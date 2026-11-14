// Crew Care — Recommendation Engine (Phase 3)
// Maps assessment findings to practical, non-diagnostic guidance.
// Never generates medication instructions or medical diagnoses.

import type { AssessmentFinding, HealthCategory, Recommendation, RecommendationPriority } from "./assessment-types";

type RuleMap = Record<string, Recommendation>;

const RULE_RECOMMENDATIONS: RuleMap = {
  EMERGENCY_SYMPTOM: {
    title: "Follow Mission Emergency Procedure",
    description:
      "An emergency symptom has been reported. This requires immediate action under your mission emergency protocol.",
    priority: "URGENT",
    indicator: "symptoms",
    reason: "Emergency keyword detected in symptom report.",
    suggestedAction:
      "Follow your mission emergency medical procedure immediately. Contact your flight surgeon now. Do not use this application to manage an emergency.",
  },
  SERIOUS_SYMPTOM: {
    title: "Report Serious Symptom to Medical Officer",
    description: "A serious symptom has been reported that warrants medical review.",
    priority: "HIGH",
    indicator: "symptoms",
    reason: "Serious symptom keyword detected.",
    suggestedAction:
      "Complete a detailed symptom report and contact your mission medical officer. Monitor for worsening.",
  },
  HEART_RATE_CRITICAL: {
    title: "Heart Rate — Immediate Review",
    description: "Heart rate is outside the critical demo range.",
    priority: "URGENT",
    indicator: "heartRate",
    reason: "Heart rate outside critical demo threshold.",
    suggestedAction:
      "Contact your flight surgeon per mission protocol. Rest immediately. Do not perform strenuous activity.",
  },
  HEART_RATE_WARNING: {
    title: "Heart Rate — Medical Review Recommended",
    description: "Heart rate is outside the warning demo range.",
    priority: "HIGH",
    indicator: "heartRate",
    reason: "Heart rate outside warning demo threshold.",
    suggestedAction: "Rest and recheck. Report to medical officer if reading persists.",
  },
  HEART_RATE_ATTENTION: {
    title: "Heart Rate — Monitor Closely",
    description: "Heart rate is outside the normal demo range.",
    priority: "MEDIUM",
    indicator: "heartRate",
    reason: "Heart rate outside attention demo threshold.",
    suggestedAction: "Rest and recheck in 1–2 hours. Record in daily check-in.",
  },
  SYSTOLIC_BP_WARNING: {
    title: "Blood Pressure — Medical Review",
    description: "Systolic blood pressure is outside the warning demo range.",
    priority: "HIGH",
    indicator: "systolicBP",
    reason: "Systolic BP outside warning demo threshold.",
    suggestedAction: "Reduce physical activity. Recheck and report to medical officer.",
  },
  SYSTOLIC_BP_ATTENTION: {
    title: "Blood Pressure — Monitor",
    description: "Systolic blood pressure is outside the normal demo range.",
    priority: "MEDIUM",
    indicator: "systolicBP",
    reason: "Systolic BP outside attention demo threshold.",
    suggestedAction: "Recheck blood pressure and monitor at next check-in.",
  },
  SYSTOLIC_BP_CRITICAL: {
    title: "Blood Pressure — Immediate Action",
    description: "Systolic blood pressure is at critical demo level.",
    priority: "URGENT",
    indicator: "systolicBP",
    reason: "Systolic BP at critical demo threshold.",
    suggestedAction: "Contact flight surgeon immediately per mission protocol.",
  },
  OXYGEN_SAT_WARNING: {
    title: "Oxygen Saturation Low — Medical Review",
    description: "Oxygen saturation is below the warning demo threshold.",
    priority: "HIGH",
    indicator: "oxygenSat",
    reason: "SpO₂ below warning demo threshold.",
    suggestedAction: "Check sensor placement. Retest. Report to medical officer immediately.",
  },
  OXYGEN_SAT_CRITICAL: {
    title: "Oxygen Saturation Critical — Immediate Action",
    description: "Oxygen saturation is critically low per demo threshold.",
    priority: "URGENT",
    indicator: "oxygenSat",
    reason: "SpO₂ at critical demo threshold.",
    suggestedAction: "Contact flight surgeon now per mission emergency protocol.",
  },
  OXYGEN_SAT_ATTENTION: {
    title: "Oxygen Saturation — Recheck",
    description: "Oxygen saturation is slightly below the normal demo range.",
    priority: "MEDIUM",
    indicator: "oxygenSat",
    reason: "SpO₂ below attention demo threshold.",
    suggestedAction: "Recheck sensor placement and reading. Report if it persists.",
  },
  SLEEP_DURATION_ATTENTION: {
    title: "Review Sleep Schedule",
    description: "Sleep duration is outside the recommended demo range.",
    priority: "MEDIUM",
    indicator: "sleepDuration",
    reason: "Sleep below attention demo threshold.",
    suggestedAction: "Review your sleep schedule. Avoid stimulants before sleep periods.",
  },
  SLEEP_BELOW_6H_3DAYS: {
    title: "Sleep Deficit — Multi-Day",
    description: "Sleep has been below 6 hours for 3 or more consecutive days.",
    priority: "HIGH",
    indicator: "sleepDuration",
    reason: "Three or more consecutive days of insufficient sleep detected.",
    suggestedAction:
      "Discuss sleep challenges with your medical officer. Prioritise rest periods.",
  },
  SLEEP_TREND_FALLING: {
    title: "Declining Sleep Trend",
    description: "Sleep duration has been declining over recent days.",
    priority: "MEDIUM",
    indicator: "sleepDuration",
    reason: "Downward sleep trend detected across recent records.",
    suggestedAction: "Review and adjust sleep schedule. Discuss with medical officer if trend continues.",
  },
  BP_TREND_RISING: {
    title: "Rising Blood Pressure Trend",
    description: "Blood pressure has been rising over recent readings.",
    priority: "HIGH",
    indicator: "systolicBP",
    reason: "Upward blood pressure trend detected.",
    suggestedAction:
      "Monitor blood pressure closely. Reduce physical exertion. Report to medical officer.",
  },
  HR_TREND_RISING: {
    title: "Rising Heart Rate Trend",
    description: "Heart rate has been trending upward.",
    priority: "MEDIUM",
    indicator: "heartRate",
    reason: "Upward heart rate trend detected.",
    suggestedAction: "Rest and monitor. Report to medical officer if trend continues.",
  },
  FATIGUE_HIGH: {
    title: "Complete Wellbeing Check-In",
    description: "High fatigue level reported.",
    priority: "MEDIUM",
    indicator: "fatigueLevel",
    reason: "Self-reported severe fatigue.",
    suggestedAction: "Rest. Complete a psychological wellbeing check-in. Contact medical officer if fatigue persists.",
  },
  FATIGUE_PERSISTENT: {
    title: "Persistent Fatigue — Medical Review",
    description: "Severe fatigue has been reported for multiple consecutive days.",
    priority: "HIGH",
    indicator: "fatigueLevel",
    reason: "Three or more consecutive days of severe fatigue.",
    suggestedAction:
      "Discuss with your medical officer. Adjust work schedule if possible. Increase rest periods.",
  },
  HIGH_STRESS_POOR_SLEEP: {
    title: "Stress and Sleep Interaction",
    description: "High stress combined with poor sleep may compound health risks.",
    priority: "MEDIUM",
    indicator: "stressLevel",
    reason: "High stress and insufficient sleep detected simultaneously.",
    suggestedAction:
      "Complete a psychological wellbeing self-assessment. Discuss with medical officer.",
  },
  MULTI_CARDIO: {
    title: "Multiple Cardiovascular Indicators",
    description: "Several cardiovascular indicators are outside normal demo ranges.",
    priority: "HIGH",
    indicator: "heartRate",
    reason: "Multiple cardiovascular indicators simultaneously outside normal demo ranges.",
    suggestedAction:
      "Rest immediately. Report to medical officer. Avoid strenuous activity until reviewed.",
  },
  FATIGUE_MOOD_LOW: {
    title: "Psychological Wellbeing Check-In",
    description: "Fatigue and low mood reported together.",
    priority: "MEDIUM",
    indicator: "mood",
    reason: "Persistent fatigue combined with low mood.",
    suggestedAction:
      "Complete a psychological wellbeing check-in. Discuss with mission support or medical officer.",
  },
  STRESS_LEVEL_WARNING: {
    title: "High Stress — Wellbeing Check",
    description: "Stress level is at a warning demo level.",
    priority: "HIGH",
    indicator: "stressLevel",
    reason: "Self-reported stress outside warning demo range.",
    suggestedAction:
      "Notify your mission support contact. Consider a structured stress management session.",
  },
  STRESS_LEVEL_ATTENTION: {
    title: "Elevated Stress",
    description: "Stress level is elevated.",
    priority: "MEDIUM",
    indicator: "stressLevel",
    reason: "Self-reported stress outside attention demo range.",
    suggestedAction: "Complete a wellbeing self-assessment. Rest and monitor.",
  },
  BODY_TEMP_WARNING: {
    title: "Body Temperature — Monitor",
    description: "Body temperature is outside the warning demo range.",
    priority: "HIGH",
    indicator: "bodyTemp",
    reason: "Body temperature outside warning demo threshold.",
    suggestedAction: "Recheck temperature. Report to medical officer if reading persists.",
  },
  BLOOD_GLUCOSE_ATTENTION: {
    title: "Blood Glucose — Recheck",
    description: "Blood glucose is outside the normal demo range.",
    priority: "MEDIUM",
    indicator: "bloodGlucose",
    reason: "Blood glucose outside attention demo threshold.",
    suggestedAction: "Recheck fasting vs post-meal. Report to medical officer.",
  },
};

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3,
};

