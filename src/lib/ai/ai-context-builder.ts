import { DEMO_ASTRONAUTS, DEMO_MISSION } from "@/lib/demo-data";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { Astronaut, HealthRecord } from "@/types";
import type { EvidenceItem } from "./ai-types";
import type { DemoState } from "./demo-state";

export type AIAnalysisPeriod = "24h" | "7d" | "30d" | "90d" | "mission";
export interface AIContext {
  scope: "astronaut" | "mission" | "general";
  period: AIAnalysisPeriod;
  generatedAt: string;
  question: string;
  healthDataIsSimulated: true;
  subjects: Array<{ id: string; callsign: string; displayName: string; latestAssessment: unknown; currentMeasurements: unknown; recordsInPeriod: number; baselines: unknown[]; trends: unknown[]; anomalies: unknown[]; patterns: unknown[]; forecasts: unknown[]; recommendations: string[]; activeAlerts: Array<{ id: string; title: string; severity: string; message: string; createdAt: string }> }>;
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
  mood: record.mood ?? null, fatigue: record.fatigue ?? null, stress1to5: record.stressLevel ?? null,
  anxiety1to5: record.anxietyLevel ?? null, symptoms: record.symptoms ?? null, source: record.measurementSource ?? "unknown", simulated: record.isSimulated !== false,
  notes: record.notes ?? null,
});

function buildSubject(astronaut: Astronaut, period: AIAnalysisPeriod, evidence: EvidenceItem[], demoState?: DemoState) {
  if (demoState) {
    const merged = new Map((astronaut.healthRecords ?? []).map((record) => [record.id, record]));
    for (const record of demoState.records) merged.set(record.id, { ...record, isSimulated: true });
    const activeAlerts = new Map((astronaut.activeAlerts ?? []).map((alert) => [alert.id, alert]));
    for (const alert of demoState.activeAlerts) activeAlerts.set(alert.id, alert);
    astronaut = {
      ...astronaut,
      healthRecords: [...merged.values()].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()).slice(-180),
      latestAssessment: demoState.latestAssessment ?? astronaut.latestAssessment,
      activeAlerts: [...activeAlerts.values()].filter((alert) => alert.status === "ACTIVE"),
      isSimulated: true,
    };
  }
  const allRecords = astronaut.healthRecords ?? [];
  const cutoff = periodMs[period] == null ? null : Date.now() - periodMs[period]!;
  const records = allRecords.filter((record) => cutoff == null || new Date(record.recordedAt).getTime() >= cutoff);
  const intelligence = generateHealthIntelligence(allRecords, { phase3Status: astronaut.latestAssessment?.status });
  const latestRecord = allRecords.at(-1);
  const subjectEvidence: EvidenceItem[] = [];
  for (const record of records.slice(-30)) subjectEvidence.push({ id: record.id, kind: "record", label: `Health check-in · ${astronaut.callsign}`, timestamp: new Date(record.recordedAt).toISOString(), detail: JSON.stringify(readable(record)) });
  if (astronaut.latestAssessment) subjectEvidence.push({ id: astronaut.latestAssessment.id, kind: "assessment", label: `Phase 3 assessment · ${astronaut.latestAssessment.status}`, timestamp: new Date(astronaut.latestAssessment.createdAt).toISOString(), detail: `${astronaut.latestAssessment.summary} ${astronaut.latestAssessment.details ?? ""} Guidance: ${astronaut.latestAssessment.guidance ?? "Not provided"}` });
  for (const alert of (astronaut.activeAlerts ?? []).filter((item) => item.status === "ACTIVE")) subjectEvidence.push({ id: alert.id, kind: "alert", label: `${alert.severity} active alert · ${alert.title}`, timestamp: new Date(alert.createdAt).toISOString(), detail: alert.message });
  for (const anomaly of intelligence.anomalies.slice(-12)) subjectEvidence.push({ id: `anomaly-${astronaut.id}-${anomaly.sourceRecordId}-${anomaly.indicator}`, kind: "anomaly", label: `Statistical deviation · ${anomaly.label}`, timestamp: anomaly.timestamp, detail: `${anomaly.explanation} Source record: ${anomaly.sourceRecordId}.` });
  for (const trend of intelligence.trends.filter((item) => item.period === (period === "mission" ? "mission" : period))) {
    const id = `trend-${astronaut.id}-${trend.indicator}-${period}`;
    subjectEvidence.push({ id, kind: "trend", label: `${trend.label} · ${period}`, timestamp: intelligence.generatedAt, detail: trend.explanation });
  }
  for (const baseline of intelligence.baselines) if (baseline.count) subjectEvidence.push({ id: `baseline-${astronaut.id}-${baseline.indicator}`, kind: "baseline", label: `${baseline.label} personal baseline`, timestamp: intelligence.generatedAt, detail: baseline.sufficient ? `${baseline.count} records. Mean ${baseline.mean} ${baseline.unit}; median ${baseline.median}; standard deviation ${baseline.standardDeviation}; range ${baseline.minimum}–${baseline.maximum}; rolling average ${baseline.rollingAverage}.` : `Only ${baseline.count}/${baseline.minimumRequired} observations; insufficient for a reliable baseline.` });
  for (const [index, pattern] of intelligence.patterns.entries()) subjectEvidence.push({ id: `pattern-${astronaut.id}-${index}`, kind: "pattern", label: `Historical pattern · ${pattern.category}`, timestamp: pattern.endDate, detail: `${pattern.explanation} Evidence: ${pattern.evidence.join("; ")}` });
  for (const forecast of intelligence.forecasts) subjectEvidence.push({ id: `forecast-${astronaut.id}-${forecast.indicator}`, kind: "forecast", label: `${forecast.label} statistical projection`, timestamp: forecast.projectedDate, detail: `${forecast.explanation} Projected ${forecast.projectedValue} ${forecast.unit}, interval ${forecast.lowerBound}–${forecast.upperBound}, confidence ${forecast.confidence}; based on ${forecast.sourcePoints} measurements from ${forecast.sourceStart} to ${forecast.sourceEnd}.` });
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
      latestAssessment: astronaut.latestAssessment ? { id: astronaut.latestAssessment.id, status: astronaut.latestAssessment.status, summary: astronaut.latestAssessment.summary, guidance: astronaut.latestAssessment.guidance, timestamp: new Date(astronaut.latestAssessment.createdAt).toISOString() } : null,
      currentMeasurements: latestRecord ? readable(latestRecord) : null, recordsInPeriod: periodRecords.length,
      baselines: intelligence.baselines, trends: intelligence.trends.filter((item) => item.period === (period === "mission" ? "mission" : period)),
      anomalies: intelligence.anomalies.slice(-12), patterns: intelligence.patterns, forecasts: intelligence.forecasts,
      recommendations: [astronaut.latestAssessment?.guidance, ...alertEvidence.map((alert) => alert.message)].filter((item): item is string => Boolean(item)),
      activeAlerts: alertEvidence.map((alert) => ({ id: alert.id, title: alert.title, severity: alert.severity, message: alert.message, createdAt: new Date(alert.createdAt).toISOString() })),
    }, missing,
  };
}

