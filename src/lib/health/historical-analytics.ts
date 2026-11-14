import type { HealthRecord, AssessmentStatus } from "@/types";

export const MIN_BASELINE_POINTS = 5;
export const MIN_FORECAST_POINTS = 7;
const FORECAST_DAYS = 5;

type Indicator = {
  key: string;
  label: string;
  unit: string;
  value: (record: HealthRecord) => number | null;
  interpretation?: string;
};

const MOOD_SCORE: Record<string, number> = { VERY_LOW: 1, LOW: 2, NEUTRAL: 3, GOOD: 4, EXCELLENT: 5 };
const FATIGUE_SCORE: Record<string, number> = { EXHAUSTED: 1, VERY_TIRED: 2, TIRED: 3, MODERATE: 4, REFRESHED: 5 };

const INDICATORS: Indicator[] = [
  { key: "heartRate", label: "Heart rate", unit: "BPM", value: (r) => r.heartRate ?? null },
  { key: "systolicBP", label: "Systolic blood pressure", unit: "mmHg", value: (r) => r.systolicBP ?? null },
  { key: "diastolicBP", label: "Diastolic blood pressure", unit: "mmHg", value: (r) => r.diastolicBP ?? null },
  { key: "bloodGlucose", label: "Blood glucose", unit: "mg/dL", value: (r) => r.bloodGlucose ?? null },
  { key: "bodyTemp", label: "Body temperature", unit: "°C", value: (r) => r.bodyTemp ?? null },
  { key: "oxygenSat", label: "Oxygen saturation", unit: "%", value: (r) => r.oxygenSat ?? null },
  { key: "sleepDuration", label: "Sleep duration", unit: "hours", value: (r) => r.sleepDuration ?? null },
  { key: "sleepQuality", label: "Sleep quality", unit: "/5", value: (r) => r.sleepQuality ?? null },
  { key: "mood", label: "Mood (self-reported)", unit: "/5", value: (r) => r.mood ? MOOD_SCORE[r.mood] ?? null : null },
  { key: "fatigue", label: "Energy (self-reported)", unit: "/5", value: (r) => r.fatigue ? FATIGUE_SCORE[r.fatigue] ?? null : null, interpretation: "Lower values represent more reported fatigue." },
  { key: "stressLevel", label: "Stress (self-reported)", unit: "/5", value: (r) => r.stressLevel ?? null },
  { key: "anxietyLevel", label: "Anxiety (self-reported)", unit: "/5", value: (r) => r.anxietyLevel ?? null },
];

export interface BaselineResult {
  indicator: string;
  label: string;
  unit: string;
  count: number;
  minimumRequired: number;
  sufficient: boolean;
  mean: number | null;
  median: number | null;
  standardDeviation: number | null;
  minimum: number | null;
  maximum: number | null;
  rollingAverage: number | null;
  interpretation?: string;
}

export interface TrendResult {
  indicator: string;
  label: string;
  unit: string;
  period: "24h" | "7d" | "30d" | "90d" | "mission";
  measurementCount: number;
  expectedDays: number | null;
  completeness: number;
  startingValue: number | null;
  latestValue: number | null;
  average: number | null;
  percentChange: number | null;
  direction: "increasing" | "decreasing" | "stable" | "insufficient";
  explanation: string;
}

export interface AnomalyResult {
  indicator: string;
  label: string;
  unit: string;
  actualValue: number;
  expectedMinimum: number;
  expectedMaximum: number;
  method: "ROBUST_Z_SCORE" | "INTERQUARTILE_RANGE";
  severity: "LOW" | "MODERATE" | "HIGH";
  deviationScore: number;
  timestamp: string;
  sourceRecordId: string;
  repeated: boolean;
  explanation: string;
}

export interface PatternResult {
  category: "SLEEP_STRESS" | "CARDIOVASCULAR_SLEEP" | "REPEATED_DEVIATION" | "RECOVERY";
  priority: "LOW" | "MODERATE" | "HIGH";
  indicators: string[];
  startDate: string | null;
  endDate: string | null;
  reliability: number;
  evidence: string[];
  explanation: string;
  suggestedFollowUp: string;
}

export interface ForecastResult {
  indicator: string;
  label: string;
  unit: string;
  method: "LINEAR_REGRESSION";
  projectedDate: string;
  projectedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  sourcePoints: number;
  sourceStart: string;
  sourceEnd: string;
  explanation: string;
}

