import { DEMO_ASTRONAUTS, DEMO_MISSION } from "@/lib/demo-data";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { Astronaut, HealthRecord } from "@/types";
import type { EvidenceItem } from "./ai-types";
import type { DemoState } from "./demo-state";
import { APP_NOW, APP_NOW_ISO, clampToAppToday, mergeAlertState, mergeDailyRecords } from "@/lib/health/checkin-store";
import { withSpaceDemoReading } from "@/lib/space-vitals";

export type AIAnalysisPeriod = "24h" | "7d" | "30d" | "90d" | "mission";
export interface AIContext {
  scope: "astronaut" | "mission" | "general";
  period: AIAnalysisPeriod;
  generatedAt: string;
  question: string;
  healthDataIsSimulated: true;
  subjects: Array<{ id: string; callsign: string; displayName: string; latestAssessment: unknown; currentMeasurements: unknown; recordsInPeriod: number; baselines: unknown[]; trends: unknown[]; recent14DayTrends: unknown[]; allergies: string[] | null; conditions: string[] | null; anomalies: unknown[]; patterns: unknown[]; forecasts: unknown[]; recommendations: string[]; activeAlerts: Array<{ id: string; title: string; severity: string; message: string; createdAt: string }> }>;
  evidence: EvidenceItem[];
  missingInformation: string[];
  mission: { name: string; code: string };
}

