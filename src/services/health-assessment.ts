// Crew Care - Health Assessment Service (v2)
//
// IMPORTANT SAFETY NOTICE:
// This service uses DETERMINISTIC RULE-BASED LOGIC only.
// It does NOT make medical diagnoses.
// It does NOT provide medical clearance.
// It does NOT replace a qualified flight surgeon.
// All thresholds below are DEMONSTRATION VALUES for hackathon purposes.
// They must be reviewed and validated by a qualified medical professional before clinical use.
// For serious symptoms (chest pain, collapse, severe breathing difficulty, unconsciousness),
// ALWAYS direct to mission emergency procedures and qualified medical support immediately.

import type { HealthRecord, AssessmentResult, VitalThreshold } from "@/types";

// ── Demonstration thresholds — NOT medically validated ───────────────────────
// AMBER = outside normal demo range (monitor / follow up)
// RED   = outside critical demo range (requires immediate attention)
// These are illustrative starting points only.
export const DEMO_THRESHOLDS: Record<string, VitalThreshold & { critMin?: number; critMax?: number }> = {
  heartRate:    { warnMin: 50,   warnMax: 100,  critMin: 40,   critMax: 130, label: "Heart Rate",          unit: "BPM"    },
  systolicBP:   { warnMin: 90,   warnMax: 130,  critMin: 80,   critMax: 160, label: "Systolic BP",         unit: "mmHg"   },
  diastolicBP:  { warnMin: 60,   warnMax: 85,   critMin: 50,   critMax: 110, label: "Diastolic BP",        unit: "mmHg"   },
  bodyTemp:     { warnMin: 36.1, warnMax: 37.2, critMin: 35.0, critMax: 38.5,label: "Body Temperature",    unit: "°C"     },
  bloodGlucose: { warnMin: 70,   warnMax: 110,  critMin: 60,   critMax: 180, label: "Blood Glucose",       unit: "mg/dL"  },
  oxygenSat:    { warnMin: 95,   warnMax: 100,  critMin: 90,   critMax: 100, label: "Oxygen Saturation",   unit: "SpO₂ %" },
  sleepDuration:{ warnMin: 6,    warnMax: 10,   critMin: 4,    critMax: 12,  label: "Sleep Duration",      unit: "hours"  },
};

// ── Emergency symptoms — always trigger RED regardless of measurements ────────
const EMERGENCY_KEYWORDS = [
  "chest pain", "chest tightness", "chest pressure",
  "cannot breathe", "can't breathe", "stopped breathing", "breathing difficulty",
  "collapsed", "unconscious", "unresponsive",
  "severe bleeding", "stroke", "seizure",
  "vision loss", "sudden blindness",
];

const SERIOUS_KEYWORDS = [
  "dizziness", "severe headache", "numbness", "weakness", "palpitation",
  "shortness of breath", "difficulty breathing", "nausea and vomiting",
];

// ── Symptom severity mapping ─────────────────────────────────────────────────
export const SYMPTOM_OPTIONS = [
  { id: "headache",             label: "Headache",               serious: false },
  { id: "dizziness",            label: "Dizziness",              serious: false },
  { id: "nausea",               label: "Nausea",                 serious: false },
  { id: "unusual_fatigue",      label: "Unusual fatigue",        serious: false },
  { id: "breathing_difficulty", label: "Breathing difficulty",   serious: true  },
  { id: "chest_pain",           label: "Chest pain",             serious: true  },
  { id: "vision_changes",       label: "Vision changes",         serious: true  },
  { id: "blurred_vision",       label: "Blurred vision",         serious: true  },
  { id: "facial_puffiness",     label: "Facial puffiness",       serious: false },
  { id: "dizzy_on_standing",    label: "Dizzy on standing",      serious: false },
  { id: "muscle_discomfort",    label: "Muscle discomfort",      serious: false },
  { id: "loss_of_appetite",     label: "Loss of appetite",       serious: false },
  { id: "sleep_disruption",     label: "Sleep disruption",       serious: false },
  { id: "cognitive_fog",        label: "Cognitive fog / confusion", serious: true },
  { id: "back_pain",            label: "Back / spine pain",      serious: false },
];

// ── Internal helpers ─────────────────────────────────────────────────────────

type Level = "ok" | "warn" | "critical";

