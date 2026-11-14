"use client";

import { useState } from "react";
import {
  Heart, Activity, Moon, Zap,
  ArrowRight, ArrowLeft, Shield, AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAstronaut } from "@/lib/astronaut-context";
import { assessHealth, SYMPTOM_OPTIONS } from "@/services/health-assessment";
import type { HealthRecord, AssessmentResult } from "@/types";
import type { EngineResult } from "@/lib/health/assessment-types";

// ── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  // Section A — Vitals
  measurementSource: "MANUAL_ENTRY" | "WEARABLE";
  heartRate: string;
  systolicBP: string;
  diastolicBP: string;
  bodyTemp: string;
  bloodGlucose: string;
  oxygenSat: string;
  // Section B — Sleep
  sleepDuration: string;
  sleepQuality: number | null; // 1-5
  fatigue: string;
  // Section C — Mental
  mood: string;
  stressLevel: number | null; // 1-5
  anxietyLevel: number | null; // 1-5
  mentalNotes: string;
  // Section D — Symptoms
  selectedSymptoms: string[];
  symptomText: string;
  symptomSeverity: string;
  notes: string;
}

const INITIAL: FormState = {
  measurementSource: "MANUAL_ENTRY",
  heartRate: "", systolicBP: "", diastolicBP: "",
  bodyTemp: "", bloodGlucose: "", oxygenSat: "",
  sleepDuration: "", sleepQuality: null, fatigue: "",
  mood: "", stressLevel: null, anxietyLevel: null, mentalNotes: "",
  selectedSymptoms: [], symptomText: "", symptomSeverity: "MILD", notes: "",
};

const MOOD_OPTIONS = [
  { v: "VERY_LOW", emoji: "😔", label: "Very Low" },
  { v: "LOW",      emoji: "😕", label: "Low" },
  { v: "NEUTRAL",  emoji: "😐", label: "Neutral" },
  { v: "GOOD",     emoji: "🙂", label: "Good" },
  { v: "EXCELLENT",emoji: "😊", label: "Excellent" },
];

const FATIGUE_OPTIONS = [
  { v: "EXHAUSTED",  label: "Exhausted" },
  { v: "VERY_TIRED", label: "Very Tired" },
  { v: "TIRED",      label: "Tired" },
  { v: "MODERATE",   label: "Moderate" },
  { v: "REFRESHED",  label: "Refreshed" },
];

const STEPS = ["Vitals", "Sleep", "Wellbeing", "Symptoms"];

// ── Validation ───────────────────────────────────────────────────────────────

function validateField(key: string, raw: string): string | null {
  if (raw === "") return null; // optional
  const v = parseFloat(raw);
  if (isNaN(v)) return "Must be a number";
  const ranges: Record<string, [number, number]> = {
    heartRate:    [20, 300],
    systolicBP:   [50, 300],
    diastolicBP:  [30, 200],
    bodyTemp:     [30, 45],
    bloodGlucose: [20, 600],
    oxygenSat:    [50, 100],
    sleepDuration:[0, 24],
  };
  const r = ranges[key];
  if (r && (v < r[0] || v > r[1])) return `Value outside plausible range (${r[0]}–${r[1]})`;
  return null;
}

