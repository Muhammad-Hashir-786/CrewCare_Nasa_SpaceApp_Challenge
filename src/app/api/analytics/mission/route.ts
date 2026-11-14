import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { DEMO_ASTRONAUTS, DEMO_MISSION } from "@/lib/demo-data";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { Astronaut } from "@/types";

async function loadCrew(): Promise<{ crew: Astronaut[]; missionId: string | null; simulated: boolean }> {
  if (!isDatabaseConfigured()) return { crew: DEMO_ASTRONAUTS, missionId: null, simulated: true };
  const [users, mission] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ASTRONAUT" }, orderBy: { callsign: "asc" },
      include: {
        healthRecords: { orderBy: { recordedAt: "desc" }, take: 365 },
        healthAssessments: { orderBy: { assessedAt: "desc" }, take: 1 },
      },
    }),
    prisma.mission.findFirst({ where: { code: DEMO_MISSION.code }, select: { id: true } }),
  ]);
  const crew = users.map((user): Astronaut => ({
    id: user.id, name: user.name, callsign: user.callsign, rank: user.rank, specialty: user.specialty,
    healthRecords: user.healthRecords.reverse().map((record) => ({
      id: record.id, userId: record.userId, recordedAt: record.recordedAt.toISOString(),
      heartRate: record.heartRate, systolicBP: record.systolicBP, diastolicBP: record.diastolicBP,
      bodyTemp: record.bodyTemp, bloodGlucose: record.bloodGlucose, oxygenSat: record.oxygenSat,
      sleepDuration: record.sleepDuration, sleepQuality: record.sleepQuality, mood: record.mood,
      fatigue: record.fatigue, stressLevel: record.stressLevel, anxietyLevel: record.anxietyLevel,
      symptoms: record.symptoms, symptomSeverity: record.symptomSeverity, notes: record.notes,
      isMeasured: record.isMeasured, isSimulated: record.isSimulated,
    })),
    latestAssessment: user.healthAssessments[0] ? {
      id: user.healthAssessments[0].id, userId: user.id,
      status: user.healthAssessments[0].overallStatus as "GREEN" | "AMBER" | "RED",
      summary: user.healthAssessments[0].summary, flags: user.healthAssessments[0].flags,
      createdAt: user.healthAssessments[0].assessedAt.toISOString(),
    } : null,
    isSimulated: user.healthRecords.length > 0 && user.healthRecords.every((record) => record.isSimulated),
  }));
  return { crew, missionId: mission?.id ?? null, simulated: crew.length > 0 && crew.every((member) => member.isSimulated) };
}

function buildMissionReport(crew: Astronaut[]) {
  const members = crew.map((astronaut) => {
    const report = generateHealthIntelligence(astronaut.healthRecords ?? [], { phase3Status: astronaut.latestAssessment?.status });
    const hrBaseline = report.baselines.find((baseline) => baseline.indicator === "heartRate");
    const sleepBaseline = report.baselines.find((baseline) => baseline.indicator === "sleepDuration");
    const latest = astronaut.healthRecords?.at(-1);
    const thirtyDay = (indicator: string) => report.trends.find((trend) => trend.indicator === indicator && trend.period === "30d");
    const latestHr = latest?.heartRate ?? null;
    const baselineDeviation = hrBaseline?.sufficient && hrBaseline.standardDeviation && latestHr != null
      ? Number(((latestHr - hrBaseline.median!) / hrBaseline.standardDeviation).toFixed(2)) : null;
    return {
      astronautId: astronaut.id,
      name: astronaut.name,
      callsign: astronaut.callsign,
      phase3Status: astronaut.latestAssessment?.status ?? null,
      recordCount: report.recordCount,
      isSimulated: report.simulatedRecordCount > 0,
      sleepTrend: thirtyDay("sleepDuration"),
      stressTrend: thirtyDay("stressLevel"),
      heartRateTrend: thirtyDay("heartRate"),
      heartRateBaseline: hrBaseline,
      sleepBaseline,
      latestHeartRate: latestHr,
      personalHeartRateDeviation: baselineDeviation,
      anomalyCount: report.anomalies.length,
      repeatedAnomalyCount: report.anomalies.filter((anomaly) => anomaly.repeated).length,
      patterns: report.patterns,
      observations: report.observations,
      dataCompleteness: thirtyDay("heartRate")?.completeness ?? 0,
    };
  });
  const allReports = crew.map((astronaut) => generateHealthIntelligence(astronaut.healthRecords ?? [], { phase3Status: astronaut.latestAssessment?.status }));
  const totalRecords = allReports.reduce((total, report) => total + report.recordCount, 0);
  const meanCoverage = members.length ? Number((members.reduce((sum, member) => sum + member.dataCompleteness, 0) / members.length).toFixed(2)) : 0;
  return {
    generatedAt: new Date().toISOString(),
    mission: DEMO_MISSION,
    crewCount: members.length,
    totalRecords,
    meanDataCompleteness: meanCoverage,
    totalAnomalies: members.reduce((sum, member) => sum + member.anomalyCount, 0),
    repeatedAnomalies: members.reduce((sum, member) => sum + member.repeatedAnomalyCount, 0),
    members,
    notes: [
      "Crew patterns are summarized from person-specific baselines; raw values are not treated as directly comparable between astronauts.",
      "Statistical deviations and projections are not medical diagnoses or validated medical limits.",
      "Correlations do not establish causation. Phase 3 remains authoritative for configured safety alerts.",
    ],
  };
}

export async function GET() {
  try {
    const { crew, missionId, simulated } = await loadCrew();
    const report = buildMissionReport(crew);
    const latestSaved = isDatabaseConfigured() && missionId
      ? await prisma.analyticsReport.findFirst({ where: { missionId }, orderBy: { generatedAt: "desc" }, select: { id: true, generatedAt: true } })
      : null;
    return NextResponse.json({ report, latestSaved, isSimulated: simulated });
  } catch (error) {
    console.error("GET /api/analytics/mission error:", error);
    return NextResponse.json({ error: "Unable to calculate crew analytics" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { crew, missionId, simulated } = await loadCrew();
    const report = buildMissionReport(crew);
    if (!isDatabaseConfigured() || !missionId) return NextResponse.json({ report, persisted: false, isSimulated: true });
    const payload = JSON.parse(JSON.stringify(report)) as Prisma.InputJsonValue;
    const saved = await prisma.analyticsReport.create({
      data: { missionId, sourceRecordCount: report.totalRecords, isSimulated: simulated, payload, generatedAt: new Date(report.generatedAt) },
      select: { id: true, generatedAt: true },
    });
    return NextResponse.json({ report, persisted: true, saved, isSimulated: simulated });
  } catch (error) {
    console.error("POST /api/analytics/mission error:", error);
    return NextResponse.json({ error: "Unable to save crew analytics" }, { status: 500 });
  }
}