export interface RiskObservation {
  category: string;
  priority: "LOW" | "MODERATE" | "HIGH";
  indicators: string[];
  evidence: string[];
  explanation: string;
  reliability: number;
  suggestedFollowUp: string;
  phase3Status: AssessmentStatus | null;
}

export interface HealthIntelligenceReport {
  generatedAt: string;
  recordCount: number;
  simulatedRecordCount: number;
  dateRange: { start: string | null; end: string | null };
  baselines: BaselineResult[];
  trends: TrendResult[];
  anomalies: AnomalyResult[];
  patterns: PatternResult[];
  forecasts: ForecastResult[];
  observations: RiskObservation[];
  limitations: string[];
}

const round = (value: number, places = 2) => Number(value.toFixed(places));

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardDeviation(values: number[], center = average(values)): number {
  if (values.length < 2) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1));
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function recordsIn(records: HealthRecord[], start: number): HealthRecord[] {
  return records.filter((record) => new Date(record.recordedAt).getTime() >= start);
}

function valuesFor(records: HealthRecord[], indicator: Indicator): Array<{ record: HealthRecord; value: number }> {
  return records.flatMap((record) => {
    const value = indicator.value(record);
    return value == null || !Number.isFinite(value) ? [] : [{ record, value }];
  });
}

function buildBaselines(records: HealthRecord[]): BaselineResult[] {
  return INDICATORS.map((indicator) => {
    const entries = valuesFor(records, indicator);
    const values = entries.map((entry) => entry.value);
    const count = values.length;
    const sufficient = count >= MIN_BASELINE_POINTS;
    if (!sufficient) {
      return {
        indicator: indicator.key, label: indicator.label, unit: indicator.unit, count,
        minimumRequired: MIN_BASELINE_POINTS, sufficient, mean: null, median: null,
        standardDeviation: null, minimum: null, maximum: null, rollingAverage: null,
        interpretation: indicator.interpretation,
      };
    }
    const center = median(values);
    return {
      indicator: indicator.key, label: indicator.label, unit: indicator.unit, count,
      minimumRequired: MIN_BASELINE_POINTS, sufficient,
      mean: round(average(values)), median: round(center),
      standardDeviation: round(standardDeviation(values, average(values))),
      minimum: round(Math.min(...values)), maximum: round(Math.max(...values)),
      rollingAverage: round(average(values.slice(-7))),
      interpretation: indicator.interpretation,
    };
  });
}

const PERIODS: Array<{ period: TrendResult["period"]; days: number | null }> = [
  { period: "24h", days: 1 }, { period: "7d", days: 7 }, { period: "30d", days: 30 },
  { period: "90d", days: 90 }, { period: "mission", days: null },
];

function buildTrends(records: HealthRecord[], now: number): TrendResult[] {
  const ordered = [...records].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  return PERIODS.flatMap(({ period, days }) => {
    const startTime = days == null ? Number.NEGATIVE_INFINITY : now - days * 86_400_000;
    const periodRecords = recordsIn(ordered, startTime);
    return INDICATORS.map((indicator): TrendResult => {
      const points = valuesFor(periodRecords, indicator);
      const values = points.map((point) => point.value);
      const first = values[0] ?? null;
      const latest = values.at(-1) ?? null;
      let direction: TrendResult["direction"] = "insufficient";
      if (values.length >= 3) {
        const delta = values[values.length - 1] - values[0];
        direction = Math.abs(delta) < Math.max(0.1, Math.abs(average(values)) * 0.03)
          ? "stable" : delta > 0 ? "increasing" : "decreasing";
      }
      const spanDays = days ?? Math.max(1, ordered.length > 1
        ? (new Date(ordered.at(-1)!.recordedAt).getTime() - new Date(ordered[0].recordedAt).getTime()) / 86_400_000
        : 1);
      const completeness = round(Math.min(1, points.length / spanDays), 2);
      const percentChange = first != null && latest != null && Math.abs(first) > 0.001
        ? round(((latest - first) / Math.abs(first)) * 100, 1) : null;
      const explanation = values.length < 3
        ? `Insufficient ${period} history for a directional trend (${values.length} measurements; at least 3 are needed).`
        : `${indicator.label} ${direction} from ${first} to ${latest} ${indicator.unit} over ${period}; ${values.length} measurements, ${Math.round(completeness * 100)}% day coverage. This describes a pattern, not a medical finding.`;
      return {
        indicator: indicator.key, label: indicator.label, unit: indicator.unit, period,
        measurementCount: values.length, expectedDays: days,
        completeness, startingValue: first, latestValue: latest,
        average: values.length ? round(average(values)) : null,
        percentChange, direction, explanation,
      };
    });
  });
}

