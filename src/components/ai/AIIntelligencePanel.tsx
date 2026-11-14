"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, ExternalLink, LoaderCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import type { DemoState } from "@/lib/ai/demo-state";

type Scope = "astronaut" | "mission";
type Period = "24h" | "7d" | "30d" | "90d" | "mission";
type Evidence = { id: string; kind: string; label: string; timestamp: string | null; detail: string };
type Subject = { id: string; callsign: string; displayName: string; latestAssessment: { status: string; summary: string; guidance: string | null } | null; currentMeasurements: Record<string, string | number | null> | null; recordsInPeriod: number; baselines: Array<{ indicator: string; label: string; unit: string; sufficient: boolean; count: number; mean: number | null; minimum: number | null; maximum: number | null }>; trends: Array<{ indicator: string; label: string; direction: string; explanation: string; percentChange: number | null; measurementCount: number }>; anomalies: Array<{ indicator: string; label: string; explanation: string; sourceRecordId: string; severity: string }>; patterns: Array<{ category: string; explanation: string; evidence: string[]; suggestedFollowUp: string; reliability: number }>; forecasts: Array<{ label: string; projectedValue: number; unit: string; lowerBound: number; upperBound: number; confidence: number; sourcePoints: number; explanation: string }>; activeAlerts: Array<{ id: string; severity: string; title: string; message: string }> };
type Context = { scope: Scope; period: Period; generatedAt: string; healthDataIsSimulated: boolean; subjects: Subject[]; evidence: Evidence[]; missingInformation: string[]; mission: { name: string; code: string } };
type Insight = { title: string; explanation: string; evidenceIds: string[]; confidence: number };
type Recommendation = { title: string; description: string; priority: string; indicators: string[]; evidenceIds: string[]; nextStep: string };
type Analysis = { title: string; summary: string; currentInterpretation: string; historicalObservations: Insight[]; patterns: Insight[]; concerns: Insight[]; recommendations: Recommendation[]; missingInformation: string[]; confidence: number; limitations: string[]; evidenceReferences: string[] };
type Answer = { analysis: Analysis; provider: string; model: string; generatedAt: string; criticalAlerts: Array<{ id: string; title: string; message: string; severity: string }>; evidence: Evidence[] };
type Message = { id: string; role: "user" | "assistant"; text: string; answer?: Answer; timestamp: string };
type Conversation = { id: string; title: string; messages: Message[]; updatedAt: string };
type RecommendationState = "NEW" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";

const surface: React.CSSProperties = { padding: 18, marginBottom: 14 };
const btnStyle: React.CSSProperties = { background: "rgba(103,222,214,.09)", color: "var(--teal-bright)", border: "1px solid var(--line)", borderRadius: 7, padding: "9px 13px", fontSize: 11, fontWeight: 600, cursor: "pointer" };
const pct = (value: number | null) => value == null ? "—" : `${value > 0 ? "+" : ""}${value}%`;

