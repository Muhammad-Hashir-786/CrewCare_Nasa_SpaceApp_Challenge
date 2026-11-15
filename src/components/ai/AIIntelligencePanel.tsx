"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Bot, ExternalLink, LoaderCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { SAMPLE_MEDICAL_KIT } from "@/lib/emergency/first-aid-guidance";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import type { DemoState } from "@/lib/ai/demo-state";
import missionStyles from "./MissionIntelligence.module.css";

type Scope = "astronaut" | "mission";
type Period = "24h" | "7d" | "30d" | "90d" | "mission";
type Evidence = { id: string; kind: string; label: string; timestamp: string | null; detail: string };
type Subject = { id: string; callsign: string; displayName: string; latestAssessment: { status: string; summary: string; guidance: string | null } | null; currentMeasurements: Record<string, string | number | null> | null; recordsInPeriod: number; allergies?: string[] | null; conditions?: string[] | null; baselines: Array<{ indicator: string; label: string; unit: string; sufficient: boolean; count: number; mean: number | null; minimum: number | null; maximum: number | null }>; trends: Array<{ indicator: string; label: string; direction: string; explanation: string; percentChange: number | null; measurementCount: number; startingValue?: number | null; latestValue?: number | null; unit?: string }>; recent14DayTrends?: Array<{ indicator: string; label: string; unit: string; count: number; firstValue: number | null; latestValue: number | null; direction: string; baselineMinimum: number | null; baselineMaximum: number | null }>; anomalies: Array<{ indicator: string; label: string; explanation: string; sourceRecordId: string; severity: string; actualValue?: number; expectedMinimum?: number | null; expectedMaximum?: number | null; unit?: string; timestamp?: string }>; patterns: Array<{ category: string; explanation: string; evidence: string[]; suggestedFollowUp: string; reliability: number }>; forecasts: Array<{ label: string; projectedValue: number; unit: string; lowerBound: number; upperBound: number; confidence: number; sourcePoints: number; explanation: string }>; activeAlerts: Array<{ id: string; severity: string; title: string; message: string }> };
type Context = { scope: Scope; period: Period; generatedAt: string; healthDataIsSimulated: boolean; subjects: Subject[]; evidence: Evidence[]; missingInformation: string[]; mission: { name: string; code: string } };
type Insight = { title: string; explanation: string; evidenceIds: string[]; confidence: number };
type Recommendation = { title: string; description: string; priority: string; indicators: string[]; evidenceIds: string[]; nextStep: string };
type Analysis = { verdict: "ALL_CLEAR" | "WATCH" | "ACT_NOW"; whatThisCouldMean: string; whatToDoNow: string[]; watchOutFor: string[]; whenToGetHelpImmediately: string; title: string; summary: string; currentInterpretation: string; historicalObservations: Insight[]; patterns: Insight[]; concerns: Insight[]; recommendations: Recommendation[]; missingInformation: string[]; confidence: number; limitations: string[]; evidenceReferences: string[] };
type Answer = { analysis: Analysis; provider: string; model: string; generatedAt: string; criticalAlerts: Array<{ id: string; title: string; message: string; severity: string }>; evidence: Evidence[] };
type Message = { id: string; role: "user" | "assistant"; text: string; answer?: Answer; timestamp: string };
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: string };
type RecommendationState = "NEW" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";

const isCrewWideQuestion = (value: string) => /\b(?:crew(?:\s+members?)?|astronauts|whole crew|all crew|everyone|team-wide|mission-wide)\b/i.test(value);

function answerVerdictForScope(answer: Answer, scope: Scope, context: Context | null): Analysis["verdict"] {
  const verdict = answer.analysis.verdict;
  if (verdict === "ACT_NOW" || scope !== "mission" || !context) return verdict;
  const text = [answer.analysis.title, answer.analysis.summary, answer.analysis.whatThisCouldMean,
    answer.analysis.currentInterpretation, ...answer.analysis.whatToDoNow, ...answer.analysis.watchOutFor,
    ...answer.analysis.recommendations.flatMap((item) => [item.title, item.description, item.nextStep]),
    ...answer.criticalAlerts.flatMap((item) => [item.title, item.message])].join(" ").toLocaleLowerCase();
  const mentioned = context.subjects.filter((subject) => text.includes(subject.displayName.toLocaleLowerCase()) ||
    new RegExp(`\\b${subject.callsign}\\b`, "i").test(text));
  if (mentioned.some((subject) => subject.latestAssessment?.status === "RED") || /\b(?:act now|urgent action|urgent attention)\b/i.test(text)) return "ACT_NOW";
  if (verdict === "WATCH" || /\b(?:needs attention|needs review)\b/i.test(text) || mentioned.some((subject) => subject.latestAssessment?.status === "AMBER" || subject.activeAlerts.length > 0 || Boolean(subject.currentMeasurements?.symptoms))) return "WATCH";
  return verdict;
}

const surface: React.CSSProperties = { padding: 18, marginBottom: 14 };
const btnStyle: React.CSSProperties = { background: "rgba(103,222,214,.09)", color: "var(--teal-bright)", border: "1px solid var(--line)", borderRadius: 7, padding: "9px 13px", fontSize: 11, fontWeight: 600, cursor: "pointer" };
const pct = (value: number | null) => value == null ? "—" : `${value > 0 ? "+" : ""}${value}%`;
const cleanDisplayText = (value: string) => value
  .replace(/\b(?:rec|ast|asmnt|alert)-[\w-]+\b/gi, "health record")
  .replace(/\bPHASE\s*[34]\b/gi, "earlier review")
  .replace(/\bRETRIEVED\b/gi, "recorded")
  .replace(/\bdeterministic\b/gi, "guided")
  .replace(/\bstatistical deviation\b/gi, "unusual reading")
  .replace(/\bSD\b/gi, "")
  .replace(/\bmedian\b/gi, "usual midpoint");

function evidenceReadings(item: Evidence): string[] {
  if (item.kind !== "record") return [];
  try {
    const record = JSON.parse(item.detail) as Record<string, unknown>;
    const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "date unavailable";
    const readings: Array<[string, unknown, string]> = [
      ["Heart rate", record.heartRateBpm, "BPM"], ["Blood pressure", record.bloodPressureMmHg, "mmHg"],
      ["Body temperature", record.temperatureC, "°C"], ["Blood sugar", record.glucoseMgDl, "mg/dL"],
      ["SpO₂", record.oxygenPercent, "%"], ["Sleep", record.sleepHours, "hours"],
      ["Sleep quality", record.sleepQuality1to5, "/5"], ["Stress", record.stress1to5, "/5"],
      ["Anxiety", record.anxiety1to5, "/5"], ["Mood", record.mood, ""],
      ["Fatigue", record.fatigue, ""], ["Symptoms", record.symptoms, ""],
    ];
    return readings.flatMap(([label, value, unit]) => value == null || value === "" ? [] : [`${label} ${value}${unit === "/5" ? unit : unit ? ` ${unit}` : ""} on ${date}`]);
  } catch { return []; }
}

const periodLabel = (period: Period) => period === "mission" ? "this mission" : `the last ${period === "24h" ? "24 hours" : period}`;