function detectAnomalies(records: HealthRecord[], now: number): AnomalyResult[] {
  const ordered = [...records].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const candidates: Array<Omit<AnomalyResult, "repeated" | "severity" | "explanation">> = [];
  for (const indicator of INDICATORS) {
    const prior: number[] = [];
    for (const record of ordered) {
      const value = indicator.value(record);
      if (value == null || !Number.isFinite(value)) continue;
      if (prior.length >= MIN_BASELINE_POINTS && new Date(record.recordedAt).getTime() >= now - 90 * 86_400_000) {
        const center = median(prior);
        const deviations = prior.map((item) => Math.abs(item - center));
        const mad = median(deviations);
        const q1 = percentile(prior, 0.25);
        const q3 = percentile(prior, 0.75);
        const iqr = q3 - q1;
        const sd = standardDeviation(prior, average(prior));
        const robustScale = mad > 0 ? mad * 1.4826 : sd;
        const score = robustScale > 0 ? Math.abs(value - center) / robustScale : 0;
        const outsideIqr = iqr > 0 && (value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr);
        const anomalous = score >= 3.5 || outsideIqr || (robustScale === 0 && value !== center);
        if (anomalous) {
          const method = score >= 3.5 || robustScale === 0 ? "ROBUST_Z_SCORE" : "INTERQUARTILE_RANGE";
          const spread = robustScale > 0 ? robustScale * 3 : iqr > 0 ? iqr * 1.5 : Math.max(0.1, Math.abs(center) * 0.05);
          candidates.push({
            indicator: indicator.key, label: indicator.label, unit: indicator.unit,
            actualValue: round(value), expectedMinimum: round(center - spread), expectedMaximum: round(center + spread),
            method, deviationScore: round(score), timestamp: new Date(record.recordedAt).toISOString(), sourceRecordId: record.id,
          });
        }
      }
      prior.push(value);
    }
  }
  return candidates.map((candidate, index) => {
    const previousForIndicator = candidates.slice(0, index).filter((item) => item.indicator === candidate.indicator);
    const repeated = previousForIndicator.length >= 1;
    const severity: AnomalyResult["severity"] = candidate.deviationScore >= 6 ? "HIGH" : repeated || candidate.deviationScore >= 4.5 ? "MODERATE" : "LOW";
    return {
      ...candidate, repeated, severity,
      explanation: `${candidate.label} (${candidate.actualValue} ${candidate.unit}) fell outside the astronaut's prior personal distribution (${candidate.expectedMinimum}–${candidate.expectedMaximum} ${candidate.unit}) using ${candidate.method.replaceAll("_", " ")}. Statistical deviation only; not a medical threshold.` + (repeated ? " Similar deviations were observed earlier in this period." : ""),
    };
  });
}

function pearson(pairs: Array<[number, number]>): number | null {
  if (pairs.length < 4) return null;
  const xs = pairs.map(([x]) => x);
  const ys = pairs.map(([, y]) => y);
  const xMean = average(xs);
  const yMean = average(ys);
  const numerator = pairs.reduce((sum, [x, y]) => sum + (x - xMean) * (y - yMean), 0);
  const denominator = Math.sqrt(xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0) * ys.reduce((sum, y) => sum + (y - yMean) ** 2, 0));
  return denominator === 0 ? null : numerator / denominator;
}

function correlationPairs(records: HealthRecord[], left: Indicator, right: Indicator): Array<[number, number]> {
  return records.flatMap((record) => {
    const x = left.value(record);
    const y = right.value(record);
    return x == null || y == null ? [] : [[x, y] as [number, number]];
  });
}

