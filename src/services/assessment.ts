// Crew Care - Health Assessment Service
// IMPORTANT: This service uses deterministic rule-based logic only.
// It does NOT make medical diagnoses. All thresholds are demonstration values
// and must be reviewed by a qualified medical professional before clinical use.
// For serious symptoms (chest pain, collapse, severe breathing difficulty),
// always direct to mission emergency procedures.

import type { HealthRecord, AssessmentResult, VitalThreshold } from "@/types";

// DEMO THRESHOLDS — not medically validated, for demonstration only
export const THRESHOLDS: Record<string, VitalThreshold> = {
  heartRate:   { warnMin: 50, warnMax: 100, min: 40, max: 130, label: "Heart Rate",           unit: "BPM"   },
  systolicBP:  { warnMin: 90, warnMax: 130, min: 80, max: 160, label: "Systolic BP",          unit: "mmHg"  },
  diastolicBP: { warnMin: 60, warnMax: 85,  min: 50, max: 110, label: "Diastolic BP",         unit: "mmHg"  },
  bodyTemp:    { warnMin: 36.1, warnMax: 37.2, min: 35.0, max: 38.5, label: "Body Temp",      unit: "°C"    },
  bloodGlucose:{ warnMin: 70, warnMax: 110, min: 60, max: 180, label: "Blood Glucose",        unit: "mg/dL" },
  oxygenSat:   { warnMin: 95, max: 100,     min: 90, label: "Oxygen Saturation",              unit: "SpO2 %" },
  sleepDuration:{ warnMin: 6, warnMax: 10,  min: 4,  max: 12,  label: "Sleep Duration",       unit: "hours" },
};

const EMERGENCY_SYMPTOMS = [
  "chest pain", "chest tightness", "cannot breathe", "stopped breathing",
  "collapsed", "unconscious", "unresponsive", "severe bleeding",
  "stroke", "seizure",
];

function checkThreshold(value: number, key: string): "ok" | "warn" | "critical" {
  const t = THRESHOLDS[key];
  if (!t) return "ok";
  if ((t.min !== undefined && value < t.min) || (t.max !== undefined && value > t.max)) return "critical";
  if ((t.warnMin !== undefined && value < t.warnMin) || (t.warnMax !== undefined && value > t.warnMax)) return "warn";
  return "ok";
}

function detectTrend(records: HealthRecord[], key: keyof HealthRecord): "rising" | "falling" | "stable" {
  const vals = records
    .slice(-5)
    .map((r) => r[key] as number | null | undefined)
    .filter((v): v is number => v != null);
  if (vals.length < 3) return "stable";
  let rises = 0, falls = 0;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] > vals[i - 1]) rises++;
    else if (vals[i] < vals[i - 1]) falls++;
  }
  if (rises >= vals.length - 2) return "rising";
  if (falls >= vals.length - 2) return "falling";
  return "stable";
}

