"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Bot, LoaderCircle, Mic, MicOff, Send, Shield, Wifi } from "lucide-react";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { EmergencyAssistant, type EmergencyContext } from "@/components/emergency/EmergencyAssistant";
import type { HealthRecord } from "@/types";

type Evidence = { id: string; label: string; timestamp: string | null };
type AssistantResult = {
  analysis: { title: string; summary: string; currentInterpretation: string; evidenceReferences: string[]; limitations: string[] };
  evidence: Evidence[];
  provider: string;
  model: string;
  generatedAt: string;
  criticalAlerts: Array<{ id: string; title: string; message: string; severity: string }>;
};
type ChatMessage = { role: "user" | "assistant"; text: string };
type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionLike = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type RecognitionConstructor = new () => RecognitionLike;

export function AIHomeExperience() {
  const [astronautId, setAstronautId] = useState(DEMO_ASTRONAUTS[0].id);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AssistantResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [localRecords, setLocalRecords] = useState<HealthRecord[]>([]);
  const [localAssessment, setLocalAssessment] = useState<EmergencyContext["latestAssessment"]>(null);
  const [localAlerts, setLocalAlerts] = useState<NonNullable<EmergencyContext["activeAlerts"]>>([]);
  const recognition = useRef<RecognitionLike | null>(null);
  const astronaut = DEMO_ASTRONAUTS.find((item) => item.id === astronautId) ?? DEMO_ASTRONAUTS[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("crewcare_astronaut_id");
      if (saved && DEMO_ASTRONAUTS.some((member) => member.id === saved)) setAstronautId(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsedRecords = JSON.parse(localStorage.getItem(`crewcare_checkins_${astronautId}`) ?? "[]");
        const parsedAssessment = JSON.parse(localStorage.getItem(`crewcare_assessment_${astronautId}`) ?? "null");
        const parsedAlerts = JSON.parse(localStorage.getItem(`crewcare_demo_alerts_${astronautId}`) ?? "[]");
        setLocalRecords(Array.isArray(parsedRecords) ? parsedRecords as HealthRecord[] : []);
        setLocalAssessment(parsedAssessment && parsedAssessment.id ? parsedAssessment : null);
        setLocalAlerts(Array.isArray(parsedAlerts) ? parsedAlerts : []);
      } catch { setLocalRecords([]); setLocalAssessment(null); setLocalAlerts([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [astronautId]);

  useEffect(() => () => { recognition.current?.stop(); }, []);

  const toggleVoice = () => {
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const host = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const SpeechRecognition = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Voice input is not supported in this browser. Type your question instead."); return; }
    setError("");
    try {
      const instance = new SpeechRecognition();
      instance.lang = navigator.language || "en-US"; instance.interimResults = false; instance.maxAlternatives = 1;
      instance.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript?.trim(); if (transcript) setQuestion(transcript); };
      instance.onerror = (event) => { setListening(false); setError(event.error === "not-allowed" ? "Microphone permission was denied. Type your question instead." : "Voice input stopped. Try again or type your question."); };
      instance.onend = () => setListening(false);
      recognition.current = instance; instance.start(); setListening(true);
    } catch { setListening(false); setError("Could not start voice input. Type your question instead."); }
  };

  const ask = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = question.trim();
    if (prompt.length < 4 || loading) return;
    recognition.current?.stop(); setListening(false);
    setLoading(true); setError(""); setAnswer(null);
    let demoState;
    try {
      const records = JSON.parse(localStorage.getItem(`crewcare_checkins_${astronautId}`) ?? "[]");
      const latestAssessment = JSON.parse(localStorage.getItem(`crewcare_assessment_${astronautId}`) ?? "null");
      const activeAlerts = JSON.parse(localStorage.getItem(`crewcare_demo_alerts_${astronautId}`) ?? "[]");
      demoState = [{ astronautId, records: Array.isArray(records) ? records.slice(-180) : [], latestAssessment, activeAlerts: Array.isArray(activeAlerts) ? activeAlerts.slice(-50) : [] }];
    } catch {
      demoState = [{ astronautId, records: [], latestAssessment: null, activeAlerts: [] }];
    }
    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "astronaut", astronautId, question: prompt, period: "30d", conversationHistory: messages.slice(-8), demoStates: demoState }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The assistant could not complete that request.");
      const result = data as AssistantResult;
      setAnswer(result);
      setMessages((previous) => [...previous, { role: "user" as const, text: prompt }, { role: "assistant" as const, text: result.analysis.summary }].slice(-10));
      setQuestion("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The assistant could not complete that request.");
    } finally { setLoading(false); }
  };

  const evidence = new Map((answer?.evidence ?? []).map((item) => [item.id, item]));
  const emergencyContext = useMemo<EmergencyContext>(() => {
    const recordMap = new Map((astronaut.healthRecords ?? []).map((record) => [record.id, record]));
    for (const record of localRecords) recordMap.set(record.id, { ...record, isSimulated: true });
    const activeAlerts = new Map((astronaut.activeAlerts ?? []).map((alert) => [alert.id, alert]));
    for (const alert of localAlerts) if (alert?.id) activeAlerts.set(alert.id, alert);
    const records = [...recordMap.values()].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    const latestAssessment = localAssessment ?? astronaut.latestAssessment;
    return {
      astronautId: astronaut.id,
      callsign: astronaut.callsign,
      assessment: latestAssessment?.status ?? "NOT AVAILABLE",
      latestAssessment: latestAssessment ? { ...latestAssessment, createdAt: new Date(latestAssessment.createdAt).toISOString() } : null,
      activeAlerts: [...activeAlerts.values()].map((alert) => ({ ...alert, createdAt: new Date(alert.createdAt).toISOString() })),
      activeCriticalAlerts: [...activeAlerts.values()].filter((alert) => alert.status === "ACTIVE" && alert.severity === "CRITICAL").map(({ title, message }) => ({ title, message })),
      lastMeasuredAt: records.at(-1) ? new Date(records.at(-1)!.recordedAt).toISOString() : null,
      healthRecords: records,
      isSimulated: true,
    };
  }, [astronaut, localRecords, localAssessment, localAlerts]);

  return (
    <main className="app-shell landing-shell">
      <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
      <div className="landing-content">
        <div className="landing-badge"><span className="live-dot"/><span>NASA SPACE APPS CHALLENGE 2026</span><span className="mission-pill-sep"/><span>DEMO BUILD</span></div>

        <Link href="/" className="landing-brand" aria-label="Crew Care home">
          <span className="landing-brand-mark"><span/></span>
          <span className="landing-brand-name">CREW<span>CARE</span></span>
        </Link>
        <p className="landing-subtitle">Astronaut Health Assessment &amp; Monitoring</p>
        <p className="landing-description">Supporting crew health awareness during long-duration spaceflight. Monitor vitals, track trends, and stay informed — mission day by day.</p>

        <section className="landing-assistant" aria-label="Ask Crew Care AI">
          <form className="landing-search-form" onSubmit={ask}>
            <span className="landing-search-icon"><Bot size={18}/></span>
            <label className="landing-search-input"><span>ASK CREWCARE AI</span><input aria-label="Ask a health question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about symptoms, vitals, sleep, or mission health…" maxLength={600}/></label>
            <button className={listening ? "landing-search-mic listening" : "landing-search-mic"} type="button" onClick={toggleVoice} aria-label={listening ? "Stop voice input" : "Speak your question"} aria-pressed={listening}>{listening ? <MicOff size={17}/> : <Mic size={17}/>}</button>
            <button className="landing-search-submit" type="submit" aria-label={loading ? "Asking Crew Care AI" : "Ask Crew Care AI"} disabled={loading || question.trim().length < 4}>{loading ? <LoaderCircle size={17} className="spin"/> : <Send size={17}/>}</button>
          </form>
          <p className="landing-ai-note">Voice is optional. When configured, Gemini receives your question and the selected fictional profile context. Never enter real crew data here yet.</p>
          {error && <p role="alert" className="landing-ai-error">{error}</p>}
          {answer && <article className="landing-answer" aria-live="polite">
            {answer.criticalAlerts.map((alert) => <div className="landing-critical" key={alert.id}><strong>{alert.severity} ALERT · {alert.title}</strong><p>{alert.message}</p></div>)}
            <span className="section-kicker">{answer.analysis.title} · {answer.provider} / {answer.model}</span>
            <p className="landing-answer-summary">{answer.analysis.summary}</p>
            <p className="landing-answer-detail">{answer.analysis.currentInterpretation}</p>
            <div className="landing-evidence">{answer.analysis.evidenceReferences.map((id) => { const item = evidence.get(id); return item ? <span key={id}>{item.label}{item.timestamp ? ` · ${new Date(item.timestamp).toLocaleDateString()}` : ""}</span> : null; })}</div>
            {answer.analysis.limitations.length > 0 && <p className="landing-answer-limit">{answer.analysis.limitations.join(" ")}</p>}
          </article>}
        </section>

        <section className="landing-emergency-cta" aria-label="Emergency assistance">
          <div><strong>Need help now?</strong><span>Open the safety intake and contact mission medical support.</span></div>
          <EmergencyAssistant context={emergencyContext}/>
        </section>

        {messages.length > 0 && <div className="landing-conversation-hint" aria-live="polite">Conversation continues with {astronaut.callsign} · {messages.filter((message) => message.role === "user").length} question(s)</div>}

        <div className="landing-portals">
          <Link href="/select" className="landing-portal-link"><article className="landing-portal-card landing-portal-astronaut">
            <span className="vital-icon vital-teal"><Activity size={20} strokeWidth={1.7}/></span>
            <h2>Astronaut Portal</h2><p>Your personal health dashboard, daily check-ins, vital trends and health education.</p>
            <span className="landing-portal-action">Enter portal <ArrowRight size={15} strokeWidth={1.7}/></span>
          </article></Link>
          <Link href="/mission-control" className="landing-portal-link"><article className="landing-portal-card landing-portal-mission">
            <span className="vital-icon vital-violet"><Wifi size={20} strokeWidth={1.7}/></span>
            <h2>Mission Control</h2><p>Monitor all crew members, review alerts, track health trends across the mission.</p>
            <span className="landing-portal-action">Enter portal <ArrowRight size={15} strokeWidth={1.7}/></span>
          </article></Link>
        </div>

        <div className="landing-disclaimer"><Shield size={14} strokeWidth={1.7}/><span>All crew data and assessments shown here are fictional and simulated. Crew Care is under development, is not a medical device, and does not replace qualified medical support. Configured thresholds are illustrative only.</span></div>
      </div>
    </main>
  );
}
