"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Moon, RotateCcw, Send, ShieldCheck, Sparkles } from "lucide-react";
import type { Astronaut, HealthRecord } from "@/types";
import { formatAppDate } from "@/lib/health/checkin-store";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import { DEMO_THRESHOLDS, assessHealth } from "@/services/health-assessment";
import { SAMPLE_MEDICAL_KIT } from "@/lib/emergency/first-aid-guidance";
import styles from "./AstronautUltimateReview.module.css";
import { CLARIFY_HEALTH_QUESTION, isTriageHealthQuestion, vagueHealthClarification } from "@/lib/ai/chat-behavior";
import { useRetryCountdown } from "@/hooks/useRetryCountdown";

type Period = "24h" | "7d" | "30d" | "90d" | "mission";
type Review = {
  verdict?: "ALL_CLEAR" | "WATCH" | "ACT_NOW";
  title?: string;
  summary?: string;
  whatThisCouldMean?: string;
  whatToDoNow?: string[];
  watchOutFor?: string[];
  whenToGetHelpImmediately?: string;
  currentInterpretation?: string;
  recommendations?: Array<{ title: string; description: string; nextStep: string; priority?: string }>;
  missingInformation?: string[];
  limitations?: string[];
};
type ChatMessage = { role: "user" | "assistant"; text: string; answer?: Review; dataUsed?: string; scopeNote?: string; showTriage?: boolean };

const periodDays: Record<Exclude<Period, "mission">, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
const prompts = ["How am I doing today?", "What changed this week?", "Explain my latest assessment", "How is my sleep compared with baseline?"];
const isCrewWideQuestion = (value: string) => /\b(?:crew(?:\s+members?)?|astronauts|whole crew|all crew|everyone|team-wide|mission-wide)\b/i.test(value);
const readout = (value: unknown) => typeof value === "string" ? value
  .replace(/\b(?:rec|ast|asmnt|alert)-[\w-]+\b/gi, "health record")
  .replace(/\bPHASE\s*[34]\b/gi, "earlier review")
  .replace(/\bRETRIEVED\b/gi, "recorded")
  .replace(/\bdeterministic\b/gi, "guided")
  .replace(/\bstatistical deviation\b/gi, "unusual reading")
  .replace(/\bSD\b/gi, "")
  .replace(/\bmedian\b/gi, "usual midpoint")
  .replace(/\s+/g, " ").trim() : "";
const dateLabel = (date: Date | string) => formatAppDate(date, { day: "numeric", month: "short" });
const statusText = (verdict?: Review["verdict"]) => verdict === "ACT_NOW" ? "Act now" : verdict === "WATCH" ? "Needs attention" : "All clear";

