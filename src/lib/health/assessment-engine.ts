// Crew Care — Health Assessment Engine (Phase 3)
//
// SAFETY NOTICE:
// This engine uses deterministic rule-based logic only.
// It does NOT make medical diagnoses.
// It does NOT provide medical clearance.
// All thresholds are DEMONSTRATION VALUES — not validated NASA/clinical limits.
// For emergencies, always direct to mission emergency procedures and qualified medical support.

import type {
  RawMeasurements, EngineResult, AssessmentFinding,
  IndicatorResult, HealthCategory,
} from "./assessment-types";
import {
  THRESHOLD_RULES, TREND_RULES, COMBO_RULES,
  EMERGENCY_KEYWORDS, SERIOUS_KEYWORDS,
  evaluateThreshold, mergeCategory,
} from "./assessment-rules";
import { computeCompleteness } from "./health-validator";
import { buildRecommendations } from "./recommendation-engine";

type HistoryRow = Pick<
  RawMeasurements,
  "heartRate" | "systolicBP" | "diastolicBP" | "bodyTemp" |
  "bloodGlucose" | "oxygenSat" | "sleepDuration" | "mood" |
  "fatigueLevel" | "stressLevel"
>;

// ── Trend detection ──────────────────────────────────────────────────────────

function detectTrend(
  history: HistoryRow[],
  field: keyof HistoryRow
): "rising" | "falling" | "stable" | "insufficient" {
  const vals = history
    .slice(-6)
    .map((r) => r[field] as number | null | undefined)
    .filter((v): v is number => v != null);
  if (vals.length < 3) return "insufficient";
  let rises = 0, falls = 0;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] > vals[i - 1] + 0.5) rises++;
    else if (vals[i] < vals[i - 1] - 0.5) falls++;
  }
  const need = vals.length - 2;
  if (rises >= need) return "rising";
  if (falls >= need) return "falling";
  return "stable";
}

function hasConsecutiveBelowThreshold(
  history: HistoryRow[],
  field: keyof HistoryRow,
  threshold: number,
  count: number
): boolean {
  const recent = history
    .slice(-count)
    .map((r) => r[field] as number | null | undefined)
    .filter((v): v is number => v != null);
  return recent.length >= count && recent.every((v) => v < threshold);
}

// ── Main engine function ─────────────────────────────────────────────────────