const periodMs: Record<AIAnalysisPeriod, number | null> = { "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000, "90d": 90 * 86_400_000, mission: null };
const readable = (record: HealthRecord) => ({
  id: record.id, recordedAt: new Date(record.recordedAt).toISOString(), heartRateBpm: record.heartRate ?? null,
  bloodPressureMmHg: record.systolicBP != null || record.diastolicBP != null ? `${record.systolicBP ?? "missing"}/${record.diastolicBP ?? "missing"}` : null,
  temperatureC: record.bodyTemp ?? null, glucoseMgDl: record.bloodGlucose ?? null, oxygenPercent: record.oxygenSat ?? null,
  sleepHours: record.sleepDuration ?? null, sleepQuality1to5: record.sleepQuality ?? null,
  heartRateVariabilityMs: record.heartRateVariabilityMs ?? null, respiratoryRatePerMin: record.respiratoryRatePerMin ?? null,
  orthostaticResponseBpm: record.orthostaticResponseBpm ?? null, exerciseMinutes: record.exerciseMinutes ?? null,
  weightKg: record.weightKg ?? null, fluidIntakeLitres: record.fluidIntakeLitres ?? null,
  visionSymptoms: record.visionSymptoms ?? null, acuityChange: record.acuityChange ?? null,
  reactionTimeMs: record.reactionTimeMs ?? null, radiationDoseRateMsvPerDay: record.radiationDoseRateMsvPerDay ?? null,
  cumulativeRadiationMsv: record.cumulativeRadiationMsv ?? null, cabinCo2Ppm: record.cabinCo2Ppm ?? null,
  mood: record.mood ?? null, fatigue: record.fatigue ?? null, stress1to5: record.stressLevel ?? null,
  anxiety1to5: record.anxietyLevel ?? null, symptoms: record.symptoms ?? null, source: record.measurementSource ?? "unknown", simulated: record.isSimulated !== false,
  notes: record.notes ?? null,
});

function buildSubject(astronaut: Astronaut, period: AIAnalysisPeriod, evidence: EvidenceItem[], demoState?: DemoState) {
  if (demoState) {
    const mergedRecords = mergeDailyRecords(astronaut.healthRecords ?? [], demoState.records.map((record) => ({ ...record, isSimulated: true })));
    const activeAlerts = mergeAlertState(astronaut.activeAlerts ?? [], demoState.activeAlerts);
    astronaut = {
      ...astronaut,
      healthRecords: mergedRecords.slice(-180),
      latestAssessment: demoState.latestAssessment ?? astronaut.latestAssessment,
      activeAlerts: activeAlerts.filter((alert) => alert.status === "ACTIVE"),
      isSimulated: true,
    };
  }
  const allRecords = withSpaceDemoReading(astronaut.healthRecords ?? [], astronaut.id);
  const cutoff = periodMs[period] == null ? null : APP_NOW.getTime() - periodMs[period]!;
  const records = allRecords.filter((record) => cutoff == null || new Date(record.recordedAt).getTime() >= cutoff);
  const intelligence = generateHealthIntelligence(allRecords, { phase3Status: astronaut.latestAssessment?.status });
  const latestRecord = allRecords.at(-1);
  const referenceTime = latestRecord ? new Date(latestRecord.recordedAt).getTime() : 0;
  const recent14Records = allRecords.filter((record) => referenceTime > 0 && new Date(record.recordedAt).getTime() >= referenceTime - 14 * 86_400_000);
  const recent14Intelligence = generateHealthIntelligence(recent14Records, { phase3Status: astronaut.latestAssessment?.status });
  const recent14DayTrends = recent14Intelligence.trends.filter((item) => item.period === "mission").map((trend) => {
    const baseline = intelligence.baselines.find((item) => item.indicator === trend.indicator);
    return { indicator: trend.indicator, label: trend.label, unit: trend.unit, count: trend.measurementCount, firstValue: trend.startingValue, latestValue: trend.latestValue, direction: trend.direction, baselineMinimum: baseline?.minimum ?? null, baselineMaximum: baseline?.maximum ?? null };
  });
  const profile = astronaut as Astronaut & { allergies?: string[] | null; conditions?: string[] | null };
  const subjectEvidence: EvidenceItem[] = [];
  for (const record of records.slice(-30)) subjectEvidence.push({ id: record.id, kind: "record", label: `Health check-in · ${astronaut.callsign}`, timestamp: new Date(record.recordedAt).toISOString(), detail: JSON.stringify(readable(record)) });
  if (astronaut.latestAssessment) subjectEvidence.push({ id: astronaut.latestAssessment.id, kind: "assessment", label: `Phase 3 assessment · ${astronaut.latestAssessment.status}`, timestamp: clampToAppToday(astronaut.latestAssessment.createdAt).toISOString(), detail: `${astronaut.latestAssessment.summary} ${astronaut.latestAssessment.details ?? ""} Guidance: ${astronaut.latestAssessment.guidance ?? "Not provided"}` });
  for (const alert of (astronaut.activeAlerts ?? []).filter((item) => item.status === "ACTIVE")) subjectEvidence.push({ id: alert.id, kind: "alert", label: `${alert.severity} active alert · ${alert.title}`, timestamp: clampToAppToday(alert.createdAt).toISOString(), detail: alert.message });
  for (const anomaly of intelligence.anomalies.slice(-12)) subjectEvidence.push({ id: `anomaly-${astronaut.id}-${anomaly.sourceRecordId}-${anomaly.indicator}`, kind: "anomaly", label: `Statistical deviation · ${anomaly.label}`, timestamp: anomaly.timestamp, detail: `${anomaly.explanation} Source record: ${anomaly.sourceRecordId}.` });
  for (const trend of intelligence.trends.filter((item) => item.period === (period === "mission" ? "mission" : period))) {
    const id = `trend-${astronaut.id}-${trend.indicator}-${period}`;
    subjectEvidence.push({ id, kind: "trend", label: `${trend.label} · ${period}`, timestamp: intelligence.generatedAt, detail: trend.explanation });
  }
  for (const trend of recent14DayTrends) subjectEvidence.push({ id: `trend14-${astronaut.id}-${trend.indicator}`, kind: "trend", label: `${trend.label} · last 14 days`, timestamp: latestRecord ? new Date(latestRecord.recordedAt).toISOString() : null, detail: `${trend.count} readings over the 14 days ending ${latestRecord ? new Date(latestRecord.recordedAt).toISOString() : "an unavailable date"}; first ${trend.firstValue ?? "not recorded"} ${trend.unit}, latest ${trend.latestValue ?? "not recorded"} ${trend.unit}, direction ${trend.direction}; full-history personal range ${trend.baselineMinimum ?? "unavailable"}–${trend.baselineMaximum ?? "unavailable"} ${trend.unit}.` });
  for (const baseline of intelligence.baselines) if (baseline.count) subjectEvidence.push({ id: `baseline-${astronaut.id}-${baseline.indicator}`, kind: "baseline", label: `${baseline.label} personal baseline`, timestamp: intelligence.generatedAt, detail: baseline.sufficient ? `${baseline.count} records. Mean ${baseline.mean} ${baseline.unit}; median ${baseline.median}; standard deviation ${baseline.standardDeviation}; range ${baseline.minimum}–${baseline.maximum}; rolling average ${baseline.rollingAverage}.` : `Only ${baseline.count}/${baseline.minimumRequired} observations; insufficient for a reliable baseline.` });
  for (const [index, pattern] of intelligence.patterns.entries()) subjectEvidence.push({ id: `pattern-${astronaut.id}-${index}`, kind: "pattern", label: `Historical pattern · ${pattern.category}`, timestamp: pattern.endDate, detail: `${pattern.explanation} Evidence: ${pattern.evidence.join("; ")}` });
  for (const forecast of intelligence.forecasts) subjectEvidence.push({ id: `forecast-${astronaut.id}-${forecast.indicator}`, kind: "forecast", label: `${forecast.label} statistical projection`, timestamp: null, detail: `${forecast.explanation} Projected ${forecast.projectedValue} ${forecast.unit} five days after the latest recorded date, interval ${forecast.lowerBound}–${forecast.upperBound}, confidence ${forecast.confidence}; based on ${forecast.sourcePoints} measurements from ${forecast.sourceStart} to ${forecast.sourceEnd}.` });
  evidence.push(...subjectEvidence);
  const periodRecords = records.slice(-30);
  const missing = latestRecord ? ["heartRate", "blood pressure", "sleep duration", "mood", "stress"].filter((label) => {
    if (label === "heartRate") return latestRecord.heartRate == null;
    if (label === "blood pressure") return latestRecord.systolicBP == null || latestRecord.diastolicBP == null;
    if (label === "sleep duration") return latestRecord.sleepDuration == null;
    if (label === "mood") return latestRecord.mood == null;
    return latestRecord.stressLevel == null;
  }).map((item) => `Latest record does not contain ${item}.`) : ["No health measurements are available."];
  const alertEvidence = (astronaut.activeAlerts ?? []).filter((alert) => alert.status === "ACTIVE");
  return {
    subject: {
      id: astronaut.id, callsign: astronaut.callsign, displayName: astronaut.name,
      latestAssessment: astronaut.latestAssessment ? { id: astronaut.latestAssessment.id, status: astronaut.latestAssessment.status, summary: astronaut.latestAssessment.summary, guidance: astronaut.latestAssessment.guidance, timestamp: clampToAppToday(astronaut.latestAssessment.createdAt).toISOString() } : null,
      currentMeasurements: latestRecord ? readable(latestRecord) : null,
      spaceHealthObservations: astronaut.id === "ast-1" && latestRecord?.exerciseMinutes != null && latestRecord?.heartRateVariabilityMs != null && latestRecord.exerciseMinutes > 90 && latestRecord.heartRateVariabilityMs > 50
        ? [`Exercise protects recovery: the latest simulated record pairs ${latestRecord.exerciseMinutes} minutes of exercise with HRV ${latestRecord.heartRateVariabilityMs} ms (+${latestRecord.heartRateVariabilityMs - 50} ms vs baseline). This is an observed demo association, not proof of cause.`]
        : [],
      recordsInPeriod: periodRecords.length,
      baselines: intelligence.baselines, trends: intelligence.trends.filter((item) => item.period === (period === "mission" ? "mission" : period)), recent14DayTrends,
      allergies: profile.allergies ?? null, conditions: profile.conditions ?? null,
      anomalies: intelligence.anomalies.slice(-12), patterns: intelligence.patterns, forecasts: intelligence.forecasts.map(({ projectedDate: _projectedDate, ...forecast }) => forecast),
      recommendations: [astronaut.latestAssessment?.guidance, ...alertEvidence.map((alert) => alert.message)].filter((item): item is string => Boolean(item)),
      activeAlerts: alertEvidence.map((alert) => ({ id: alert.id, title: alert.title, severity: alert.severity, message: alert.message, createdAt: clampToAppToday(alert.createdAt).toISOString() })),
    }, missing,
  };
}

export function buildAstronautAIContext(astronautId: string, question: string, period: AIAnalysisPeriod = "30d", demoState?: DemoState): AIContext | null {
  // This phase intentionally operates on the fictional roster only until real auth is configured.
  const astronaut = DEMO_ASTRONAUTS.find((item) => item.id === astronautId);
  if (!astronaut) return null;
  const evidence: EvidenceItem[] = [];
  const { subject, missing } = buildSubject(astronaut, period, evidence, demoState);
  return { scope: "astronaut", period, generatedAt: APP_NOW_ISO, question, healthDataIsSimulated: true, subjects: [subject], evidence, missingInformation: missing, mission: { name: DEMO_MISSION.name, code: DEMO_MISSION.code } };
}

/** Home-page assistant context includes current readings and enough recent/personal history to ground follow-ups. */
export function buildLatestAstronautAIContext(astronautId: string, question: string, demoState?: DemoState): AIContext | null {
  return buildAstronautAIContext(astronautId, question, "30d", demoState);
}

/** Context-free home-page advice. No crew names, records, vitals, or demo state are included. */
export function buildGeneralAIContext(question: string): AIContext {
  return {
    scope: "general", period: "24h", generatedAt: APP_NOW_ISO, question, healthDataIsSimulated: true,
    subjects: [], evidence: [], missingInformation: [], mission: { name: "", code: "" },
  };
}

export function buildMissionAIContext(question: string, period: AIAnalysisPeriod = "7d", demoStates: DemoState[] = []): AIContext {
  const evidence: EvidenceItem[] = [];
  const states = new Map(demoStates.map((state) => [state.astronautId, state]));
  const results = DEMO_ASTRONAUTS.map((astronaut) => buildSubject(astronaut, period, evidence, states.get(astronaut.id)));
  return { scope: "mission", period, generatedAt: APP_NOW_ISO, question, healthDataIsSimulated: true,
    subjects: results.map(({ subject }) => subject), evidence,
    missingInformation: results.flatMap(({ subject, missing }) => missing.map((item) => `${subject.callsign}: ${item}`)),
    mission: { name: DEMO_MISSION.name, code: DEMO_MISSION.code } };
}

