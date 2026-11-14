import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { HealthRecord } from "@/types";

async function loadReportInput(userId: string) {
  if (!isDatabaseConfigured()) {
    const astronaut = DEMO_ASTRONAUTS.find((member) => member.id === userId);
    if (!astronaut) return null;
    const records = astronaut.healthRecords ?? [];
    return {
      records,
      status: astronaut.latestAssessment?.status ?? null,
      simulated: true,
    };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, role: "ASTRONAUT" },
    select: { id: true },
  });
  if (!user) return null;
  const [records, assessment] = await Promise.all([
    prisma.healthRecord.findMany({ where: { userId }, orderBy: { recordedAt: "desc" }, take: 365 }),
    prisma.healthAssessment.findFirst({ where: { userId }, orderBy: { assessedAt: "desc" }, select: { overallStatus: true } }),
  ]);
  return {
    records: records.reverse().map((record): HealthRecord => ({
      id: record.id,
      userId: record.userId,
      recordedAt: record.recordedAt.toISOString(),
      heartRate: record.heartRate,
      systolicBP: record.systolicBP,
      diastolicBP: record.diastolicBP,
      bodyTemp: record.bodyTemp,
      bloodGlucose: record.bloodGlucose,
      oxygenSat: record.oxygenSat,
      sleepDuration: record.sleepDuration,
      sleepQuality: record.sleepQuality,
      mood: record.mood,
      fatigue: record.fatigue,
      stressLevel: record.stressLevel,
      anxietyLevel: record.anxietyLevel,
      symptoms: record.symptoms,
      symptomSeverity: record.symptomSeverity,
      notes: record.notes,
      isMeasured: record.isMeasured,
      isSimulated: record.isSimulated,
    })),
    status: assessment?.overallStatus ?? null,
    simulated: records.length > 0 && records.every((record) => record.isSimulated),
  };
}

function makeReport(input: NonNullable<Awaited<ReturnType<typeof loadReportInput>>>) {
  return generateHealthIntelligence(input.records, {
    phase3Status: input.status === "GREEN" || input.status === "AMBER" || input.status === "RED" ? input.status : null,
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  try {
    const input = await loadReportInput(userId);
    if (!input) return NextResponse.json({ error: "Astronaut not found" }, { status: 404 });
    const report = makeReport(input);
    if (isDatabaseConfigured()) {
      const saved = await prisma.analyticsReport.findFirst({
        where: { userId }, orderBy: { generatedAt: "desc" }, select: { id: true, generatedAt: true },
      });
      return NextResponse.json({ report, latestSavedReport: saved, isSimulated: input.simulated });
    }
    return NextResponse.json({ report, latestSavedReport: null, isSimulated: true });
  } catch (error) {
    console.error("GET /api/analytics/[userId] error:", error);
    return NextResponse.json({ error: "Unable to calculate health analytics" }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  try {
    const input = await loadReportInput(userId);
    if (!input) return NextResponse.json({ error: "Astronaut not found" }, { status: 404 });
    const report = makeReport(input);
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ report, persisted: false, isSimulated: true });
    }

    const payload = JSON.parse(JSON.stringify(report)) as Prisma.InputJsonValue;
    const saved = await prisma.$transaction(async (tx) => {
      const analyticsReport = await tx.analyticsReport.create({
        data: {
          userId,
          sourceRecordCount: report.recordCount,
          isSimulated: input.simulated,
          payload,
          generatedAt: new Date(report.generatedAt),
        },
      });
      if (report.baselines.length) await tx.healthBaseline.createMany({
        data: report.baselines.map((baseline) => ({
          reportId: analyticsReport.id, userId, indicator: baseline.indicator, label: baseline.label, unit: baseline.unit,
          measurementCount: baseline.count, minimumRequired: baseline.minimumRequired, sufficient: baseline.sufficient,
          mean: baseline.mean, median: baseline.median, standardDeviation: baseline.standardDeviation,
          minimum: baseline.minimum, maximum: baseline.maximum, rollingAverage: baseline.rollingAverage,
          interpretation: baseline.interpretation ?? null,
        })),
      });
      if (report.trends.length) await tx.healthTrend.createMany({
        data: report.trends.map((trend) => ({
          reportId: analyticsReport.id, userId, indicator: trend.indicator, label: trend.label, unit: trend.unit,
          period: trend.period, measurementCount: trend.measurementCount, expectedDays: trend.expectedDays,
          completeness: trend.completeness, startingValue: trend.startingValue, latestValue: trend.latestValue,
          average: trend.average, percentChange: trend.percentChange,
          direction: trend.direction === "insufficient" ? "INSUFFICIENT" : trend.direction.toUpperCase() as "INCREASING" | "DECREASING" | "STABLE",
          explanation: trend.explanation,
        })),
      });
      if (report.anomalies.length) await tx.healthAnomaly.createMany({
        data: report.anomalies.map((anomaly) => ({
          reportId: analyticsReport.id, userId, sourceRecordId: anomaly.sourceRecordId,
          indicator: anomaly.indicator, label: anomaly.label, unit: anomaly.unit,
          actualValue: anomaly.actualValue, expectedMinimum: anomaly.expectedMinimum, expectedMaximum: anomaly.expectedMaximum,
          method: anomaly.method, severity: anomaly.severity, deviationScore: anomaly.deviationScore,
          recordedAt: new Date(anomaly.timestamp), repeated: anomaly.repeated, explanation: anomaly.explanation,
        })),
      });
      if (report.patterns.length) await tx.healthPattern.createMany({
        data: report.patterns.map((pattern) => ({
          reportId: analyticsReport.id, userId, category: pattern.category, priority: pattern.priority,
          indicators: pattern.indicators, startDate: pattern.startDate ? new Date(pattern.startDate) : null,
          endDate: pattern.endDate ? new Date(pattern.endDate) : null, reliability: pattern.reliability,
          evidence: pattern.evidence, explanation: pattern.explanation, suggestedFollowUp: pattern.suggestedFollowUp,
        })),
      });
      if (report.forecasts.length) await tx.healthForecast.createMany({
        data: report.forecasts.map((forecast) => ({
          reportId: analyticsReport.id, userId, indicator: forecast.indicator, label: forecast.label, unit: forecast.unit,
          method: forecast.method, forecastDate: new Date(forecast.projectedDate), projectedValue: forecast.projectedValue,
          lowerBound: forecast.lowerBound, upperBound: forecast.upperBound, confidence: forecast.confidence,
          sourcePoints: forecast.sourcePoints, sourceStart: new Date(forecast.sourceStart), sourceEnd: new Date(forecast.sourceEnd),
          explanation: forecast.explanation,
        })),
      });
      return analyticsReport;
    });
    return NextResponse.json({ report, reportId: saved.id, persisted: true, isSimulated: input.simulated });
  } catch (error) {
    console.error("POST /api/analytics/[userId] error:", error);
    return NextResponse.json({ error: "Unable to save health analytics" }, { status: 500 });
  }
}