function checkThreshold(value: number, key: string): Level {
  const t = DEMO_THRESHOLDS[key];
  if (!t) return "ok";
  if (
    (t.critMin !== undefined && value < t.critMin) ||
    (t.critMax !== undefined && value > t.critMax)
  ) return "critical";
  if (
    (t.warnMin !== undefined && value < t.warnMin) ||
    (t.warnMax !== undefined && value > t.warnMax)
  ) return "warn";
  return "ok";
}

function detectTrend(
  records: HealthRecord[],
  key: keyof HealthRecord
): "rising" | "falling" | "stable" | "insufficient" {
  const vals = records
    .slice(-6)
    .map((r) => r[key] as number | null | undefined)
    .filter((v): v is number => v != null);
  if (vals.length < 3) return "insufficient";
  let rises = 0, falls = 0;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] > vals[i - 1] + 0.5) rises++;
    else if (vals[i] < vals[i - 1] - 0.5) falls++;
  }
  if (rises >= vals.length - 2) return "rising";
  if (falls >= vals.length - 2) return "falling";
  return "stable";
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ── Personal baseline comparison ─────────────────────────────────────────────
export interface BaselineComparison {
  metric: string;
  label: string;
  unit: string;
  current: number;
  average: number;
  change: number;    // current - average
  changePct: number; // % change
  historyCount: number;
  note: string;
}

export function compareToBaseline(
  latest: HealthRecord,
  history: HealthRecord[]
): BaselineComparison[] {
  const comparisons: BaselineComparison[] = [];
  const metrics: Array<{ key: keyof HealthRecord; threshKey: string }> = [
    { key: "heartRate", threshKey: "heartRate" },
    { key: "systolicBP", threshKey: "systolicBP" },
    { key: "bodyTemp", threshKey: "bodyTemp" },
    { key: "oxygenSat", threshKey: "oxygenSat" },
    { key: "sleepDuration", threshKey: "sleepDuration" },
  ];

  for (const { key, threshKey } of metrics) {
    const current = latest[key] as number | null | undefined;
    if (current == null) continue;
    const t = DEMO_THRESHOLDS[threshKey];
    if (!t) continue;

    const histVals = history
      .slice(0, -1) // exclude the latest record itself
      .map((r) => r[key] as number | null | undefined)
      .filter((v): v is number => v != null);

    if (histVals.length < 2) {
      comparisons.push({
        metric: key,
        label: t.label,
        unit: t.unit,
        current,
        average: current,
        change: 0,
        changePct: 0,
        historyCount: histVals.length,
        note: "Insufficient history to calculate personal baseline.",
      });
      continue;
    }

    const average = avg(histVals);
    const change = current - average;
    const changePct = average !== 0 ? (change / average) * 100 : 0;

    let note = "";
    if (Math.abs(changePct) < 3) {
      note = "Similar to your recent average.";
    } else if (change > 0) {
      note = `${Math.abs(changePct).toFixed(0)}% above your recent average. Demo threshold comparison only.`;
    } else {
      note = `${Math.abs(changePct).toFixed(0)}% below your recent average. Demo threshold comparison only.`;
    }

    comparisons.push({
      metric: key,
      label: t.label,
      unit: t.unit,
      current,
      average: parseFloat(average.toFixed(1)),
      change: parseFloat(change.toFixed(1)),
      changePct: parseFloat(changePct.toFixed(1)),
      historyCount: histVals.length,
      note,
    });
  }
  return comparisons;
}

