"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Bot, CircleAlert, LoaderCircle, Mic, MicOff, RotateCcw, Send, Shield, Sparkles, Volume2, Wifi } from "lucide-react";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { EmergencyAssistant, type EmergencyContext } from "@/components/emergency/EmergencyAssistant";
import type { HealthRecord } from "@/types";
import { useMicrophoneLevel } from "@/hooks/useMicrophoneLevel";

type Evidence = { id: string; label: string; timestamp: string | null; url?: string };
type AIAnswer = {
  verdict: "ALL_CLEAR" | "WATCH" | "ACT_NOW";
  whatThisCouldMean: string;
  whatToDoNow: string[];
  watchOutFor: string[];
  whenToGetHelpImmediately: string;
  title: string; summary: string; currentInterpretation: string;
  evidenceReferences: string[]; limitations: string[];
};
type AssistantResult = { analysis: AIAnswer; evidence: Evidence[]; provider: string; model: string; generatedAt: string; criticalAlerts: Array<{ id: string; title: string; message: string; severity: string }> };
type ChatMessage = { role: "user" | "assistant"; text: string; historyText?: string; answer?: AssistantResult; answeredForId?: string | null; dataUsed?: string; topic?: string };
type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionLike = { lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type RecognitionConstructor = new () => RecognitionLike;
const FOLLOW_UPS = ["What if it gets worse?", "Explain it simpler", "Show the steps again"];
const firstName = (name: string) => name.split(/\s+/).find((part) => !/^(dr\.?|capt\.?|commander)$/i.test(part)) ?? name;

function answerHistoryText(answer: AIAnswer) {
  return `Verdict: ${answer.verdict}. What this could mean: ${answer.whatThisCouldMean}. What to do right now: ${answer.whatToDoNow.map((item, index) => `${index + 1}. ${item}`).join(" ")} Watch out for: ${answer.watchOutFor.join(" ")} When to get help immediately: ${answer.whenToGetHelpImmediately}`.slice(0, 4000);
}

function contextualFollowUp(chip: string, topic: string) {
  const instruction = chip === "What if it gets worse?"
    ? "Explain what worsening of this same problem would look like, and restate the same relevant warning signs and urgent next steps."
    : chip === "Explain it simpler"
      ? "Re-explain the immediately previous answer about this same problem in simpler, shorter words, preserving its verdict, warning signs, and advice."
      : "Show the same numbered steps from the immediately previous answer about this same problem again; do not replace them with unrelated advice.";
  return `Follow-up about the same topic: ${topic}. ${instruction} Use the immediately previous answer and full chat history as context. Do not switch to general advice.`.slice(0, 600);
}

export function AIHomeExperience() {
  const [astronautId, setAstronautId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AssistantResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const micLevel = useMicrophoneLevel();
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [localRecords, setLocalRecords] = useState<HealthRecord[]>([]);
  const [localAssessment, setLocalAssessment] = useState<EmergencyContext["latestAssessment"]>(null);
  const [localAlerts, setLocalAlerts] = useState<NonNullable<EmergencyContext["activeAlerts"]>>([]);
  const recognition = useRef<RecognitionLike | null>(null);
  const astronaut = DEMO_ASTRONAUTS.find((item) => item.id === astronautId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("crewcare_ai_astronaut_id");
      if (saved && DEMO_ASTRONAUTS.some((member) => member.id === saved)) setAstronautId(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { try {
      if (!astronautId) { setLocalRecords([]); setLocalAssessment(null); setLocalAlerts([]); return; }
      const parsedRecords = JSON.parse(localStorage.getItem(`crewcare_checkins_${astronautId}`) ?? "[]");
      const parsedAssessment = JSON.parse(localStorage.getItem(`crewcare_assessment_${astronautId}`) ?? "null");
      const parsedAlerts = JSON.parse(localStorage.getItem(`crewcare_demo_alerts_${astronautId}`) ?? "[]");
      setLocalRecords(Array.isArray(parsedRecords) ? parsedRecords as HealthRecord[] : []);
      setLocalAssessment(parsedAssessment && parsedAssessment.id ? parsedAssessment : null);
      setLocalAlerts(Array.isArray(parsedAlerts) ? parsedAlerts : []);
    } catch { setLocalRecords([]); setLocalAssessment(null); setLocalAlerts([]); } }, 0);
    return () => window.clearTimeout(timer);
  }, [astronautId]);
  useEffect(() => { if (micLevel.micOff && listening) { recognition.current?.stop(); setListening(false); } }, [micLevel.micOff, listening]);
  useEffect(() => () => { recognition.current?.stop(); micLevel.stop(); window.speechSynthesis?.cancel(); }, [micLevel.stop]);

  const clearConversation = () => { setAnswer(null); setMessages([]); setQuestion(""); setError(""); setCanRetry(false); };
  const selectAstronaut = (id: string) => {
    setAstronautId(id); if (id) localStorage.setItem("crewcare_ai_astronaut_id", id); else localStorage.removeItem("crewcare_ai_astronaut_id");
    clearConversation();
  };
  const toggleVoice = async () => {
    setCanRetry(false);
    if (listening) { recognition.current?.stop(); setListening(false); micLevel.stop(); return; }
    const host = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const SpeechRecognition = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!SpeechRecognition) { micLevel.markOff(); setError("Voice input is not supported in this browser. Type your question instead."); return; }
    setError("");
    if (!await micLevel.start()) { setError("Mic off — tap to allow microphone access, or type your question instead."); return; }
    try {
      const instance = new SpeechRecognition(); instance.lang = navigator.language || "en-US"; instance.interimResults = false; instance.maxAlternatives = 1;
      instance.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript?.trim(); if (transcript) setQuestion(transcript); };
      instance.onerror = (event) => { setListening(false); micLevel.stop(); if (event.error === "not-allowed") micLevel.markOff(); setError(event.error === "not-allowed" ? "Mic off — tap to allow microphone access. Type your question instead." : "Voice input stopped. Try again or type your question."); };
      instance.onend = () => { setListening(false); micLevel.stop(); }; recognition.current = instance; instance.start(); setListening(true);
    } catch { setListening(false); micLevel.stop(); setError("Could not start voice input. Type your question instead."); }
  };

  const ask = async (event?: React.FormEvent, followUp?: string, retry = false) => {
    event?.preventDefault();
    const prompt = (followUp ?? question).trim();
    if (loading) return;
    if (!astronaut && !followUp) {
      const explicit = prompt.match(/\bfor\s+([a-z]+)\b/i)?.[1]?.toLowerCase();
      const matched = explicit && DEMO_ASTRONAUTS.find((member) => member.name.toLowerCase().includes(explicit) || member.callsign.toLowerCase() === explicit);
      if (matched) { setAstronautId(matched.id); localStorage.setItem("crewcare_ai_astronaut_id", matched.id); }
    }
    const selected = astronaut ?? (!astronautId && !followUp ? (() => {
      const explicit = prompt.match(/\bfor\s+([a-z]+)\b/i)?.[1]?.toLowerCase();
      return explicit ? DEMO_ASTRONAUTS.find((member) => member.name.toLowerCase().includes(explicit) || member.callsign.toLowerCase() === explicit) : undefined;
    })() : undefined);
    if (prompt.length < 4) return;
    recognition.current?.stop(); micLevel.stop(); setListening(false); setLoading(true); setError(""); setCanRetry(false); setAnswer(null);
    const topic = messages.filter((message) => message.role === "user").at(-1)?.text ?? prompt;
    const sentPrompt = followUp && FOLLOW_UPS.includes(followUp) ? contextualFollowUp(followUp, topic) : prompt;
    const priorMessages = retry ? messages : [...messages, { role: "user" as const, text: followUp ?? prompt, topic }];
    if (!retry) setMessages(priorMessages);
    try {
      let demoState;
      if (selected) {
        try {
          const records = JSON.parse(localStorage.getItem(`crewcare_checkins_${selected.id}`) ?? "[]");
          const latestAssessment = JSON.parse(localStorage.getItem(`crewcare_assessment_${selected.id}`) ?? "null");
          const activeAlerts = JSON.parse(localStorage.getItem(`crewcare_demo_alerts_${selected.id}`) ?? "[]");
          demoState = [{ astronautId: selected.id, records: Array.isArray(records) ? records.slice(-180) : [], latestAssessment, activeAlerts: Array.isArray(activeAlerts) ? activeAlerts.slice(-50) : [] }];
        } catch { demoState = [{ astronautId: selected.id, records: [], latestAssessment: null, activeAlerts: [] }]; }
      }
      const response = await fetch("/api/ai/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: selected ? "astronaut" : "general", ...(selected ? { astronautId: selected.id, demoStates: demoState } : {}), question: sentPrompt, period: "30d", conversationHistory: priorMessages.map((message) => ({ role: message.role, text: message.historyText ?? message.text })).slice(-100) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = typeof data.code === "string" ? data.code : "";
        const friendlyMessage = code === "AI_NOT_CONFIGURED" || code === "AI_MODEL_NOT_CONFIGURED" ? "Crew Care AI needs a provider key and model configured by the project owner." : code === "AI_RATE_LIMITED" ? "Gemini is receiving a lot of requests right now. Wait a moment, then try again." : code === "AI_TIMEOUT" ? "Gemini took too long to respond. Your question is still here; try once more." : code === "AI_TEMPORARILY_UNAVAILABLE" || code === "AI_PROVIDER_UNAVAILABLE" ? "Gemini is temporarily busy. Your question is still here; try again in a moment." : (typeof data.error === "string" ? data.error : "Crew Care couldn’t finish that response. Please try again.");
        setError(friendlyMessage); setCanRetry(response.status === 429 || response.status >= 500 || code === "AI_PROVIDER_UNAVAILABLE"); return;
      }
      const result = data as AssistantResult; setAnswer(result);
      const merged = selected ? new Map([...(selected.healthRecords ?? []), ...(demoState?.[0]?.records ?? [])].map((record) => [record.id, record])) : null;
      const latestRecord = merged ? [...merged.values()].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()).at(-1) : null;
      const dataUsed = latestRecord ? `Using ${firstName(selected!.name)}'s latest check-in (${new Date(latestRecord.recordedAt).toLocaleDateString()})${latestRecord.heartRate != null ? `: heart rate ${latestRecord.heartRate} bpm` : ""}${latestRecord.systolicBP != null && latestRecord.diastolicBP != null ? `, blood pressure ${latestRecord.systolicBP}/${latestRecord.diastolicBP}` : ""}.` : selected ? `No stored check-in is available for ${firstName(selected.name)}; this is general advice.` : "";
      const assistantMessage: ChatMessage = { role: "assistant", text: result.analysis.summary, historyText: answerHistoryText(result.analysis), answer: result, answeredForId: selected?.id ?? null, dataUsed, topic };
      setMessages((previous) => [...previous, assistantMessage]);
      if (!followUp) setQuestion("");
    } catch {
      setError("Crew Care couldn’t connect just now. Your question is still here; check your connection and try again."); setCanRetry(true);
    } finally { setLoading(false); }
  };

  const emergencyContext = useMemo<EmergencyContext | undefined>(() => {
    if (!astronaut) return undefined;
    const recordMap = new Map((astronaut.healthRecords ?? []).map((record) => [record.id, record]));
    for (const record of localRecords) recordMap.set(record.id, { ...record, isSimulated: true });
    const alertMap = new Map((astronaut.activeAlerts ?? []).map((alert) => [alert.id, alert]));
    for (const alert of localAlerts) if (alert?.id) alertMap.set(alert.id, alert);
    const records = [...recordMap.values()].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    const latestAssessment = localAssessment ?? astronaut.latestAssessment;
    return { astronautId: astronaut.id, callsign: astronaut.callsign, assessment: latestAssessment?.status ?? "NOT AVAILABLE", latestAssessment: latestAssessment ? { ...latestAssessment, createdAt: new Date(latestAssessment.createdAt).toISOString() } : null, activeAlerts: [...alertMap.values()].map((alert) => ({ ...alert, createdAt: new Date(alert.createdAt).toISOString() })), activeCriticalAlerts: [...alertMap.values()].filter((alert) => alert.status === "ACTIVE" && alert.severity === "CRITICAL").map(({ title, message }) => ({ title, message })), lastMeasuredAt: records.at(-1) ? new Date(records.at(-1)!.recordedAt).toISOString() : null, healthRecords: records, isSimulated: true };
  }, [astronaut, localRecords, localAssessment, localAlerts]);
  const speakAnswer = (spokenAnswer = answer) => {
    if (!spokenAnswer || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); const a = spokenAnswer.analysis;
    const speech = new SpeechSynthesisUtterance(`${a.verdict.replace("_", " ")}. What this could mean. ${a.whatThisCouldMean}. What to do right now. ${a.whatToDoNow.join(". ")}. Watch out for. ${a.watchOutFor.join(". ")}. When to get help immediately. ${a.whenToGetHelpImmediately}`);
    speech.onstart = () => setSpeaking(true); speech.onend = () => setSpeaking(false); speech.onerror = () => setSpeaking(false); window.speechSynthesis.speak(speech);
  };

  return <main className="app-shell landing-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <div className="landing-content">
      <div className="landing-badge"><span className="live-dot"/><span>NASA SPACE APPS CHALLENGE 2026</span><span className="mission-pill-sep"/><span>DEMO BUILD</span></div>
      <header className={`landing-hero ${loading || speaking ? "is-active" : ""}`}>
        <div className="doctor-agent" role="img" aria-label="Friendly CrewCare doctor agent">
          <span className="agent-ring agent-ring-one"/><span className="agent-ring agent-ring-two"/>
          <svg viewBox="0 0 120 120" aria-hidden="true" className="doctor-agent-svg">
            <circle cx="60" cy="63" r="38" className="agent-face"/><path d="M34 44q2-19 26-19t26 19" className="agent-cap"/><path d="M51 25v-8h18v8" className="agent-cap-top"/><path d="M60 17v8m-4-4h8" className="agent-cross"/>
            <circle cx="47" cy="62" r="3" className="agent-eye"/><circle cx="73" cy="62" r="3" className="agent-eye"/><path d="M49 75q11 10 22 0" className="agent-smile"/>
            <path d="M27 67v15q0 13 13 13h5" className="agent-stethoscope"/><circle cx="49" cy="95" r="6" className="agent-stethoscope-head"/>
          </svg>
        </div>
        <Link href="/" className="landing-brand-name" aria-label="CrewCare home">CREW<span>CARE</span></Link>
        <p className="landing-subtitle">Astronaut Health Assessment &amp; Monitoring</p>
      </header>

      <section className="landing-assistant" aria-label="Ask Crew Care AI">
        <form className="landing-search-form" onSubmit={ask}>
          <span className="landing-search-icon"><Bot size={20}/></span>
          <label className="landing-search-input"><span>ASK CREWCARE AI</span><input aria-label="Ask a health question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about symptoms, vitals, sleep, or mission health…" maxLength={600}/></label>
          <span className={`landing-mic-control ${listening ? "is-listening" : ""}`} style={{ "--mic-level": micLevel.level } as React.CSSProperties}>
            {listening && <><span className="landing-mic-ring landing-mic-ring-one" style={{ transform: `scale(${1 + micLevel.level * .5})`, opacity: .08 + micLevel.level * .22 }}/><span className="landing-mic-ring landing-mic-ring-two" style={{ transform: `scale(${1 + micLevel.level * .85})`, opacity: .05 + micLevel.level * .14 }}/><span className="landing-mic-wave" aria-label="Live microphone level">{[.45,.8,1,.66,.9,.52,.75].map((factor,index)=><i key={index} style={{ height: `${3 + micLevel.level * 19 * factor}px` }}/>)}</span></>}
            <button className={listening ? "landing-search-mic listening" : "landing-search-mic"} style={listening ? { transform: `scale(${1 + micLevel.level * .15})`, boxShadow: `0 0 ${4 + micLevel.level * 18}px rgba(103,222,214,${.15 + micLevel.level * .45})`, transition: "transform 55ms linear, box-shadow 55ms linear" } : undefined} type="button" onClick={() => void toggleVoice()} title={micLevel.micOff ? "Mic off — tap to allow" : undefined} aria-label={listening ? "Stop voice input" : micLevel.micOff ? "Mic off — tap to allow" : "Speak your question"} aria-pressed={listening}>{listening ? <MicOff size={19}/> : <Mic size={19}/>}</button>
          </span>
          <button className="landing-search-submit" type="submit" aria-label={loading ? "Asking Crew Care AI" : "Ask Crew Care AI"} disabled={loading || question.trim().length < 4}>{loading ? <LoaderCircle size={19} className="spin"/> : <Send size={19}/>}</button>
        </form>
        {(listening || micLevel.micOff) && <p className={`landing-mic-status ${listening ? "is-listening" : ""}`} role="status">{listening ? <><i/>Listening… tap to stop</> : "Mic off — tap to allow. Type your question instead."}</p>}
        <div className="landing-mode"><label htmlFor="ai-profile">Answer mode</label><select id="ai-profile" value={astronautId} onChange={(event) => selectAstronaut(event.target.value)}><option value="">General advice — no crew member selected</option>{DEMO_ASTRONAUTS.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
        <p className="landing-ai-note">{astronaut ? `Answering for ${astronaut.name}.` : "General advice — no crew member selected."} Fictional crew profiles are used only when explicitly selected.</p>
        {loading && <div className="landing-ai-status" role="status" aria-live="polite"><span className="landing-ai-status-orb"><Sparkles size={15}/></span><span>Reading your question and preparing guidance…</span><span className="landing-ai-status-dots" aria-hidden="true">•••</span></div>}
        {error && <div role="alert" className="landing-ai-error"><CircleAlert size={18} aria-hidden="true"/><p>{error}</p>{canRetry && <button type="button" onClick={() => { void ask(undefined, undefined, true); }} disabled={loading}><RotateCcw size={14}/> Try again</button>}</div>}
        <div className="ai-chat-thread" aria-live="polite">
          {messages.map((message, index) => message.role === "user" ? <div className="ai-chat-user" key={`user-${index}`}><span>You</span><p>{message.text}</p></div> : message.answer ? <article key={`answer-${index}`} className={`landing-answer verdict-${message.answer.analysis.verdict.toLowerCase()}`}>
            <div className="answer-heading"><div><span className="answer-mode-label">{message.answeredForId ? `Answering for ${DEMO_ASTRONAUTS.find((member) => member.id === message.answeredForId)?.name ?? "selected astronaut"}` : "General advice — no crew member selected"}</span>{message.dataUsed && <p className="answer-data-used">{message.dataUsed}</p>}</div><button className="answer-speak" type="button" onClick={() => speakAnswer(message.answer)} aria-label="Read answer aloud"><Volume2 size={21}/></button></div>
            <div className="verdict-badge"><span className="verdict-dot"/>{message.answer.analysis.verdict === "ALL_CLEAR" ? "All clear" : message.answer.analysis.verdict === "WATCH" ? "Watch" : "Act now"}</div>
            {message.answer.criticalAlerts.map((alert) => <div className="landing-critical" key={alert.id}><strong>{alert.severity} ALERT · {alert.title}</strong><p>{alert.message}</p></div>)}
            <section className="answer-section"><h3>What this could mean</h3><p>{message.answer.analysis.whatThisCouldMean}</p></section>
            <section className="answer-section"><h3>What to do right now</h3><ol>{message.answer.analysis.whatToDoNow.map((step, stepIndex) => <li key={`${stepIndex}-${step}`}>{step}</li>)}</ol></section>
            <section className="answer-section"><h3>Watch out for</h3><ul>{message.answer.analysis.watchOutFor.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{item}</li>)}</ul></section>
            <section className="answer-section"><h3>When to get help immediately</h3><p>{message.answer.analysis.whenToGetHelpImmediately}</p></section>
            <details className="answer-more"><summary>More detail</summary><p>{message.answer.analysis.currentInterpretation}</p><div className="landing-evidence">{message.answer.analysis.evidenceReferences.map((id) => { const item = message.answer!.evidence.find((entry) => entry.id === id); return item ? <span key={id}>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.label}</a> : item.label}{item.timestamp ? ` · ${new Date(item.timestamp).toLocaleDateString()}` : ""}</span> : null; })}</div><p className="landing-answer-limit">CrewCare is not a doctor and this is not a diagnosis — this is guidance to act on until professional help arrives.</p></details>
            <div className="answer-followups" aria-label="Suggested follow-up questions">{FOLLOW_UPS.map((chip) => <button key={chip} type="button" onClick={() => { setQuestion(chip); void ask(undefined, chip); }}>{chip}</button>)}</div>
          </article> : null)}
          {loading && <div className="landing-ai-status" role="status">Nova is considering the conversation…</div>}
        </div>
        <div className="ai-chat-controls"><button type="button" onClick={clearConversation} disabled={!messages.length && !error}><RotateCcw size={14}/> New conversation</button><span>This conversation is kept while you stay on this page</span></div>
      </section>

      <section className="landing-emergency-cta" aria-label="Emergency assistance">
        <div><strong>Need help now?</strong><span>Open the safety intake and contact mission medical support.</span></div>
        <EmergencyAssistant context={emergencyContext}/>
      </section>
      <div className="landing-portals">
        <Link href="/select" className="landing-portal-link"><article className="landing-portal-card landing-portal-astronaut"><span className="vital-icon vital-teal"><Activity size={20} strokeWidth={1.7}/></span><h2>Astronaut Portal</h2><p>Your personal health dashboard, daily check-ins, vital trends and health education.</p><span className="landing-portal-action">Enter portal <ArrowRight size={15} strokeWidth={1.7}/></span></article></Link>
        <Link href="/mission-control" className="landing-portal-link"><article className="landing-portal-card landing-portal-mission"><span className="vital-icon vital-violet"><Wifi size={20} strokeWidth={1.7}/></span><h2>Mission Control</h2><p>Monitor all crew members, review alerts, track health trends across the mission.</p><span className="landing-portal-action">Enter portal <ArrowRight size={15} strokeWidth={1.7}/></span></article></Link>
      </div>
      <div className="landing-disclaimer"><Shield size={14} strokeWidth={1.7}/><span>All crew data and assessments shown here are fictional and simulated. Crew Care is under development, is not a medical device, and does not replace qualified medical support. Configured thresholds are illustrative only.</span></div>
    </div>
  </main>;
}
