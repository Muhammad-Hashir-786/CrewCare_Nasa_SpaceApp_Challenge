"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Check, CircleAlert, Heart, Moon, Thermometer, Droplets } from "lucide-react";
import { BodyTrendDashboard } from "@/components/health/BodyTrendDashboard";
import type { Alert, Assessment, Astronaut, HealthRecord } from "@/types";
import { APP_NOW, formatAppDate, mergeAlertState, mergeDailyRecords } from "@/lib/health/checkin-store";
import styles from "./crew-overview.module.css";

type QuestionInfo = { count: number; topics: string[]; found: boolean };
type CrewSnapshot = Astronaut & { activeAlerts: Alert[]; healthRecords: HealthRecord[] };
const dateText = (date: Date | string) => formatAppDate(date, { month: "short", day: "numeric", year: "numeric" });
const statusLabel = (status?: string) => status === "RED" ? "Act now" : status === "AMBER" ? "Needs attention" : "All clear";

function mergeStoredAstronaut(base: Astronaut): CrewSnapshot {
  let records = [...(base.healthRecords ?? [])];
  let assessment = base.latestAssessment ?? null;
  let alerts = [...(base.activeAlerts ?? [])];
  try {
    const savedRecords = JSON.parse(localStorage.getItem(`crewcare_checkins_${base.id}`) ?? "[]") as HealthRecord[];
    if (Array.isArray(savedRecords)) {
      records = mergeDailyRecords(records, savedRecords.filter((record) => record?.id && record.userId === base.id));
    }
  } catch { /* Use the shared read-only fixture when local records are invalid. */ }
  try {
    const saved = JSON.parse(localStorage.getItem(`crewcare_assessment_${base.id}`) ?? "null") as Assessment | null;
    if (saved?.userId === base.id && (!assessment || new Date(saved.createdAt).getTime() >= new Date(assessment.createdAt).getTime())) assessment = saved;
  } catch { /* Keep the roster assessment. */ }
  try {
    const saved = JSON.parse(localStorage.getItem(`crewcare_demo_alerts_${base.id}`) ?? "[]") as Alert[];
    alerts = mergeAlertState(alerts, Array.isArray(saved) ? saved.filter((alert) => alert?.id && alert.userId === base.id) : []).filter((alert) => alert.status === "ACTIVE");
  } catch { alerts = alerts.filter((alert) => alert.status === "ACTIVE"); }
  return { ...base, healthRecords: records, latestAssessment: assessment, activeAlerts: alerts, isSimulated: true };
}

function loadRecentQuestions(astronautId: string): QuestionInfo {
  const cutoff = APP_NOW.getTime() - 7 * 86_400_000;
  const messages: Array<{ role?: string; text?: string; timestamp?: string }> = [];
  try {
    const conversations = JSON.parse(localStorage.getItem(`crewcare-ai-conversations:astronaut:${astronautId}`) ?? "[]");
    if (Array.isArray(conversations)) for (const conversation of conversations) {
      if (Array.isArray(conversation?.messages)) messages.push(...conversation.messages);
    }
  } catch { return { count: 0, topics: [], found: false }; }
  const questions = messages.filter((message) => message.role === "user" && typeof message.text === "string" && (!message.timestamp || new Date(message.timestamp).getTime() >= cutoff));
  if (!questions.length) return { count: 0, topics: [], found: false };
  const categories: Array<[string, RegExp]> = [["headaches", /headache|migraine/i], ["dizziness", /dizz(y|iness)|vertigo/i], ["sleep", /sleep|insomnia/i], ["blood pressure", /blood pressure|\bbp\b/i], ["pain", /pain|ache/i], ["breathing", /breath|oxygen/i], ["fatigue", /fatigue|tired|energy/i]];
  const topics = categories.flatMap(([label, pattern]) => {
    const count = questions.filter((question) => pattern.test(question.text ?? "")).length;
    return count ? [{ label, count }] : [];
  }).sort((a, b) => b.count - a.count).slice(0, 2).map(({ label, count }) => `${label} (${count} ${count === 1 ? "question" : "questions"})`);
  return { count: questions.length, topics, found: true };
}

function thresholdVerdict(value: number | null | undefined, low: number, high?: number) {
  if (value == null) return { label: "Not recorded", kind: "missing" };
  if (value < low) return { label: "Low", kind: "outside" };
  if (high != null && value > high) return { label: "High", kind: "outside" };
  return { label: "Within range", kind: "normal" };
}