export function buildAstronautAIContext(astronautId: string, question: string, period: AIAnalysisPeriod = "30d", demoState?: DemoState): AIContext | null {
  // This phase intentionally operates on the fictional roster only until real auth is configured.
  const astronaut = DEMO_ASTRONAUTS.find((item) => item.id === astronautId);
  if (!astronaut) return null;
  const evidence: EvidenceItem[] = [];
  const { subject, missing } = buildSubject(astronaut, period, evidence, demoState);
  return { scope: "astronaut", period, generatedAt: new Date().toISOString(), question, healthDataIsSimulated: true, subjects: [subject], evidence, missingInformation: missing, mission: { name: DEMO_MISSION.name, code: DEMO_MISSION.code } };
}

/** Minimal context for the home-page assistant: current data only, never mission-wide history. */
export function buildLatestAstronautAIContext(astronautId: string, question: string, demoState?: DemoState): AIContext | null {
  const context = buildAstronautAIContext(astronautId, question, "24h", demoState);
  if (!context) return null;
  const subject = context.subjects[0];
  const current = subject.currentMeasurements as { id?: string } | null;
  const assessment = subject.latestAssessment as { id?: string } | null;
  const allowed = new Set([current?.id, assessment?.id, ...subject.activeAlerts.map((alert) => alert.id)].filter(Boolean));
  return {
    ...context,
    evidence: context.evidence.filter((item) => allowed.has(item.id)),
    missingInformation: subject.currentMeasurements ? context.missingInformation : ["No stored health measurements are available for this crew member; use general advice only."],
    subjects: [{ ...subject, baselines: [], trends: [], anomalies: [], patterns: [], forecasts: [], recommendations: [] }],
  };
}

/** Context-free home-page advice. No crew names, records, vitals, or demo state are included. */
export function buildGeneralAIContext(question: string): AIContext {
  return {
    scope: "general", period: "24h", generatedAt: new Date().toISOString(), question, healthDataIsSimulated: true,
    subjects: [], evidence: [], missingInformation: [], mission: { name: "", code: "" },
  };
}

export function buildMissionAIContext(question: string, period: AIAnalysisPeriod = "7d", demoStates: DemoState[] = []): AIContext {
  const evidence: EvidenceItem[] = [];
  const states = new Map(demoStates.map((state) => [state.astronautId, state]));
  const results = DEMO_ASTRONAUTS.map((astronaut) => buildSubject(astronaut, period, evidence, states.get(astronaut.id)));
  return { scope: "mission", period, generatedAt: new Date().toISOString(), question, healthDataIsSimulated: true,
    subjects: results.map(({ subject }) => subject), evidence,
    missingInformation: results.flatMap(({ subject, missing }) => missing.map((item) => `${subject.callsign}: ${item}`)),
    mission: { name: DEMO_MISSION.name, code: DEMO_MISSION.code } };
}

