// Crew Care — Assessment Rules (Phase 3)
//
// All thresholds are DEMONSTRATION VALUES for the hackathon prototype.
// They are NOT medically validated NASA limits.
// Mark thresholds clearly as illustrative until reviewed by qualified medical personnel.

import type { HealthCategory } from "./assessment-types";

export interface ThresholdRule {
  key: string;
  label: string;
  unit: string;
  indicator: string;
  attentionMin?: number;
  attentionMax?: number;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
}

export interface TrendRule {
  key: string;
  indicator: string;
  label: string;
  direction: "rising" | "falling";
  minPoints: number;
  consecutiveDays?: number;
  thresholdValue?: number;
  category: HealthCategory;
  explanation: string;
}

export interface ComboRule {
  key: string;
  indicators: string[];
  label: string;
  category: HealthCategory;
  explanation: string;
}

// ── Single-indicator threshold rules ─────────────────────────────────────────
// DEMO VALUES — not medically validated

export const THRESHOLD_RULES: ThresholdRule[] = [
  {
    key: "HEART_RATE",
    indicator: "heartRate",
    label: "Heart Rate",
    unit: "BPM",
    attentionMin: 50, attentionMax: 100,
    warningMin: 45,   warningMax: 115,
    criticalMin: 40,  criticalMax: 130,
  },
  {
    key: "SYSTOLIC_BP",
    indicator: "systolicBP",
    label: "Systolic BP",
    unit: "mmHg",
    attentionMin: 90, attentionMax: 130,
    warningMin: 85,   warningMax: 145,
    criticalMin: 80,  criticalMax: 160,
  },
  {
    key: "DIASTOLIC_BP",
    indicator: "diastolicBP",
    label: "Diastolic BP",
    unit: "mmHg",
    attentionMin: 60, attentionMax: 85,
    warningMin: 55,   warningMax: 95,
    criticalMin: 50,  criticalMax: 110,
  },
  {
    key: "BODY_TEMP",
    indicator: "bodyTemp",
    label: "Body Temperature",
    unit: "°C",
    attentionMin: 36.1, attentionMax: 37.2,
    warningMin: 35.5,   warningMax: 37.8,
    criticalMin: 35.0,  criticalMax: 38.5,
  },
  {
    key: "BLOOD_GLUCOSE",
    indicator: "bloodGlucose",
    label: "Blood Glucose",
    unit: "mg/dL",
    attentionMin: 70, attentionMax: 110,
    warningMin: 65,   warningMax: 140,
    criticalMin: 60,  criticalMax: 180,
  },
  {
    key: "OXYGEN_SAT",
    indicator: "oxygenSat",
    label: "Oxygen Saturation",
    unit: "SpO₂ %",
    attentionMin: 95,
    warningMin: 92,
    criticalMin: 90,
  },
  {
    key: "SLEEP_DURATION",
    indicator: "sleepDuration",
    label: "Sleep Duration",
    unit: "hours",
    attentionMin: 6, attentionMax: 10,
    warningMin: 5,   warningMax: 11,
    criticalMin: 4,  criticalMax: 12,
  },
  {
    key: "STRESS_LEVEL",
    indicator: "stressLevel",
    label: "Stress Level",
    unit: "/5",
    attentionMax: 3,
    warningMax: 4,
    criticalMax: 5,
  },
  {
    key: "ANXIETY_LEVEL",
    indicator: "anxietyLevel",
    label: "Anxiety Level",
    unit: "/5",
    attentionMax: 3,
    warningMax: 4,
    criticalMax: 5,
  },
  {
    key: "SLEEP_QUALITY",
    indicator: "sleepQuality",
    label: "Sleep Quality",
    unit: "/5",
    attentionMin: 3,
    warningMin: 2,
    criticalMin: 1,
  },
];

// ── Trend rules ───────────────────────────────────────────────────────────────