function measurementItems(latest?: HealthRecord) {
  if (!latest) return [];
  const bp = latest.systolicBP == null ? null : `${latest.systolicBP}/${latest.diastolicBP ?? "—"}`;
  const bpLevel = latest.systolicBP == null ? { label: "Not recorded", kind: "missing" } : latest.systolicBP < 90 || (latest.diastolicBP ?? 0) < 60 ? { label: "Low", kind: "outside" } : latest.systolicBP > 130 || (latest.diastolicBP ?? 0) > 85 ? { label: "High", kind: "outside" } : { label: "Within range", kind: "normal" };
  return [
    { key: "heartRate", label: "Heart rate", value: latest.heartRate != null ? `${latest.heartRate} bpm` : null, verdict: thresholdVerdict(latest.heartRate, 50, 100), Icon: Heart },
    { key: "bloodPressure", label: "Blood pressure", value: bp ? `${bp} mmHg` : null, verdict: bpLevel, Icon: Activity },
    { key: "bodyTemp", label: "Temperature", value: latest.bodyTemp != null ? `${latest.bodyTemp} °C` : null, verdict: thresholdVerdict(latest.bodyTemp, 36.1, 37.2), Icon: Thermometer },
    { key: "oxygenSat", label: "Oxygen saturation", value: latest.oxygenSat != null ? `${latest.oxygenSat}%` : null, verdict: thresholdVerdict(latest.oxygenSat, 95), Icon: Droplets },
    { key: "sleepDuration", label: "Sleep", value: latest.sleepDuration != null ? `${latest.sleepDuration} hours` : null, verdict: thresholdVerdict(latest.sleepDuration, 6), Icon: Moon },
    { key: "mood", label: "Mood", value: latest.mood ? latest.mood.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()) : null, verdict: latest.mood ? { label: "Self-reported", kind: "normal" } : { label: "Not recorded", kind: "missing" }, Icon: Activity },
    { key: "bloodGlucose", label: "Blood sugar", value: latest.bloodGlucose != null ? `${latest.bloodGlucose} mg/dL` : null, verdict: thresholdVerdict(latest.bloodGlucose, 70, 110), Icon: Activity },
  ];
}

function sentenceList(text?: string | null) {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean).slice(0, 3);
}