export function AstronautUltimateReview({ astronaut }: { astronaut: Astronaut }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [review, setReview] = useState<Review | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [retryRequest, setRetryRequest] = useState<{ displayText: string; requestText: string; history: Array<{ role: "user" | "assistant"; text: string }> } | null>(null);
  const [reviewRetryAttempt, setReviewRetryAttempt] = useState(0);
  const retryCountdown = useRetryCountdown();
  const { seconds: reviewRetrySeconds, start: startReviewRetryCountdown, clear: clearReviewRetryCountdown } = useRetryCountdown();
  const [showEvidence, setShowEvidence] = useState(false);
  const [chatOwner, setChatOwner] = useState(astronaut.id);
  const activeMessages = chatOwner === astronaut.id ? messages : [];

  const records = useMemo(() => [...(astronaut.healthRecords ?? [])].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()), [astronaut.healthRecords]);
  const referenceTime = records.at(-1) ? new Date(records.at(-1)!.recordedAt).getTime() : 0;
  const selectedRecords = useMemo(() => {
    if (period === "mission") return records;
    const since = referenceTime - periodDays[period] * 86_400_000;
    return records.filter((record) => new Date(record.recordedAt).getTime() >= since);
  }, [records, period, referenceTime]);
  const latest = selectedRecords.at(-1) ?? records.at(-1) ?? null;
  const assessment = latest ? assessHealth(latest, selectedRecords.slice(-7)) : null;
  const analytics = useMemo(() => generateHealthIntelligence(selectedRecords, { phase3Status: astronaut.latestAssessment?.status ?? null }), [selectedRecords, astronaut.latestAssessment?.status]);
  const verdict: Review["verdict"] = assessment?.hasEmergency || assessment?.status === "RED" ? "ACT_NOW" : assessment?.status === "AMBER" ? "WATCH" : "ALL_CLEAR";
  const displayedVerdict = review?.verdict ?? verdict;
  const activeAlerts = (astronaut.activeAlerts ?? []).filter((alert) => alert.status === "ACTIVE");
  const allergies = (astronaut as Astronaut & { allergies?: string[] | null }).allergies;
  const promptContext = makePromptContext(period, selectedRecords, analytics.baselines, analytics.trends, activeAlerts, allergies);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoadingReview(true); setReviewError(""); setReview(null);
      try {
        const response = await fetch("/api/ai/assistant", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: "astronaut", astronautId: astronaut.id, period,
            question: `Create an automatic health review. Use only supplied records; state missing data. Give concise food, activity, and rest suggestions when supported. No diagnosis, invented values, IDs, or medicines without allergy data and a configured kit. ${promptContext}`.slice(0, 600),
            demoStates: [{ astronautId: astronaut.id, records: records.map((r) => ({ ...r, recordedAt: new Date(r.recordedAt).toISOString() })), latestAssessment: astronaut.latestAssessment ? { ...astronaut.latestAssessment, createdAt: new Date(astronaut.latestAssessment.createdAt).toISOString() } : null, activeAlerts: (astronaut.activeAlerts ?? []).filter((a) => a.status === "ACTIVE").map((a) => ({ ...a, createdAt: new Date(a.createdAt).toISOString(), acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt).toISOString() : null, acknowledgedBy: a.acknowledgedBy ?? null, metric: a.metric ?? null, value: a.value ?? null, threshold: a.threshold ?? null })) }],
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) { startReviewRetryCountdown(data.retryAfterSeconds); throw new Error(response.status === 429 ? "rate" : "retry"); }
        if (active) { setReview(data.analysis as Review); clearReviewRetryCountdown(); }
      } catch { if (active) setReviewError("CrewCare AI couldn’t complete this review. Your question is safe to retry."); }
      finally { if (active) setLoadingReview(false); }
    };
    void run();
    return () => { active = false; };
  }, [astronaut, period, records, promptContext, reviewRetryAttempt, startReviewRetryCountdown, clearReviewRetryCountdown]);

  const ask = async (prompt = question, contextualPrompt?: string, retry = false) => {
    const displayText = (retry ? retryRequest?.displayText : prompt)?.trim() ?? "";
    const text = (retry ? retryRequest?.requestText : contextualPrompt ?? prompt)?.trim() ?? "";
    if (text.length < 4 || chatLoading || (!retry && retryCountdown.seconds > 0)) return;
    if (!retry && vagueHealthClarification(displayText)) {
      setMessages((items) => [...(chatOwner === astronaut.id ? items : []), { role: "user", text: displayText }, { role: "assistant", text: CLARIFY_HEALTH_QUESTION }]);
      setChatOwner(astronaut.id); setQuestion(""); setChatError(""); setRetryRequest(null); retryCountdown.clear(); return;
    }
    const history = retry ? retryRequest?.history ?? [] : activeMessages.map((message) => ({ role: message.role, text: message.role === "assistant" && message.answer ? `Verdict: ${statusText(message.answer.verdict)}. What this could mean: ${readout(message.answer.whatThisCouldMean)}. What to do right now: ${(message.answer.whatToDoNow ?? []).map((step, i) => `${i + 1}. ${readout(step)}`).join(" ")}. Watch out for: ${(message.answer.watchOutFor ?? []).map(readout).join(" ")}. When to get help immediately: ${readout(message.answer.whenToGetHelpImmediately)}.`.slice(0, 4000) : readout(message.text) })).slice(-100);
    setChatLoading(true); setChatError("");
    if (!retry) {
      if (chatOwner !== astronaut.id) { setChatOwner(astronaut.id); setMessages([{ role: "user", text: displayText }]); }
      else setMessages((items) => [...items, { role: "user", text: displayText }]);
    }
    setQuestion("");
    try {
      const scopeInstruction = isCrewWideQuestion(displayText) ? `This is an astronaut-only chat for ${astronaut.name}. Answer only from ${astronaut.name}'s supplied data. The question asks about the whole crew; clearly say you can cover only ${astronaut.name} and do not invent or infer other crew members' data. ` : "";
      const response = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "astronaut", astronautId: astronaut.id, question: `${scopeInstruction}${text.slice(0, 500)}. Use only supplied data, do not invent details or mention IDs. ${promptContext}`.slice(0, 1000), period, conversationHistory: history, demoStates: [{ astronautId: astronaut.id, records: records.map((r) => ({ ...r, recordedAt: new Date(r.recordedAt).toISOString() })), latestAssessment: astronaut.latestAssessment ? { ...astronaut.latestAssessment, createdAt: new Date(astronaut.latestAssessment.createdAt).toISOString() } : null, activeAlerts: (astronaut.activeAlerts ?? []).filter((a) => a.status === "ACTIVE").map((a) => ({ ...a, createdAt: new Date(a.createdAt).toISOString(), acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt).toISOString() : null, acknowledgedBy: a.acknowledgedBy ?? null, metric: a.metric ?? null, value: a.value ?? null, threshold: a.threshold ?? null })) }] }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { retryCountdown.start(data.retryAfterSeconds); throw new Error(response.status === 429 ? "rate" : "retry"); }
      retryCountdown.clear(); setRetryRequest(null);
      const a = data.analysis as Review;
      const source = latest ? `Using ${astronaut.name}'s latest check-in (${dateLabel(latest.recordedAt)})${latest.heartRate != null ? `: heart rate ${latest.heartRate} bpm` : ""}${latest.systolicBP != null && latest.diastolicBP != null ? `, blood pressure ${latest.systolicBP}/${latest.diastolicBP}` : ""}${latest.oxygenSat != null ? `, oxygen ${latest.oxygenSat}%` : ""}.` : `No stored check-in is available for ${astronaut.name}.`;
      const scopeNote = isCrewWideQuestion(displayText) ? `This chat covers ${astronaut.name} only — for the whole crew, ask in Mission intelligence.` : undefined;
      const showTriage = isTriageHealthQuestion(text) || (Boolean(contextualPrompt) && activeMessages.at(-1)?.showTriage === true);
      setMessages((items) => [...(chatOwner === astronaut.id ? items : retry ? [] : [{ role: "user" as const, text: readout(displayText) }]), { role: "assistant", text: readout(a.summary) || "No answer text was returned.", answer: a, dataUsed: readout(source), scopeNote, showTriage }]);
    } catch (cause) {
      setChatError(cause instanceof Error && cause.message === "rate" ? "CrewCare AI is busy right now. Your question is safe to retry." : "CrewCare AI couldn’t complete that answer. Your question is safe to retry.");
      if (!retry) setRetryRequest({ displayText, requestText: text, history });
    }
    finally { setChatLoading(false); }
  };
  const clearConversation = () => { setMessages([]); setChatError(""); setQuestion(""); setRetryRequest(null); retryCountdown.clear(); };

  const attention = latest ? getAttention(latest, assessment) : [];
  const baselineKeys = ["heartRate", "sleepDuration", "stressLevel", "mood"];
  const baselines = analytics.baselines.filter((item) => baselineKeys.includes(item.indicator));
  const checkInCount = selectedRecords.length;
  const latestDate = records.at(-1)?.recordedAt;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.kicker}>CREWCARE · ASTRONAUT PORTAL</p><h1>Ultimate review</h1><p className={styles.subhead}>{astronaut.name} · Simulated demo data — not a medical device.</p></div>
      <label className={styles.range}>Review period<select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>{(["24h", "7d", "30d", "90d", "mission"] as Period[]).map((value) => <option key={value} value={value}>{value === "mission" ? "Mission" : value}</option>)}</select></label>
    </header>

    <section className={`${styles.card} ${styles.verdictCard}`} aria-live="polite">
      <div className={styles.verdictTop}><span className={`${styles.verdict} ${styles[displayedVerdict.toLowerCase()]}`}><span className={styles.dot}/>{statusText(displayedVerdict)}</span><span className={styles.tag}><Sparkles size={14}/>{loadingReview ? "Preparing AI review…" : review ? "Personal health review" : "Health review"}</span></div>
      <h2>{readout(review?.title) || `Your ${period === "mission" ? "mission" : period} health summary`}</h2>
      <p className={styles.lead}>{readout(review?.summary) || readout(review?.whatThisCouldMean) || (latest ? assessment?.summary : "No check-in data is available for this profile yet.")}</p>
      {reviewError && <p role="alert" className={styles.inlineNote}>{reviewError} {reviewRetrySeconds > 0 && <span>Try again in {reviewRetrySeconds} seconds. </span>}<button type="button" onClick={() => { setReviewError(""); clearReviewRetryCountdown(); setReviewRetryAttempt((value) => value + 1); }} disabled={loadingReview || reviewRetrySeconds > 0}><RotateCcw size={13}/> Retry</button></p>}
      {review?.missingInformation?.length ? <p className={styles.inlineNote}>Missing information: {review.missingInformation.map(readout).filter(Boolean).join(" · ")}</p> : null}
      <p className={styles.meta}>{checkInCount} {checkInCount === 1 ? "check-in" : "check-ins"} in the selected period{latestDate ? ` — latest ${dateLabel(latestDate)}` : ""} · <a href="/astronaut/history">Open health history</a></p>
    </section>

    <section className={styles.section}>
      <SectionTitle title="Your personal review" subtitle="A clear look at what needs attention and what is going well." />
      {attention.length ? <div className={styles.attentionGrid}>{attention.map((item) => <article className={`${styles.card} ${styles.statCard}`} key={item.key}>
        <div className={styles.statTitle}><Activity size={18}/><h3>{item.label}</h3><strong>{item.value} <small>{item.unit}</small></strong></div>
        <p className={styles.meaning}>{item.meaning}</p>
        <div className={styles.adviceGrid}><Advice label="EAT" value={item.eat}/><Advice label="DO" value={item.do}/><Advice label="AVOID" value={item.avoid}/></div>
      </article>)}</div> : <div className={styles.card}><p className={styles.okLine}><Check size={17}/>No current measurement is outside the app’s illustrative ranges.</p></div>}
      <p className={styles.okLine}><Check size={16}/>{getOkayLine(latest, attention)}</p>
      {review?.whatToDoNow?.length ? <div className={`${styles.card} ${styles.actionCard}`}><h3>What to do next</h3><ol>{review.whatToDoNow.slice(0, 5).map((item, i) => <li key={i}>{readout(item)}</li>)}</ol></div> : null}
      {activeAlerts.length > 0 && <div className={`${styles.card} ${styles.alertCard}`}><h3><AlertTriangle size={18}/>Active alerts</h3>{activeAlerts.map((alert, index) => <p key={index}>{readout(alert.title)} — {readout(alert.message)}</p>)}</div>}
      {review?.watchOutFor?.length ? <p className={styles.mutedLine}><strong>Watch for:</strong> {review.watchOutFor.slice(0, 3).map(readout).join(" · ")}</p> : null}
    </section>

    <section className={styles.section}>
      <SectionTitle title="Your baselines" subtitle={`Personal history for ${period === "mission" ? "the mission" : `the last ${period}`}.`} />
      <div className={styles.baselineGrid}>{baselines.map((item) => {
        const trend = analytics.trends.find((row) => row.indicator === item.indicator && row.period === period);
        const isLower = trend?.direction === "decreasing";
        const isHigher = trend?.direction === "increasing";
        const trendLabel = trend?.direction === "increasing" ? "Going up" : trend?.direction === "decreasing" ? "Going down" : trend?.direction === "stable" ? "Steady" : "Not enough history";
        const Icon = isLower ? ArrowDown : ArrowUp;
        return <article className={`${styles.card} ${styles.baselineCard}`} key={item.indicator}><span>{item.label}</span><strong>{item.sufficient ? `${item.median} ${item.unit}` : "Building baseline"}</strong><p>{item.sufficient ? `Your usual: ${item.minimum}–${item.maximum} ${item.unit} · ${item.count} records` : `${item.count} records · at least ${item.minimumRequired} needed`}</p><small className={isHigher || isLower ? styles.trend : styles.steady}>{trend?.direction === "increasing" || trend?.direction === "decreasing" ? <Icon size={14}/> : null}{trendLabel}</small></article>;
      })}</div>
    </section>

    <section className={styles.section}>
      <SectionTitle title="What stands out" subtitle="Changes compared with earlier records." />
      {analytics.anomalies.length ? <div className={styles.card}>{analytics.anomalies.slice(0, 4).map((item, index) => {
        const entry = selectedRecords.find((record) => record.id === item.sourceRecordId);
        return <p className={styles.finding} key={`${item.indicator}-${index}`}><Activity size={16}/><span>{item.label} was outside its personal pattern on {entry ? dateLabel(entry.recordedAt) : "one recorded day"}: <strong>{item.actualValue} {item.unit}</strong>{item.expectedMinimum != null && item.expectedMaximum != null ? ` (usual pattern ${item.expectedMinimum}–${item.expectedMaximum} ${item.unit})` : ""}.</span></p>;
      })}<button type="button" className={styles.textButton} onClick={() => setShowEvidence((value) => !value)}>{showEvidence ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {showEvidence ? "Hide evidence" : "View evidence"}</button>{showEvidence && <div className={styles.evidence}>{analytics.anomalies.slice(0, 8).map((item, index) => { const entry = selectedRecords.find((record) => record.id === item.sourceRecordId); return entry ? <p key={`${item.indicator}-evidence-${index}`}>{dateLabel(entry.recordedAt)} · {item.label}: {item.actualValue} {item.unit}</p> : null; })}</div>}</div> : <div className={styles.card}><p className={styles.okLine}><ShieldCheck size={17}/>No unusual readings were identified in this period.</p></div>}
      <p className={styles.honesty}>This describes past records — not a diagnosis.</p>
    </section>

    <section className={styles.section}>
      <SectionTitle title="Food, activity & rest" subtitle="Simple habits to support day-to-day wellbeing." />
      <div className={styles.adviceGridLarge}><article className={styles.card}><h3><span>01</span>Food</h3><p>{getLifestyleAdvice(latest, "food", attention)}</p></article><article className={styles.card}><h3><span>02</span>Activity</h3><p>{getLifestyleAdvice(latest, "activity", attention)}</p></article><article className={styles.card}><h3><Moon size={17}/>Rest</h3><p>{getLifestyleAdvice(latest, "rest", attention)}</p></article></div>
    </section>

    <section className={`${styles.section} ${styles.kit}`}>
      <SectionTitle title="Medicines from the kit" subtitle={SAMPLE_MEDICAL_KIT.status} />
      <div className={styles.card}><p>Simulated sample kit — not verified onboard inventory.</p><p>{allergies?.length ? `Stored allergies: ${allergies.join(", ")}.` : "Allergy information is not stored for this crew profile, so this review will not recommend a medicine."}</p><p>Use the non-medicine steps above. The sample kit lists {SAMPLE_MEDICAL_KIT.items.length} item, but its inventory is simulated and unverified; no medication is recommended here.</p></div>
    </section>

    <section className={styles.section}>
      <SectionTitle title="Ask a follow-up" subtitle="Questions use the same CrewCare AI assistant and this astronaut’s available records." />
      <div className={`${styles.card} ${styles.chat}`}>
        <div className={styles.chips}>{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)} disabled={chatLoading || retryCountdown.seconds > 0}>{prompt}</button>)}</div>
        {activeMessages.map((message, index) => <div className={message.role === "user" ? styles.userBubble : styles.answerBubble} key={`${message.role}-${index}`}><span>{message.role === "user" ? "You" : "CrewCare AI"}</span>{message.role === "user" ? <p>{readout(message.text)}</p> : message.answer ? <div>
          {message.scopeNote && <p className={styles.meta}>{readout(message.scopeNote)}</p>}
          {message.showTriage && <span className={`${styles.verdict} ${styles[(message.answer.verdict ?? "ALL_CLEAR").toLowerCase()]}`}><span className={styles.dot}/>{statusText(message.answer.verdict)}</span>}
          <p className={styles.meta}>{readout(message.dataUsed)}</p>
          <section className={styles.chatAnswerSection}><h3>What this could mean</h3><p>{readout(message.answer.whatThisCouldMean ?? message.answer.summary)}</p></section>
          <section className={styles.chatAnswerSection}><h3>What to do right now</h3><ol>{(message.answer.whatToDoNow ?? []).slice(0, 5).map((step, i) => <li key={i}>{readout(step)}</li>)}</ol></section>
          <section className={styles.chatAnswerSection}><h3>Watch out for</h3><ul>{(message.answer.watchOutFor ?? []).map((item, i) => <li key={i}>{readout(item)}</li>)}</ul></section>
          <section className={styles.chatAnswerSection}><h3>When to get help immediately</h3><p>{readout(message.answer.whenToGetHelpImmediately)}</p></section>
          <div className={styles.chips}>{["What if it gets worse?", "Explain it simpler", "Show the steps again"].map((chip) => { const topic = activeMessages.filter((entry) => entry.role === "user").at(-1)?.text ?? "the health concern just discussed"; const instruction = chip === "What if it gets worse?" ? `Explain what worsening of this same concern (${topic}) would look like and restate its warning signs.` : chip === "Explain it simpler" ? `Re-explain your immediately previous answer about the same concern (${topic}) in simpler, shorter words.` : `Repeat the same numbered guidance from your immediately previous answer about the concern (${topic}).`; return <button key={chip} type="button" onClick={() => void ask(chip, instruction)} disabled={chatLoading}>{chip}</button>; })}</div>
        </div> : <p>{readout(message.text)}</p>}</div>)}
        {chatLoading && <p role="status" className={styles.inlineNote}>CrewCare AI is considering your question and the conversation so far…</p>}
        <div className={styles.chatSessionControls}><button type="button" className={styles.textButton} onClick={clearConversation}>New conversation</button><span>This conversation is kept while you stay on this page.</span></div>
        {chatError && <p role="alert" className={styles.inlineNote}>{chatError} {retryCountdown.seconds > 0 && <span>Try again in {retryCountdown.seconds} seconds. </span>}<button type="button" onClick={() => { if (retryRequest) void ask(retryRequest.displayText, retryRequest.requestText, true); }} disabled={chatLoading || !retryRequest || retryCountdown.seconds > 0}><RotateCcw size={13}/> Retry</button></p>}
        {!chatError && retryCountdown.seconds > 0 && <p role="status" className={styles.inlineNote}>Try again in {retryCountdown.seconds} seconds.</p>}
        <form className={styles.chatForm} onSubmit={(event) => { event.preventDefault(); void ask(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your health trends…" maxLength={600}/><button disabled={chatLoading || retryCountdown.seconds > 0 || question.trim().length < 4}>{chatLoading ? "Thinking…" : <><Send size={16}/> Ask CrewCare</>}</button></form>
      </div>
    </section>
      <p className={styles.safety}>CrewCare is not a doctor — this is guidance until professional help arrives. All health data shown is fictional and simulated for demonstration.</p>
  </main>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className={styles.sectionTitle}><h2>{title}</h2><p>{subtitle}</p></div>; }
function Advice({ label, value }: { label: string; value: string }) { return <div className={styles.advice}><strong>{label}</strong><span>{value}</span></div>; }

function makePromptContext(
  period: Period,
  records: HealthRecord[],
  baselines: ReturnType<typeof generateHealthIntelligence>["baselines"],
  trends: ReturnType<typeof generateHealthIntelligence>["trends"],
  alerts: NonNullable<Astronaut["activeAlerts"]>,
  allergies?: string[] | null,
) {
  const latest = records.at(-1);
  const values = latest ? ([
    ["HR", latest.heartRate, "bpm"], ["BP", latest.systolicBP != null && latest.diastolicBP != null ? `${latest.systolicBP}/${latest.diastolicBP}` : latest.systolicBP ?? latest.diastolicBP, "mmHg"],
    ["SpO2", latest.oxygenSat, "%"], ["temp", latest.bodyTemp, "C"], ["sleep", latest.sleepDuration, "h"], ["glucose", latest.bloodGlucose, "mg/dL"],
  ] as Array<[string, unknown, string]>).filter((item) => item[1] != null).map(([label, value, unit]) => `${label} ${value}${unit}`).join(", ") : "no check-in";
  const baselineText = baselines.filter((item) => ["heartRate", "sleepDuration", "stressLevel", "mood"].includes(item.indicator)).map((item) => `${item.label} ${item.sufficient ? `${item.minimum}-${item.maximum} ${item.unit}` : "baseline unavailable"}`).join("; ");
  const trendText = trends.filter((item) => item.period === period && ["heartRate", "sleepDuration", "stressLevel", "mood"].includes(item.indicator)).map((item) => `${item.label} ${item.direction === "increasing" ? "up" : item.direction === "decreasing" ? "down" : item.direction === "stable" ? "steady" : "insufficient history"}`).join(", ");
  const allergyText = allergies?.length ? `stored allergies: ${allergies.join(", ")}` : "allergy information not stored";
  return `Data ${period}, ${records.length} records: ${values || "no readings"}. Baselines: ${baselineText || "unavailable"}. Trends: ${trendText || "insufficient history"}. Active alerts: ${alerts.length}. ${allergyText}.`;
}

function getAttention(record: HealthRecord, assessment: ReturnType<typeof assessHealth> | null) {
  const items: Array<{ key: string; label: string; value: string | number; unit: string; meaning: string; eat: string; do: string; avoid: string }> = [];
  const mapping: Array<{ key: keyof HealthRecord; name: string; unit: string; food: string; activity: string; avoid: string }> = [
    { key: "heartRate", name: "Heart rate", unit: "bpm", food: "Keep regular meals and fluids as allowed by mission guidance.", activity: "Pause strenuous activity and repeat the measurement after resting.", avoid: "Avoid exertion until the reading is rechecked." },
    { key: "systolicBP", name: "Systolic blood pressure", unit: "mmHg", food: "Choose balanced meals and follow your mission nutrition plan.", activity: "Sit quietly, then repeat the measurement using the approved method.", avoid: "Avoid exercise immediately before rechecking." },
    { key: "diastolicBP", name: "Diastolic blood pressure", unit: "mmHg", food: "Follow your usual balanced meal plan and hydration guidance.", activity: "Rest quietly and recheck blood pressure with the approved method.", avoid: "Avoid strenuous activity before the repeat reading." },
    { key: "bodyTemp", name: "Body temperature", unit: "°C", food: "Sip fluids if you can swallow normally.", activity: "Rest and repeat the temperature with the same approved device.", avoid: "Avoid overheating and strenuous activity while unwell." },
    { key: "bloodGlucose", name: "Blood sugar", unit: "mg/dL", food: "Follow the mission meal plan and record whether this was fasting.", activity: "Repeat the reading using the approved device and procedure.", avoid: "Avoid changing meals or treatment based on one reading alone." },
    { key: "oxygenSat", name: "Oxygen saturation", unit: "%", food: "Food is not a way to correct a low oxygen reading; follow the cabin procedure.", activity: "Sit upright, repeat the reading, and check the sensor fit.", avoid: "Avoid exertion while rechecking." },
    { key: "sleepDuration", name: "Sleep", unit: "hours", food: "Keep meals at your usual mission schedule when possible.", activity: "Protect the next planned rest period and keep a steady routine.", avoid: "Avoid late stimulating activity before scheduled sleep." },
  ];
  for (const item of mapping) {
    const value = record[item.key];
    if (typeof value !== "number") continue;
    const t = DEMO_THRESHOLDS[item.key as string];
    if (!t) continue;
    const crit = (t.critMin !== undefined && value < t.critMin) || (t.critMax !== undefined && value > t.critMax);
    const warn = (t.warnMin !== undefined && value < t.warnMin) || (t.warnMax !== undefined && value > t.warnMax);
    if (!crit && !warn) continue;
    items.push({ key: String(item.key), label: item.name, value, unit: item.unit, meaning: crit ? "This is outside the app’s critical illustrative range. Repeat if safe and follow the mission medical procedure." : "This is outside the app’s usual illustrative range. A repeat reading can help confirm whether it persists.", eat: item.food, do: item.activity, avoid: item.avoid });
  }
  if (assessment?.hasEmergency && record.symptoms) items.unshift({ key: "symptoms", label: "Reported symptoms", value: record.symptoms, unit: "", meaning: "A reported red-flag symptom needs urgent attention; this app cannot identify its cause.", eat: "Do not eat or drink if confused, drowsy, or unable to swallow safely.", do: "Use the emergency guide and follow the mission procedure now.", avoid: "Do not wait for another reading before acting." });
  return items;
}

function getOkayLine(record: HealthRecord | null, attention: ReturnType<typeof getAttention>) {
  if (!record) return "No check-in has been recorded yet.";
  const fields = ["heartRate", "systolicBP", "diastolicBP", "bodyTemp", "bloodGlucose", "oxygenSat", "sleepDuration"] as const;
  const labels: Record<(typeof fields)[number], string> = { heartRate: "Heart rate", systolicBP: "Systolic BP", diastolicBP: "Diastolic BP", bodyTemp: "Temperature", bloodGlucose: "Blood sugar", oxygenSat: "Oxygen", sleepDuration: "Sleep" };
  const units: Record<(typeof fields)[number], string> = { heartRate: "bpm", systolicBP: "mmHg", diastolicBP: "mmHg", bodyTemp: "°C", bloodGlucose: "mg/dL", oxygenSat: "%", sleepDuration: "h" };
  const okay = fields.filter((key) => typeof record[key] === "number" && !attention.some((item) => item.key === key));
  return okay.length ? `${okay.map((key) => `${labels[key]} ${record[key]} ${units[key]} — within illustrative range`).join(" · ")}.` : "No additional recorded measurements are within range to summarize.";
}

function getLifestyleAdvice(record: HealthRecord | null, kind: "food" | "activity" | "rest", attention: ReturnType<typeof getAttention>) {
  if (!record) return "No check-in data is available yet. Keep to your mission-approved routine and record a check-in when possible.";
  if (kind === "food") return attention.some((item) => item.key === "bloodGlucose") ? "Follow the mission meal plan, note whether the reading was fasting, and recheck as instructed. Do not make major diet changes from one reading." : "Continue your mission-approved balanced meal plan and hydration routine; no food-specific concern is recorded in this check-in.";
  if (kind === "activity") return attention.some((item) => ["heartRate", "oxygenSat", "symptoms"].includes(item.key)) ? "Pause strenuous activity while you follow the guidance on the flagged reading or symptom." : "Continue the activity plan approved for your mission and record how you feel afterward.";
  return attention.some((item) => item.key === "sleepDuration") ? `Your latest sleep entry was ${record.sleepDuration ?? "not recorded"} hours. Protect the next scheduled rest period and note if short sleep continues.` : "Keep a consistent sleep opportunity; your latest available check-in does not flag sleep duration.";
}