function buildPatterns(records: HealthRecord[], trends: TrendResult[], anomalies: AnomalyResult[]): PatternResult[] {
  const result: PatternResult[] = [];
  const missionTrends = (indicator: string) => trends.find((trend) => trend.indicator === indicator && trend.period === "mission");
  const sleep = missionTrends("sleepDuration");
  const stress = missionTrends("stressLevel");
  const sleepQuality = missionTrends("sleepQuality");
  const heartRate = missionTrends("heartRate");
  const sleepStressCorrelation = pearson(correlationPairs(records, INDICATORS.find((x) => x.key === "sleepDuration")!, INDICATORS.find((x) => x.key === "stressLevel")!));
  if (sleep && stress && sleep.measurementCount >= 4 && stress.measurementCount >= 4 && sleep.direction === "decreasing" && stress.direction === "increasing" && sleepStressCorrelation != null && sleepStressCorrelation < -0.4) {
    result.push({
      category: "SLEEP_STRESS", priority: "MODERATE", indicators: ["sleepDuration", "stressLevel"],
      startDate: records[0]?.recordedAt ? new Date(records[0].recordedAt).toISOString() : null,
      endDate: records.at(-1)?.recordedAt ? new Date(records.at(-1)!.recordedAt).toISOString() : null,
      reliability: round(Math.min(0.85, 0.45 + sleep.measurementCount / 40), 2),
      evidence: [`Sleep duration moved ${sleep.startingValue}→${sleep.latestValue} hours.`, `Self-reported stress moved ${stress.startingValue}→${stress.latestValue}/5.`, `Paired-measure correlation r=${round(sleepStressCorrelation)} across ${Math.min(sleep.measurementCount, stress.measurementCount)} records.`],
      explanation: "Sleep duration and reported stress changed in opposite directions in the available paired records. The association does not establish that either caused the other.",
      suggestedFollowUp: "Review the time series with the astronaut and qualified mission medical support.",
    });
  }
  if (heartRate && sleepQuality && heartRate.measurementCount >= 4 && sleepQuality.measurementCount >= 4 && heartRate.direction === "increasing" && sleepQuality.direction === "decreasing") {
    result.push({
      category: "CARDIOVASCULAR_SLEEP", priority: "MODERATE", indicators: ["heartRate", "sleepQuality"],
      startDate: records[0]?.recordedAt ? new Date(records[0].recordedAt).toISOString() : null,
      endDate: records.at(-1)?.recordedAt ? new Date(records.at(-1)!.recordedAt).toISOString() : null,
      reliability: round(Math.min(0.8, 0.4 + Math.min(heartRate.measurementCount, sleepQuality.measurementCount) / 40), 2),
      evidence: [`Heart rate moved ${heartRate.startingValue}→${heartRate.latestValue} BPM.`, `Sleep quality moved ${sleepQuality.startingValue}→${sleepQuality.latestValue}/5.`],
      explanation: "Heart rate increased while self-reported sleep quality decreased across the mission records. This co-occurrence does not establish causation or medical risk.",
      suggestedFollowUp: "Review the measurements, context, and collection quality with qualified mission medical support.",
    });
  }
  const repeatedGroups = new Map<string, AnomalyResult[]>();
  for (const anomaly of anomalies) repeatedGroups.set(anomaly.indicator, [...(repeatedGroups.get(anomaly.indicator) ?? []), anomaly]);
  for (const [indicator, group] of repeatedGroups) {
    if (group.length < 2) continue;
    result.push({
      category: "REPEATED_DEVIATION", priority: group.some((item) => item.severity === "HIGH") ? "HIGH" : "MODERATE",
      indicators: [indicator], startDate: group[0].timestamp, endDate: group.at(-1)!.timestamp,
      reliability: round(Math.min(0.9, 0.5 + group.length / 10), 2),
      evidence: group.slice(-4).map((item) => `${item.timestamp}: ${item.actualValue} ${item.unit}, expected personal range ${item.expectedMinimum}–${item.expectedMaximum} ${item.unit}.`),
      explanation: `${group.length} statistically unusual ${group[0].label.toLowerCase()} readings were found against earlier personal observations.`,
      suggestedFollowUp: "Confirm the readings and review them with qualified mission medical support; this pattern does not replace configured Phase 3 alerts.",
    });
  }
  if (anomalies.length && records.length >= MIN_BASELINE_POINTS) {
    const last = records.at(-1)!;
    const priorAnomalies = anomalies.filter((item) => new Date(item.timestamp).getTime() < new Date(last.recordedAt).getTime());
    const currentAnomalies = anomalies.filter((item) => new Date(item.timestamp).getTime() === new Date(last.recordedAt).getTime());
    if (priorAnomalies.length && !currentAnomalies.length) {
      result.push({
        category: "RECOVERY", priority: "LOW", indicators: [...new Set(priorAnomalies.map((item) => item.indicator))],
        startDate: priorAnomalies.at(-1)?.timestamp ?? null, endDate: new Date(last.recordedAt).toISOString(),
        reliability: 0.45,
        evidence: [`${priorAnomalies.length} earlier statistical deviation(s) were detected.`, "No new anomaly was detected in the latest recorded check-in."],
        explanation: "The latest record did not repeat previously detected statistical deviations. This is a descriptive change, not a clinical recovery determination.",
        suggestedFollowUp: "Continue routine monitoring and interpret the values with their measurement context.",
      });
    }
  }
  return result;
}