export function AIIntelligencePanel({ scope, astronautId }: { scope: Scope; astronautId?: string }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [context, setContext] = useState<Context | null>(null);
  const [contextError, setContextError] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [recommendationStatuses, setRecommendationStatuses] = useState<Record<string, RecommendationState>>({});
  const [loadedRecommendationKey, setLoadedRecommendationKey] = useState("");
  const [demoStates, setDemoStates] = useState<DemoState[]>([]);
  const [loadedDemoOwner, setLoadedDemoOwner] = useState("");
  const [missionEvaluation, setMissionEvaluation] = useState<Answer | null>(null);
  const [missionEvaluationError, setMissionEvaluationError] = useState("");
  const [missionEvaluationLoading, setMissionEvaluationLoading] = useState(false);
  const contextKey = `${scope}:${astronautId ?? "mission"}:${period}`;
  const recommendationStorageKey = `crewcare-ai-recommendation-status:${scope}:${astronautId ?? "mission"}`;
  const activeConversations = conversations;
  const currentConversation = activeConversations.find((conversation) => conversation.id === conversationId) ?? null;
  const activeRecommendationStatuses = loadedRecommendationKey === recommendationStorageKey ? recommendationStatuses : {};
  const activeContext = context?.period === period && context.scope === scope && (scope === "mission" || context.subjects[0]?.id === astronautId) ? context : null;
  const demoOwner = `${scope}:${astronautId ?? "mission"}`;
  const activeDemoStates = useMemo(() => loadedDemoOwner === demoOwner ? demoStates : [], [loadedDemoOwner, demoOwner, demoStates]);
  const visibleText = cleanDisplayText;

  useEffect(() => {
    if (scope !== "mission" || !activeContext || activeContext.subjects.length === 0) return;
    const controller = new AbortController();
    setMissionEvaluation(null); setMissionEvaluationError(""); setMissionEvaluationLoading(true);
    fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ scope: "mission", period, demoStates: activeDemoStates, question: "Review the full crew for this selected period using only the supplied measurements, individual baselines, trends, symptoms, alerts, and history. Start with a short overall verdict. Identify only crew members who need attention, explain the observed concern in plain words, and give cautious EAT, DO, and AVOID advice supported by their data. For others give one short reassuring line. Do not diagnose, invent data, medicine or doses, and never mention record IDs. Mention allergy information only when supplied." })
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The crew evaluation could not be generated.");
      if (!controller.signal.aborted) setMissionEvaluation({ analysis: data.analysis, provider: data.provider, model: data.model, generatedAt: data.generatedAt, criticalAlerts: data.criticalAlerts ?? [], evidence: activeContext.evidence });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setMissionEvaluationError(cause instanceof Error ? cause.message : "The crew evaluation could not be generated."); })
      .finally(() => { if (!controller.signal.aborted) setMissionEvaluationLoading(false); });
    return () => controller.abort();
  }, [scope, activeContext, period, activeDemoStates]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/context", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ scope, astronautId, period, demoStates: activeDemoStates }) }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load health context.");
      setContext(data.context); setContextError("");
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setContextError(cause instanceof Error ? cause.message : "Unable to load health context."); });
    return () => controller.abort();
  }, [contextKey, scope, astronautId, period, activeDemoStates]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ids = scope === "mission" ? ["ast-1", "ast-2", "ast-3", "ast-4"] : astronautId ? [astronautId] : [];
      const states: DemoState[] = [];
      for (const id of ids) {
        try {
          const records = JSON.parse(localStorage.getItem(`crewcare_checkins_${id}`) ?? "[]") as DemoState["records"];
          const latestAssessment = JSON.parse(localStorage.getItem(`crewcare_assessment_${id}`) ?? "null") as DemoState["latestAssessment"];
          const activeAlerts = JSON.parse(localStorage.getItem(`crewcare_demo_alerts_${id}`) ?? "[]") as DemoState["activeAlerts"];
          if (records.length || latestAssessment || activeAlerts.length) states.push({ astronautId: id, records, latestAssessment, activeAlerts });
        } catch { /* Ignore malformed local demo state; server uses the read-only fixture instead. */ }
      }
      setDemoStates(states); setLoadedDemoOwner(demoOwner);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [demoOwner, scope, astronautId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setRecommendationStatuses(JSON.parse(localStorage.getItem(recommendationStorageKey) ?? "{}") as Record<string, RecommendationState>); }
      catch { setRecommendationStatuses({}); }
      setLoadedRecommendationKey(recommendationStorageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recommendationStorageKey]);

  const persistConversations = useCallback((next: Conversation[]) => setConversations(next), []);

  const setRecommendationState = (key: string, status: RecommendationState) => {
    const next = { ...activeRecommendationStatuses, [key]: status };
    setRecommendationStatuses(next);
    try { localStorage.setItem(recommendationStorageKey, JSON.stringify(next)); } catch { setError("Unable to save recommendation status in browser storage."); }
  };

  const newConversation = () => { setConversationId(""); setError(""); setQuestion(""); };
  const ask = async (prompt = question, contextualPrompt?: string) => {
    const displayText = prompt.trim();
    const clean = (contextualPrompt ?? prompt).trim();
    if (clean.length < 4 || loading) return;
    setLoading(true); setError("");
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text: displayText, timestamp: new Date().toISOString() };
    try {
      const history = (currentConversation?.messages ?? []).map((message) => ({ role: message.role, text: message.role === "assistant" && message.answer ? `Verdict: ${message.answer.analysis.verdict}. What this could mean: ${message.answer.analysis.whatThisCouldMean}. What to do right now: ${message.answer.analysis.whatToDoNow.map((step, i) => `${i + 1}. ${step}`).join(" ")}. Watch out for: ${message.answer.analysis.watchOutFor.join(" ")}. When to get help immediately: ${message.answer.analysis.whenToGetHelpImmediately}.` : message.text })).slice(-100);
      const existingRecommendations = [...new Set(activeConversations.flatMap((conversation) => conversation.messages.flatMap((message) => message.answer?.analysis.recommendations.map((item) => item.title) ?? [])))].filter((title) => !Object.entries(activeRecommendationStatuses).some(([key, status]) => key.endsWith(`:${title}`) && (status === "RESOLVED" || status === "DISMISSED"))).slice(-20);
      const questionForScope = scope === "astronaut" && isCrewWideQuestion(displayText) ? `This is an astronaut-only chat for the selected astronaut. Answer only from that astronaut's supplied data. The question asks about the whole crew; clearly say you can cover only this astronaut and do not invent or infer other crew members' data. ${clean}` : clean;
      const response = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, astronautId, question: questionForScope, period, conversationHistory: history, existingRecommendations, demoStates: activeDemoStates }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "AI analysis could not be generated.");
      const analysis = data.analysis as Analysis;
      if (scope === "mission" && /sleep/i.test(displayText) && /(declin|decreas|going down|trend)/i.test(displayText) && activeContext) {
        const declining = activeContext.subjects.flatMap((subject) => subject.trends.filter((trend) => trend.indicator === "sleepDuration" && trend.direction === "decreasing").map((trend) => `${subject.displayName} (${subject.callsign}): ${trend.startingValue ?? "—"} to ${trend.latestValue ?? "—"} ${trend.unit ?? "hours"}${trend.percentChange == null ? "" : `, ${trend.percentChange}%`}`));
        analysis.whatThisCouldMean = declining.length ? `In the selected ${period === "mission" ? "mission" : period} records, sleep duration is going down for ${declining.join("; ")}. These figures compare each person with their own earlier readings.` : `No crew member has a decreasing sleep trend in the selected ${period === "mission" ? "mission" : period} records.`;
        analysis.summary = analysis.whatThisCouldMean;
      }
      const answer: Answer = { analysis, provider: data.provider, model: data.model, generatedAt: data.generatedAt, criticalAlerts: data.criticalAlerts ?? [], evidence: activeContext?.evidence ?? [] };
      const assistantMessage: Message = { id: crypto.randomUUID(), role: "assistant", text: answer.analysis.summary, answer, timestamp: answer.generatedAt };
      const existing = currentConversation;
      const conversation: Conversation = { id: existing?.id ?? crypto.randomUUID(), title: existing?.title ?? displayText.slice(0, 72), messages: [...(existing?.messages ?? []), userMessage, assistantMessage], updatedAt: answer.generatedAt };
      persistConversations([...activeConversations.filter((item) => item.id !== conversation.id), conversation]);
      setConversationId(conversation.id); setQuestion("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "AI analysis could not be generated.";
      setError(message);
      // Keep failed questions visible without presenting them as an AI answer.
      const existing = currentConversation;
      const conversation: Conversation = { id: existing?.id ?? crypto.randomUUID(), title: existing?.title ?? displayText.slice(0,72), messages: [...(existing?.messages ?? []), userMessage], updatedAt: new Date().toISOString() };
      persistConversations([...activeConversations.filter((item) => item.id !== conversation.id), conversation]);
      setConversationId(conversation.id); setQuestion("");
    } finally { setLoading(false); }
  };

  const subjects = activeContext?.subjects ?? [];
  const astronautName = subjects[0]?.displayName ?? DEMO_ASTRONAUTS.find((member) => member.id === astronautId)?.name ?? "this astronaut";
  const recordEvidence = activeContext?.evidence.filter((item) => item.kind === "record") ?? [];
  if (scope === "mission" && (!activeContext || activeContext.subjects.length === 0)) {
    return <main className={missionStyles.missionPage}>{contextError ? <div role="alert" style={{ padding: 28, color: "#1f2e2c" }}>{contextError} <button type="button" onClick={() => window.location.reload()} style={btnStyle}>Reload crew data</button></div> : <p role="status" style={{ margin: 0, padding: 28, color: "#1f2e2c", fontSize: 18 }}>Loading crew…</p>}</main>;
  }
  const deleteConversation = () => {
    if (!currentConversation) return;
    const next = activeConversations.filter((item) => item.id !== currentConversation.id);
    persistConversations(next); setConversationId("");
  };

  const aiChatCard = (
    <section className={`card ${scope === "mission" ? missionStyles.aiChatCard : ""}`} style={surface}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}>{scope === "mission" && <span className={missionStyles.chatAvatar}><Bot size={28}/></span>}<h2 className={scope === "mission" ? missionStyles.chatTitle : "section-kicker"} style={{ margin: 0 }}>{scope === "mission" ? "Ask CrewCare AI" : "ASK CREW CARE AI"}</h2></div><div style={{ display: "flex", gap: 7 }}><select aria-label="Conversation history" value={currentConversation?.id ?? ""} onChange={(event) => setConversationId(event.target.value)} style={{ background: "#ffffff", color: "#4d605d", border: "1px solid var(--line)", borderRadius: 6, fontSize: 10, padding: "6px 8px", maxWidth: 165 }}><option value="">New conversation</option>{activeConversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}</select><button onClick={newConversation} style={btnStyle}>{scope === "mission" ? "New conversation" : "New chat"}</button>{currentConversation && <button onClick={deleteConversation} style={{ ...btnStyle, color: "#b42323" }}>Delete</button>}</div></div>
      <p style={{ color: "var(--muted)", fontSize: 10, lineHeight: 1.5, margin: "0 0 12px" }}>{scope === "mission" ? "Ask about any crew member’s health — answers use the crew’s real readings and trends." : "Questions are answered from this page’s recorded data and analysis."}</p>

      <div className={scope === "mission" ? missionStyles.chatThread : undefined} aria-live="polite" style={{ maxHeight: 470, overflow: "auto", marginBottom: 12 }}>{currentConversation?.messages.map((message) => <article key={message.id} style={{ borderTop: "1px solid var(--line)", padding: "11px 0" }}>
        {message.role === "user" ? <p style={{ margin: 0, fontSize: 11, color: "var(--teal-bright)" }}>You · {new Date(message.timestamp).toLocaleString()}<br/><span style={{ color: "#4d605d" }}>{visibleText(message.text)}</span></p> : message.answer ? <div>
          {scope === "astronaut" && isCrewWideQuestion(message.text) && astronautId && <p style={{ margin: "0 0 9px", color: "#1f2e2c", fontSize: 14, fontWeight: 600 }}>This chat covers {astronautName} only — for the whole crew, ask in Mission intelligence.</p>}
          {scope === "astronaut" && <p style={{ margin: "0 0 5px", fontSize: 10, color: "var(--muted)" }}>{visibleText(message.answer.analysis.title)} · {message.answer.provider} / {message.answer.model} · {new Date(message.timestamp).toLocaleString()}</p>}
          {(() => { const verdict = answerVerdictForScope(message.answer!, scope, activeContext); return <span style={{ display: "inline-flex", border: `1px solid ${verdict === "ACT_NOW" ? "#b42323" : verdict === "WATCH" ? "#d8b96f" : "#dce6e4"}`, color: verdict === "ACT_NOW" ? "#b42323" : verdict === "WATCH" ? "#94600b" : "#08784f", borderRadius: 999, padding: "7px 12px", fontWeight: 800 }}>{verdict === "ACT_NOW" ? "Act now" : verdict === "WATCH" ? "Needs attention" : "All clear"}</span>; })()}
          {message.answer.criticalAlerts.map((alert) => <div key={alert.id} style={{ padding: "9px 10px", border: "1px solid #b42323", borderRadius: 6, color: "#b42323", fontSize: 11, margin: "8px 0" }}><AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 6 }}/>{visibleText(alert.severity)} health alert: {visibleText(alert.title)}. Follow established mission emergency procedures and contact authorized medical personnel. {visibleText(alert.message)}</div>)}
          <section><h3 style={{ fontSize: 15, margin: "14px 0 5px" }}>What this could mean</h3><p style={{ color: "#1f2e2c", fontSize: 14, lineHeight: 1.55, margin: 0 }}>{visibleText(message.answer.analysis.whatThisCouldMean)}</p></section>
          <section><h3 style={{ fontSize: 15, margin: "14px 0 5px" }}>What to do right now</h3><ol style={{ color: "#1f2e2c", fontSize: 14, lineHeight: 1.55 }}>{message.answer.analysis.whatToDoNow.map((step, i) => <li key={i}>{visibleText(step)}</li>)}</ol></section>
          <section><h3 style={{ fontSize: 15, margin: "14px 0 5px" }}>Watch out for</h3><ul style={{ color: "#1f2e2c", fontSize: 14, lineHeight: 1.55 }}>{message.answer.analysis.watchOutFor.map((item, i) => <li key={i}>{visibleText(item)}</li>)}</ul></section>
          <section><h3 style={{ fontSize: 15, margin: "14px 0 5px" }}>When to get help immediately</h3><p style={{ color: "#1f2e2c", fontSize: 14, lineHeight: 1.55, margin: 0 }}>{visibleText(message.answer.analysis.whenToGetHelpImmediately)}</p></section>
          {scope === "astronaut" && <><EvidenceLinks ids={message.answer.analysis.evidenceReferences} evidence={message.answer.evidence}/>
          {[...message.answer.analysis.historicalObservations,...message.answer.analysis.patterns,...message.answer.analysis.concerns].map((insight,index)=><div key={`${insight.title}-${index}`} style={{ padding: "8px 10px", background: "rgba(255,255,255,.025)", borderRadius: 6, marginTop: 7 }}><strong style={{ fontSize: 10 }}>{insight.title}</strong><p style={{ color: "#4d605d", fontSize: 10, lineHeight: 1.5, margin: "4px 0" }}>{insight.explanation}</p><EvidenceLinks ids={insight.evidenceIds} evidence={message.answer!.evidence}/></div>)}</>}
          {message.answer.analysis.recommendations.map((recommendation,index)=><div key={`${recommendation.title}-${index}`} style={{ padding: "9px 10px", borderLeft: "2px solid #67ded6", marginTop: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 10 }}>{visibleText(recommendation.title)} · {recommendation.priority} suggestion</strong>{scope === "astronaut" && <select aria-label={`Recommendation status: ${recommendation.title}`} value={activeRecommendationStatuses[`${message.id}:${index}:${recommendation.title}`] ?? "NEW"} onChange={(event) => setRecommendationState(`${message.id}:${index}:${recommendation.title}`, event.target.value as RecommendationState)} style={{ background: "#ffffff", color: "#4d605d", border: "1px solid var(--line)", borderRadius: 5, fontSize: 9, padding: "4px 6px" }}><option value="NEW">New</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option></select>}</div><p style={{ color: "#4d605d", fontSize: 10, lineHeight: 1.5, margin: "4px 0" }}>{visibleText(recommendation.description)}</p><p style={{ color: "#4d605d", fontSize: 10, margin: "4px 0" }}>Next step: {visibleText(recommendation.nextStep)}</p>{scope === "astronaut" && <EvidenceLinks ids={recommendation.evidenceIds} evidence={message.answer!.evidence}/>}</div>)}
          {scope === "astronaut" && message.answer.analysis.missingInformation.length>0&&<p style={{ color: "#94600b", fontSize: 10, lineHeight: 1.5 }}>Missing information: {message.answer.analysis.missingInformation.join(" · ")}</p>}
          {scope === "astronaut" && <p style={{ color: "var(--muted)", fontSize: 9, lineHeight: 1.5 }}>AI confidence {Math.round(message.answer.analysis.confidence*100)}% · {message.answer.analysis.limitations.join(" ")}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{["What if it gets worse?", "Explain it simpler", "Show the steps again"].map((chip) => { const topic = currentConversation?.messages.filter((entry) => entry.role === "user").at(-1)?.text ?? "the health concern just discussed"; const instruction = chip === "What if it gets worse?" ? `Explain what worsening of this same concern (${topic}) would look like and restate the relevant warning signs.` : chip === "Explain it simpler" ? `Re-explain your immediately previous answer about the same concern (${topic}) in simpler, shorter words.` : `Repeat the same numbered guidance from your immediately previous answer about the concern (${topic}).`; return <button key={chip} type="button" onClick={() => void ask(chip, instruction)} disabled={loading} style={{ ...btnStyle, padding: "7px 10px" }}>{chip}</button>; })}</div>
        </div> : <p style={{ color: "#4d605d", fontSize: 10 }}>No AI answer was generated.</p>}
      </article>)}</div>
            {error && <p className={scope === "mission" ? missionStyles.chatError : undefined} role="alert" style={{ color: "#b42323", fontSize: 11 }}>{error}</p>}
      <form className={scope === "mission" ? missionStyles.chatForm : undefined} onSubmit={(event) => { event.preventDefault(); void ask(); }} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} maxLength={600} placeholder={scope === "mission" ? "Which crew members have declining sleep trends?" : "How has my sleep changed over the last 30 days?"} rows={scope === "mission" ? 3 : 2} style={{ flex: 1, resize: "vertical", background: "#ffffff", border: "1px solid var(--line)", borderRadius: 7, color: "#1f2e2c", padding: scope === "mission" ? 16 : 10, font: scope === "mission" ? "18px DM Sans" : "11px DM Sans" }}/><button type="submit" className={scope === "mission" ? missionStyles.askButton : undefined} disabled={loading || question.trim().length < 4} style={{ ...btnStyle, display: "flex", alignItems: "center", gap: 7, opacity: loading ? .65 : 1 }}>{loading ? <LoaderCircle size={14} className="spin"/> : <Send size={14}/>} {loading ? "Analyzing" : "Ask AI"}</button></form>
      {scope === "mission" && <div className={missionStyles.exampleQuestions}>{["Which crew members have declining sleep trends?", "Who needs attention right now?", "Why is CIPHER's blood pressure rising?", "What should I do about the sleep problem?"].map((prompt) => <button key={prompt} type="button" onClick={() => setQuestion(prompt)} disabled={loading}>{prompt}</button>)}</div>}
      {scope === "astronaut" && <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 9 }}><span className="section-kicker" style={{ margin: 0 }}>QUICK QUESTIONS</span>{["How am I doing today?", "What changed this week?", "Explain my latest assessment", "How is my sleep compared with baseline?"].map((prompt) => <button key={prompt} type="button" onClick={() => { setQuestion(prompt); void ask(prompt); }} disabled={loading} style={{ ...btnStyle, padding: "6px 8px", fontSize: 9 }}>{prompt}</button>)}</div>}
      <p style={{ fontSize: 9, color: "var(--muted)", margin: "8px 0 0" }}>This conversation is kept while you stay on this page. Reloading starts a new conversation. Do not enter identifying personal information.</p>
    </section>
  );

  return <div className={scope === "mission" ? missionStyles.missionPage : undefined}>
    <header className={scope === "mission" ? missionStyles.missionHeader : undefined} style={{ marginBottom: 20 }}>
      <p className="section-kicker">AI HEALTH INTELLIGENCE · {scope === "mission" ? "MISSION CONTROL" : subjects[0]?.callsign ?? "ASTRONAUT PORTAL"}</p>
      <h1 style={{ font: "500 25px Manrope", margin: "0 0 6px" }}>{scope === "mission" ? "Mission intelligence" : "Health intelligence"}</h1>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>{scope === "mission" ? "A crew-wide evaluation of current readings and personal trends." : `Evidence-led reasoning over ${period === "mission" ? "all available mission" : `the last ${period}`} records. AI suggestions do not replace medical review.`}</p>
    </header>

    {scope === "mission" && aiChatCard}
    {scope === "mission" && <MissionLegend/>}
    {scope === "mission" && <MissionStatusBoard subjects={activeContext?.subjects ?? []}/>}

    {scope === "astronaut" && subjects[0] && <section className="agent-welcome" aria-label="Health review summary">
      <div className="agent-welcome-orb" aria-hidden="true"><span/></div>
      <div><span className="section-kicker">CREWCARE · HEALTH REVIEW</span><h2>Ultimate review</h2><p>{subjects[0].latestAssessment ? `Your latest assessment is ${subjects[0].latestAssessment.status}: ${visibleText(subjects[0].latestAssessment.summary)}` : "No assessment is available yet."} This review uses {subjects[0].recordsInPeriod} recorded health records for this period and {subjects[0].activeAlerts.length} active alerts. Ask a question below for evidence-linked analysis{activeContext?.healthDataIsSimulated ? "; this profile uses simulated data." : "."}</p></div>
    </section>}

    <div className={`card ${scope === "mission" ? missionStyles.periodCard : ""}`} style={{ ...surface, borderColor: "#16825d" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}><ShieldCheck size={16} color="var(--teal)"/><span style={{ fontSize: 11, color: "#4d605d" }}>{scope === "mission" ? `Simulated crew data · ${subjects.length} members` : `Demo data only · ${subjects.length} subject${subjects.length === 1 ? "" : "s"} · ${activeContext?.evidence.length ?? 0} evidence items`}</span></div>
        <div style={{ display: "flex", gap: 6 }}>{(["24h","7d","30d","90d","mission"] as Period[]).map((value) => <button key={value} onClick={() => setPeriod(value)} style={{ ...btnStyle, padding: "6px 9px", color: period === value ? "var(--teal-bright)" : "var(--muted)", borderColor: period === value ? "var(--teal)" : "var(--line)" }}>{value === "mission" ? "Mission" : value}</button>)}</div>
      </div>
      {contextError && <p role="alert" style={{ color: "#b42323", fontSize: 11, marginBottom: 0 }}>{contextError}</p>}
      {activeContext?.missingInformation.length ? <p style={{ color: "#94600b", fontSize: 10, lineHeight: 1.5, margin: "10px 0 0" }}>Missing from latest records: {activeContext.missingInformation.slice(0, 5).join(" · ")}</p> : null}
    </div>

    {scope === "mission" && <MissionEvaluation context={activeContext} answer={missionEvaluation} loading={missionEvaluationLoading} error={missionEvaluationError} period={period}/>}

    {scope === "astronaut" && subjects.map((subject) => <section className="card" key={subject.id} style={surface}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><div><p className="section-kicker" style={{ margin: "0 0 4px" }}>ULTIMATE REVIEW</p><strong style={{ color: subject.latestAssessment?.status === "RED" ? "#ef4444" : subject.latestAssessment?.status === "AMBER" ? "#f59e0b" : "#10b981" }}>{subject.latestAssessment?.status ?? "NOT AVAILABLE"}</strong><p style={{ color: "#4d605d", fontSize: 11, margin: "6px 0" }}>{visibleText(subject.latestAssessment?.summary ?? "No assessment is available.")}</p></div><div style={{ minWidth: 190 }}><p className="section-kicker" style={{ margin: "0 0 5px" }}>LATEST CHECK-IN</p><p style={{ fontSize: 11, color: "#4d605d", margin: 0 }}>{subject.currentMeasurements?.recordedAt ? new Date(String(subject.currentMeasurements.recordedAt)).toLocaleString() : "No current record"}</p><p style={{ fontSize: 10, color: "var(--muted)", margin: "4px 0" }}>{subject.recordsInPeriod} records in selected period</p></div></div>
      {subject.activeAlerts.map((alert) => <div key={alert.id} style={{ padding: "8px 10px", borderLeft: "2px solid #ef4444", background: "rgba(239,68,68,.06)", marginTop: 10, fontSize: 11 }}><strong>{visibleText(alert.severity)} · {visibleText(alert.title)}</strong><p style={{ color: "#4d605d", margin: "4px 0 0" }}>{visibleText(alert.message)}</p></div>)}
    </section>)}

    {scope === "astronaut" && subjects.map((subject) => <section key={`signals-${subject.id}`} style={{ marginBottom: 18 }}>
      <h2 className="section-kicker" style={{ margin: "0 0 9px" }}>Personal trends</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 9 }}>{subject.baselines.filter((baseline) => ["heartRate","sleepDuration","sleepQuality","stressLevel","anxietyLevel"].includes(baseline.indicator)).map((baseline) => <div className="card" key={baseline.indicator} style={{ padding: 12 }}><span className="section-kicker">{baseline.label.toUpperCase()}</span><strong style={{ display: "block", fontSize: 14, marginTop: 5 }}>{baseline.sufficient ? `${baseline.mean} ${baseline.unit}` : "Insufficient data"}</strong><small style={{ display: "block", color: "var(--muted)", fontSize: 9, marginTop: 4 }}>{baseline.sufficient ? `Range ${baseline.minimum}–${baseline.maximum} · ${baseline.count} records` : `${baseline.count} observations`}</small></div>)}</div>
      {subject.patterns.length > 0 && <div className="card" style={{ ...surface, marginTop: 10, marginBottom: 0 }}><span className="section-kicker">What stands out</span>{subject.patterns.slice(0,3).map((pattern,index) => <p key={`${pattern.category}-${index}`} style={{ color: "#4d605d", fontSize: 11, lineHeight: 1.5, margin: "7px 0 0" }}>{visibleText(pattern.explanation)} <a href="#evidence" style={{ color: "var(--teal)" }}>View evidence</a></p>)}</div>}
    </section>)}

    {scope === "astronaut" && <section id="evidence" className="card" style={surface}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Sparkles size={15} color="var(--teal)"/><h2 className="section-kicker" style={{ margin: 0 }}>Health history evidence</h2></div>
      {recordEvidence.length > 0 && <p style={{ color: "#4d605d", fontSize: 12, margin: "0 0 10px" }}>{recordEvidence.length} check-ins in {periodLabel(period)} — latest {recordEvidence.map((item) => item.timestamp).filter(Boolean).sort().at(-1) ? new Date(recordEvidence.map((item) => item.timestamp).filter(Boolean).sort().at(-1)!).toLocaleDateString("en-GB") : "date unavailable"} · <a href="/astronaut/history" style={{ color: "var(--teal)" }}>Open health history</a></p>}
      <div style={{ maxHeight: 310, overflow: "auto" }}>{recordEvidence.map((item) => <details key={`${item.kind}-${item.id}`} style={{ borderTop: "1px solid var(--line)", padding: "8px 0" }}><summary style={{ cursor: "pointer", fontSize: 12, color: "#4d605d" }}>Health check-in · {item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-GB") : "date unavailable"}</summary><ul style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.6, margin: "7px 0 0", paddingLeft: 18 }}>{evidenceReadings(item).map((reading) => <li key={reading}>{visibleText(reading)}</li>)}</ul></details>)}</div>
    </section>}

{scope === "astronaut" && aiChatCard}
    <p style={{ fontSize: 9, color: "#08784f", lineHeight: 1.5 }}>CrewCare is decision support only; this is not a diagnosis. {activeContext?.healthDataIsSimulated ? "All shown health history is fictional, simulated demo data." : ""}</p>
  </div>;
}

function EvidenceLinks({ ids, evidence }: { ids: string[]; evidence: Evidence[] }) {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const readings = [...new Set(ids.flatMap((id) => { const item = evidenceById.get(id); return item ? evidenceReadings(item) : []; }))];
  return readings.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{readings.map((reading) => <a href="#evidence" key={reading} style={{ color: "var(--teal)", fontSize: 10, border: "1px solid var(--line)", borderRadius: 4, padding: "3px 6px" }}>{cleanDisplayText(reading)}</a>)}</div> : null;
}

type MissionPoint = { value: number; date: string };
function missionPoints(context: Context | null, subject: Subject, key: string): MissionPoint[] {
  const recordKey: Record<string, string> = {
    heartRate: "heartRateBpm", heartRateBpm: "heartRateBpm",
    systolicBP: "bloodPressureMmHg", diastolicBP: "bloodPressureMmHg", bloodPressureMmHg: "bloodPressureMmHg",
    sleepDuration: "sleepHours", sleep: "sleepHours", sleepHours: "sleepHours",
    stressLevel: "stress1to5", stress: "stress1to5", stress1to5: "stress1to5",
    anxietyLevel: "anxiety1to5", anxiety: "anxiety1to5", anxiety1to5: "anxiety1to5",
    oxygenSat: "oxygenPercent", oxygen: "oxygenPercent", oxygenPercent: "oxygenPercent",
    bodyTemp: "temperatureC", bodyTemperature: "temperatureC", temperature: "temperatureC", temperatureC: "temperatureC",
    bloodGlucose: "glucoseMgDl", glucose: "glucoseMgDl", glucoseMgDl: "glucoseMgDl",
    mood: "mood", fatigue: "fatigue",
  };
  const field = recordKey[key] ?? key;
  return (context?.evidence ?? []).filter((item) => item.kind === "record" && item.label.endsWith(`· ${subject.callsign}`)).flatMap((item) => {
    try {
      const row = JSON.parse(item.detail) as Record<string, unknown>;
      const raw = row[field];
      const scores: Record<string, number> = { VERY_LOW: 1, LOW: 2, NEUTRAL: 3, GOOD: 4, EXCELLENT: 5, EXHAUSTED: 1, VERY_TIRED: 2, TIRED: 3, MODERATE: 4, REFRESHED: 5 };
      const value = field === "bloodPressureMmHg" ? Number(String(raw).split("/")[key === "diastolicBP" ? 1 : 0]) : field === "mood" || field === "fatigue" ? typeof raw === "string" ? scores[raw] : raw : typeof raw === "string" ? Number(raw) : raw;
      return typeof value === "number" && Number.isFinite(value) ? [{ value, date: String(row.recordedAt ?? item.timestamp ?? "") }] : [];
    }
    catch { return []; }
  }).sort((a, b) => a.date.localeCompare(b.date));
}
function MissionSpark({ points, band, threshold, bars = false, label }: { points: MissionPoint[]; band?: [number | null, number | null]; threshold?: number; bars?: boolean; label: string }) {
  if (!points.length) return <div className={missionStyles.chartEmpty}>No readings</div>;
  const values: number[] = [...points.map((point) => point.value), ...(band ?? []).flatMap((item) => item == null ? [] : [item]), ...(threshold == null ? [] : [threshold])];
  const low = Math.min(...values), high = Math.max(...values), span = high - low || 1;
  const x = (index: number) => points.length < 2 ? 160 : 8 + index * 304 / (points.length - 1);
  const y = (value: number) => 66 - (value - low) * 54 / span;
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`).join(" ");
  const lowBand = band?.[0], highBand = band?.[1], inBand = lowBand != null && highBand != null;
  return <svg className={bars ? missionStyles.barChart : missionStyles.lineChart} viewBox="0 0 320 76" role="img" aria-label={label}>
    {inBand && <rect x="5" width="310" y={y(highBand)} height={Math.max(2, y(lowBand) - y(highBand))} className={missionStyles.rangeBand}/>}
    {threshold != null && <><line x1="5" x2="315" y1={y(threshold)} y2={y(threshold)} className={missionStyles.threshold}/><text x="8" y={Math.max(10,y(threshold)-3)} className={missionStyles.thresholdText}>{threshold}</text></>}
    {bars ? points.map((point, index) => <rect key={`${point.date}-${index}`} x={x(index)-15} y={y(point.value)} width="30" height={Math.max(3,68-y(point.value))} rx="4" className={missionStyles.bar}/>) : <path d={path} className={missionStyles.chartLine}/>}
    {!bars && points.map((point, index) => <circle key={`${point.date}-${index}`} cx={x(index)} cy={y(point.value)} r="3.5" className={band && (point.value < (band[0] ?? -Infinity) || point.value > (band[1] ?? Infinity)) ? missionStyles.outlier : missionStyles.chartPoint}><title>{`${new Date(point.date).toLocaleDateString()}: ${point.value}`}</title></circle>)}
  </svg>;
}
function shortLines(text: string) { const words = text.split(/\s+/); const lines: string[] = []; for (let i = 0; i < words.length; i += 5) lines.push(words.slice(i, i + 5).join(" ")); return lines; }
function trendMark(direction?: string) { return direction === "increasing" ? ["↗", "Going up"] : direction === "decreasing" ? ["↘", "Going down"] : direction === "stable" ? ["→", "Steady"] : ["·", "No trend"]; }
function verdictFor(value: unknown, baseline?: Subject["baselines"][number]) { if (typeof value !== "number" || !baseline?.sufficient || baseline.minimum == null || baseline.maximum == null) return "No range"; return value < baseline.minimum ? "Low" : value > baseline.maximum ? "High" : "In range"; }
function MissionLegend() { return <aside className={missionStyles.legend}><strong>HOW TO READ THIS PAGE</strong><span><i className={missionStyles.legendDot}/>Status · one word</span><span>↗ / ↘ / → · trend</span><span><i className={missionStyles.legendLine}/>Sparkline · usual range + unusual points</span><span><b>In range</b> · word under every value</span></aside>; }

function MissionStatusBoard({ subjects }: { subjects: Subject[] }) {
  return <section className={missionStyles.crewBoard} aria-label="Crew status board">{subjects.length ? subjects.map((subject) => {
    const needs = subject.latestAssessment?.status === "AMBER" || subject.latestAssessment?.status === "RED" || subject.activeAlerts.length > 0 || Boolean(subject.currentMeasurements?.symptoms);
    const act = subject.latestAssessment?.status === "RED", tone = act ? "act" : needs ? "watch" : "clear";
    const trend = subject.trends.find((item) => item.indicator === "sleepDuration" && item.direction === "decreasing") ?? subject.trends.find((item) => item.indicator === "heartRate") ?? subject.trends[0];
    const [arrow, word] = trendMark(trend?.direction);
    const initials = subject.displayName.replace(/^Dr\.\s*/, "").split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
    return <article className={missionStyles.memberStatus} key={subject.id}><span className={missionStyles.avatar}>{initials}</span><div className={missionStyles.memberIdentity}><strong>{subject.displayName}</strong><small>{subject.callsign} · {subject.recordsInPeriod} records</small></div><div className={`${missionStyles.statusRing} ${missionStyles[tone]}`}><span/></div><span className={`${missionStyles.statusWord} ${missionStyles[`${tone}Text`]}`}>{act ? "Act now" : needs ? "Needs attention" : "All clear"}</span><span className={missionStyles.trendBadge}>{arrow} {word}</span></article>;
  }) : <div className={missionStyles.boardLoading}>Loading crew status…</div>}</section>;
}

function MissionEvaluation({ context, answer, loading, error, period }: { context: Context | null; answer: Answer | null; loading: boolean; error: string; period: Period }) {
  const subjects = context?.subjects ?? [];
  const attention = subjects.filter((subject) => subject.latestAssessment?.status === "AMBER" || subject.latestAssessment?.status === "RED" || subject.activeAlerts.length > 0 || subject.currentMeasurements?.symptoms);
  const latestDate = subjects.map((subject) => subject.currentMeasurements?.recordedAt).filter((value): value is string | number => typeof value === "string" || typeof value === "number").sort().at(-1);
  const periodMs: Record<Exclude<Period, "mission">, number> = { "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000, "90d": 90 * 86_400_000 };
  const cutoff = period === "mission" ? 0 : (latestDate ? new Date(latestDate).getTime() : Date.now()) - periodMs[period];
  const groups = new Map<string, { subject: Subject; label: string; direction: "higher" | "lower" | "outside"; items: Subject["anomalies"] }>();
  subjects.forEach((subject) => subject.anomalies.filter((item) => !item.timestamp || new Date(item.timestamp).getTime() >= cutoff).forEach((item) => {
    const key = `${subject.id}:${item.indicator}:${item.actualValue != null && item.expectedMaximum != null && item.actualValue > item.expectedMaximum ? "higher" : item.actualValue != null && item.expectedMinimum != null && item.actualValue < item.expectedMinimum ? "lower" : "outside"}`;
    const direction = item.actualValue != null && item.expectedMaximum != null && item.actualValue > item.expectedMaximum ? "higher" : item.actualValue != null && item.expectedMinimum != null && item.actualValue < item.expectedMinimum ? "lower" : "outside";
    const group = groups.get(key) ?? { subject, label: item.label, direction, items: [] };
    group.items.push(item); groups.set(key, group);
  }));
  const findings = [...groups.values()].map((group) => ({ ...group, items: group.items.sort((a, b) => new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime()) })).sort((a, b) => {
    const distance = (group: typeof a) => Math.max(...group.items.map((item) => item.actualValue != null && item.expectedMinimum != null && item.expectedMaximum != null ? Math.max(item.expectedMinimum - item.actualValue, item.actualValue - item.expectedMaximum, 0) : 0));
    return distance(b) - distance(a);
  }).slice(0, 5);
  const plain = cleanDisplayText;
  const fmt = (value: unknown) => value == null ? "not recorded" : String(value);
  const dataItems = (subject: Subject) => [
    ["Heart rate", subject.currentMeasurements?.heartRateBpm, "bpm"], ["Blood pressure", subject.currentMeasurements?.bloodPressureMmHg, "mmHg"],
    ["Sleep", subject.currentMeasurements?.sleepHours, "h"], ["Oxygen", subject.currentMeasurements?.oxygenPercent, "%"],
    ["Temperature", subject.currentMeasurements?.temperatureC, "°C"], ["Blood sugar", subject.currentMeasurements?.glucoseMgDl, "mg/dL"],
  ].filter(([, value]) => value != null);
  const statusText = answer?.analysis.verdict === "ACT_NOW" ? "Act now" : answer?.analysis.verdict === "WATCH" || attention.length ? "Needs attention" : "All clear";
  const recommendationsFor = (subject: Subject) => {
    const measures = subject.currentMeasurements ?? {};
    const sleep = Number(measures.sleepHours);
    const bp = String(measures.bloodPressureMmHg ?? "").split("/").map(Number);
    const fatigue = String(measures.fatigue ?? "");
    const symptom = String(measures.symptoms ?? "");
    const sleepTrend = subject.recent14DayTrends?.find((item) => item.indicator === "sleepDuration");
    const sleepNeedsAttention = (Number.isFinite(sleep) && sleep < 6) || sleepTrend?.direction === "decreasing";
    const elevatedPressure = bp.length === 2 && (bp[0] >= 135 || bp[1] >= 85);
    return {
      eat: elevatedPressure ? "Choose lower-salt options from the mission meal plan; avoid making treatment changes from one reading." : "Keep regular meals and follow the mission nutrition and hydration plan.",
      do: `${elevatedPressure ? "Rest quietly and repeat the blood-pressure check using the approved method. " : "Continue scheduled check-ins. "}${sleepNeedsAttention ? "Protect a fixed sleep opportunity and record whether short sleep continues. " : "Keep the planned rest routine. "}${fatigue && fatigue !== "REFRESHED" && fatigue !== "MODERATE" ? "Record ongoing fatigue alongside the next check-in. " : ""}${symptom ? `Track reported symptoms: ${symptom}.` : ""}`.trim(),
      avoid: `${elevatedPressure ? "Avoid strenuous activity immediately before a repeat reading. " : "Avoid changing routines based on a single measurement. "}${sleepNeedsAttention ? "Avoid screens and stimulating activity before the planned sleep period." : "Avoid late stimulating activity before rest."}`,
    };
  };
  return <>
    {!context ? <section className="card" role="status" style={surface}>Loading crew health data…</section> : <>
      <section className={missionStyles.verdictCard}>
        <div className={`${missionStyles.verdictGauge} ${missionStyles[statusText === "Act now" ? "act" : attention.length ? "watch" : "clear"]}`}><strong>{attention.length}</strong><small>needs attention</small></div>
        <div className={missionStyles.verdictCopy}><p className="section-kicker">CREW EVALUATION · {period === "mission" ? "MISSION" : period.toUpperCase()}</p><h2>{answer ? statusText : attention.length ? "Needs attention" : loading ? "Updating review…" : "All clear"}</h2>
          <p>{answer ? plain(answer.analysis.whatThisCouldMean || answer.analysis.summary) : loading ? "AI is reviewing crew readings and trends." : "No current crew concerns found in the loaded review."}</p>
          {loading && <span role="status">Updating evaluation…</span>}{error && <span role="alert">Evaluation unavailable: {error}</span>}
          <small>{context.evidence.filter((item) => item.kind === "record").length} records · latest {latestDate ? new Date(latestDate).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "date unavailable"} · {subjects.length} crew members</small>
        </div>
      </section>
      <section className={missionStyles.section}>
        <h2>Crew who need attention</h2>
        {attention.length ? attention.map((subject) => {
          const advice = recommendationsFor(subject);
          const storedAllergies = subject.allergies?.length ? `Stored allergies: ${subject.allergies.join(", ")}.` : "Allergy information is not stored for this crew profile.";
          const allergySafe = subject.allergies?.length ? "Do not use a medicine unless mission medical guidance confirms it is safe with these allergies." : "No medicine in the kit for this — do the non-medicine steps. Allergy information is not stored, and the sample inventory is unverified.";
          const relevantAlerts = subject.activeAlerts;
          const symptomRecords = (context?.evidence ?? []).filter((item) => item.kind === "record" && item.label.endsWith(`· ${subject.callsign}`)).flatMap((item) => {
            try { const value = JSON.parse(item.detail) as { symptoms?: string | null; recordedAt?: string }; return value.symptoms ? [{ symptoms: value.symptoms, recordedAt: value.recordedAt ?? item.timestamp }] : []; } catch { return []; }
          });
          return <article className="card" key={subject.id} style={{ ...surface, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div><span className={`${missionStyles.subjectStatus} ${subject.latestAssessment?.status === "RED" ? missionStyles.actText : missionStyles.watchText}`}><i/> {subject.latestAssessment?.status === "RED" ? "Act now" : "Needs attention"} · {subject.callsign}</span><h3 className={missionStyles.subjectName}>{subject.displayName}</h3><p className={missionStyles.subjectSummary}>{plain(subject.latestAssessment?.summary ?? "Current readings or alerts need review.")}</p></div>
              <Link href={`/mission-control/crew/${encodeURIComponent(subject.id)}`} className="btn btn-primary" style={{ textDecoration: "none" }}>View profile →</Link>
            </div>
            {symptomRecords.length > 0 && <p style={{ color: "#4d605d", fontSize: 13, margin: "10px 0 0" }}>Recent recorded symptoms: {symptomRecords.slice(-3).map((item) => `${item.symptoms}${item.recordedAt ? ` (${new Date(item.recordedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })})` : ""}`).join(" · ")}.</p>}
            <div className={missionStyles.adviceCards}>
              {[["🍽","EAT", advice.eat], ["✅","DO", advice.do || "Continue the planned routine and record the next check-in."], ["🚫","AVOID", advice.avoid]].map(([icon,label, text]) => <div key={label} className={missionStyles.adviceCard}><span>{icon}</span><strong>{label}</strong><div>{shortLines(String(text)).map((line,index)=><small key={index}>{line}</small>)}</div></div>)}
            </div>
            <div className={missionStyles.attentionCharts}>
              <div className={missionStyles.miniChart}><strong>Blood pressure · last 5 days</strong><span>135 mmHg reference line</span><MissionSpark points={missionPoints(context,subject,"bloodPressureMmHg").slice(-5)} threshold={135} label={`${subject.callsign} systolic blood pressure over five days`}/><small>{missionPoints(context,subject,"bloodPressureMmHg").slice(-5).map((point) => `${new Date(point.date).toLocaleDateString(undefined,{day:"numeric",month:"short"})}: ${point.value}`).join(" · ")}</small></div>
              <div className={missionStyles.miniChart}><strong>Sleep · last 3 nights</strong><span>6-hour reference line</span><MissionSpark points={missionPoints(context,subject,"sleepHours").slice(-3)} threshold={6} bars label={`${subject.callsign} sleep hours over three nights`}/><small>{missionPoints(context,subject,"sleepHours").slice(-3).map((point) => `${point.value}h`).join(" · ")}</small></div>
            </div>
            <p className={missionStyles.medicineNote}>Simulated sample kit — not verified onboard inventory.</p><details className={missionStyles.medicineNote}><summary>Medicine safety</summary><p>{storedAllergies} {SAMPLE_MEDICAL_KIT.items.length ? "The sample kit is simulated and not verified for this spacecraft." : ""} {allergySafe}</p></details>
            <div className={missionStyles.alertChips}>{relevantAlerts.map((alert) => <span key={alert.id}><AlertTriangle size={14}/>{plain(alert.title)}</span>)}</div>
            <details style={{ marginTop: 13, borderTop: "1px solid var(--line)", paddingTop: 10 }}><summary style={{ cursor: "pointer", color: "var(--teal)", fontSize: 13 }}>View the numbers</summary>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginTop: 10 }}>{dataItems(subject).map(([label, value, unit]) => <div key={String(label)} style={{ padding: 9, background: "rgba(255,255,255,.025)", borderRadius: 6 }}><span style={{ color: "var(--muted)", fontSize: 11 }}>{label}</span><strong style={{ display: "block", marginTop: 4 }}>{fmt(value)} {unit}</strong></div>)}</div>
              <p style={{ color: "var(--muted)", fontSize: 12, margin: "10px 0 0" }}>Personal ranges and trends</p>
              {subject.baselines.filter((item) => ["heartRate", "systolicBP", "diastolicBP", "sleepDuration", "oxygenSat", "bodyTemp"].includes(item.indicator)).map((item) => {
                const trend = subject.trends.find((row) => row.indicator === item.indicator);
                const verdict = trend?.direction === "increasing" ? "Going up" : trend?.direction === "decreasing" ? "Going down" : trend?.direction === "stable" ? "Steady" : "Not enough history";
                return <p key={item.indicator} style={{ color: "#4d605d", fontSize: 12, margin: "5px 0" }}>{item.label}: {item.sufficient ? `usual ${item.minimum}–${item.maximum} ${item.unit}` : "usual range unavailable"} · {verdict}</p>;
              })}
              {relevantAlerts.map((alert) => <p key={`evidence-${alert.id}`} style={{ color: "#4d605d", fontSize: 12, margin: "5px 0" }}>Alert: {plain(alert.title)} — {plain(alert.message)}</p>)}
            </details>
          </article>;
        }) : <div className="card" style={{ ...surface, color: "#08784f" }}>No crew member currently needs attention in the available readings.</div>}
        {subjects.filter((subject) => !attention.some((item) => item.id === subject.id)).map((subject) => <p key={subject.id} style={{ margin: "7px 0", color: "#4d605d", fontSize: 13 }}><strong>{subject.displayName} ({subject.callsign}):</strong> No current alert or flagged assessment in this period.</p>)}
      </section>
      <section className={missionStyles.section}>
        <h2>What stands out</h2><p className={missionStyles.sectionIntro}>Changes compared with each crew member’s earlier records</p>
        {findings.length ? <div className={missionStyles.findingsGrid}>{findings.map((group) => {
          const extreme = group.items.reduce((best, item) => item.actualValue != null && (best.actualValue == null || (group.direction === "lower" ? item.actualValue < best.actualValue : item.actualValue > best.actualValue)) ? item : best, group.items[0]);
          const dates = group.items.map((item) => item.timestamp ? new Date(item.timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "date unavailable");
          const series = missionPoints(context,group.subject,extreme.indicator);
          const uniqueDates = [...new Set(dates)], shownDates = uniqueDates.slice(0, 3).join(", ");
          return <article className={missionStyles.findingRow} key={`${group.subject.id}-${extreme.indicator}`}><Activity size={15}/><MissionSpark points={series.slice(-8)} band={[extreme.expectedMinimum ?? null,extreme.expectedMaximum ?? null]} label={`${group.subject.callsign} ${group.label} trend`}/><p><strong>{group.subject.callsign} · {group.label}</strong> {group.direction === "outside" ? "outside usual range" : `${group.direction} than usual`} {group.items.length}× ({shownDates}{uniqueDates.length > 3 ? ` +${uniqueDates.length - 3}` : ""}) · {group.direction === "lower" ? "lowest" : "highest"} <b>{fmt(extreme.actualValue)} {extreme.unit}</b></p></article>;
        })}</div> : <div className={missionStyles.findingEmpty}>Nothing unusual — no marked changes were found for this period.</div>}
        <p className={missionStyles.honesty}>This describes past records — not a diagnosis.</p>
      </section>
      <section className={missionStyles.section}><h2>Crew trends</h2><div className={missionStyles.crewTrendRows}>{subjects.map((subject) => <article className={missionStyles.crewTrendRow} key={subject.id}><strong>{subject.displayName}<small>{subject.callsign}</small></strong>{subject.baselines.filter((item) => ["heartRate", "sleepDuration", "mood", "stressLevel"].includes(item.indicator)).map((item) => {
        const trend = subject.trends.find((row) => row.indicator === item.indicator);
        const [arrow,direction] = trendMark(trend?.direction);
        const measure = item.indicator === "heartRate" ? subject.currentMeasurements?.heartRateBpm : item.indicator === "sleepDuration" ? subject.currentMeasurements?.sleepHours : item.indicator === "stressLevel" ? subject.currentMeasurements?.stress1to5 : subject.currentMeasurements?.mood;
        const dataKey = item.indicator === "heartRate" ? "heartRateBpm" : item.indicator === "sleepDuration" ? "sleepHours" : item.indicator === "stressLevel" ? "stress1to5" : "mood";
        return <div className={missionStyles.trendMetric} key={`${subject.id}-${item.indicator}`}><span>{item.label}</span><MissionSpark points={missionPoints(context,subject,dataKey).slice(-10)} band={[item.minimum,item.maximum]} label={`${subject.callsign} ${item.label} trend`}/><small>{arrow} {direction} · {fmt(measure)} {item.unit}</small><b>{verdictFor(measure,item)}</b></div>;
      })}</article>)}</div></section>
      <p style={{ color: "var(--muted)", fontSize: 12 }}>The AI evaluation uses the crew’s {context.evidence.filter((item) => item.kind === "record").length} recorded check-ins, individual ranges, trends, and current alerts. Record IDs are not displayed.</p>
    </>}
  </>;
}