// ── Main assessment function ──────────────────────────────────────────────────
export function assessHealth(
  latest: HealthRecord,
  history: HealthRecord[] = []
): AssessmentResult {
  const flags: string[] = [];
  const emergencyMessages: string[] = [];
  const criticalMessages: string[] = [];
  const warningMessages: string[] = [];
  let hasEmergency = false;

  // 1. Emergency symptom check — ALWAYS first, ALWAYS overrides everything
  const symptomText = (latest.symptoms ?? "").toLowerCase();
  for (const kw of EMERGENCY_KEYWORDS) {
    if (symptomText.includes(kw)) {
      hasEmergency = true;
      flags.push("EMERGENCY_SYMPTOM");
      emergencyMessages.push(
        `EMERGENCY: "${kw}" reported. Follow your mission emergency medical procedure IMMEDIATELY. ` +
        `Contact your flight surgeon now. Do not delay.`
      );
      break; // one emergency message is enough
    }
  }

  // 2. Serious (non-emergency) symptom check
  if (!hasEmergency) {
    for (const kw of SERIOUS_KEYWORDS) {
      if (symptomText.includes(kw)) {
        flags.push("SERIOUS_SYMPTOM");
        warningMessages.push(
          `Serious symptom reported: "${kw}". ` +
          `Monitor closely and report to your medical officer if it worsens.`
        );
        break;
      }
    }
  }

  // 3. Threshold checks on measured vitals
  const vitalKeys: Array<[keyof HealthRecord, string]> = [
    ["heartRate", "heartRate"],
    ["systolicBP", "systolicBP"],
    ["diastolicBP", "diastolicBP"],
    ["bodyTemp", "bodyTemp"],
    ["bloodGlucose", "bloodGlucose"],
    ["oxygenSat", "oxygenSat"],
    ["sleepDuration", "sleepDuration"],
  ];

  for (const [field, key] of vitalKeys) {
    const val = latest[field] as number | null | undefined;
    if (val == null) continue;
    const level = checkThreshold(val, key);
    const t = DEMO_THRESHOLDS[key];
    if (level === "critical") {
      flags.push(`${key.toUpperCase()}_CRITICAL`);
      criticalMessages.push(
        `${t.label} is ${val} ${t.unit} — outside the critical demo range ` +
        `(${t.critMin ?? ""}–${t.critMax ?? ""} ${t.unit}). ` +
        `Demo threshold only — not a validated medical limit.`
      );
    } else if (level === "warn") {
      flags.push(`${key.toUpperCase()}_WARN`);
      warningMessages.push(
        `${t.label} is ${val} ${t.unit} — outside the normal demo range ` +
        `(${t.warnMin ?? ""}–${t.warnMax ?? ""} ${t.unit}).`
      );
    }
  }

  // 4. Fatigue level check
  const severeFatigue = ["EXHAUSTED", "VERY_TIRED"];
  if (latest.fatigue && severeFatigue.includes(latest.fatigue)) {
    flags.push("FATIGUE_HIGH");
    warningMessages.push(`Self-reported fatigue: ${latest.fatigue.replace("_", " ")}. Consider rest and medical review.`);
  }

  // 5. Trend analysis — only when sufficient history exists
  if (history.length >= 3) {
    const bpTrend = detectTrend(history, "systolicBP");
    if (bpTrend === "rising") {
      flags.push("BP_TREND_UP");
      warningMessages.push("Systolic blood pressure has been rising over recent readings.");
    }

    const sleepTrend = detectTrend(history, "sleepDuration");
    if (sleepTrend === "falling") {
      flags.push("SLEEP_TREND_DOWN");
      warningMessages.push("Sleep duration has been declining over recent days.");
    }

    const hrTrend = detectTrend(history, "heartRate");
    if (hrTrend === "rising") {
      flags.push("HR_TREND_UP");
      warningMessages.push("Heart rate has been trending upward across recent readings.");
    }

    // 3 consecutive nights below 6 h
    const recentSleep = history
      .slice(-3)
      .map((r) => r.sleepDuration)
      .filter((v): v is number => v != null);
    if (recentSleep.length === 3 && recentSleep.every((v) => v < 6)) {
      if (!flags.includes("SLEEP_BELOW_6H")) {
        flags.push("SLEEP_BELOW_6H");
        warningMessages.push("Sleep has been below 6 hours for 3 or more consecutive days.");
      }
    }

    // 3 consecutive days of severe fatigue
    const recentFatigue = history.slice(-3).map((r) => r.fatigue).filter(Boolean);
    if (
      recentFatigue.length >= 3 &&
      recentFatigue.every((f) => severeFatigue.includes(f!))
    ) {
      if (!flags.includes("FATIGUE_PERSISTENT")) {
        flags.push("FATIGUE_PERSISTENT");
        warningMessages.push("Severe fatigue reported for 3 or more consecutive days.");
      }
    }
  }

  // 6. Determine final status
  let status: AssessmentResult["status"];
  if (hasEmergency || criticalMessages.length > 0) {
    status = "RED";
  } else if (warningMessages.length > 0) {
    status = "AMBER";
  } else {
    status = "GREEN";
  }

  const allDetails = [...emergencyMessages, ...criticalMessages, ...warningMessages];

  const summaryMap: Record<typeof status, string> = {
    GREEN: "No configured warnings identified in available measurements.",
    AMBER: `${warningMessages.length + criticalMessages.length} condition(s) flagged for follow-up.`,
    RED: hasEmergency
      ? "Emergency symptom reported. Follow mission emergency procedure immediately."
      : "Critical reading detected. Seek medical attention per mission protocol.",
  };

  const guidanceMap: Record<typeof status, string> = {
    GREEN:
      "No action required based on current readings. Continue daily check-ins. " +
      "These results are based on demonstration thresholds and are not a medical clearance.",
    AMBER:
      "Review the flagged items with your medical officer. Monitor closely. " +
      "If conditions worsen, increase check-in frequency. " +
      "These are demonstration thresholds — consult mission medical personnel for clinical decisions.",
    RED: hasEmergency
      ? "EMERGENCY: Follow your mission emergency medical procedure now. " +
        "Contact your flight surgeon immediately. Do not use this software to manage an emergency."
      : "Seek immediate medical attention per your mission emergency medical protocol. " +
        "Contact your flight surgeon. Do not delay escalation.",
  };

  return {
    status,
    summary: summaryMap[status],
    details:
      allDetails.length > 0
        ? allDetails.join(" | ")
        : "All checked measurements within demonstration thresholds.",
    guidance: guidanceMap[status],
    flags: [...new Set(flags)],
    hasEmergency,
  };
}