function forecastIndicator(records: HealthRecord[], indicator: Indicator): ForecastResult | null {
  const entries = valuesFor(records, indicator).sort((a, b) => new Date(a.record.recordedAt).getTime() - new Date(b.record.recordedAt).getTime());
  const uniqueDays = new Set(entries.map(({ record }) => new Date(record.recordedAt).toISOString().slice(0, 10)));
  if (entries.length < MIN_FORECAST_POINTS || uniqueDays.size < 7) return null;
  const origin = new Date(entries[0].record.recordedAt).getTime();
  const xs = entries.map(({ record }) => (new Date(record.recordedAt).getTime() - origin) / 86_400_000);
  const ys = entries.map(({ value }) => value);
  const xMean = average(xs);
  const yMean = average(ys);
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  if (denominator === 0) return null;
  const slope = xs.reduce((sum, x, index) => sum + (x - xMean) * (ys[index] - yMean), 0) / denominator;
  const intercept = yMean - slope * xMean;
  const residuals = ys.map((y, index) => y - (intercept + slope * xs[index]));
  const rmse = Math.sqrt(average(residuals.map((value) => value ** 2)));
  const span = Math.max(...ys) - Math.min(...ys);
  const relativeUncertainty = rmse / Math.max(span, Math.abs(yMean) * 0.05, 0.1);
  const confidence = round(Math.max(0, Math.min(0.8, 0.8 - relativeUncertainty)), 2);
  if (confidence < 0.25) return null;
  const lastX = xs.at(-1)!;
  const nextX = lastX + FORECAST_DAYS;
  const projectedValue = intercept + slope * nextX;
  const interval = Math.max(0.1, 1.96 * rmse * Math.sqrt(1 + 1 / entries.length + (nextX - xMean) ** 2 / denominator));
  const projectedDate = new Date(new Date(entries.at(-1)!.record.recordedAt).getTime() + FORECAST_DAYS * 86_400_000);
  return {
    indicator: indicator.key, label: indicator.label, unit: indicator.unit, method: "LINEAR_REGRESSION",
    projectedDate: projectedDate.toISOString(), projectedValue: round(projectedValue),
    lowerBound: round(projectedValue - interval), upperBound: round(projectedValue + interval),
    confidence, sourcePoints: entries.length,
    sourceStart: new Date(entries[0].record.recordedAt).toISOString(),
    sourceEnd: new Date(entries.at(-1)!.record.recordedAt).toISOString(),
    explanation: `Illustrative ${FORECAST_DAYS}-day linear projection from ${entries.length} measurements. The shaded range reflects residual-based uncertainty; the observed trend may not continue. This is not a predicted health outcome.`,
  };
}

function buildForecasts(records: HealthRecord[]): ForecastResult[] {
  return INDICATORS.flatMap((indicator) => {
    if (!["heartRate", "systolicBP", "sleepDuration", "sleepQuality", "stressLevel"].includes(indicator.key)) return [];
    const forecast = forecastIndicator(records, indicator);
    return forecast ? [forecast] : [];
  });
}