export function runAssessment(
  current: RawMeasurements,
  history: HistoryRow[] = []
): EngineResult {
  const findings: AssessmentFinding[] = [];
  const indicatorResults: Record<string, IndicatorResult> = {};
  const flags: string[] = [];
  let overallCategory: HealthCategory = "NORMAL";
  let hasEmergency = false;

  // 1. Emergency symptom check — always first, always overrides
  const symptomText = (current.symptoms ?? "").toLowerCase();
  for (const kw of EMERGENCY_KEYWORDS) {
    if (symptomText.includes(kw)) {
      hasEmergency = true;
      flags.push("EMERGENCY_SYMPTOM");
      findings.push({
        indicator: "symptoms",
        label: "Emergency Symptom",
        category: "CRITICAL",
        ruleKey: "EMERGENCY_SYMPTOM",
        explanation:
          `EMERGENCY: "${kw}" reported. Follow your mission emergency medical procedure IMMEDIATELY. ` +
          `Contact your flight surgeon now. Do not delay.`,
      });
      overallCategory = "CRITICAL";
      break;
    }
  }

  // 2. Serious (non-emergency) symptom check
  if (!hasEmergency) {
    for (const kw of SERIOUS_KEYWORDS) {
      if (symptomText.includes(kw)) {
        flags.push("SERIOUS_SYMPTOM");
        findings.push({
          indicator: "symptoms",
          label: "Serious Symptom Reported",
          category: "ATTENTION",
          ruleKey: "SERIOUS_SYMPTOM",
          explanation: `Serious symptom reported: "${kw}". Monitor closely and report to medical officer if it worsens.`,
        });
        overallCategory = mergeCategory(overallCategory, "ATTENTION");
        break;
      }
    }
  }

  // 3. Threshold checks on numeric indicators
  for (const rule of THRESHOLD_RULES) {
    const rawVal = current[rule.indicator as keyof RawMeasurements];
    if (rawVal == null) {
      indicatorResults[rule.indicator] = {
        indicator: rule.indicator,
        label: rule.label,
        value: null,
        unit: rule.unit,
        category: "NORMAL",
        ruleKey: "NO_DATA",
        explanation: "No measurement provided for this indicator.",
      };
      continue;
    }
    const val = Number(rawVal);
    const cat = evaluateThreshold(val, rule);
    indicatorResults[rule.indicator] = {
      indicator: rule.indicator,
      label: rule.label,
      value: val,
      unit: rule.unit,
      category: cat,
      ruleKey: `${rule.key}_${cat}`,
      threshold: cat !== "NORMAL"
        ? (val > (rule.attentionMax ?? Infinity) ? (rule.attentionMax ?? rule.warningMax ?? rule.criticalMax) : (rule.attentionMin ?? rule.warningMin ?? rule.criticalMin))
        : undefined,
      explanation:
        cat === "NORMAL"
          ? `${rule.label} (${val} ${rule.unit}) is within the normal demo range.`
          : `${rule.label} is ${val} ${rule.unit} — ${cat.toLowerCase()} demo threshold exceeded. ` +
            `These are illustrative demo values, not validated medical limits.`,
    };

    if (cat !== "NORMAL") {
      flags.push(`${rule.key}_${cat}`);
      findings.push({
        indicator: rule.indicator,
        label: rule.label,
        category: cat,
        ruleKey: `${rule.key}_${cat}`,
        value: val,
        unit: rule.unit,
        explanation: indicatorResults[rule.indicator].explanation,
      });
      overallCategory = mergeCategory(overallCategory, cat);
    }
  }

  // 4. Trend rules
  if (history.length >= 3) {
    for (const tRule of TREND_RULES) {
      if (tRule.consecutiveDays && tRule.thresholdValue) {
        // consecutive-days streak check
        const hit = hasConsecutiveBelowThreshold(
          history,
          tRule.indicator as keyof HistoryRow,
          tRule.thresholdValue,
          tRule.consecutiveDays
        );
        if (hit && !flags.includes(tRule.key)) {
          flags.push(tRule.key);
          findings.push({
            indicator: tRule.indicator,
            label: tRule.label,
            category: tRule.category,
            ruleKey: tRule.key,
            explanation: tRule.explanation,
          });
          overallCategory = mergeCategory(overallCategory, tRule.category);
        }
      } else {
        // direction trend
        const trend = detectTrend(history, tRule.indicator as keyof HistoryRow);
        if (trend === tRule.direction && !flags.includes(tRule.key)) {
          flags.push(tRule.key);
          findings.push({
            indicator: tRule.indicator,
            label: tRule.label,
            category: tRule.category,
            ruleKey: tRule.key,
            explanation: tRule.explanation,
          });
          overallCategory = mergeCategory(overallCategory, tRule.category);
        }
      }
    }
  }

  // 5. Combination rules
  for (const cRule of COMBO_RULES) {
    // All listed indicators must be in ATTENTION or worse
    const allFlagged = cRule.indicators.every((ind) => {
      const r = indicatorResults[ind];
      return r && r.category !== "NORMAL";
    });
    if (allFlagged && !flags.includes(cRule.key)) {
      flags.push(cRule.key);
      findings.push({
        indicator: cRule.indicators.join("+"),
        label: cRule.label,
        category: cRule.category,
        ruleKey: cRule.key,
        explanation: cRule.explanation,
      });
      overallCategory = mergeCategory(overallCategory, cRule.category);
    }
  }

  // 6. Fatigue check (string-based)
  const severeFatigue = ["EXHAUSTED", "VERY_TIRED"];
  if (current.fatigueLevel && severeFatigue.includes(current.fatigueLevel)) {
    flags.push("FATIGUE_HIGH");
    findings.push({
      indicator: "fatigueLevel",
      label: "High Fatigue",
      category: "ATTENTION",
      ruleKey: "FATIGUE_HIGH",
      explanation: `Self-reported fatigue: ${current.fatigueLevel.replace("_", " ")}. Consider rest and medical review.`,
    });
    overallCategory = mergeCategory(overallCategory, "ATTENTION");
  }

  // 7. Persistent fatigue trend (3 consecutive days)
  if (history.length >= 3) {
    const recentFatigue = history.slice(-3).map((r) => r.fatigueLevel).filter(Boolean);
    if (
      recentFatigue.length >= 3 &&
      recentFatigue.every((f) => severeFatigue.includes(f!)) &&
      !flags.includes("FATIGUE_PERSISTENT")
    ) {
      flags.push("FATIGUE_PERSISTENT");
      findings.push({
        indicator: "fatigueLevel",
        label: "Persistent Severe Fatigue",
        category: "WARNING",
        ruleKey: "FATIGUE_PERSISTENT",
        explanation: "Severe fatigue reported for 3 or more consecutive days.",
      });
      overallCategory = mergeCategory(overallCategory, "WARNING");
    }
  }

  // 8. Stale data / missing data check
  const completeness = computeCompleteness(current);
  if (completeness < 0.3) {
    findings.push({
      indicator: "dataCompleteness",
      label: "Limited Data",
      category: "NORMAL",
      ruleKey: "LOW_COMPLETENESS",
      explanation: `Only ${Math.round(completeness * 100)}% of key indicators provided. Assessment confidence is reduced.`,
    });
  }

  // 9. Build summaries
  const statusMap: Record<HealthCategory, "GREEN" | "AMBER" | "RED"> = {
    NORMAL: "GREEN", ATTENTION: "AMBER", WARNING: "RED", CRITICAL: "RED",
  };
  const overallStatus = hasEmergency ? "RED" : statusMap[overallCategory];

  const summaryMap: Record<HealthCategory, string> = {
    NORMAL: "No configured warnings identified in available measurements.",
    ATTENTION: `${findings.filter((f) => f.category === "ATTENTION").length} indicator(s) flagged for attention.`,
    WARNING: "One or more warning-level conditions detected. Medical review recommended.",
    CRITICAL: hasEmergency
      ? "Emergency symptom reported. Follow mission emergency procedure immediately."
      : "Critical-level reading detected. Immediate medical attention required.",
  };

  const guidanceMap: Record<HealthCategory, string> = {
    NORMAL:
      "No action required based on current readings. Continue daily check-ins. " +
      "These results are based on demonstration thresholds and do not constitute medical clearance.",
    ATTENTION:
      "Review the flagged indicators with your medical officer. Monitor closely. " +
      "If conditions worsen, increase check-in frequency.",
    WARNING:
      "Seek medical review per your mission health protocol. Contact your flight surgeon. " +
      "These are demonstration thresholds — consult qualified medical personnel for clinical decisions.",
    CRITICAL: hasEmergency
      ? "EMERGENCY: Follow your mission emergency medical procedure now. " +
        "Contact your flight surgeon immediately. Do not use this software to manage an emergency."
      : "Seek immediate medical attention per your mission emergency medical protocol. " +
        "Contact your flight surgeon. Do not delay escalation.",
  };

  const details = findings.length > 0
    ? findings.map((f) => f.explanation).join(" | ")
    : "All checked measurements within demonstration thresholds.";

  // 10. Confidence score: based on completeness + no missing critical indicators
  const criticalIndicators = ["heartRate", "oxygenSat"];
  const critPresent = criticalIndicators.filter((key) => key === "heartRate" ? current.heartRate != null : current.oxygenSat != null).length;
  const confidence = parseFloat(
    ((completeness * 0.6 + (critPresent / criticalIndicators.length) * 0.4)).toFixed(2)
  );

  // 11. Recommendations
  const recommendations = buildRecommendations(findings, flags, hasEmergency, overallCategory);

  return {
    overallCategory,
    overallStatus,
    summary: summaryMap[overallCategory],
    details,
    guidance: guidanceMap[overallCategory],
    flags: [...new Set(flags)],
    hasEmergency,
    dataCompleteness: completeness,
    confidence,
    findings,
    recommendations,
    indicatorResults,
  };
}
