import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { DEMO_ASTRONAUTS, DEMO_MISSION } from "@/lib/demo-data";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { Astronaut } from "@/types";
import { APP_NOW_ISO, countAnomalyDays, mergeDailyRecords } from "@/lib/health/checkin-store";

async function loadCrew(): Promise<{ crew: Astronaut[]; missionId: string | null; simulated: boolean }> {
  if (!isDatabaseConfigured()) return { crew: DEMO_ASTRONAUTS, missionId: null, simulated: true };
  // Mission Control's demo dashboard is backed by this fixture. Analytics must
  // read that same source, even when a connected database has not been seeded.
  const mission = await prisma.mission.findFirst({ where: { code: DEMO_MISSION.code }, select: { id: true } });
  return { crew: DEMO_ASTRONAUTS, missionId: mission?.id ?? null, simulated: true };
}

function buildMissionReport(crew: Astronaut[]) {
  const members = crew.map((astronaut) => {
    const report = generateHealthIntelligence(astronaut.healthRecords ?? [], { phase3Status: astronaut.latestAssessment?.status });
    const hrBaseline = report.baselines.find((baseline) => baseline.indicator === "heartRate");
    const sleepBaseline = report.baselines.find((baseline) => baseline.indicator === "sleepDuration");
    const latest = astronaut.healthRecords?.at(-1);
    const thirtyDay = (indicator: string) => report.trends.find((trend) => trend.indicator === indicator && trend.period === "30d");
    const latestHr = latest?.heartRate ?? null;
    const { days: outOfRangeDayCount, repeatedDays: repeatedOutOfRangeDays } = countAnomalyDays(report.anomalies);
    const sourceStatus = astronaut.latestAssessment?.status ?? null;
    const reconciledStatus = sourceStatus === "RED" ? "RED" : sourceStatus === "AMBER" || outOfRangeDayCount > 0 ? "AMBER" : sourceStatus;
    const baselineDeviation = hrBaseline?.sufficient && hrBaseline.standardDeviation && latestHr != null
      ? Number(((latestHr - hrBaseline.median!) / hrBaseline.standardDeviation).toFixed(2)) : null;
    return {
      astronautId: astronaut.id,
      name: astronaut.name,
      callsign: astronaut.callsign,
      phase3Status: reconciledStatus,
      recordCount: report.recordCount,
      isSimulated: report.simulatedRecordCount > 0,
      sleepTrend: thirtyDay("sleepDuration"),
      stressTrend: thirtyDay("stressLevel"),
      heartRateTrend: thirtyDay("heartRate"),
      heartRateBaseline: hrBaseline,
      sleepBaseline,
      latestHeartRate: latestHr,
      personalHeartRateDeviation: baselineDeviation,
      anomalyCount: outOfRangeDayCount,
      repeatedAnomalyCount: repeatedOutOfRangeDays,
      patterns: report.patterns,
      observations: report.observations,
      dataCompleteness: thirtyDay("heartRate")?.completeness ?? 0,
    };
  });
  const allReports = crew.map((astronaut) => generateHealthIntelligence(astronaut.healthRecords ?? [], { phase3Status: astronaut.latestAssessment?.status }));
  const totalRecords = allReports.reduce((total, report) => total + report.recordCount, 0);
  const meanCoverage = members.length ? Number((members.reduce((sum, member) => sum + member.dataCompleteness, 0) / members.length).toFixed(2)) : 0;
  return {
    generatedAt: APP_NOW_ISO,
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

export async function POST(request: NextRequest) {
  try {
    const loaded = await loadCrew();
    const body = await request.json().catch(() => ({})) as { demoStates?: Array<{ astronautId: string; records?: Astronaut["healthRecords"] }> };
    const localStates = new Map((body.demoStates ?? []).map((state) => [state.astronautId, state.records ?? []]));
    const crew = loaded.crew.map((astronaut) => ({ ...astronaut, healthRecords: mergeDailyRecords(astronaut.healthRecords ?? [], localStates.get(astronaut.id) ?? []) }));
    const { missionId, simulated } = loaded;
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