export const TREND_RULES: TrendRule[] = [
  {
    key: "BP_TREND_RISING",
    indicator: "systolicBP",
    label: "Rising Blood Pressure",
    direction: "rising",
    minPoints: 3,
    category: "ATTENTION",
    explanation: "Systolic blood pressure has been rising over recent readings.",
  },
  {
    key: "SLEEP_TREND_FALLING",
    indicator: "sleepDuration",
    label: "Declining Sleep",
    direction: "falling",
    minPoints: 3,
    category: "ATTENTION",
    explanation: "Sleep duration has been declining over recent days.",
  },
  {
    key: "HR_TREND_RISING",
    indicator: "heartRate",
    label: "Rising Heart Rate",
    direction: "rising",
    minPoints: 3,
    category: "ATTENTION",
    explanation: "Heart rate has been trending upward across recent readings.",
  },
  {
    key: "SLEEP_BELOW_6H_3DAYS",
    indicator: "sleepDuration",
    label: "Sleep Deficit Streak",
    direction: "falling",
    minPoints: 3,
    consecutiveDays: 3,
    thresholdValue: 6,
    category: "WARNING",
    explanation: "Sleep below 6 hours for 3 or more consecutive days.",
  },
];

// ── Combination rules ─────────────────────────────────────────────────────────

export const COMBO_RULES: ComboRule[] = [
  {
    key: "HIGH_STRESS_POOR_SLEEP",
    indicators: ["stressLevel", "sleepDuration"],
    label: "Stress & Sleep Interaction",
    category: "ATTENTION",
    explanation:
      "High stress combined with insufficient sleep may compound psychological and physical health risks.",
  },
  {
    key: "MULTI_CARDIO",
    indicators: ["heartRate", "systolicBP", "diastolicBP"],
    label: "Multiple Cardiovascular Indicators",
    category: "WARNING",
    explanation:
      "Multiple cardiovascular indicators are outside normal demo ranges simultaneously.",
  },
  {
    key: "FATIGUE_MOOD_LOW",
    indicators: ["fatigueLevel", "mood"],
    label: "Fatigue and Low Mood",
    category: "ATTENTION",
    explanation:
      "Persistent fatigue combined with low mood may indicate psychological wellbeing concerns.",
  },
];

// ── Emergency keywords ────────────────────────────────────────────────────────

export const EMERGENCY_KEYWORDS = [
  "chest pain", "chest tightness", "chest pressure",
  "cannot breathe", "can't breathe", "stopped breathing",
  "breathing difficulty", "severe breathing",
  "collapsed", "unconscious", "unresponsive",
  "severe bleeding", "stroke", "seizure",
  "vision loss", "sudden blindness",
  "vision changes", "cognitive fog", "confusion",
];

export const SERIOUS_KEYWORDS = [
  "severe headache", "dizziness", "numbness", "weakness",
  "palpitation", "shortness of breath", "difficulty breathing",
  "nausea and vomiting",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function evaluateThreshold(
  value: number,
  rule: ThresholdRule
): HealthCategory {
  // Critical check
  if (
    (rule.criticalMin !== undefined && value < rule.criticalMin) ||
    (rule.criticalMax !== undefined && value > rule.criticalMax)
  ) return "CRITICAL";
  // Warning check
  if (
    (rule.warningMin !== undefined && value < rule.warningMin) ||
    (rule.warningMax !== undefined && value > rule.warningMax)
  ) return "WARNING";
  // Attention check
  if (
    (rule.attentionMin !== undefined && value < rule.attentionMin) ||
    (rule.attentionMax !== undefined && value > rule.attentionMax)
  ) return "ATTENTION";
  return "NORMAL";
}

export function categoryToStatus(cat: HealthCategory): "GREEN" | "AMBER" | "RED" {
  if (cat === "CRITICAL" || cat === "WARNING") return "RED";
  if (cat === "ATTENTION") return "AMBER";
  return "GREEN";
}

export function mergeCategory(a: HealthCategory, b: HealthCategory): HealthCategory {
  const rank: Record<HealthCategory, number> = {
    NORMAL: 0, ATTENTION: 1, WARNING: 2, CRITICAL: 3,
  };
  return rank[a] >= rank[b] ? a : b;
}