// ── Alert generation helper ───────────────────────────────────────────────────
export interface AlertSpec {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

export function deriveAlerts(result: AssessmentResult, latest: HealthRecord): AlertSpec[] {
  const alerts: AlertSpec[] = [];

  if (result.hasEmergency) {
    alerts.push({
      severity: "CRITICAL",
      title: "Emergency Symptom Reported",
      message:
        "Crew member has reported a symptom requiring emergency response. " +
        "Follow mission emergency medical procedure immediately.",
      metric: "symptoms",
    });
    return alerts; // one alert is enough for an emergency
  }

  for (const flag of result.flags) {
    if (flag === "SYSTOLICBP_CRITICAL" || flag === "BP_TREND_UP") {
      alerts.push({
        severity: flag === "SYSTOLICBP_CRITICAL" ? "CRITICAL" : "HIGH",
        title: "Blood Pressure Needs Attention",
        message:
          flag === "BP_TREND_UP"
            ? "Systolic blood pressure has been rising over recent readings. Demo threshold."
            : `Systolic BP ${latest.systolicBP} mmHg — outside critical demo range.`,
        metric: "systolicBP",
        value: latest.systolicBP ?? undefined,
        threshold: DEMO_THRESHOLDS.systolicBP.warnMax,
      });
    }
    if (flag === "OXYGENSSAT_CRITICAL" || flag === "OXYGENSAT_CRITICAL" || flag === "OXYGENSAT_WARN") {
      alerts.push({
        severity: flag.endsWith("CRITICAL") ? "CRITICAL" : "HIGH",
        title: "Oxygen Saturation Below Threshold",
        message: `SpO₂ ${latest.oxygenSat}% — demo threshold is ${DEMO_THRESHOLDS.oxygenSat.warnMin}%.`,
        metric: "oxygenSat",
        value: latest.oxygenSat ?? undefined,
        threshold: DEMO_THRESHOLDS.oxygenSat.warnMin,
      });
    }
    if (flag === "SLEEP_BELOW_6H" || flag === "SLEEP_TREND_DOWN") {
      alerts.push({
        severity: "MEDIUM",
        title: "Sleep Duration Below Threshold",
        message: "Sleep duration has been below 6 hours. Insufficient rest may affect performance.",
        metric: "sleepDuration",
        value: latest.sleepDuration ?? undefined,
        threshold: 6,
      });
    }
    if (flag === "FATIGUE_PERSISTENT") {
      alerts.push({
        severity: "MEDIUM",
        title: "Persistent Severe Fatigue",
        message: "Severe fatigue reported for 3 or more consecutive days.",
        metric: "fatigue",
      });
    }
    if (flag === "HEARTRATE_CRITICAL" || flag === "HR_TREND_UP") {
      alerts.push({
        severity: flag === "HEARTRATE_CRITICAL" ? "HIGH" : "MEDIUM",
        title: "Heart Rate Needs Attention",
        message:
          flag === "HR_TREND_UP"
            ? "Heart rate has been trending upward over recent readings."
            : `Heart rate ${latest.heartRate} BPM — outside critical demo range.`,
        metric: "heartRate",
        value: latest.heartRate ?? undefined,
        threshold: DEMO_THRESHOLDS.heartRate.warnMax,
      });
    }
  }

  return alerts;
}
