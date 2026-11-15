"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Activity, Moon, Zap, Thermometer, Droplets, Gauge, Check,
  ArrowRight, ArrowLeft, Shield, AlertTriangle,
} from "lucide-react";
import { useAstronaut } from "@/lib/astronaut-context";
import { assessHealth, DEMO_THRESHOLDS, SYMPTOM_OPTIONS } from "@/services/health-assessment";
import styles from "./checkin.module.css";
import { SAMPLE_MEDICAL_KIT } from "@/lib/emergency/first-aid-guidance";
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
    heartRate:    [30, 220],
    systolicBP:   [50, 250],
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
  borderRadius: 7, color: "#1f2e2c", fontSize: 13, outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, color: "var(--muted)",
  letterSpacing: "0.08em", textTransform: "uppercase",
  marginBottom: 4, fontFamily: "Manrope", fontWeight: 600,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const router = useRouter();
  const { astronaut, addHealthRecord } = useAstronaut();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<HealthRecord | null>(null);
  const prefilledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("crewcare_astronaut_id")) router.replace("/select");
  }, [router]);

  useEffect(() => {
    if (!astronaut?.id || prefilledFor.current === astronaut.id) return;
    const latest = [...(astronaut.healthRecords ?? [])].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    if (!latest) return;
    const timer = window.setTimeout(() => {
      if (prefilledFor.current === astronaut.id) return;
      prefilledFor.current = astronaut.id;
      setForm((current) => ({
        ...current,
        heartRate: current.heartRate || (latest.heartRate == null ? "" : String(latest.heartRate)),
        systolicBP: current.systolicBP || (latest.systolicBP == null ? "" : String(latest.systolicBP)),
        diastolicBP: current.diastolicBP || (latest.diastolicBP == null ? "" : String(latest.diastolicBP)),
        bodyTemp: current.bodyTemp || (latest.bodyTemp == null ? "" : String(latest.bodyTemp)),
        bloodGlucose: current.bloodGlucose || (latest.bloodGlucose == null ? "" : String(latest.bloodGlucose)),
        oxygenSat: current.oxygenSat || (latest.oxygenSat == null ? "" : String(latest.oxygenSat)),
        sleepDuration: current.sleepDuration || (latest.sleepDuration == null ? "" : String(latest.sleepDuration)),
        sleepQuality: latest.sleepQuality ?? current.sleepQuality,
        fatigue: current.fatigue || latest.fatigue || "",
        mood: current.mood || latest.mood || "",
        stressLevel: latest.stressLevel ?? current.stressLevel,
        anxietyLevel: latest.anxietyLevel ?? current.anxietyLevel,
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [astronaut]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setStr = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    const err = validateField(k, v);
    setErrors((e) => ({ ...e, [k]: err ?? undefined }));
  };

  const goNext = () => {
    const keys = step === 0 ? ["heartRate", "systolicBP", "diastolicBP", "bodyTemp", "bloodGlucose", "oxygenSat"] : step === 1 ? ["sleepDuration"] : [];
    const stepErrors: Partial<Record<string, string>> = {};
    for (const key of keys) {
      const error = validateField(key, String(form[key as keyof FormState] ?? ""));
      if (error) stepErrors[key] = error;
    }
    setErrors((previous) => ({ ...previous, ...stepErrors }));
    if (Object.keys(stepErrors).length) { setSaveError("Please correct the highlighted value before continuing."); return; }
    setSaveError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
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
    const numericKeys = ["heartRate", "systolicBP", "diastolicBP", "bodyTemp", "bloodGlucose", "oxygenSat", "sleepDuration"];
    const nextErrors: Partial<Record<string, string>> = {};
    for (const key of numericKeys) {
      const value = String(form[key as keyof FormState] ?? "");
      const error = validateField(key, value);
      if (error) nextErrors[key] = error;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      setStep(["heartRate", "systolicBP", "diastolicBP", "bodyTemp", "bloodGlucose", "oxygenSat"].includes(first) ? 0 : 1);
      setSaveError("Please correct the highlighted value before submitting.");
      return;
    }
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
    let resultRecord: HealthRecord = rec;
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
      if (savedRecord) resultRecord = savedRecord;
      if (body.result) {
        const saved = body.result as EngineResult;
        assessment.status = saved.overallStatus;
        assessment.summary = saved.summary;
        assessment.details = saved.details;
        assessment.guidance = saved.guidance;
        assessment.flags = saved.flags;
        assessment.hasEmergency = saved.hasEmergency;
      }
    } catch {
      // Demo crew are not always provisioned in the connected database. Keep the
      // selected astronaut's assessment usable and persisted in local demo data.
      const localRecord = { ...rec, id: `local-${astronaut.id}-${Date.now()}` };
      resultRecord = localRecord;
      setSaveError("Cloud save is unavailable right now. This check-in was saved in this browser.");
    }

    setSubmittedRecord(resultRecord);
    if (!astronaut.healthRecords?.some((item) => item.id === resultRecord.id)) {
      addHealthRecord(resultRecord, {
        id: `assessment-${resultRecord.id}`,
        userId: astronaut.id,
        status: assessment.status,
        summary: assessment.summary,
        details: assessment.details,
        guidance: assessment.guidance,
        flags: assessment.flags,
        createdAt: resultRecord.recordedAt,
      }, true);
    }
    setResult(assessment);
    setSubmitted(true);
    setSaving(false);
  };

  const statusColor = result?.status === "GREEN" ? "#10b981"
    : result?.status === "AMBER" ? "#f59e0b" : "#ef4444";

  if (submitted && result) {
    return <AssessmentView result={result} statusColor={statusColor} astronaut={astronaut} record={submittedRecord} saveNotice={saveError} onUpdate={(updated, record) => { setResult(updated); setSubmittedRecord(record); addHealthRecord(record, { id: `assessment-${record.id}`, userId: astronaut.id, status: updated.status, summary: updated.summary, details: updated.details, guidance: updated.guidance, flags: updated.flags, createdAt: record.recordedAt }, true); }} onReset={() => { setSubmitted(false); setResult(null); setSubmittedRecord(null); setForm(INITIAL); setStep(0); }} />;
  }

  return (
    <div className={styles.checkinPage}>
      <header className={styles.pageHeader}>
        <div><span className="section-kicker">ASTRONAUT PORTAL · {astronaut.callsign}</span><h1>Daily Check-In</h1><p>{astronaut.name} ({astronaut.callsign}) · Simulated demo data</p></div>
        <div className={styles.demoNotice}><Shield size={20} /><span>Demo build using demonstration thresholds only. Not a medical device. If you are experiencing a medical emergency, follow your mission emergency medical procedure immediately.</span></div>
      </header>
      {hasEmergency && <div style={{ padding: "14px 16px", marginBottom: 20, background: "rgba(239,68,68,0.08)", border: "1px solid #b42323", borderRadius: 8, display: "flex", gap: 12 }}><AlertTriangle size={18} style={{ color: "#b42323", flexShrink: 0 }} /><div><strong>Emergency Symptom Detected</strong><p>You have reported a serious symptom. Follow your mission emergency medical procedure immediately. Contact your flight surgeon now.</p></div></div>}
      <div className={styles.stepper} aria-label="Daily Check-In progress" aria-live="polite"><div className={styles.stepTrack}>{STEPS.map((label, i) => <div className={`${styles.stepItem} ${i === step ? styles.currentStep : ""} ${i < step ? styles.completedStep : ""}`} key={label}><button type="button" disabled={i > step} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}><span className={styles.stepCircle}>{i < step ? <Check size={18} /> : String(i + 1).padStart(2, "0")}</span><span>{label}</span></button>{i < 3 && <span className={`${styles.stepConnector} ${i < step ? styles.connectorDone : ""}`} />}</div>)}</div><div className={styles.progressMeta}><span>Step {step + 1} of 4 — {STEPS[step]}</span><span>{Math.round(((step + 1) / 4) * 100)}%</span></div><div className={styles.progressTrack}><span style={{ width: `${((step + 1) / 4) * 100}%` }} /></div></div>
      <div className={styles.layout}>
      <main className={styles.formColumn}>
        {/* ── Step 0: Vitals ── */}
        {step === 0 && (
          <div>
            <div className={`card ${styles.stepCard}`} style={{ padding: "24px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div className="vital-icon vital-coral"><Heart size={18} strokeWidth={1.7} /></div>
                <div>
                  <h2 className={styles.stepTitle}>Your vitals</h2>
                  <p className={styles.stepDescription}>Enter today&apos;s numbers. Every field is optional — skip anything you do not have.</p>
                </div>
              </div>
              <div className={styles.sourceGrid} aria-label="Reading source">
                <span className={styles.sourceLabel}>Reading source</span>
                <button type="button" className={`${styles.sourceCard} ${form.measurementSource === "MANUAL_ENTRY" ? styles.sourceActive : ""}`} aria-pressed={form.measurementSource === "MANUAL_ENTRY"} onClick={() => set("measurementSource", "MANUAL_ENTRY")}><Activity size={19} /> <span>Manual entry</span></button>
                <button type="button" className={`${styles.sourceCard} ${form.measurementSource === "WEARABLE" ? styles.sourceActive : ""}`} aria-pressed={form.measurementSource === "WEARABLE"} onClick={() => set("measurementSource", "WEARABLE")}><Heart size={19} /> <span>Sensor reading — enter by hand</span></button>
                <button type="button" className={`${styles.sourceCard} ${styles.sourceUnavailable}`} disabled title="Not available in this demo — setup needed"><Activity size={19} /> <span>Connect device<small>Not available in this demo — setup needed</small></span></button>
              </div>
              <div className={styles.vitalsGrid}>
                {[
                  { key: "heartRate",    label: "Heart rate",    unit: "bpm",   placeholder: "e.g. 72",  hint: "Typical demo range: 60–100 bpm", icon: Heart, source: "NASA HRP risk context: cardiovascular adaptations" },
                  { key: "systolicBP",   label: "Systolic blood pressure",   unit: "mmHg",  placeholder: "e.g. 118", hint: "Demo reference: under 120/80 mmHg", icon: Gauge, source: "NASA HRP risk context: cardiovascular adaptations" },
                  { key: "diastolicBP",  label: "Diastolic blood pressure",  unit: "mmHg",  placeholder: "e.g. 76",  hint: "Demo reference: under 120/80 mmHg", icon: Gauge, source: "NASA HRP risk context: cardiovascular adaptations" },
                  { key: "bodyTemp",     label: "Body temperature",     unit: "°C",    placeholder: "e.g. 36.8",hint: "Typical demo range: 36.5–37.5 °C", icon: Thermometer, source: "NASA HRP risk context: altered immune system" },
                  { key: "oxygenSat",    label: "Oxygen saturation",          unit: "%",     placeholder: "e.g. 98",  hint: "Typical demo range: 95–100%", icon: Droplets, source: "NASA HRP risk context: hypoxia" },
                  { key: "bloodGlucose", label: "Fasting blood sugar", unit: "mg/dL", placeholder: "e.g. 90",  hint: "Fasting demo range: 70–99 mg/dL", icon: Droplets, source: "NASA HRP nutrition context; range is a CrewCare demo rule" },
                ].map((f) => (
                  <div key={f.key} className={styles.vitalField}>
                    <label className={styles.vitalLabel}>
                      <f.icon size={20} aria-hidden="true" /> <span>{f.label}</span> <span className={styles.unitChip}>{f.unit}</span>
                    </label>
                    <input
                      type="number" step="any"
                      placeholder={f.placeholder}
                      value={String(form[f.key as keyof FormState] ?? "")}
                      onChange={(e) => setStr(f.key, e.target.value)}
                      className={styles.vitalInput}
                      aria-invalid={Boolean(errors[f.key])}
                      aria-describedby={errors[f.key] ? `checkin-error-${f.key}` : undefined}
                      style={{ borderColor: errors[f.key] ? "rgba(239,68,68,0.5)" : "var(--line)" }}
                    />
                    {errors[f.key] ? (
                      <p id={`checkin-error-${f.key}`} role="alert" style={{ margin: "4px 0 0", fontSize: 12, color: "#b42323" }}>{errors[f.key]}</p>
                    ) : (
                      <>
                        <p className={styles.rangeHint}>{f.hint}</p>
                        <a href="/astronaut/learn#nasa-data-sources" className={styles.rangeHint} style={{ display: "inline-block", marginTop: 3, color: "#08784f", textDecoration: "underline", textUnderlineOffset: 2 }}>Source: CrewCare demo rule · {f.source}</a>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <NavRow step={step} onBack={() => setStep(step - 1)} onNext={goNext} />
          </div>
        )}

        {/* ── Step 1: Sleep ── */}
        {step === 1 && (
          <div>
            <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div className="vital-icon vital-violet"><Moon size={18} strokeWidth={1.7} /></div>
                <div>
                  <div><h2 className={styles.stepTitle}>Sleep &amp; recovery</h2><p className={styles.stepDescription}>Share how long and how well you slept. Estimates are fine.</p></div>
                </div>
              </div>

              {/* Sleep duration */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Sleep Duration <span style={{ color: "#08784f", textTransform: "none" }}>(hours)</span></label>
                <input
                  type="number" step="0.5"
                  placeholder="e.g. 7.5"
                  value={form.sleepDuration}
                  onChange={(e) => setStr("sleepDuration", e.target.value)}
                  style={{ ...inputStyle, maxWidth: 180, borderColor: errors.sleepDuration ? "rgba(239,68,68,0.5)" : "var(--line)" }}
                />
                {errors.sleepDuration && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#b42323" }}>{errors.sleepDuration}</p>}
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
                      padding: "8px 4px", border: `1px solid ${form.sleepQuality === opt.v ? "#16825d" : "var(--line)"}`,
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

              <p style={{ margin: "0 0 18px", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>Light exposure is another sleep factor. NASA actigraphy wrist devices measure motion, sleep patterns and light exposure; this demo does not collect an actigraphy signal.</p>

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
            <NavRow step={step} onBack={() => setStep(step - 1)} onNext={goNext} />
          </div>
        )}

        {/* ── Step 2: Mental wellbeing ── */}
        {step === 2 && (
          <div>
            <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div className="vital-icon vital-violet"><Zap size={18} strokeWidth={1.7} /></div>
                <h2 className={styles.stepTitle}>Wellbeing</h2>
              </div>
              <p className={styles.stepDescription} style={{ margin: "0 0 20px" }}>
                Self-reported indicators, not a psychological diagnosis. Every field is optional. Mood context can include isolation, radiation, distance from Earth, sleep loss and team tension.
              </p>

              {/* Mood */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...labelStyle, marginBottom: 10 }}>Current Mood</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
                  {MOOD_OPTIONS.map((opt) => (
                    <button key={opt.v} type="button" onClick={() => set("mood", opt.v)} style={{
                      padding: "10px 4px",
                      border: `1px solid ${form.mood === opt.v ? "#16825d" : "var(--line)"}`,
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
                      border: `1px solid ${form.stressLevel === opt.v ? "#dce6e4" : "var(--line)"}`,
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
                      border: `1px solid ${form.anxietyLevel === value ? "#dce6e4" : "var(--line)"}`,
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
            <NavRow step={step} onBack={() => setStep(step - 1)} onNext={goNext} />
          </div>
        )}

        {/* ── Step 3: Symptoms ── */}
        {step === 3 && (
          <div>
            <div className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div className="vital-icon vital-amber"><Activity size={18} strokeWidth={1.7} /></div>
                <h2 className={styles.stepTitle}>Symptoms</h2>
              </div>
              <p className={styles.stepDescription} style={{ margin: "0 0 18px" }}>
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
                      border: `1px solid ${selected ? (s.serious ? "#b42323" : "#16825d") : "var(--line)"}`,
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
                      padding: "6px 14px", border: `1px solid ${form.symptomSeverity === sv ? "#16825d" : "var(--line)"}`,
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
            <div className={styles.navRow}>
              <button onClick={() => setStep(step - 1)} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 18px", border: "1px solid var(--line)", borderRadius: 8,
                background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer",
              }}>
                <ArrowLeft size={15} strokeWidth={1.7} /> Back
              </button>
              <button className={styles.nextButton} onClick={handleSubmit} disabled={saving} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "11px 28px", border: 0, borderRadius: 9,
                color: "#08784f", background: saving ? "#4a9e98" : "#8be8df",
                fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
              }}>
                {saving ? "Analysing…" : "Submit & Get Assessment"}
                {!saving && <ArrowRight size={17} strokeWidth={1.7} />}
              </button>
              <button type="button" className={styles.skipButton} disabled={saving} onClick={handleSubmit}>Skip this step</button>
            </div>
            {saveError && <p role="status" aria-live="polite" style={{ marginTop: 10, fontSize: 13, color: saveError.startsWith("Cloud save") ? "#4d605d" : "#b42323" }}>{saveError}</p>}
          </div>
        )}
      </main>

        <aside className={styles.summaryPanel}><div className={styles.summaryHeader}><div><span className="section-kicker">LIVE PREVIEW</span><h2>Your check-in so far</h2></div></div><section className={styles.summaryGroup}><h3>Vitals</h3>{[
          { key: "heartRate", label: "Heart rate", unit: "bpm" }, { key: "systolicBP", label: "Systolic BP", unit: "mmHg" }, { key: "diastolicBP", label: "Diastolic BP", unit: "mmHg" }, { key: "bodyTemp", label: "Body temperature", unit: "°C" }, { key: "oxygenSat", label: "Oxygen saturation", unit: "%" }, { key: "bloodGlucose", label: "Fasting blood sugar", unit: "mg/dL" }
        ].map(({key,label,unit}) => { const raw=form[key as keyof FormState] as string; const value=raw.trim()?Number(raw):null; const t=DEMO_THRESHOLDS[key]; const red=value!==null&&((t.critMin!==undefined&&value<t.critMin)||(t.critMax!==undefined&&value>t.critMax)); const amber=value!==null&&!red&&((t.warnMin!==undefined&&value<t.warnMin)||(t.warnMax!==undefined&&value>t.warnMax)); const verdict=value===null?"Not entered yet":red?"Outside critical demo range":amber?"Outside normal demo range":"Within normal range"; return <div className={styles.summaryReading} key={key}><div><strong>{label}</strong><span>{value===null?"Not entered yet":`${value} ${unit}`}</span></div><p className={value===null?"":red?styles.redVerdict:amber?styles.amberVerdict:styles.greenVerdict}>{verdict}</p>{red&&<small>Follow mission medical procedure and seek immediate review.</small>}{amber&&<small>Recheck the reading and follow mission guidance.</small>}</div>; })}</section><section className={styles.summaryGroup}><h3>Check-in steps</h3>{STEPS.map((label,i)=><div className={styles.summaryStep} key={label}><span className={i<step?styles.stepCheck:styles.stepPending}>{i<step?<Check size={15}/>:i+1}</span><span>{label}</span><small>{i<step?"Complete":i===step?"In progress":"Up next"}</small></div>)}</section><p className={styles.summaryNote}>Demonstration ranges only. This preview is not a medical assessment.</p></aside>
      </div>
    </div>
  );
}

// ── Nav row component ─────────────────────────────────────────────────────────

function NavRow({ step, onBack, onNext }: { step: number; onBack: () => void; onNext: () => void }) {
  return <div className={styles.navRow}>{step > 0 && <button type="button" className={styles.backButton} onClick={onBack}><ArrowLeft size={18}/>Back</button>}<button type="button" className={styles.nextButton} onClick={onNext}>Next: {STEPS[step+1] ?? "Continue"}<ArrowRight size={19}/></button>{step > 0 && <button type="button" className={styles.skipButton} onClick={onNext}>Skip this step</button>}</div>;
}

// ── Assessment result view ────────────────────────────────────────────────────

interface SuggestedTest { id: string; name: string; field?: keyof HealthRecord; unit?: string; }

function AssessmentView({ result, statusColor, astronaut, record, saveNotice, onUpdate, onReset }: {
  result: AssessmentResult;
  statusColor: string;
  astronaut: ReturnType<typeof useAstronaut>["astronaut"];
  record: HealthRecord | null;
  saveNotice: string | null;
  onUpdate: (result: AssessmentResult, record: HealthRecord) => void;
  onReset: () => void;
}) {
  const [testValues, setTestValues] = useState<Record<string,string>>({});
  const [testTimes, setTestTimes] = useState<Record<string,string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const values = [
    ["heartRate", record?.heartRate], ["systolicBP", record?.systolicBP], ["diastolicBP", record?.diastolicBP],
    ["bodyTemp", record?.bodyTemp], ["bloodGlucose", record?.bloodGlucose], ["oxygenSat", record?.oxygenSat],
  ] as const;
  const out = values.filter(([key,value]) => {
    if (value == null) return false;
    const t=DEMO_THRESHOLDS[key];
    return (t.warnMin !== undefined && value < t.warnMin) || (t.warnMax !== undefined && value > t.warnMax);
  }).map(([key])=>key);
  const symptoms=(record?.symptoms ?? "").toLowerCase();
  const storedAllergies=(astronaut as typeof astronaut & {allergies?:string[]}).allergies??[];
  const aspirinAllergy=storedAllergies.some((item)=>item.toLowerCase().includes("aspirin"));
  const tests: SuggestedTest[]=[];
  if (record?.heartRate != null) tests.push({id:"heartRate",name:"Re-check heart rate after 15 minutes",field:"heartRate",unit:"bpm"});
  if (out.includes("systolicBP") || out.includes("diastolicBP")) tests.push({id:"bloodPressure",name:"Re-check blood pressure",field:"systolicBP",unit:"mmHg"});
  if (out.includes("bodyTemp")) tests.push({id:"temperature",name:"Re-check temperature",field:"bodyTemp",unit:"°C"});
  if (out.includes("bloodGlucose")) tests.push({id:"glucose",name:"Re-check blood sugar",field:"bloodGlucose",unit:"mg/dL"});
  if (out.includes("oxygenSat")) tests.push({id:"oxygen",name:"Re-check SpO₂",field:"oxygenSat",unit:"%"});
  if (/vision|eye/.test(symptoms)) tests.push({id:"eyeScan",name:"Eye scan",unit:"result"});
  if (/chest pain|chest tightness|chest pressure/.test(symptoms)) tests.push({id:"ecg",name:"ECG",unit:"result"});
  if (!tests.length) tests.push({id:"repeat",name:"Repeat a vital reading after 15 minutes",unit:"result"});
  const verdict=result.status==="GREEN"?"All clear":result.status==="AMBER"?"Needs attention":"Act now";
  const reason=out.length ? out.length+" reading"+(out.length===1?" is":"s are")+" outside the normal demo range — "+out.map((key)=>DEMO_THRESHOLDS[key].label.toLowerCase()).join(", ")+"." : result.hasEmergency ? "A serious symptom was reported and needs immediate attention." : "The entered readings are within the normal demo ranges.";
  const actions=result.status==="RED"&&result.hasEmergency
    ? ["Open the emergency guide and follow its first-aid steps.","Keep the person safe and avoid exertion while reassessing.","Record changes in symptoms and readings.","Contact mission medical support / the flight surgeon as soon as the channel allows."]
    : result.guidance?.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0,5) ?? (result.status==="RED"
      ? ["Follow the mission emergency procedure for the reported symptom.","Keep the person safe and avoid exertion while you reassess.","Record any changes in symptoms or readings."]
      : result.status==="AMBER" ? ["Repeat any reading marked outside the normal demo range.","Note symptoms and how they change over time.","Follow mission medical protocol if concerns persist."]
      : ["Continue your planned mission routine and check in again as scheduled.","Repeat a reading if you feel different or the value seems unexpected."]);
  const meaning=result.summary || "The current results are a guide to what may need attention. They do not identify a diagnosis.";
  const updateResults=async()=>{
    if(!record)return;
    const completed=tests.filter(t=>(testValues[t.id]??"").trim());
    if(!completed.length){setAnalysisError("Enter at least one test result before analyzing.");return;}
    setAnalyzing(true);setAnalysisError("");
    const timestamp=new Date().toISOString();
    const text=completed.map(t=>t.name+": "+testValues[t.id]+(testTimes[t.id]?" at "+testTimes[t.id]:"")).join("; ").slice(0,300);
    const updatedRecord:HealthRecord={...record,id:"local-"+astronaut.id+"-"+Date.now(),recordedAt:timestamp,notes:[record.notes,"Follow-up tests: "+text].filter(Boolean).join(" | ")};
    for(const t of completed){const value=Number(testValues[t.id]);if(t.field&&Number.isFinite(value))(updatedRecord[t.field] as number|null)=value;}
    let next=assessHealth(updatedRecord,astronaut.healthRecords??[]);
    try{
      const previous=astronaut.latestAssessment;
      const response=await fetch("/api/ai/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        scope:"astronaut",astronautId:astronaut.id,period:"24h",
        question:"Reassess the full check-in for "+astronaut.name+" ("+astronaut.callsign+") using all original vitals, sleep, wellbeing, symptoms, and these new follow-up results: "+text+". Return an updated verdict, plain-language meaning, up to five next actions, and precautions. Do not diagnose or invent treatment.",
        demoStates:[{astronautId:astronaut.id,records:[updatedRecord],latestAssessment:previous?{id:previous.id,userId:astronaut.id,status:previous.status,summary:previous.summary,details:previous.details??null,guidance:previous.guidance??null,flags:previous.flags,createdAt:new Date(previous.createdAt).toISOString()}:null,activeAlerts:[]}]
      })});
      if(!response.ok)throw new Error("AI analysis is unavailable right now. The entered results were still saved and checked against the demo thresholds.");
      const ai=await response.json();
      const status=ai.verdict==="ACT_NOW"?"RED":ai.verdict==="WATCH"?"AMBER":"GREEN";
      next={status,summary:ai.whatThisCouldMean||ai.summary,details:[...(ai.watchOutFor??[]),ai.whenToGetHelpImmediately,text].filter(Boolean).join(" | "),guidance:(ai.whatToDoNow??[]).slice(0,5).join(" "),flags:result.flags,hasEmergency:result.hasEmergency};
    }catch(e){setAnalysisError(e instanceof Error?e.message:"AI analysis unavailable; local demo thresholds were applied.");}
    onUpdate(next,updatedRecord);setUpdated(true);setAnalyzing(false);
  };
  return <div className={styles.assessmentPage}>
    {result.hasEmergency&&<section className={styles.emergencyBanner}><AlertTriangle size={24}/><div><h2>Emergency Symptom Detected</h2><p>A serious symptom was reported. Open the emergency guide and alert mission medical support.</p></div><Link href="/astronaut/emergency">Open emergency guide <ArrowRight size={18}/></Link></section>}
    <header className={styles.assessmentHeader}><span className="section-kicker">CHECK-IN COMPLETE · {astronaut.callsign}</span><h1>Check-in complete</h1><p>Assessment for {astronaut.name} · Simulated demo data based on this check-in and available profile history.</p>{saveNotice && <p role="status" aria-live="polite">{saveNotice}</p>}</header>
    <section className={styles.verdictCard+" "+(result.status==="GREEN"?styles.verdictGreen:result.status==="AMBER"?styles.verdictAmber:styles.verdictRed)} style={{borderColor:statusColor}}><span className={styles.verdictLabel}>{verdict}</span><p>{reason}</p>{updated&&<small>Updated after your new test results — here is what changed.</small>}</section>
    <div className={styles.resultGrid}>
      <section className={styles.resultCard}><h2>What this could mean</h2><p>{meaning}</p></section>
      <section className={styles.resultCard}><h2>What to do right now</h2><ol>{actions.slice(0,5).map((item,i)=><li key={i}>{item}</li>)}</ol></section>
      <section className={styles.resultCard+" "+styles.testsCard}><h2>Tests we suggest</h2><p>Record tests you can perform with available equipment.</p>{tests.map(t=><div className={styles.testRow} key={t.id}><strong>{t.name}</strong><input aria-label={t.name+" result"} placeholder="Enter result" value={testValues[t.id]??""} onChange={e=>setTestValues(v=>({...v,[t.id]:e.target.value}))}/><input aria-label={t.name+" time"} placeholder="Time (optional)" value={testTimes[t.id]??""} onChange={e=>setTestTimes(v=>({...v,[t.id]:e.target.value}))}/></div>)}<button className={styles.analyzeButton} onClick={updateResults} disabled={analyzing}>{analyzing?"Analyzing…":"Analyze my results"} <ArrowRight size={18}/></button>{analysisError&&<p className={styles.analysisError}>{analysisError}</p>}</section>
      <section className={styles.resultCard}><h2>Precautions</h2><ul>{(result.details?.split(" | ").filter(Boolean).slice(0,4)??[]).map((item,i)=><li key={i}>{item}</li>)}<li>Avoid strenuous activity if it worsens symptoms and watch for changes.</li></ul></section>
      <section className={styles.resultCard}><h2>Medicines from the kit</h2><p className={styles.resultMeta}>Simulated sample kit — not verified onboard inventory.</p><p className={styles.resultMeta}>Illustrative kit list · not verified for this mission: {SAMPLE_MEDICAL_KIT.items.map(item=>item.name+" — "+item.dose).join("; ")}</p><p>{aspirinAllergy?"The stored profile lists an aspirin allergy; do not use aspirin. No medicine in the kit for this — do the physical steps.":storedAllergies.length?"Stored profile allergies: "+storedAllergies.join(", ")+". No medicine is recommended from this illustrative list; continue physical steps.":"No allergy information is stored for this crew profile, so no medicine is recommended. Continue physical steps and confirm allergies with mission medical support."}</p></section>
      <section className={styles.resultCard}><h2>When to get help immediately</h2><ul><li>Chest pain, difficulty breathing, collapse, loss of consciousness, sudden vision loss, or severe bleeding.</li><li>Any symptom that is severe, worsening, or feels unsafe.</li><li>Contact mission medical support / the flight surgeon as soon as the channel allows.</li></ul></section>
    </div>
    <p className={styles.safetyLine}>CrewCare is not a doctor — this is guidance until professional help arrives.</p><button onClick={onReset} className={styles.backToCheckin}>← New Check-In</button>
  </div>;
}