export function AIIntelligencePanel({ scope, astronautId }: { scope: Scope; astronautId?: string }) {
  const [period, setPeriod] = useState<Period>(scope === "astronaut" ? "30d" : "7d");
  const [context, setContext] = useState<Context | null>(null);
  const [contextError, setContextError] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const [recommendationStatuses, setRecommendationStatuses] = useState<Record<string, RecommendationState>>({});
  const [loadedRecommendationKey, setLoadedRecommendationKey] = useState("");
  const [demoStates, setDemoStates] = useState<DemoState[]>([]);
  const [loadedDemoOwner, setLoadedDemoOwner] = useState("");
  const contextKey = `${scope}:${astronautId ?? "mission"}:${period}`;
  const storageKey = `crewcare-ai-conversations:${scope}:${astronautId ?? "mission"}`;
  const recommendationStorageKey = `crewcare-ai-recommendation-status:${scope}:${astronautId ?? "mission"}`;
  const activeConversations = loadedStorageKey === storageKey ? conversations : [];
  const currentConversation = activeConversations.find((conversation) => conversation.id === conversationId) ?? activeConversations[0] ?? null;
  const activeRecommendationStatuses = loadedRecommendationKey === recommendationStorageKey ? recommendationStatuses : {};
  const activeContext = context?.period === period && context.scope === scope && (scope === "mission" || context.subjects[0]?.id === astronautId) ? context : null;
  const demoOwner = `${scope}:${astronautId ?? "mission"}`;
  const activeDemoStates = useMemo(() => loadedDemoOwner === demoOwner ? demoStates : [], [loadedDemoOwner, demoOwner, demoStates]);

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
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as Conversation[];
        const saved = Array.isArray(parsed) ? parsed : [];
        setConversations(saved); setConversationId(saved[0]?.id ?? "");
      } catch { setConversations([]); setConversationId(""); }
      setLoadedStorageKey(storageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setRecommendationStatuses(JSON.parse(localStorage.getItem(recommendationStorageKey) ?? "{}") as Record<string, RecommendationState>); }
      catch { setRecommendationStatuses({}); }
      setLoadedRecommendationKey(recommendationStorageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recommendationStorageKey]);

  const persistConversations = useCallback((next: Conversation[]) => {
    setConversations(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 20))); } catch { setError("Conversation storage is full; earlier local demo conversations may need to be cleared."); }
  }, [storageKey]);

  const setRecommendationState = (key: string, status: RecommendationState) => {
    const next = { ...activeRecommendationStatuses, [key]: status };
    setRecommendationStatuses(next);
    try { localStorage.setItem(recommendationStorageKey, JSON.stringify(next)); } catch { setError("Unable to save recommendation status in browser storage."); }
  };

  const newConversation = () => { setConversationId(""); setError(""); };
  const ask = async (prompt = question) => {
    const clean = prompt.trim();
    if (clean.length < 4 || loading) return;
    setLoading(true); setError("");
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text: clean, timestamp: new Date().toISOString() };
    try {
      const history = (currentConversation?.messages ?? []).slice(-8).map((message) => ({ role: message.role, text: message.role === "assistant" ? message.answer?.analysis.summary ?? message.text : message.text }));
      const existingRecommendations = [...new Set(activeConversations.flatMap((conversation) => conversation.messages.flatMap((message) => message.answer?.analysis.recommendations.map((item) => item.title) ?? [])))].filter((title) => !Object.entries(activeRecommendationStatuses).some(([key, status]) => key.endsWith(`:${title}`) && (status === "RESOLVED" || status === "DISMISSED"))).slice(-20);
      const response = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, astronautId, question: clean, period, conversationHistory: history, existingRecommendations, demoStates: activeDemoStates }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "AI analysis could not be generated.");
      const answer: Answer = { analysis: data.analysis, provider: data.provider, model: data.model, generatedAt: data.generatedAt, criticalAlerts: data.criticalAlerts ?? [], evidence: activeContext?.evidence ?? [] };
      const assistantMessage: Message = { id: crypto.randomUUID(), role: "assistant", text: answer.analysis.summary, answer, timestamp: answer.generatedAt };
      const existing = currentConversation;
      const conversation: Conversation = { id: existing?.id ?? crypto.randomUUID(), title: existing?.title ?? clean.slice(0, 72), messages: [...(existing?.messages ?? []), userMessage, assistantMessage], updatedAt: answer.generatedAt };
      persistConversations([conversation, ...activeConversations.filter((item) => item.id !== conversation.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setConversationId(conversation.id); setQuestion("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "AI analysis could not be generated.";
      setError(message);
      // Keep failed questions visible without presenting them as an AI answer.
      const existing = currentConversation;
      const conversation: Conversation = { id: existing?.id ?? crypto.randomUUID(), title: existing?.title ?? clean.slice(0,72), messages: [...(existing?.messages ?? []), userMessage], updatedAt: new Date().toISOString() };
      persistConversations([conversation, ...activeConversations.filter((item) => item.id !== conversation.id)]);
      setConversationId(conversation.id); setQuestion("");
    } finally { setLoading(false); }
  };

  const subjects = activeContext?.subjects ?? [];
  const recordEvidence = activeContext?.evidence.filter((item) => item.kind === "record") ?? [];
  const deleteConversation = () => {
    if (!currentConversation) return;
    const next = activeConversations.filter((item) => item.id !== currentConversation.id);
    persistConversations(next); setConversationId(next[0]?.id ?? "");
  };

  return <div>
    <header style={{ marginBottom: 20 }}>
      <p className="section-kicker">AI HEALTH INTELLIGENCE · {scope === "mission" ? "MISSION CONTROL" : subjects[0]?.callsign ?? "ASTRONAUT PORTAL"}</p>
      <h1 style={{ font: "500 25px Manrope", margin: "0 0 6px" }}>{scope === "mission" ? "Mission intelligence" : "Health intelligence"}</h1>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Evidence-led reasoning over {period === "mission" ? "all available mission" : `the last ${period}`} records. AI suggestions do not replace Phase 3 assessments or medical review.</p>
    </header>

    {scope === "astronaut" && subjects[0] && <section className="agent-welcome" aria-label="Retrieved health context summary">
      <div className="agent-welcome-orb" aria-hidden="true"><span/></div>
      <div><span className="section-kicker">CREW CARE MEDICAL ASSISTANT · RETRIEVED CONTEXT</span><h2>Welcome, {subjects[0].callsign}.</h2><p>{subjects[0].latestAssessment ? `Your latest deterministic assessment is ${subjects[0].latestAssessment.status}: ${subjects[0].latestAssessment.summary}` : "No assessment is available yet."} Retrieved {subjects[0].recordsInPeriod} health records for this period and {subjects[0].activeAlerts.length} active alerts. This is a data summary, not an AI-generated interpretation. Ask a question below for evidence-linked analysis{activeContext?.healthDataIsSimulated ? "; this profile uses simulated data." : "."}</p></div>
    </section>}

    <div className="card" style={{ ...surface, borderColor: "rgba(103,222,214,.22)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}><ShieldCheck size={16} color="var(--teal)"/><span style={{ fontSize: 11, color: "#a8c5c1" }}>Demo data only · {subjects.length} subject{subjects.length === 1 ? "" : "s"} · {activeContext?.evidence.length ?? 0} evidence items</span></div>
        <div style={{ display: "flex", gap: 6 }}>{(["24h","7d","30d","90d","mission"] as Period[]).map((value) => <button key={value} onClick={() => setPeriod(value)} style={{ ...btnStyle, padding: "6px 9px", color: period === value ? "var(--teal-bright)" : "var(--muted)", borderColor: period === value ? "var(--teal)" : "var(--line)" }}>{value === "mission" ? "Mission" : value}</button>)}</div>
      </div>
      {contextError && <p role="alert" style={{ color: "#f2a5a5", fontSize: 11, marginBottom: 0 }}>{contextError}</p>}
      {activeContext?.missingInformation.length ? <p style={{ color: "#d2b977", fontSize: 10, lineHeight: 1.5, margin: "10px 0 0" }}>Missing from latest records: {activeContext.missingInformation.slice(0, 5).join(" · ")}</p> : null}
    </div>

    {scope === "mission" ? <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12, marginBottom: 18 }}>{subjects.map((subject) => <article className="card" key={subject.id} style={{ ...surface, margin: 0 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong style={{ font: "500 16px Manrope" }}>{subject.callsign}</strong><span style={{ color: subject.latestAssessment?.status === "RED" ? "#ef4444" : subject.latestAssessment?.status === "AMBER" ? "#f59e0b" : "#10b981", fontSize: 10 }}>{subject.latestAssessment?.status ?? "NO ASSESSMENT"} · Phase 3</span></div><p style={{ color: "var(--muted)", fontSize: 10, margin: "5px 0 12px" }}>{subject.recordsInPeriod} records in period · {subject.activeAlerts.length} active alerts</p>{subject.trends.slice(0,3).map((trend) => <p key={trend.indicator} style={{ color: "#a8c5c1", fontSize: 10, margin: "5px 0" }}>{trend.label}: {trend.direction} ({pct(trend.percentChange)})</p>)}{subject.activeAlerts.map((alert) => <p key={alert.id} style={{ color: "#f2c578", fontSize: 10, margin: "8px 0 0" }}><AlertTriangle size={12} style={{ verticalAlign: "middle", marginRight: 5 }}/>{alert.severity}: {alert.title}</p>)}</article>)}</section> : subjects.map((subject) => <section className="card" key={subject.id} style={surface}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><div><p className="section-kicker" style={{ margin: "0 0 4px" }}>PHASE 3 DETERMINISTIC STATUS</p><strong style={{ color: subject.latestAssessment?.status === "RED" ? "#ef4444" : subject.latestAssessment?.status === "AMBER" ? "#f59e0b" : "#10b981" }}>{subject.latestAssessment?.status ?? "NOT AVAILABLE"}</strong><p style={{ color: "#a8c5c1", fontSize: 11, margin: "6px 0" }}>{subject.latestAssessment?.summary ?? "No assessment is available."}</p></div><div style={{ minWidth: 190 }}><p className="section-kicker" style={{ margin: "0 0 5px" }}>LATEST CHECK-IN</p><p style={{ fontSize: 11, color: "#a8c5c1", margin: 0 }}>{subject.currentMeasurements?.recordedAt ? new Date(String(subject.currentMeasurements.recordedAt)).toLocaleString() : "No current record"}</p><p style={{ fontSize: 10, color: "var(--muted)", margin: "4px 0" }}>{subject.recordsInPeriod} records in selected period</p></div></div>
      {subject.activeAlerts.map((alert) => <div key={alert.id} style={{ padding: "8px 10px", borderLeft: "2px solid #ef4444", background: "rgba(239,68,68,.06)", marginTop: 10, fontSize: 11 }}><strong>{alert.severity} · {alert.title}</strong><p style={{ color: "#a8c5c1", margin: "4px 0 0" }}>{alert.message}</p></div>)}
    </section>)}

    {subjects.map((subject) => <section key={`signals-${subject.id}`} style={{ marginBottom: 18 }}>
      <h2 className="section-kicker" style={{ margin: "0 0 9px" }}>{scope === "mission" ? `${subject.callsign} · PERSONAL-BASELINE SIGNALS` : "PERSONAL-BASELINE SIGNALS"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 9 }}>{subject.baselines.filter((baseline) => ["heartRate","sleepDuration","sleepQuality","stressLevel","anxietyLevel"].includes(baseline.indicator)).map((baseline) => <div className="card" key={baseline.indicator} style={{ padding: 12 }}><span className="section-kicker">{baseline.label.toUpperCase()}</span><strong style={{ display: "block", fontSize: 14, marginTop: 5 }}>{baseline.sufficient ? `${baseline.mean} ${baseline.unit}` : "Insufficient data"}</strong><small style={{ display: "block", color: "var(--muted)", fontSize: 9, marginTop: 4 }}>{baseline.sufficient ? `Range ${baseline.minimum}–${baseline.maximum} · ${baseline.count} records` : `${baseline.count} observations`}</small></div>)}</div>
      {subject.patterns.length > 0 && <div className="card" style={{ ...surface, marginTop: 10, marginBottom: 0 }}><span className="section-kicker">PHASE 4 PATTERNS</span>{subject.patterns.slice(0,3).map((pattern,index) => <p key={`${pattern.category}-${index}`} style={{ color: "#a8c5c1", fontSize: 11, lineHeight: 1.5, margin: "7px 0 0" }}>{pattern.explanation} <a href="#evidence" style={{ color: "var(--teal)" }}>View evidence</a></p>)}</div>}
    </section>)}

    <section id="evidence" className="card" style={surface}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Sparkles size={15} color="var(--teal)"/><h2 className="section-kicker" style={{ margin: 0 }}>RETRIEVED EVIDENCE · {activeContext?.evidence.length ?? 0}</h2></div>
      <div style={{ maxHeight: 310, overflow: "auto" }}>{activeContext?.evidence.map((item) => <details key={`${item.kind}-${item.id}`} style={{ borderTop: "1px solid var(--line)", padding: "8px 0" }}><summary style={{ cursor: "pointer", fontSize: 10, color: "#c3d5d2" }}>{item.label} · {item.timestamp ? new Date(item.timestamp).toLocaleString() : "date unavailable"} <code style={{ color: "var(--teal-dim)" }}>{item.id}</code></summary><p style={{ whiteSpace: "pre-wrap", color: "var(--muted)", fontSize: 10, lineHeight: 1.5, margin: "7px 0 0" }}>{item.detail}</p></details>)}</div>
      {activeContext && recordEvidence.length > 0 && <a href={scope === "mission" ? "/mission-control/analytics" : "/astronaut/history"} style={{ color: "var(--teal)", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 9 }}>Open health history <ExternalLink size={11}/></a>}
    </section>

    <section className="card" style={surface}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Bot size={16} color="var(--teal)"/><h2 className="section-kicker" style={{ margin: 0 }}>ASK CREW CARE AI</h2></div><div style={{ display: "flex", gap: 7 }}><select aria-label="Conversation history" value={currentConversation?.id ?? ""} onChange={(event) => setConversationId(event.target.value)} style={{ background: "#0d201e", color: "#c3d5d2", border: "1px solid var(--line)", borderRadius: 6, fontSize: 10, padding: "6px 8px", maxWidth: 165 }}><option value="">New conversation</option>{activeConversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}</select><button onClick={newConversation} style={btnStyle}>New chat</button>{currentConversation && <button onClick={deleteConversation} style={{ ...btnStyle, color: "#eaa" }}>Delete</button>}</div></div>
      <p style={{ color: "var(--muted)", fontSize: 10, lineHeight: 1.5, margin: "0 0 12px" }}>Questions are answered from this page’s retrieved records and analysis. Live AI requires a server-side provider key; no demo answer is fabricated.</p>
      <div aria-live="polite" style={{ maxHeight: 470, overflow: "auto", marginBottom: 12 }}>{currentConversation?.messages.map((message) => <article key={message.id} style={{ borderTop: "1px solid var(--line)", padding: "11px 0" }}>
        {message.role === "user" ? <p style={{ margin: 0, fontSize: 11, color: "var(--teal-bright)" }}>You · {new Date(message.timestamp).toLocaleString()}<br/><span style={{ color: "#c3d5d2" }}>{message.text}</span></p> : message.answer ? <div><p style={{ margin: "0 0 5px", fontSize: 10, color: "var(--muted)" }}>{message.answer.analysis.title} · {message.answer.provider} / {message.answer.model} · {new Date(message.timestamp).toLocaleString()}</p>
          {message.answer.criticalAlerts.map((alert) => <div key={alert.id} style={{ padding: "9px 10px", border: "1px solid rgba(239,68,68,.45)", borderRadius: 6, color: "#ffb4b4", fontSize: 11, marginBottom: 8 }}><AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 6 }}/>{alert.severity} Phase 3 alert: {alert.title}. Follow established mission emergency procedures and contact authorized medical personnel. {alert.message}</div>)}
          <p style={{ color: "#d5e6e3", fontSize: 12, lineHeight: 1.65, margin: "4px 0 8px" }}>{message.answer.analysis.summary}</p><EvidenceLinks ids={message.answer.analysis.evidenceReferences} evidence={message.answer.evidence}/><p style={{ color: "#9ebbb7", fontSize: 11, lineHeight: 1.55, margin: "8px 0" }}>{message.answer.analysis.currentInterpretation}</p>
          {[...message.answer.analysis.historicalObservations,...message.answer.analysis.patterns,...message.answer.analysis.concerns].map((insight,index)=><div key={`${insight.title}-${index}`} style={{ padding: "8px 10px", background: "rgba(255,255,255,.025)", borderRadius: 6, marginTop: 7 }}><strong style={{ fontSize: 10 }}>{insight.title}</strong><p style={{ color: "#a8c5c1", fontSize: 10, lineHeight: 1.5, margin: "4px 0" }}>{insight.explanation}</p><EvidenceLinks ids={insight.evidenceIds} evidence={message.answer!.evidence}/></div>)}
          {message.answer.analysis.recommendations.map((recommendation,index)=><div key={`${recommendation.title}-${index}`} style={{ padding: "9px 10px", borderLeft: "2px solid #67ded6", marginTop: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 10 }}>{recommendation.title} · {recommendation.priority} suggestion</strong><select aria-label={`Recommendation status: ${recommendation.title}`} value={activeRecommendationStatuses[`${message.id}:${index}:${recommendation.title}`] ?? "NEW"} onChange={(event) => setRecommendationState(`${message.id}:${index}:${recommendation.title}`, event.target.value as RecommendationState)} style={{ background: "#0d201e", color: "#c3d5d2", border: "1px solid var(--line)", borderRadius: 5, fontSize: 9, padding: "4px 6px" }}><option value="NEW">New</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option></select></div><p style={{ color: "#a8c5c1", fontSize: 10, lineHeight: 1.5, margin: "4px 0" }}>{recommendation.description}</p><p style={{ color: "#c3d5d2", fontSize: 10, margin: "4px 0" }}>Next step: {recommendation.nextStep}</p><EvidenceLinks ids={recommendation.evidenceIds} evidence={message.answer!.evidence}/></div>)}
          {message.answer.analysis.missingInformation.length>0&&<p style={{ color: "#d2b977", fontSize: 10, lineHeight: 1.5 }}>Missing information: {message.answer.analysis.missingInformation.join(" · ")}</p>}
          <p style={{ color: "var(--muted)", fontSize: 9, lineHeight: 1.5 }}>AI confidence {Math.round(message.answer.analysis.confidence*100)}% · {message.answer.analysis.limitations.join(" ")}</p>
        </div> : <p style={{ color: "#a8c5c1", fontSize: 10 }}>No AI answer was generated.</p>}
      </article>)}</div>
      {error && <p role="alert" style={{ color: "#f2a5a5", fontSize: 11 }}>{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); void ask(); }} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} maxLength={600} placeholder={scope === "mission" ? "Which crew members have declining sleep trends?" : "How has my sleep changed over the last 30 days?"} rows={2} style={{ flex: 1, resize: "vertical", background: "#071110", border: "1px solid var(--line)", borderRadius: 7, color: "#edf8f8", padding: 10, font: "11px DM Sans" }}/><button type="submit" disabled={loading || question.trim().length < 4} style={{ ...btnStyle, display: "flex", alignItems: "center", gap: 7, opacity: loading ? .65 : 1 }}>{loading ? <LoaderCircle size={14} className="spin"/> : <Send size={14}/>} {loading ? "Analyzing" : "Ask AI"}</button></form>
      {scope === "astronaut" && <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 9 }}><span className="section-kicker" style={{ margin: 0 }}>QUICK QUESTIONS</span>{["How am I doing today?", "What changed this week?", "Explain my latest assessment", "How is my sleep compared with baseline?"].map((prompt) => <button key={prompt} type="button" onClick={() => { setQuestion(prompt); void ask(prompt); }} disabled={loading} style={{ ...btnStyle, padding: "6px 8px", fontSize: 9 }}>{prompt}</button>)}</div>}
      <p style={{ fontSize: 9, color: "var(--muted)", margin: "8px 0 0" }}>Conversation history is saved in this browser only and is isolated by demo astronaut or mission scope. Do not enter identifying personal information.</p>
    </section>
    <p style={{ fontSize: 9, color: "#627b78", lineHeight: 1.5 }}>Prototype decision support only. This does not diagnose, clear, or treat a medical condition. Phase 3 status and alerts remain authoritative. {activeContext?.healthDataIsSimulated ? "All shown health history is fictional, simulated demo data." : ""}</p>
  </div>;
}

function EvidenceLinks({ ids, evidence }: { ids: string[]; evidence: Evidence[] }) {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{ids.map((id) => { const item = evidenceById.get(id); return item ? <a href="#evidence" key={id} title={item.detail} style={{ color: "var(--teal)", fontSize: 9, border: "1px solid var(--line)", borderRadius: 4, padding: "3px 5px" }}>{item.label} · {id}</a> : null; })}</div>;
}

