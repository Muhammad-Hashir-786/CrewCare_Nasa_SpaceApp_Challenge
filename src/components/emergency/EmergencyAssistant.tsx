"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertOctagon, ArrowLeft, Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import { evaluateEmergencyScreen, type EmergencyAnswer, type EmergencyScreen } from "@/lib/emergency/decision-support";
import type { HealthRecord } from "@/types";

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionLike = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;
export type EmergencyContext = {
  astronautId?: string;
  callsign: string;
  assessment: string;
  activeCriticalAlerts: Array<{ title: string; message: string }>;
  lastMeasuredAt: string | null;
  healthRecords?: HealthRecord[];
  isSimulated?: boolean;
  latestAssessment?: { id: string; userId: string; status: "GREEN" | "AMBER" | "RED"; summary: string; details?: string | null; guidance?: string | null; flags: string[]; createdAt: string } | null;
  activeAlerts?: Array<{ id: string; userId: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED"; title: string; message: string; createdAt: string }>;
};
type VoiceState = "IDLE" | "LISTENING" | "TRANSCRIBING" | "PROCESSING" | "SPEAKING" | "WAITING" | "INTERRUPTED" | "CONNECTION_ERROR";
type Message = { role: "crew" | "assistant"; text: string; at: string };
type Identity = "SELF" | "OTHER_KNOWN" | "UNABLE_TO_COMMUNICATE" | "UNKNOWN" | "";

const SCREEN_KEYS: Array<{ key: keyof EmergencyScreen; label: string }> = [
  { key: "responsive", label: "Is the person responsive?" },
  { key: "breathingNormally", label: "Are they breathing normally?" },
  { key: "severeBleeding", label: "Is there severe bleeding?" },
];
const ANSWERS: Array<{ value: EmergencyAnswer; label: string }> = [
  { value: "YES", label: "Yes" }, { value: "NO", label: "No" }, { value: "UNKNOWN", label: "Unsure / cannot check" },
];
const defaultScreen: EmergencyScreen = { responsive: "", breathingNormally: "", severeBleeding: "" };
const safeMessage = "I cannot diagnose or provide treatment instructions. Contact mission medical support for health concerns. If anyone may be in immediate danger, use your approved mission emergency procedure and contact mission medical support now. This application has not contacted anyone.";

const metricDefinitions: Array<{ key: keyof HealthRecord; label: string; unit: string }> = [
  { key: "heartRate", label: "Heart rate", unit: "bpm" },
  { key: "systolicBP", label: "Systolic BP", unit: "mmHg" },
  { key: "diastolicBP", label: "Diastolic BP", unit: "mmHg" },
  { key: "bodyTemp", label: "Body temperature", unit: "°C" },
  { key: "oxygenSat", label: "Oxygen saturation", unit: "%" },
  { key: "bloodGlucose", label: "Blood glucose", unit: "mg/dL" },
  { key: "sleepDuration", label: "Sleep duration", unit: "h" },
];

export function EmergencyAssistant({ context }: { context?: EmergencyContext }) {
  const [open, setOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [unsupported, setUnsupported] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speechRate, setSpeechRate] = useState(0.92);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [identity, setIdentity] = useState<Identity>("");
  const [useSelectedProfile, setUseSelectedProfile] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [screen, setScreen] = useState<EmergencyScreen>(defaultScreen);
  const [screenIndex, setScreenIndex] = useState(0);
  const [screenComplete, setScreenComplete] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"NOT_REQUESTED" | "LOCAL_REQUEST_RECORDED">("NOT_REQUESTED");
  const recognition = useRef<RecognitionLike | null>(null);
  const voiceInteraction = useRef(false);
  const startedAt = useRef<number | null>(null);
  const history = useMemo(() => context?.healthRecords ?? [], [context?.healthRecords]);
  const latest = history.at(-1);
  const intelligence = useMemo(() => generateHealthIntelligence(history, { phase3Status: context?.assessment as "GREEN" | "AMBER" | "RED" | undefined }), [history, context?.assessment]);
  const decision = screenComplete ? evaluateEmergencyScreen(screen) : null;
  const urgent = Boolean(decision?.escalateNow);

  useEffect(() => {
    if (!open) return;
    startedAt.current = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [open]);
  useEffect(() => () => {
    recognition.current?.abort();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const speak = (value: string) => {
    if (!("speechSynthesis" in window)) { setVoiceState("CONNECTION_ERROR"); setError("Spoken response is unavailable. Read the message and use your approved mission channel."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.rate = speechRate;
    utterance.onstart = () => setVoiceState("SPEAKING");
    utterance.onend = () => setVoiceState("WAITING");
    utterance.onerror = () => setVoiceState("CONNECTION_ERROR");
    window.speechSynthesis.speak(utterance);
  };
  const stopListening = () => { recognition.current?.stop(); if (voiceState === "LISTENING") setVoiceState("INTERRUPTED"); };
  const listen = () => {
    voiceInteraction.current = true;
    window.speechSynthesis?.cancel();
    setVoiceState("TRANSCRIBING");
    const host = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const SpeechRecognition = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!SpeechRecognition) { setUnsupported(true); setVoiceState("CONNECTION_ERROR"); setError("Speech recognition is not supported here. You can type instead."); return; }
    setError("");
    try {
      const instance = new SpeechRecognition();
      instance.lang = navigator.language || "en-US"; instance.interimResults = false; instance.maxAlternatives = 1;
      instance.onresult = (event) => {
        setVoiceState("PROCESSING");
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) setText((previous) => previous ? `${previous} ${transcript}` : transcript);
        setVoiceState("WAITING");
      };
      instance.onerror = (event) => { setVoiceState("CONNECTION_ERROR"); setError(event.error === "not-allowed" ? "Microphone permission was denied. Allow microphone access or type instead." : "Speech recognition stopped. Try again or type instead."); };
      instance.onend = () => setVoiceState((current) => current === "LISTENING" ? "WAITING" : current);
      recognition.current = instance; instance.start(); setVoiceState("LISTENING");
    } catch { setVoiceState("CONNECTION_ERROR"); setError("Could not start speech recognition. Try again or type instead."); }
  };
  const addMessage = (role: Message["role"], value: string) => setMessages((previous) => [...previous, { role, text: value, at: new Date().toISOString() }]);
  const startSession = () => {
    setOpen(true); setUnsupported(false); setError(""); setMessages([]); setElapsed(0); setIdentity(""); setOtherName(""); setUseSelectedProfile(false); setScreen(defaultScreen); setScreenIndex(0); setScreenComplete(false); setRequestStatus("NOT_REQUESTED"); setVoiceState("IDLE");
    voiceInteraction.current = false;
  };
  const recordAnswer = (key: keyof EmergencyScreen, answer: EmergencyAnswer) => {
    if (!identity) { setError("Choose who needs help so the record context is clear."); return; }
    setError("");
    const nextScreen = { ...screen, [key]: answer };
    setScreen(nextScreen);
    const immediateConcern = key === "responsive" && answer !== "YES"
      || key === "breathingNormally" && answer !== "YES"
      || key === "severeBleeding" && answer !== "NO";
    if (immediateConcern) {
      setScreenComplete(true); setVoiceState("PROCESSING");
      const response = evaluateEmergencyScreen(nextScreen).instructions.join(" ");
      addMessage("assistant", response); setVoiceState("WAITING"); speak(response);
      return;
    }
    if (screenIndex < SCREEN_KEYS.length - 1) setScreenIndex((index) => index + 1);
    else {
      setScreenComplete(true);
      const response = "No urgent concern was reported in this initial screen. This does not rule out an emergency. Describe what is happening and contact mission medical support for health concerns.";
      addMessage("assistant", response); setVoiceState("WAITING");
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); const report = text.trim(); if (!report) return;
    stopListening(); window.speechSynthesis?.cancel(); setVoiceState("PROCESSING");
    addMessage("crew", report); setText("");
    if (!screenComplete || urgent) {
      addMessage("assistant", decision?.instructions.join(" ") ?? safeMessage);
      setVoiceState("WAITING");
      return;
    }
    const attachProfile = identity === "SELF" || identity === "UNABLE_TO_COMMUNICATE" && useSelectedProfile;
    const demoState = context?.astronautId && attachProfile ? {
      astronautId: context.astronautId,
      records: (context.healthRecords ?? []).slice(-180).map((record) => ({
        id: record.id, userId: record.userId, recordedAt: new Date(record.recordedAt).toISOString(),
        heartRate: record.heartRate ?? null, systolicBP: record.systolicBP ?? null, diastolicBP: record.diastolicBP ?? null,
        bodyTemp: record.bodyTemp ?? null, bloodGlucose: record.bloodGlucose ?? null, oxygenSat: record.oxygenSat ?? null,
        sleepDuration: record.sleepDuration ?? null, sleepQuality: record.sleepQuality ?? null, mood: record.mood ?? null,
        fatigue: record.fatigue ?? null, stressLevel: record.stressLevel ?? null, anxietyLevel: record.anxietyLevel ?? null,
        symptoms: record.symptoms ?? null, symptomSeverity: record.symptomSeverity ?? null, notes: record.notes ?? null,
        isMeasured: record.isMeasured, isSimulated: true,
      })),
      latestAssessment: context.latestAssessment ?? null,
      activeAlerts: context.activeAlerts ?? [],
    } : undefined;
    const requestHistory = [...messages.slice(-10), { role: "crew" as const, text: report }];
    try {
      const response = await fetch("/api/emergency/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity, astronautId: demoState?.astronautId, screen, concern: report,
          conversationHistory: requestHistory, demoState,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Emergency AI is unavailable.");
      const contextEvidence = Array.isArray(payload.evidenceReferences) && payload.evidenceReferences.length ? `Context referenced: ${payload.evidenceReferences.map((item: { label: string; timestamp: string | null }) => `${item.label}${item.timestamp ? ` · ${new Date(item.timestamp).toLocaleDateString()}` : ""}`).join("; ")}.` : "";
      const assistantReply = [payload.reply, contextEvidence, payload.recommendedAction, payload.nextQuestion ? `One question: ${payload.nextQuestion}` : ""].filter(Boolean).join("\n\n");
      addMessage("assistant", assistantReply);
      if (voiceInteraction.current) speak(assistantReply);
      else setVoiceState("WAITING");
    } catch (cause) {
      const fallback = cause instanceof Error ? cause.message : "Emergency AI is unavailable.";
      setError(fallback);
      addMessage("assistant", `${safeMessage}\n\n${fallback}`);
      setVoiceState("CONNECTION_ERROR");
    }
  };
  const requestMedicalSupport = () => {
    setRequestStatus("LOCAL_REQUEST_RECORDED");
    addMessage("crew", "Requested medical assistance in this interface.");
    addMessage("assistant", "This request is recorded only on this screen and has not been delivered to mission control or a medical officer. Use your approved mission communication channel now.");
    setVoiceState("WAITING");
  };
  const close = () => { stopListening(); window.speechSynthesis?.cancel(); setVoiceState("IDLE"); setOpen(false); };
  const attachProfile = identity === "SELF" || identity === "UNABLE_TO_COMMUNICATE" && useSelectedProfile;
  const subject = identity === "SELF" ? `Self · ${context?.callsign ?? "no crew profile"}` : identity === "OTHER_KNOWN" ? (otherName.trim() || "Other person · identity not verified") : identity === "UNABLE_TO_COMMUNICATE" ? `Unable to communicate · ${useSelectedProfile ? context?.callsign ?? "profile unavailable" : "identity unknown"}` : identity === "UNKNOWN" ? "Unknown / unverified person" : "Not selected";
  const displayMetrics = latest ? metricDefinitions.flatMap((metric) => {
    const value = latest[metric.key];
    return typeof value === "number" ? [{ ...metric, value }] : [];
  }) : [];

  return <>
    <button className="emergency-btn" onClick={startSession} aria-haspopup="dialog" aria-label="Open emergency assistance"><AlertOctagon size={16} strokeWidth={1.9}/><span>Emergency</span></button>
    {open && <div role="dialog" aria-modal="true" aria-labelledby="emergency-title" className="emergency-screen">
      <header className="emergency-header"><button onClick={close} className="emergency-back"><ArrowLeft size={18}/> Exit emergency assistant</button><span className="emergency-session-time">SESSION {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}</span></header>
      <main className="emergency-main">
        <div className="emergency-status"><span className="emergency-pulse"/><span>{urgent ? "IMMEDIATE HUMAN SUPPORT REQUIRED" : "EMERGENCY ASSISTANCE · LOCAL SESSION"}</span></div>
        <div className="emergency-orb" aria-hidden="true"><span/><span/><span/></div>
        <p className="section-kicker" style={{ color: "#ffb1a6" }}>CREW CARE SAFETY ASSISTANT</p>
        <h1 id="emergency-title">{urgent ? "Contact mission medical support now." : "Let’s establish immediate safety."}</h1>
        <p className="emergency-question">This is a structured intake, not diagnosis or treatment. If the person may be in immediate danger, do not wait for this assistant: use the approved mission emergency procedure and contact mission medical support.</p>
        <div role="status" aria-live="polite" className="emergency-voice-state">Voice state: {voiceState.replaceAll("_", " ")}{voiceState === "LISTENING" ? " · microphone active" : ""}</div>

        <section className="emergency-context" aria-label="Patient identification and available record context">
          <span>PERSON NEEDING HELP · {subject.toUpperCase()}</span>
          <div className="emergency-identity-grid">{([["SELF", "Myself"], ["OTHER_KNOWN", "Someone else"], ["UNABLE_TO_COMMUNICATE", "Unable to communicate"], ["UNKNOWN", "Unknown / unverified"]] as Array<[Identity, string]>).map(([value, label]) => <button type="button" key={value} aria-pressed={identity === value} className={`emergency-choice ${identity === value ? "selected" : ""}`} onClick={() => { setIdentity(value); setUseSelectedProfile(false); setError(""); }}>{label}</button>)}</div>
          {identity === "OTHER_KNOWN" && <input className="emergency-name-input" aria-label="Person's name or callsign" value={otherName} onChange={(event) => setOtherName(event.target.value)} placeholder="Name or callsign (not verified)" maxLength={80}/>}
          {identity === "UNABLE_TO_COMMUNICATE" && <label className="emergency-profile-confirm"><input type="checkbox" checked={useSelectedProfile} onChange={(event) => setUseSelectedProfile(event.target.checked)}/> I have independently confirmed this person matches the selected crew profile.</label>}
          <p>{attachProfile ? `Selected profile record: ${context?.callsign ?? "none"}. Identity is not authenticated; verify with mission procedures. ${context?.isSimulated ? "This record is simulated." : ""}` : identity === "UNKNOWN" || identity === "OTHER_KNOWN" || identity === "UNABLE_TO_COMMUNICATE" ? "No health record is attached to this person. The selected profile’s medical history stays hidden." : "Select a person first. Identity is not authenticated by this application."}</p>
        </section>

        <section className="emergency-screening" aria-label="Immediate safety screen">
          <h2>Immediate safety screen</h2><p>Answer only what you can observe. Unsure answers are not treated as reassuring.</p>
          {!screenComplete && <fieldset className="emergency-question-row"><legend>{screenIndex + 1} of {SCREEN_KEYS.length} · {SCREEN_KEYS[screenIndex].label}</legend><div>{ANSWERS.map(({ value, label }) => <button type="button" key={value} className="emergency-choice" onClick={() => recordAnswer(SCREEN_KEYS[screenIndex].key, value)} disabled={!identity}>{label}</button>)}</div></fieldset>}
          {decision && <div className={urgent ? "emergency-decision urgent" : "emergency-decision"} role="alert"><strong>{decision.urgency.replaceAll("_", " ")}</strong><p>{decision.reason}</p><ul>{decision.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul><small>No approved clinical protocol is active. No care instructions were generated and no human was contacted.</small></div>}
        </section>

        <details className="emergency-context emergency-record-details"><summary>Available health record context · {attachProfile ? context?.callsign ?? "none" : "withheld until identity is confirmed"}</summary>
          {!attachProfile ? <p>Selected profile history is hidden because this patient is not identified as that crew member.</p> : <>
          <p>Latest Phase 3 assessment: {context?.assessment ?? "not available"}. Last record: {context?.lastMeasuredAt ? new Date(context.lastMeasuredAt).toLocaleString() : "not available"}. {context?.isSimulated ? "SIMULATED DATA" : "Record provenance may require verification."}</p>
          {displayMetrics.length ? <ul className="emergency-metric-list">{displayMetrics.map((metric) => <li key={metric.key}><span>{metric.label}</span><strong>{metric.value} {metric.unit}</strong><small>{new Date(latest!.recordedAt).toLocaleString()} · {latest!.measurementSource === "WEARABLE" ? "wearable reading entered by hand" : latest!.measurementSource === "SIMULATED_SENSOR" ? "simulated sensor" : latest!.measurementSource === "MANUAL_ENTRY" ? "manual entry" : latest!.isMeasured ? "measured · source not recorded" : "self-reported"} · {latest!.isSimulated ? "simulated record" : "not marked simulated"}</small></li>)}</ul> : <p>No numeric measurements are available in the selected record.</p>}
          {context?.activeCriticalAlerts.map((alert, index) => <p className="emergency-context-alert" key={`${alert.title}-${index}`}><strong>Recorded critical alert:</strong> {alert.title} — {alert.message}</p>)}
          <p>Historical analysis: {intelligence.recordCount} records available; {intelligence.anomalies.length} statistical pattern flag(s). These are unvalidated decision-support signals, not clinical findings.</p>
          {intelligence.observations.slice(0, 3).map((observation, index) => <p key={`${observation.category}-${index}`}><strong>{observation.category.replaceAll("_", " ")}:</strong> {observation.explanation}</p>)}
          </>}
        </details>

        <section className="emergency-transcript" aria-label="Session transcript">{messages.length === 0 ? <p className="emergency-empty">This session stays in this browser view only. It is not sent to an AI provider or persisted.</p> : messages.map((message, index) => <article key={`${message.at}-${index}`} className={`emergency-message emergency-message-${message.role}`}><span>{message.role === "crew" ? "CREW INPUT" : "SAFETY WORKFLOW · NOT DIAGNOSIS"}</span><p>{message.text}</p><time>{new Date(message.at).toLocaleTimeString()}</time></article>)}</section>
        <form onSubmit={submit} className="emergency-input-row"><textarea aria-label="Describe what is happening" value={text} onChange={(event) => setText(event.target.value)} placeholder="Describe the concern, when it began, and whether it is changing…" rows={2} maxLength={1200}/><div className="emergency-controls"><button type="button" onClick={voiceState === "LISTENING" ? stopListening : listen} className={voiceState === "LISTENING" ? "emergency-control active" : "emergency-control"} aria-pressed={voiceState === "LISTENING"}>{voiceState === "LISTENING" ? <MicOff size={18}/> : <Mic size={18}/>}<span>{voiceState === "LISTENING" ? "Stop listening" : unsupported ? "Try microphone" : "Speak"}</span></button><button type="submit" disabled={!text.trim()} className="emergency-control emergency-send"><Send size={17}/><span>Send</span></button></div></form>
        {error && <p role="alert" className="emergency-error">{error}</p>}
        <div className="emergency-disclosure">{unsupported ? "Voice recognition is unavailable. Text remains available." : "Microphone activates only when selected. Browser speech recognition may process audio through your browser provider."} If configured, Gemini receives this fictional intake and selected simulated record context. No audio or session transcript is saved.</div>
        <div className="emergency-response-tools"><div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9 }}><button onClick={() => voiceState === "SPEAKING" ? (window.speechSynthesis.cancel(), setVoiceState("INTERRUPTED")) : speak(messages.filter((item) => item.role === "assistant").at(-1)?.text ?? safeMessage)} className="emergency-tool">{voiceState === "SPEAKING" ? <VolumeX size={15}/> : <Volume2 size={15}/>} {voiceState === "SPEAKING" ? "Stop speaking" : "Read safety message"}</button><label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#caa9a5", fontSize: 9 }}>Speech speed <input aria-label="Speech speed" type="range" min="0.75" max="1.25" step="0.05" value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value))}/></label></div><a href="/mission-control/alerts">Review recorded alerts</a></div>
        <button className="emergency-screen-submit emergency-support-button" type="button" onClick={requestMedicalSupport}>{requestStatus === "LOCAL_REQUEST_RECORDED" ? "Request noted here · use approved channel now" : "I need medical support"}</button>
        <p className="emergency-human-status"><strong>Human support:</strong> Not connected. {requestStatus === "LOCAL_REQUEST_RECORDED" ? "Your local request was not transmitted." : "This application has not transmitted an alert."} Use your approved mission communications channel.</p>
      </main>
    </div>}
  </>;
}
