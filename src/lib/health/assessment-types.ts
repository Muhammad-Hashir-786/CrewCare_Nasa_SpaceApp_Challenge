// Crew Care — Health Assessment Types (Phase 3)
// All categories and thresholds are DEMONSTRATION VALUES only.

export type HealthCategory = "NORMAL" | "ATTENTION" | "WARNING" | "CRITICAL";
export type MeasurementSource = "MANUAL_ENTRY" | "SIMULATED_SENSOR" | "WEARABLE";
export type RecommendationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type RecommendationStatus = "ACTIVE" | "ACKNOWLEDGED" | "DISMISSED";

export interface RawMeasurements {
  userId: string;
  recordedAt?: string;
  source?: MeasurementSource;
  // Cardiovascular
  heartRate?: number | null;
  systolicBP?: number | null;
  diastolicBP?: number | null;
  // Metabolic
  bloodGlucose?: number | null;
  oxygenSat?: number | null;
  // Temperature
  bodyTemp?: number | null;
  // Sleep
  sleepDuration?: number | null;
  sleepQuality?: number | null;   // 1-5
  // Psychological
  mood?: string | null;
  stressLevel?: number | null;    // 1-5
  fatigueLevel?: string | null;
  anxietyLevel?: number | null;   // 1-5
  // Freeform
  symptoms?: string | null;
  symptomSeverity?: "MILD" | "MODERATE" | "SEVERE" | null;
  notes?: string | null;
}

export interface IndicatorResult {
  indicator: string;
  label: string;
  value: number | string | null;
  unit: string;
  category: HealthCategory;
  ruleKey: string;
  threshold?: number;
  explanation: string;
}

export interface AssessmentFinding {
  indicator: string;
  label: string;
  category: HealthCategory;
  ruleKey: string;
  value?: number;
  unit?: string;
  threshold?: number;
  explanation: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: RecommendationPriority;
  indicator?: string;
  reason: string;
  suggestedAction: string;
}

export interface EngineResult {
  overallCategory: HealthCategory;
  overallStatus: "GREEN" | "AMBER" | "RED";
  summary: string;
  details: string;
  guidance: string;
  flags: string[];
  hasEmergency: boolean;
  dataCompleteness: number;   // 0–1
  confidence: number;         // 0–1
  findings: AssessmentFinding[];
  recommendations: Recommendation[];
  indicatorResults: Record<string, IndicatorResult>;
}