export function CrewMemberOverview({ astronaut }: { astronaut: Astronaut }) {
  const [member, setMember] = useState<CrewSnapshot>(() => ({ ...astronaut, healthRecords: astronaut.healthRecords ?? [], activeAlerts: (astronaut.activeAlerts ?? []).filter((alert) => alert.status === "ACTIVE"), isSimulated: true }));
  const [questions, setQuestions] = useState<QuestionInfo>({ count: 0, topics: [], found: false });
  const [loadedLocalData, setLoadedLocalData] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMember(mergeStoredAstronaut(astronaut));
      setQuestions(loadRecentQuestions(astronaut.id));
      setLoadedLocalData(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [astronaut]);

  const records = member.healthRecords;
  const latest = records.at(-1);
  const assessment = member.latestAssessment;
  const alerts = member.activeAlerts;
  const status = assessment?.status ?? "GREEN";
  const latestMetrics = measurementItems(latest);
  const allSymptoms = useMemo(() => [...new Set(records.slice(-7).flatMap((record) => (record.symptoms ?? "").split(/[,;.]+/).map((item) => item.trim()).filter(Boolean)))], [records]);
  const flags = assessment?.flags ?? [];
  const recentShortSleepCount = records.slice(-7).filter((record) => record.sleepDuration != null && record.sleepDuration < 6).length;
  const findings: string[] = [];
  if (flags.some((flag) => flag.includes("BP_TREND_UP"))) findings.push("Blood pressure trend flagged");
  if (flags.some((flag) => flag.includes("HR_TREND_UP"))) findings.push("Heart rate trend flagged");
  if (recentShortSleepCount > 0) findings.push(`Sleep below 6 hours in ${recentShortSleepCount} recent ${recentShortSleepCount === 1 ? "entry" : "entries"}`);
  if (flags.some((flag) => flag.includes("FATIGUE_PERSISTENT")) || records.slice(-3).some((record) => record.fatigue === "VERY_TIRED" || record.fatigue === "EXHAUSTED")) findings.push("Fatigue reported in recent check-ins");
  allSymptoms.slice(0, 3).forEach((symptom) => findings.push(`${symptom} reported`));
  const actions = sentenceList(assessment?.guidance).length ? sentenceList(assessment?.guidance) : ["Continue daily check-ins.", "Review any change or worsening with the mission medical procedure."];
  const firstName = astronaut.name.replace(/^Dr\.\s*/i, "").split(/\s+/)[0];
  const questionSummary = !loadedLocalData ? "Checking this browser for recent CrewCare AI questions…" : questions.topics.length
    ? `${firstName} asked CrewCare AI about ${questions.topics.join(" and ")} this week — this is included in the review.`
    : questions.found ? `${firstName} asked CrewCare AI ${questions.count} question${questions.count === 1 ? "" : "s"} this week; no specific symptom topic was identified.`
      : "No recent CrewCare AI questions were found in this browser’s local history.";

  return <main className={styles.page}>
    <Link className={styles.backLink} href="/mission-control"><ArrowLeft size={17}/> Back to Crew Overview</Link>
    <header className={styles.identityHeader}><div><p className={styles.kicker}>MISSION CONTROL · CREW OVERVIEW</p><h1>{member.name}</h1><p>{[member.rank, member.specialty].filter(Boolean).join(" · ")} <span>·</span> <strong>{member.callsign}</strong></p></div><span className={`${styles.status} ${styles[`status_${status.toLowerCase()}`]}`}><i/>{statusLabel(status)}</span></header>
    <aside className={styles.demoNotice}><span>SIMULATED DATA</span><p>All health measurements and assessment details on this page are fictional and simulated. Thresholds are illustrative.</p></aside>

    <section className={`${styles.card} ${styles.conclusion}`}>
      <div className={styles.conclusionTop}><div><p className={styles.kicker}>WHAT THIS MEANS</p><h2>{statusLabel(status)}</h2></div><span className={`${styles.status} ${styles[`status_${status.toLowerCase()}`]}`}><i/>{statusLabel(status)}</span></div>
      <p className={styles.conclusionText}>{assessment?.summary ?? "No assessment is available for this crew member yet."}</p>
      {assessment?.details && <p className={styles.conclusionDetails}>{sentenceList(assessment.details).slice(0, 3).join(" ")}</p>}
      <div className={styles.findings}>{findings.length ? findings.map((finding) => <span key={finding}>{finding}</span>) : <span>No flagged findings are present in the latest assessment.</span>}</div>
      <div className={styles.aiQuestionLine}><strong>Recent CrewCare AI questions</strong><p>{questionSummary}</p></div>
      <div className={styles.nextActions}><h3>What to do next</h3><ol>{actions.map((action, index) => <li key={index}>{action}</li>)}</ol></div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>LATEST MEASUREMENTS</p><h2>Latest measurements</h2><p>Most recent stored check-in{latest ? ` · ${dateText(latest.recordedAt)}` : ""}</p></div></div>
      <div className={styles.measurementGrid}>{latestMetrics.map(({ key, label, value, verdict, Icon }) => <article className={styles.measurementCard} key={key}><span className={styles.metricIcon}><Icon size={19}/></span><span className={styles.metricName}>{label}</span><strong>{value ?? "Not recorded"}</strong><small className={styles[`verdict_${verdict.kind}`]}>{verdict.label}</small></article>)}</div>
    </section>

    <section className={styles.section}>
      <BodyTrendDashboard person={member} records={records} assessmentStatus={assessment?.status} heading="Crew trends" initialPeriod={7}/>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>ACTIVE ALERTS</p><h2>Active alerts</h2><p>Current alerts attached to this crew member.</p></div><span className={styles.alertCount}>{alerts.length}</span></div>
      {alerts.length ? <div className={styles.alertList}>{alerts.map((alert) => <article className={styles.alertCard} key={alert.id}><div><CircleAlert size={18}/><h3>{alert.title}</h3></div><p>{alert.message}</p><small>Next: {actions[0] ?? "Follow mission medical guidance."}</small></article>)}</div> : <div className={styles.card}><p className={styles.noAlerts}><Check size={17}/>No active alerts for {member.name}.</p></div>}
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>FULL RECORDS</p><h2>Health record history</h2><p>{records.length} stored records · newest first</p></div></div>
      <div className={styles.historyCard}><div className={styles.tableScroll}><table><thead><tr>{["Date", "HR", "BP", "Temp", "SpO₂", "Sleep", "Mood", "Blood sugar", "Symptoms"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{[...records].reverse().map((record) => <tr key={record.id}><td>{dateText(record.recordedAt)}</td><td>{record.heartRate ?? "—"}</td><td>{record.systolicBP != null ? `${record.systolicBP}/${record.diastolicBP ?? "—"}` : "—"}</td><td>{record.bodyTemp ?? "—"}</td><td>{record.oxygenSat ?? "—"}</td><td>{record.sleepDuration ?? "—"}</td><td>{record.mood?.replaceAll("_", " ") ?? "—"}</td><td>{record.bloodGlucose ?? "—"}</td><td>{record.symptoms ?? "None"}</td></tr>)}</tbody></table></div></div>
    </section>
    <p className={styles.safety}>CrewCare is not a doctor — this is guidance until professional help arrives. All data is simulated and is not a medical device.</p>
  </main>;
}
