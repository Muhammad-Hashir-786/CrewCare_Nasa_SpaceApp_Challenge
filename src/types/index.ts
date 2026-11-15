export type AssessmentStatus = "GREEN" | "AMBER" | "RED";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type Role = "ASTRONAUT" | "MISSION_CONTROL" | "MEDICAL_OFFICER";
export type MoodLevel = "VERY_LOW" | "LOW" | "NEUTRAL" | "GOOD" | "EXCELLENT";
export type FatigueLevel = "EXHAUSTED" | "VERY_TIRED" | "TIRED" | "MODERATE" | "REFRESHED";
export type MeasurementSource = "MANUAL_ENTRY" | "SIMULATED_SENSOR" | "WEARABLE";

export interface HealthRecord {
  id: string;
  userId: string;
  recordedAt: Date | string;
  heartRate?: number | null;
  systolicBP?: number | null;
  diastolicBP?: number | null;
  bodyTemp?: number | null;
  bloodGlucose?: number | null;
  oxygenSat?: number | null;
  sleepDuration?: number | null;
  heartRateVariabilityMs?: number | null;
  respiratoryRatePerMin?: number | null;
  orthostaticResponseBpm?: number | null;
  exerciseMinutes?: number | null;
  weightKg?: number | null;
  fluidIntakeLitres?: number | null;
  visionSymptoms?: string | null;
  acuityChange?: string | null;
  reactionTimeMs?: number | null;
  radiationDoseRateMsvPerDay?: number | null;
  cumulativeRadiationMsv?: number | null;
  cabinCo2Ppm?: number | null;
  sleepQuality?: number | null;
  mood?: MoodLevel | null;
  fatigue?: FatigueLevel | null;
  stressLevel?: number | null;
  anxietyLevel?: number | null;
  symptoms?: string | null;
  symptomSeverity?: string | null;
  notes?: string | null;
  isMeasured: boolean;
  measurementSource?: MeasurementSource;
  isSimulated?: boolean;
}

export interface Astronaut {
  id: string;
  name: string;
  callsign: string;
  rank?: string | null;
  specialty?: string | null;
  healthRecords?: HealthRecord[];
  latestAssessment?: Assessment | null;
  activeAlerts?: Alert[];
  isSimulated?: boolean;
}

export interface Assessment {
  id: string;
  userId: string;
  status: AssessmentStatus;
  summary: string;
  details?: string | null;
  guidance?: string | null;
  flags: string[];
  createdAt: Date | string;
}

export interface Alert {
  id: string;
  userId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  metric?: string | null;
  value?: number | null;
  threshold?: number | null;
  acknowledgedAt?: Date | string | null;
  acknowledgedBy?: string | null;
  createdAt: Date | string;
}

export interface AssessmentResult {
  status: AssessmentStatus;
  summary: string;
  details: string;
  guidance: string;
  flags: string[];
  hasEmergency: boolean;
}

export interface VitalThreshold {
  min?: number;
  max?: number;
  warnMin?: number;
  warnMax?: number;
  label: string;
  unit: string;
}