// ── Shared styled elements ────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)",
  borderRadius: 7, color: "#edf8f8", fontSize: 13, outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, color: "var(--muted)",
  letterSpacing: "0.08em", textTransform: "uppercase",
  marginBottom: 4, fontFamily: "Manrope", fontWeight: 600,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const { astronaut, addHealthRecord } = useAstronaut();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setStr = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    const err = validateField(k, v);
    setErrors((e) => ({ ...e, [k]: err ?? undefined }));
  };

  const toggleSymptom = (id: string) =>
    setForm((f) => ({
      ...f,
      selectedSymptoms: f.selectedSymptoms.includes(id)
        ? f.selectedSymptoms.filter((s) => s !== id)
        : [...f.selectedSymptoms, id],
    }));

  // Check for emergency symptoms
  const hasEmergency =
    form.selectedSymptoms.some((id) => {
      const s = SYMPTOM_OPTIONS.find((o) => o.id === id);
      return s?.serious;
    }) ||
    ["chest pain", "cannot breathe", "collapsed", "unconscious", "stroke", "seizure"].some((kw) =>
      form.symptomText.toLowerCase().includes(kw)
    );

  const handleSubmit = async () => {
    setSaving(true);
    setSaveError(null);

    // Build the record
    const rec: HealthRecord = {
      id: "pending",
      userId: astronaut.id,
      recordedAt: new Date().toISOString(),
      heartRate:     form.heartRate    ? parseFloat(form.heartRate)    : null,
      systolicBP:    form.systolicBP   ? parseFloat(form.systolicBP)   : null,
      diastolicBP:   form.diastolicBP  ? parseFloat(form.diastolicBP)  : null,
      bodyTemp:      form.bodyTemp     ? parseFloat(form.bodyTemp)     : null,
      bloodGlucose:  form.bloodGlucose ? parseFloat(form.bloodGlucose) : null,
      oxygenSat:     form.oxygenSat    ? parseFloat(form.oxygenSat)    : null,
      sleepDuration: form.sleepDuration? parseFloat(form.sleepDuration): null,
      mood: (form.mood || null) as HealthRecord["mood"],
      fatigue: (form.fatigue || null) as HealthRecord["fatigue"],
      sleepQuality: form.sleepQuality,
      stressLevel: form.stressLevel,
      anxietyLevel: form.anxietyLevel,
      symptomSeverity: form.selectedSymptoms.length || form.symptomText.trim() ? form.symptomSeverity as "MILD" | "MODERATE" | "SEVERE" : null,
      symptoms: [
        ...form.selectedSymptoms.map((id) => SYMPTOM_OPTIONS.find((o) => o.id === id)?.label ?? id),
        form.symptomText,
      ].filter(Boolean).join(", ") || null,
      notes: [form.notes, form.mentalNotes].filter(Boolean).join(" | ") || null,
      isMeasured: true,
      measurementSource: form.measurementSource,
    };

    // Run local assessment immediately (works in demo mode without DB)
    const history = astronaut.healthRecords ?? [];
    const assessment = assessHealth(rec, history);

    // Also run the Phase 3 engine for richer findings + recommendations
    const phase3Raw = {
      userId: astronaut.id,
      source: form.measurementSource,
      heartRate: rec.heartRate ?? null,
      systolicBP: rec.systolicBP ?? null,
      diastolicBP: rec.diastolicBP ?? null,
      bodyTemp: rec.bodyTemp ?? null,
      bloodGlucose: rec.bloodGlucose ?? null,
      oxygenSat: rec.oxygenSat ?? null,
      sleepDuration: rec.sleepDuration ?? null,
      sleepQuality: form.sleepQuality,
      mood: form.mood || null,
      stressLevel: form.stressLevel,
      anxietyLevel: form.anxietyLevel,
      fatigueLevel: form.fatigue || null,
      symptoms: rec.symptoms ?? null,
      symptomSeverity: (rec.symptomSeverity as "MILD" | "MODERATE" | "SEVERE" | null) ?? null,
      notes: rec.notes ?? null,
    };
    // Try to persist via Phase 3 API (also persists to DB if configured)
    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(phase3Raw),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to save this check-in. Please try again.");
      }
      const body = await response.json();
      const savedRecord = body.record as HealthRecord | undefined;
      if (body.result) {
        const saved = body.result as EngineResult;
        assessment.status = saved.overallStatus;
        assessment.summary = saved.summary;
        assessment.details = saved.details;
        assessment.guidance = saved.guidance;
        assessment.flags = saved.flags;
        assessment.hasEmergency = saved.hasEmergency;
        if (savedRecord) {
          addHealthRecord(
            savedRecord,
            {
              id: body.assessmentId,
              userId: astronaut.id,
              status: saved.overallStatus,
              summary: saved.summary,
              details: saved.details,
              guidance: saved.guidance,
              flags: saved.flags,
              createdAt: savedRecord.recordedAt,
            },
            body.isSimulated === true,
          );
        }
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save this check-in. Please try again.");
      setSaving(false);
      return;
    }

    setResult(assessment);
    setSubmitted(true);
    setSaving(false);
  };

  const statusColor = result?.status === "GREEN" ? "#10b981"
    : result?.status === "AMBER" ? "#f59e0b" : "#ef4444";

  if (submitted && result) {
    return <AssessmentView result={result} statusColor={statusColor} onReset={() => { setSubmitted(false); setResult(null); setForm(INITIAL); setStep(0); }} />;
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <span className="section-kicker">ASTRONAUT PORTAL · {astronaut.callsign}</span>
        <h1 style={{ margin: 0, font: "500 24px Manrope" }}>Daily Health Check-In</h1>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          Record today&apos;s measurements and how you&apos;re feeling — takes about 2 minutes
        </p>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: "10px 14px", marginBottom: 20, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 7, fontSize: 11, color: "#526b68", display: "flex", gap: 8 }}>
        <Shield size={14} strokeWidth={1.7} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
        Demo build using demonstration thresholds only. Not a medical device. If you are experiencing a medical emergency, follow your mission emergency medical procedure immediately.
      </div>

      {/* Emergency banner — shown if serious symptom selected */}
      {hasEmergency && (
        <div style={{ padding: "14px 16px", marginBottom: 20, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, display: "flex", gap: 12 }}>
          <AlertTriangle size={18} strokeWidth={1.7} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: "0 0 4px", font: "600 13px Manrope", color: "#ef4444" }}>Emergency Symptom Detected</p>
            <p style={{ margin: 0, fontSize: 12, color: "#a8c5c1", lineHeight: 1.5 }}>
              You have reported a serious symptom. <strong>Follow your mission emergency medical procedure immediately.</strong> Contact your flight surgeon now. Do not rely on this application to manage an emergency.
            </p>
          </div>
        </div>
      )}

      {/* Step progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => i <= step && setStep(i)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 12px", borderRadius: 6, border: "1px solid",
                borderColor: i === step ? "var(--teal)" : i < step ? "#10b98140" : "var(--line)",
                background: i === step ? "rgba(103,222,214,0.1)" : "transparent",
                color: i === step ? "var(--teal-bright)" : i < step ? "#10b981" : "var(--muted)",
                fontSize: 10, fontWeight: 600, cursor: i <= step ? "pointer" : "default",
                fontFamily: "Manrope", letterSpacing: "0.08em",
              }}
            >
              {i < step && <CheckCircle size={12} strokeWidth={1.7} />}
              <span>{String(i + 1).padStart(2, "0")} {s}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div style={{ width: 20, height: 1, background: "var(--line)" }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 700 }}>
        {/* ── Step 0: Vitals ── */}
        {step === 0 && (
          <div>
            <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div className="vital-icon vital-coral"><Heart size={18} strokeWidth={1.7} /></div>
                <div>
                  <span className="section-kicker" style={{ margin: 0 }}>MEASURED VITALS</span>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>All fields optional — enter a reading or type a value from a sensor</p>
                </div>
              </div>
              <div className="measurement-source-row" aria-label="Measurement source">
                <span>Reading source</span>
                <button type="button" className={form.measurementSource === "MANUAL_ENTRY" ? "measurement-source active" : "measurement-source"} aria-pressed={form.measurementSource === "MANUAL_ENTRY"} onClick={() => set("measurementSource", "MANUAL_ENTRY")}>Manual entry</button>
                <button type="button" className={form.measurementSource === "WEARABLE" ? "measurement-source active" : "measurement-source"} aria-pressed={form.measurementSource === "WEARABLE"} onClick={() => set("measurementSource", "WEARABLE")}>Sensor reading · enter by hand</button>
                <button type="button" className="measurement-source unavailable" disabled title="A device model and data connection must be configured first">Connect device · setup needed</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
                {[
                  { key: "heartRate",    label: "Heart Rate",    unit: "BPM",   placeholder: "e.g. 72",  hint: "Resting heart rate" },
                  { key: "systolicBP",   label: "Systolic BP",   unit: "mmHg",  placeholder: "e.g. 120", hint: "Upper BP number" },
                  { key: "diastolicBP",  label: "Diastolic BP",  unit: "mmHg",  placeholder: "e.g. 80",  hint: "Lower BP number" },
                  { key: "bodyTemp",     label: "Body Temp",     unit: "°C",    placeholder: "e.g. 36.8",hint: "Oral/ear temperature" },
                  { key: "oxygenSat",    label: "SpO₂",          unit: "%",     placeholder: "e.g. 98",  hint: "Pulse oximeter reading" },
                  { key: "bloodGlucose", label: "Blood Glucose", unit: "mg/dL", placeholder: "e.g. 90",  hint: "Fasting or post-meal" },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={labelStyle}>
                      {f.label} <span style={{ color: "#3e5a57", textTransform: "none", fontWeight: 400 }}>({f.unit})</span>
                    </label>
                    <input
                      type="number" step="any"
                      placeholder={f.placeholder}
                      value={String(form[f.key as keyof FormState] ?? "")}
                      onChange={(e) => setStr(f.key, e.target.value)}
                      style={{ ...inputStyle, borderColor: errors[f.key] ? "rgba(239,68,68,0.5)" : "var(--line)" }}
                    />
                    {errors[f.key] ? (
                      <p style={{ margin: "4px 0 0", fontSize: 10, color: "#ef4444" }}>{errors[f.key]}</p>
                    ) : (
                      <p style={{ margin: "4px 0 0", fontSize: 10, color: "#3e5a57" }}>{f.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <NavRow step={step} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)} />
          </div>
        )}

        {/* ── Step 1: Sleep ── */}
        {step === 1 && (
          <div>
            <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div className="vital-icon vital-violet"><Moon size={18} strokeWidth={1.7} /></div>
                <div>
                  <span className="section-kicker" style={{ margin: 0 }}>SLEEP & RECOVERY</span>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>Self-reported — estimates are fine</p>
                </div>
              </div>

              {/* Sleep duration */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Sleep Duration <span style={{ color: "#3e5a57", textTransform: "none" }}>(hours)</span></label>
                <input
                  type="number" step="0.5"
                  placeholder="e.g. 7.5"
                  value={form.sleepDuration}
                  onChange={(e) => setStr("sleepDuration", e.target.value)}
                  style={{ ...inputStyle, maxWidth: 180, borderColor: errors.sleepDuration ? "rgba(239,68,68,0.5)" : "var(--line)" }}
                />
                {errors.sleepDuration && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#ef4444" }}>{errors.sleepDuration}</p>}
              </div>

              {/* Sleep quality slider */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...labelStyle, marginBottom: 10 }}>Sleep Quality</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {[
                    { v: 1, label: "Very Poor" },
                    { v: 2, label: "Poor" },
                    { v: 3, label: "Fair" },
                    { v: 4, label: "Good" },
                    { v: 5, label: "Excellent" },
                  ].map((opt) => (
                    <button key={opt.v} type="button" onClick={() => set("sleepQuality", opt.v)} style={{
                      padding: "8px 4px", border: `1px solid ${form.sleepQuality === opt.v ? "rgba(103,222,214,0.4)" : "var(--line)"}`,
                      borderRadius: 7, background: form.sleepQuality === opt.v ? "rgba(103,222,214,0.1)" : "rgba(0,0,0,0.1)",
                      color: form.sleepQuality === opt.v ? "var(--teal-bright)" : "var(--muted)",
                      fontSize: 9, cursor: "pointer", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 16, marginBottom: 3 }}>{"⭐".repeat(opt.v)}</div>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => set("sleepQuality", null)} style={{ marginTop: 8, padding: "5px 9px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: form.sleepQuality == null ? "var(--teal-bright)" : "var(--muted)", fontSize: 10, cursor: "pointer" }}>Not reported</button>
              </div>

              {/* Fatigue */}
              <div>
                <label style={{ ...labelStyle, marginBottom: 10 }}>Fatigue Level</label>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="radio" name="fatigue" value="" checked={!form.fatigue} onChange={() => set("fatigue", "")} style={{ accentColor: "var(--teal)", width: 14, height: 14 }} />
                    <span style={{ fontSize: 12, color: !form.fatigue ? "#edf8f8" : "var(--muted)" }}>Not reported</span>
                  </label>
                  {FATIGUE_OPTIONS.map((opt) => (
                    <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="radio" name="fatigue" value={opt.v}
                        checked={form.fatigue === opt.v}
                        onChange={() => set("fatigue", opt.v)}
                        style={{ accentColor: "var(--teal)", width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 12, color: form.fatigue === opt.v ? "#edf8f8" : "var(--muted)" }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <NavRow step={step} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)} />
          </div>
        )}

        {/* ── Step 2: Mental wellbeing ── */}
        {step === 2 && (
          <div>
            <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div className="vital-icon vital-violet"><Zap size={18} strokeWidth={1.7} /></div>
                <span className="section-kicker" style={{ margin: 0 }}>MENTAL WELLBEING</span>
              </div>
              <p style={{ margin: "0 0 20px", fontSize: 11, color: "#3e5a57" }}>
                These are self-reported wellbeing indicators, not psychological diagnoses. All inputs are optional.
              </p>

              {/* Mood */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...labelStyle, marginBottom: 10 }}>Current Mood</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
                  {MOOD_OPTIONS.map((opt) => (
                    <button key={opt.v} type="button" onClick={() => set("mood", opt.v)} style={{
                      padding: "10px 4px",
                      border: `1px solid ${form.mood === opt.v ? "rgba(103,222,214,0.4)" : "var(--line)"}`,
                      borderRadius: 8,
                      background: form.mood === opt.v ? "rgba(103,222,214,0.1)" : "rgba(0,0,0,0.1)",
                      color: form.mood === opt.v ? "var(--teal-bright)" : "var(--muted)",
                      fontSize: 9, cursor: "pointer", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.emoji}</div>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => set("mood", "")} style={{ marginTop: 8, padding: "5px 9px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: !form.mood ? "var(--teal-bright)" : "var(--muted)", fontSize: 10, cursor: "pointer" }}>Not reported</button>
              </div>

              {/* Stress */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...labelStyle, marginBottom: 10 }}>Stress Level</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {[
                    { v: 1, label: "Very Low" },
                    { v: 2, label: "Low" },
                    { v: 3, label: "Moderate" },
                    { v: 4, label: "High" },
                    { v: 5, label: "Very High" },
                  ].map((opt) => (
                    <button key={opt.v} type="button" onClick={() => set("stressLevel", opt.v)} style={{
                      padding: "8px 4px",
                      border: `1px solid ${form.stressLevel === opt.v ? "rgba(169,160,244,0.4)" : "var(--line)"}`,
                      borderRadius: 7,
                      background: form.stressLevel === opt.v ? "rgba(169,160,244,0.1)" : "rgba(0,0,0,0.1)",
                      color: form.stressLevel === opt.v ? "#a9a0f4" : "var(--muted)",
                      fontSize: 9, cursor: "pointer", textAlign: "center",
                    }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => set("stressLevel", null)} style={{ marginTop: 8, padding: "5px 9px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: form.stressLevel == null ? "#a9a0f4" : "var(--muted)", fontSize: 10, cursor: "pointer" }}>Not reported</button>
              </div>

              {/* Anxiety */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...labelStyle, marginBottom: 10 }}>Anxiety Level (optional)</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" onClick={() => set("anxietyLevel", value)} style={{
                      padding: "8px 4px",
                      border: `1px solid ${form.anxietyLevel === value ? "rgba(169,160,244,0.4)" : "var(--line)"}`,
                      borderRadius: 7,
                      background: form.anxietyLevel === value ? "rgba(169,160,244,0.1)" : "rgba(0,0,0,0.1)",
                      color: form.anxietyLevel === value ? "#a9a0f4" : "var(--muted)",
                      fontSize: 9, cursor: "pointer",
                    }}>{["Very Low", "Low", "Moderate", "High", "Very High"][value - 1]}</button>
                  ))}
                </div>
                <button type="button" onClick={() => set("anxietyLevel", null)} style={{ marginTop: 8, padding: "5px 9px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: form.anxietyLevel == null ? "#a9a0f4" : "var(--muted)", fontSize: 10, cursor: "pointer" }}>Not reported</button>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Personal notes (optional)</label>
                <textarea
                  placeholder="Add context for your check-in..."
                  value={form.mentalNotes}
                  onChange={(e) => set("mentalNotes", e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            </div>
            <NavRow step={step} onBack={() => setStep(step - 1)} onNext={() => setStep(step + 1)} />
          </div>
        )}

        {/* ── Step 3: Symptoms ── */}
        {step === 3 && (
          <div>
            <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div className="vital-icon vital-amber"><Activity size={18} strokeWidth={1.7} /></div>
                <span className="section-kicker" style={{ margin: 0 }}>SYMPTOMS & CONCERNS</span>
              </div>
              <p style={{ margin: "0 0 18px", fontSize: 11, color: "#3e5a57" }}>
                Select any symptoms you are experiencing. All fields are optional — only report what is applicable.
              </p>

              {/* Symptom grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginBottom: 18 }}>
                {SYMPTOM_OPTIONS.map((s) => {
                  const selected = form.selectedSymptoms.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSymptom(s.id)} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 12px", textAlign: "left",
                      border: `1px solid ${selected ? (s.serious ? "rgba(239,68,68,0.5)" : "rgba(103,222,214,0.4)") : "var(--line)"}`,
                      borderRadius: 8,
                      background: selected ? (s.serious ? "rgba(239,68,68,0.08)" : "rgba(103,222,214,0.07)") : "rgba(0,0,0,0.1)",
                      color: selected ? (s.serious ? "#ef4444" : "var(--teal-bright)") : "var(--muted)",
                      fontSize: 11, cursor: "pointer",
                    }}>
                      {s.serious && <AlertTriangle size={12} strokeWidth={1.7} style={{ color: selected ? "#ef4444" : "#526b68", flexShrink: 0 }} />}
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Severity */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Symptom Severity</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["MILD", "MODERATE", "SEVERE"].map((sv) => (
                    <button key={sv} type="button" onClick={() => set("symptomSeverity", sv)} style={{
                      padding: "6px 14px", border: `1px solid ${form.symptomSeverity === sv ? "rgba(103,222,214,0.4)" : "var(--line)"}`,
                      borderRadius: 6, background: form.symptomSeverity === sv ? "rgba(103,222,214,0.08)" : "transparent",
                      color: form.symptomSeverity === sv ? "var(--teal-bright)" : "var(--muted)",
                      fontSize: 11, cursor: "pointer",
                    }}>{sv}</button>
                  ))}
                </div>
              </div>

              {/* Free text */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Additional symptoms or details (optional)</label>
                <textarea
                  placeholder="Describe any other symptoms or concerns..."
                  value={form.symptomText}
                  onChange={(e) => set("symptomText", e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <div>
                <label style={labelStyle}>General notes (optional)</label>
                <textarea
                  placeholder="Anything else you want to record..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => setStep(step - 1)} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 18px", border: "1px solid var(--line)", borderRadius: 8,
                background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer",
              }}>
                <ArrowLeft size={15} strokeWidth={1.7} /> Back
              </button>
              <button onClick={handleSubmit} disabled={saving} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "11px 28px", border: 0, borderRadius: 9,
                color: "#0c2421", background: saving ? "#4a9e98" : "#8be8df",
                fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
              }}>
                {saving ? "Analysing…" : "Submit & Get Assessment"}
                {!saving && <ArrowRight size={17} strokeWidth={1.7} />}
              </button>
            </div>
            {saveError && <p style={{ marginTop: 10, fontSize: 11, color: "#ef4444" }}>{saveError}</p>}
          </div>
        )}
      </div>
    </>
  );
}

// ── Nav row component ─────────────────────────────────────────────────────────

function NavRow({ step, onBack, onNext }: {
  step: number;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {step > 0 && (
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "10px 18px", border: "1px solid var(--line)", borderRadius: 8,
          background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer",
        }}>
          <ArrowLeft size={15} strokeWidth={1.7} /> Back
        </button>
      )}
      <button onClick={onNext} style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 24px", border: 0, borderRadius: 8,
        color: "#0c2421", background: "#8be8df",
        fontSize: 12, fontWeight: 700, cursor: "pointer",
      }}>
        Next <ArrowRight size={15} strokeWidth={1.7} />
      </button>
    </div>
  );
}

// ── Assessment result view ────────────────────────────────────────────────────

function AssessmentView({ result, statusColor, onReset }: {
  result: AssessmentResult;
  statusColor: string;
  onReset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <span className="section-kicker">CHECK-IN COMPLETE</span>
        <h1 style={{ margin: 0, font: "500 24px Manrope" }}>Assessment Result</h1>
      </div>

      {/* Emergency block */}
      {result.hasEmergency && (
        <div style={{
          padding: "16px 18px", marginBottom: 20,
          background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.5)",
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertTriangle size={22} strokeWidth={1.7} style={{ color: "#ef4444", flexShrink: 0 }} />
            <div>
              <p style={{ margin: "0 0 6px", font: "700 15px Manrope", color: "#ef4444" }}>EMERGENCY — Immediate Action Required</p>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#a8c5c1", lineHeight: 1.6 }}>
                You have reported a serious symptom. <strong style={{ color: "#edf8f8" }}>Follow your mission emergency medical procedure immediately.</strong> Contact your flight surgeon now. Do not rely on this application to manage a medical emergency.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status card */}
      <div className="card" style={{
        padding: "22px 24px", marginBottom: 16,
        borderColor: `${statusColor}30`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span className={`status-badge status-${result.status.toLowerCase()}`}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
            {result.status}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>
            Assessment · {new Date().toLocaleString()} · Demo thresholds
          </span>
        </div>

        <p style={{ margin: "0 0 12px", font: "500 16px Manrope", color: "#edf8f8" }}>{result.summary}</p>

        {/* Guidance */}
        <div style={{
          padding: "11px 14px", marginBottom: 12,
          background: "rgba(103,222,214,0.05)", border: "1px solid var(--line)",
          borderRadius: 8, fontSize: 12, color: "#a8c5c1", lineHeight: 1.65,
        }}>
          <span style={{ color: "var(--teal)", fontWeight: 600 }}>Recommended next step: </span>
          {result.guidance}
        </div>

        {/* Flags */}
        {result.flags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {result.flags.map((f) => (
              <span key={f} style={{
                padding: "2px 8px", background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)", borderRadius: 4,
                fontSize: 10, color: "#f59e0b",
              }}>
                {f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Expandable details */}
        <button onClick={() => setShowDetails((v) => !v)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: 0, border: 0, background: "none",
          color: "var(--muted)", fontSize: 11, cursor: "pointer",
        }}>
          {showDetails ? <ChevronUp size={13} strokeWidth={1.7} /> : <ChevronDown size={13} strokeWidth={1.7} />}
          {showDetails ? "Hide" : "Show"} assessment details
        </button>

        {showDetails && result.details && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(0,0,0,0.15)", borderRadius: 7 }}>
            {result.details.split(" | ").map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : "8px 0 0", fontSize: 12, color: "#a8c5c1", lineHeight: 1.6 }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Safety disclaimer */}
      <div style={{ padding: "10px 14px", marginBottom: 20, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 7, fontSize: 11, color: "#526b68", lineHeight: 1.5 }}>
        ⚠ This assessment uses demonstration thresholds only. It is not a medical diagnosis or clearance. All findings must be reviewed with your flight surgeon. If in doubt, consult your mission medical protocol.
      </div>

      <button onClick={onReset} style={{
        padding: "9px 20px", border: "1px solid var(--line)", borderRadius: 7,
        background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer",
      }}>
        ← New Check-In
      </button>
    </>
  );
}