export function buildRecommendations(
  findings: AssessmentFinding[],
  flags: string[],
  hasEmergency: boolean,
  overallCategory: HealthCategory
): Recommendation[] {
  const seen = new Set<string>();
  const recs: Recommendation[] = [];

  // Emergency always first
  if (hasEmergency) {
    const r = RULE_RECOMMENDATIONS["EMERGENCY_SYMPTOM"];
    if (r) { recs.push(r); seen.add("EMERGENCY_SYMPTOM"); }
    return recs; // No other recommendations needed during emergency
  }

  // Map each flag to a recommendation
  for (const flag of flags) {
    if (seen.has(flag)) continue;
    const rec = RULE_RECOMMENDATIONS[flag];
    if (rec) {
      recs.push(rec);
      seen.add(flag);
    }
  }

  // Add generic follow-up for WARNING/CRITICAL with no specific rec
  if ((overallCategory === "WARNING" || overallCategory === "CRITICAL") && recs.length === 0) {
    recs.push({
      title: "Contact Mission Medical Officer",
      description: "A warning-level condition has been detected.",
      priority: "HIGH",
      indicator: undefined,
      reason: "Overall assessment is at WARNING or CRITICAL level.",
      suggestedAction:
        "Contact your flight surgeon per your mission medical protocol.",
    });
  }

  // Sort by priority descending
  return recs.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
}