function buildObservations(
  baselines: BaselineResult[], trends: TrendResult[], anomalies: AnomalyResult[],
  patterns: PatternResult[], forecasts: ForecastResult[], phase3Status?: AssessmentStatus | null,
): RiskObservation[] {
  const observations: RiskObservation[] = [];
  for (const pattern of patterns) observations.push({
    category: pattern.category, priority: pattern.priority, indicators: pattern.indicators,
    evidence: pattern.evidence, explanation: pattern.explanation, reliability: pattern.reliability,
    suggestedFollowUp: pattern.suggestedFollowUp, phase3Status: phase3Status ?? null,
  });
  const repeated = anomalies.filter((item) => item.repeated);
  if (repeated.length) observations.push({
    category: "REPEATED_STATISTICAL_DEVIATION",
    priority: repeated.some((item) => item.severity === "HIGH") ? "HIGH" : "MODERATE",
    indicators: [...new Set(repeated.map((item) => item.indicator))],
    evidence: repeated.map((item) => `${item.label}=${item.actualValue} ${item.unit} (${item.method}; ${item.timestamp})`),
    explanation: "Several measurements differ from earlier personal observations. These are statistical flags, not medical thresholds.",
    reliability: round(Math.min(0.9, 0.5 + repeated.length / 10), 2),
    suggestedFollowUp: "Verify the observations and review them with qualified mission medical support.",
    phase3Status: phase3Status ?? null,
  });
  const insufficient = baselines.filter((baseline) => baseline.count > 0 && !baseline.sufficient);
  if (insufficient.length) observations.push({
    category: "LIMITED_PERSONAL_HISTORY", priority: "LOW",
    indicators: insufficient.map((baseline) => baseline.indicator),
    evidence: insufficient.map((baseline) => `${baseline.label}: ${baseline.count}/${baseline.minimumRequired} observations for a personal baseline.`),
    explanation: "Personal baselines are withheld where the configurable minimum history requirement is not met.",
    reliability: 0.25,
    suggestedFollowUp: "Continue recording measurements where available; do not interpret missing history as normal values.",
    phase3Status: phase3Status ?? null,
  });
  const directional = forecasts.filter((forecast) => forecast.confidence >= 0.5);
  if (directional.length) observations.push({
    category: "PROJECTION_WITH_UNCERTAINTY", priority: "LOW",
    indicators: directional.map((forecast) => forecast.indicator),
    evidence: directional.map((forecast) => `${forecast.label}: ${forecast.projectedValue} ${forecast.unit} around ${new Date(forecast.projectedDate).toLocaleDateString()} (interval ${forecast.lowerBound}–${forecast.upperBound}, ${Math.round(forecast.confidence * 100)}% reliability).`),
    explanation: "Short-term projections extend observed statistical patterns and are uncertain; they do not assert future health outcomes.",
    reliability: round(average(directional.map((forecast) => forecast.confidence))),
    suggestedFollowUp: "Use projections only as a prompt to review the underlying observations and context.",
    phase3Status: phase3Status ?? null,
  });
  return observations;
}

export function generateHealthIntelligence(
  inputRecords: HealthRecord[],
  options: { now?: Date; phase3Status?: AssessmentStatus | null } = {},
): HealthIntelligenceReport {
  const records = [...inputRecords].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const now = options.now?.getTime() ?? Date.now();
  const baselines = buildBaselines(records);
  const trends = buildTrends(records, now);
  const anomalies = detectAnomalies(records, now);
  const patterns = buildPatterns(records, trends, anomalies);
  const forecasts = buildForecasts(records);
  const observations = buildObservations(baselines, trends, anomalies, patterns, forecasts, options.phase3Status);
  const missing = baselines.filter((baseline) => baseline.count === 0).map((baseline) => baseline.label);
  return {
    generatedAt: new Date(now).toISOString(), recordCount: records.length,
    simulatedRecordCount: records.filter((record) => record.isSimulated).length,
    dateRange: { start: records[0] ? new Date(records[0].recordedAt).toISOString() : null, end: records.at(-1) ? new Date(records.at(-1)!.recordedAt).toISOString() : null },
    baselines, trends, anomalies, patterns, forecasts, observations,
    limitations: [
      "All generated statistics describe recorded data and are not diagnoses or medically validated thresholds.",
      "Personal baselines require at least five observations per indicator; forecasts require at least seven points across seven days.",
      "Correlation and co-occurrence do not establish causation. Missing measurements reduce coverage and reliability.",
      ...(missing.length ? [`No historical observations are available for: ${missing.join(", ")}.`] : []),
    ],
  };
}
