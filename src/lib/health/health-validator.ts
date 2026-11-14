// Crew Care — Health Input Validator (Phase 3)

import type { RawMeasurements } from "./assessment-types";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  cleaned: RawMeasurements;
}

const NUMERIC_RANGES = {
  heartRate:    [20, 300],
  systolicBP:   [50, 300],
  diastolicBP:  [30, 200],
  bodyTemp:     [30.0, 45.0],
  bloodGlucose: [20, 600],
  oxygenSat:    [50, 100],
  sleepDuration:[0, 24],
  sleepQuality: [1, 5],
  stressLevel:  [1, 5],
  anxietyLevel: [1, 5],
} satisfies Record<keyof Pick<RawMeasurements,
  "heartRate" | "systolicBP" | "diastolicBP" | "bodyTemp" | "bloodGlucose" | "oxygenSat" |
  "sleepDuration" | "sleepQuality" | "stressLevel" | "anxietyLevel"
>, [number, number]>;
type NumericKey = keyof typeof NUMERIC_RANGES;

export function validateMeasurements(raw: RawMeasurements): ValidationResult {
  const errors: ValidationError[] = [];
  const cleaned = { ...raw };

  if (!raw.userId || raw.userId.trim() === "") {
    errors.push({ field: "userId", message: "userId is required" });
  }

  for (const field of Object.keys(NUMERIC_RANGES) as NumericKey[]) {
    const [min, max] = NUMERIC_RANGES[field];
    const val = raw[field];
    if (val === undefined || val === null) continue;
    const num = Number(val);
    if (isNaN(num)) {
      errors.push({ field, message: `${field} must be a number` });
      cleaned[field] = null;
      continue;
    }
    if (num < min || num > max) {
      errors.push({ field, message: `${field} outside plausible range ${min}–${max}` });
      cleaned[field] = null;
    } else {
      cleaned[field] = num;
    }
  }

  // At least one measurement must be present
  const measureKeys = Object.keys(NUMERIC_RANGES) as NumericKey[];
  const hasAny = measureKeys.some((k) => cleaned[k] != null);
  const hasSymptoms = !!cleaned.symptoms?.trim();
  const hasMood = !!cleaned.mood?.trim();
  if (!hasAny && !hasSymptoms && !hasMood) {
    errors.push({ field: "general", message: "At least one measurement or symptom is required" });
  }

  return { valid: errors.length === 0, errors, cleaned };
}

// How complete is this submission? 0–1
export function computeCompleteness(raw: RawMeasurements): number {
  const keys = [
    "heartRate", "systolicBP", "diastolicBP", "bodyTemp",
    "bloodGlucose", "oxygenSat", "sleepDuration", "mood",
  ] as const satisfies readonly (keyof RawMeasurements)[];
  const present = keys.filter((k) => raw[k] != null).length;
  return parseFloat((present / keys.length).toFixed(2));
}