export function assessHealth(
  latest: HealthRecord,
  history: HealthRecord[] = []
): AssessmentResult {
  const flags: string[] = [];
  const warnings: string[] = [];
  const criticals: string[] = [];
  let hasEmergency = false;

  // Emergency symptom check — always first
  const symptomText = (latest.symptoms ?? "").toLowerCase();
  for (const kw of EMERGENCY_SYMPTOMS) {
    if (symptomText.includes(kw)) {
      hasEmergency = true;
      flags.push("EMERGENCY_SYMPTOM");
      criticals.push(
        `EMERGENCY: Reported symptom "${kw}" requires immediate escalation. ` +
        `Follow your mission emergency medical procedure NOW. Contact flight surgeon immediately.`
      );
      break;
    }
  }

  // Vital checks
  const checks: Array<[keyof HealthRecord, string]> = [
    ["heartRate", "heartRate"],
    ["systolicBP", "systolicBP"],
    ["diastolicBP", "diastolicBP"],
    ["bodyTemp", "bodyTemp"],
    ["bloodGlucose", "bloodGlucose"],
    ["oxygenSat", "oxygenSat"],
    ["sleepDuration", "sleepDuration"],
  ];

  for (const [field, key] of checks) {
    const val = latest[field] as number | null | undefined;
    if (val == null) continue;
    const result = checkThreshold(val, key);
    const t = THRESHOLDS[key];
    if (result === "critical") {
      flags.push(`${key.toUpperCase()}_CRITICAL`);
      criticals.push(
        `${t.label} is ${val} ${t.unit} — outside the critical demo threshold ` +
        `(${t.min ?? ""}–${t.max ?? ""} ${t.unit}). This is a demo threshold, not a validated medical limit.`
      );
    } else if (result === "warn") {
      flags.push(`${key.toUpperCase()}_WARN`);
      warnings.push(
        `${t.label} is ${val} ${t.unit} — outside the normal demo range ` +
        `(${t.warnMin ?? ""}–${t.warnMax ?? ""} ${t.unit}).`
      );
    }
  }

  // Trend analysis
  if (history.length >= 3) {
    const bpTrend = detectTrend(history, "systolicBP");
    if (bpTrend === "rising") {
      flags.push("BP_TREND_UP");
      warnings.push("Systolic blood pressure has been rising over the last several readings.");
    }
    const sleepTrend = detectTrend(history, "sleepDuration");
    if (sleepTrend === "falling") {
      flags.push("SLEEP_TREND_DOWN");
      warnings.push("Sleep duration has been declining over recent days.");
    }
    const hrTrend = detectTrend(history, "heartRate");
    if (hrTrend === "rising") {
      flags.push("HR_TREND_UP");
      warnings.push("Heart rate has been trending upward across recent readings.");
    }

    // Sleep below threshold 3 consecutive days
    const recentSleep = history.slice(-3).map((r) => r.sleepDuration).filter((v): v is number => v != null);
    if (recentSleep.length === 3 && recentSleep.every((v) => v < 6)) {
      flags.push("SLEEP_BELOW_6H");
      warnings.push("Sleep has been below 6 hours for 3 or more consecutive days.");
    }

    // Persistent fatigue
    const fatigueLevels = ["EXHAUSTED", "VERY_TIRED"];
    const recentFatigue = history.slice(-3).map((r) => r.fatigue).filter(Boolean);
    if (recentFatigue.length >= 3 && recentFatigue.every((f) => fatigueLevels.includes(f!))) {
      flags.push("FATIGUE_PERSISTENT");
      warnings.push("Severe fatigue has been reported for 3 or more consecutive days.");
    }
  }

  // Determine status
  let status: AssessmentResult["status"];
  if (hasEmergency || criticals.length > 0) {
    status = "RED";
  } else if (warnings.length > 0) {
    status = "AMBER";
  } else {
    status = "GREEN";
  }

  const allIssues = [...criticals, ...warnings];

  const summaryMap: Record<typeof status, string> = {
    GREEN: "No configured warnings identified in available measurements.",
    AMBER: `${warnings.length} condition(s) need attention or follow-up.`,
    RED: "Urgent condition or critical reading requires immediate attention.",
  };

  const guidanceMap: Record<typeof status, string> = {
    GREEN:
      "No action required based on current readings. Continue daily check-ins. " +
      "These results reflect demo thresholds and are not medical clearance.",
    AMBER:
      "Review the flagged items with your medical officer. Monitor closely. " +
      "Increase check-in frequency if conditions worsen. These are demo thresholds — consult mission medical personnel.",
    RED:
      "Seek immediate medical attention per your mission emergency medical protocol. " +
      "Contact your flight surgeon now. Do not delay escalation.",
  };

  return {
    status,
    summary: summaryMap[status],
    details: allIssues.length > 0 ? allIssues.join(" | ") : "All checked measurements within demo thresholds.",
    guidance: guidanceMap[status],
    flags,
    hasEmergency,
  };
}
