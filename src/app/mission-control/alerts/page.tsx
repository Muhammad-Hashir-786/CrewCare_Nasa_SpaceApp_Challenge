"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";
import { DEMO_ALERTS, DEMO_ASTRONAUTS } from "@/lib/demo-data";
import type { Alert, Astronaut, HealthRecord } from "@/types";
import styles from "./MissionAlertsPage.module.css";

type Reading = { date: string; value: number; secondary?: number; record: HealthRecord };
const dateLabel = (date: string | Date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const durationLabel = (start: string | Date, end: string | Date) => {
  const hours = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000));
  if (hours < 1) return "Less than 1 hour";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
};

function readingsFor(alert: Alert, astronaut?: Astronaut): Reading[] {
  const records = [...(astronaut?.healthRecords ?? [])].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const metric = alert.metric ?? "";
  if (metric === "systolicBP") {
    const threshold = alert.threshold;
    const matching = threshold == null ? [] : records.filter((record) => typeof record.systolicBP === "number" && record.systolicBP > threshold).slice(-3);
    const rows = matching.length ? matching : records.filter((record) => record.systolicBP === alert.value).slice(-1);
    return rows.flatMap((record) => typeof record.systolicBP === "number" ? [{ date: String(record.recordedAt), value: record.systolicBP, secondary: record.diastolicBP ?? undefined, record }] : []);
  }
  if (metric === "sleepDuration") return records.filter((record) => typeof record.sleepDuration === "number" && (alert.threshold == null || record.sleepDuration < alert.threshold)).slice(-3).map((record) => ({ date: String(record.recordedAt), value: record.sleepDuration!, record }));
  if (metric === "heartRate+systolicBP") return records.filter((record) => typeof record.heartRate === "number" && typeof record.systolicBP === "number" && (record.heartRate >= 95 || record.systolicBP >= 140)).slice(-3).map((record) => ({ date: String(record.recordedAt), value: record.systolicBP!, secondary: record.heartRate!, record }));
  const match = records.filter((record) => record.systolicBP === alert.value || record.heartRate === alert.value || record.sleepDuration === alert.value).slice(-1);
  return match.flatMap((record) => {
    if (typeof record.systolicBP === "number") return [{ date: String(record.recordedAt), value: record.systolicBP, secondary: record.diastolicBP ?? undefined, record }];
    if (typeof record.heartRate === "number") return [{ date: String(record.recordedAt), value: record.heartRate, record }];
    if (typeof record.sleepDuration === "number") return [{ date: String(record.recordedAt), value: record.sleepDuration, record }];
    return [];
  });
}

function ReadingChart({ readings, threshold, unit, label }: { readings: Reading[]; threshold?: number | null; unit: string; label: string }) {
  if (!readings.length) return <div className={styles.chartEmpty}>No dated readings are available for this alert.</div>;
  const values = [...readings.map((reading) => reading.value), ...(threshold == null ? [] : [threshold])];
  const min = Math.min(...values), max = Math.max(...values), span = max - min || Math.max(1, max * 0.08);
  const x = (index: number) => readings.length === 1 ? 160 : 24 + index * 272 / (readings.length - 1);
  const y = (value: number) => 90 - ((value - min) / span) * 66;
  const path = readings.map((reading, index) => `${index ? "L" : "M"}${x(index)},${y(reading.value)}`).join(" ");
  return <svg className={styles.chart} viewBox="0 0 320 112" role="img" aria-label={`${label} readings chart`}>
    {threshold != null && <><line x1="12" x2="308" y1={y(threshold)} y2={y(threshold)} className={styles.thresholdLine}/><text x="12" y={Math.max(12,y(threshold)-5)} className={styles.chartLabel}>Reference {threshold} {unit}</text></>}
    <path d={path} className={styles.chartPath}/>
    {readings.map((reading, index) => <g key={`${reading.date}-${index}`}><circle cx={x(index)} cy={y(reading.value)} r="5" className={styles.chartPoint}/><text x={x(index)} y="108" textAnchor="middle" className={styles.dateAxis}>{dateLabel(reading.date)}</text><title>{`${dateLabel(reading.date)}: ${reading.value}${reading.secondary != null ? `/${reading.secondary}` : ""} ${unit}`}</title></g>)}
  </svg>;
}

function guidanceFor(alert: Alert) {
  if (alert.metric === "systolicBP") return {
    steps: ["Repeat the reading with the approved method.", "Let the crew member rest quietly for 15 minutes.", "Repeat and record both blood-pressure numbers.", "Compare the results with their earlier readings.", "Follow the mission medical procedure if it stays high."],
    check: ["Was the cuff fitted and positioned correctly?", "Any new headache, dizziness, chest pain, or breathing trouble?", "What changed in sleep, food, activity, or rest?"],
    redFlags: "Chest pain, severe breathing trouble, collapse, or a sudden vision change means use the emergency procedure now.",
  };
  if (alert.metric === "sleepDuration") return {
    steps: ["Confirm the sleep entry and its time period.", "Review the last few nights for the same pattern.", "Ask how rested the crew member feels today.", "Protect the next planned sleep period.", "Record whether short sleep continues."],
    check: ["Was sleep interrupted or shifted by mission tasks?", "Any fatigue, headache, confusion, or difficulty focusing?", "Were rest, meal, and screen routines different?"],
    redFlags: "Confusion, collapse, severe distress, or breathing trouble means use the emergency procedure now.",
  };
  if (alert.metric === "heartRate+systolicBP") return {
    steps: ["Review the dated readings shown above.", "Check the current assessment and current readings.", "Record any symptoms with their start time.", "Keep the historical episode separate from current status.", "Follow mission medical review procedures if it recurs."],
    check: ["Were readings taken with the approved method?", "Any palpitations, chest pain, or breathing trouble?", "Do current readings differ from this historical episode?"],
    redFlags: "Chest pain, severe breathing trouble, or collapse means use the emergency procedure now.",
  };
  return {
    steps: ["Repeat the reading with the approved method.", "Let the crew member rest quietly before repeating.", "Record the result and the time taken.", "Compare it with their earlier readings.", "Follow the mission medical procedure if it remains high."],
    check: ["Was the approved device used correctly?", "Any new symptoms or change in how they feel?", "What changed in sleep, food, activity, or rest?"],
    redFlags: "Chest pain, severe breathing trouble, collapse, or a sudden vision change means use the emergency procedure now.",
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [crew, setCrew] = useState<Astronaut[]>(DEMO_ASTRONAUTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoAlert, setUndoAlert] = useState<Alert | null>(null);
  const undoTimer = useRef<number | null>(null);
  const simulated = true;

  const loadAlerts = useCallback(() => {
    setLoading(true);
    setLoadError("");
    try {
      // Use the same canonical roster and alerts as the Mission Control overview.
      const byId = new Map(DEMO_ALERTS.map((alert) => [alert.id, alert]));
      for (const astronaut of DEMO_ASTRONAUTS) {
        const key = `crewcare_demo_alerts_${astronaut.id}`;
        const baseline = DEMO_ALERTS.filter((alert) => alert.userId === astronaut.id);
        let saved: Alert[] = [];
        try {
          const raw = localStorage.getItem(key);
          const parsed: unknown = raw ? JSON.parse(raw) : [];
          saved = Array.isArray(parsed) ? parsed as Alert[] : [];
        } catch { saved = []; }
        // Empty or missing local state is seeded from the complete demo alert set.
        if (saved.length === 0) {
          saved = baseline;
          localStorage.setItem(key, JSON.stringify(saved));
        }
        saved.forEach((alert) => byId.set(alert.id, alert));
      }
      setCrew(DEMO_ASTRONAUTS);
      setAlerts([...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      // The bundled demo roster remains available even if browser storage is blocked.
      setCrew(DEMO_ASTRONAUTS);
      setAlerts([...DEMO_ALERTS]);
      setLoadError("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(loadAlerts, 0); return () => window.clearTimeout(timer); }, [loadAlerts]);
  useEffect(() => () => { if (undoTimer.current != null) window.clearTimeout(undoTimer.current); }, []);

  const handleAcknowledge = (id: string) => {
    const current = alerts?.find((alert) => alert.id === id);
    if (!current) return;
    const acknowledged: Alert = { ...current, status: "ACKNOWLEDGED", acknowledgedAt: new Date().toISOString(), acknowledgedBy: "Mission Control (Demo)" };
    setAlerts((previous) => (previous ?? []).map((alert) => alert.id === id ? acknowledged : alert));
    try {
      const key = `crewcare_demo_alerts_${acknowledged.userId}`;
      const stored = JSON.parse(localStorage.getItem(key) ?? "[]") as Alert[];
      const byId = new Map(stored.map((alert) => [alert.id, alert]));
      byId.set(id, acknowledged);
      localStorage.setItem(key, JSON.stringify([...byId.values()]));
      setLoadError("");
      setUndoAlert(current);
      if (undoTimer.current != null) window.clearTimeout(undoTimer.current);
      undoTimer.current = window.setTimeout(() => setUndoAlert(null), 7000);
    } catch {
      setLoadError("This browser could not save the acknowledgement. Keep this page open or enable browser storage and reload.");
    }
  };

  const undoAcknowledge = () => {
    if (!undoAlert) return;
    setAlerts((previous) => (previous ?? []).map((alert) => alert.id === undoAlert.id ? undoAlert : alert));
    try {
      const key = `crewcare_demo_alerts_${undoAlert.userId}`;
      const stored = JSON.parse(localStorage.getItem(key) ?? "[]") as Alert[];
      const byId = new Map(stored.map((alert) => [alert.id, alert]));
      byId.set(undoAlert.id, undoAlert);
      localStorage.setItem(key, JSON.stringify([...byId.values()]));
      setLoadError("");
      setUndoAlert(null);
      if (undoTimer.current != null) window.clearTimeout(undoTimer.current);
    } catch {
      setLoadError("This browser could not undo the acknowledgement. Enable browser storage and try again.");
    }
  };

  const undoToast = undoAlert ? <div className={styles.undoToast} role="status" aria-live="polite"><span>{undoAlert.title} acknowledged.</span><button type="button" onClick={undoAcknowledge}>Undo</button></div> : null;

  const allAlerts = alerts ?? [];
  const active = allAlerts.filter((alert) => alert.status === "ACTIVE");
  const acknowledged = allAlerts.filter((alert) => alert.status === "ACKNOWLEDGED");
  const selected = allAlerts.find((alert) => alert.id === selectedId) ?? null;
  const person = selected ? crew.find((astronaut) => astronaut.id === selected.userId) : undefined;
  const readings = useMemo(() => selected ? readingsFor(selected, person) : [], [selected, person]);
  const guidance = selected ? guidanceFor(selected) : null;
  const unit = selected?.metric === "sleepDuration" ? "hours" : selected?.metric === "heartRate+systolicBP" ? "bpm" : "mmHg";
  const chartUnit = selected?.metric === "sleepDuration" ? "hours" : "mmHg";
  const verdict = selected?.threshold == null || selected.value == null ? "No threshold set" : selected.metric === "sleepDuration" ? selected.value < selected.threshold ? "Low" : "In range" : selected.value > selected.threshold ? "High" : "In range";
  const durationEnd = selected?.status === "ACKNOWLEDGED" && selected.acknowledgedAt ? selected.acknowledgedAt : new Date();

  if (loading) return <main className={styles.page}><p role="status" className={styles.counts}>Loading alerts…</p></main>;

  if (selected && guidance) return <main className={styles.page}>
    {undoToast}
    <button className={styles.backButton} onClick={() => setSelectedId(null)}><ArrowLeft size={17}/> Back to Alerts</button>
    <header className={styles.detailHeader}><div><p className={styles.kicker}>MISSION CONTROL · ALERT DETAIL</p><h1>{selected.title}</h1><p>{selected.message}</p></div><div className={styles.detailStatus}><span><i/> {selected.severity[0] + selected.severity.slice(1).toLowerCase()}</span><strong>{selected.status === "ACTIVE" ? "Active" : "Acknowledged"}</strong></div></header>
    <div className={styles.detailMeta}><span><strong>Affects</strong>{person ? `${person.name} · ${person.callsign}` : "Crew member not found"}</span><span><strong>Active for</strong>{durationLabel(selected.createdAt, durationEnd)}</span><span><strong>Latest alert value</strong>{selected.value ?? "Not recorded"} {unit} · {verdict}</span></div>

    <section className={styles.detailSection}>
      <div className={styles.sectionHeading}><span className={styles.sectionNumber}>01</span><div><h2>Actual readings</h2><p>Values from the crew member’s stored records</p></div></div>
      <p className={styles.dataNote}>Rule source: CrewCare illustrative demo alert rule. NASA HRP provides context for cardiovascular and sleep risks; it did not set this alert threshold. <a href="/astronaut/learn#nasa-data-sources">How NASA data shapes this app</a></p>
      {readings.length > 0 ? <>
        <div className={styles.readingLayout}><div className={styles.readingList}>{readings.map((reading, index) => <div className={styles.readingRow} key={`${reading.date}-${index}`}><time>{dateLabel(reading.date)}</time><strong>{selected.metric === "sleepDuration" ? "Sleep" : "Blood pressure, top number"}</strong><b>{reading.value}{selected.metric !== "heartRate+systolicBP" && reading.secondary != null ? `/${reading.secondary}` : ""} <small>{selected.metric === "sleepDuration" ? "hours" : "mmHg"}</small>{selected.metric === "heartRate+systolicBP" && <em> · HR {reading.secondary ?? "not recorded"} bpm</em>}</b></div>)}</div>
          <div className={styles.chartCard}><div className={styles.chartHeading}><strong>{selected.metric === "sleepDuration" ? "Hours of sleep" : "Blood pressure, top number"}</strong><span>{selected.threshold != null ? `Reference line: ${selected.threshold} ${chartUnit}` : "Recorded values"}</span></div><ReadingChart readings={readings} threshold={selected.threshold} unit={chartUnit} label={selected.title}/></div>
        </div>
        {selected.metric === "heartRate+systolicBP" && <p className={styles.dataNote}>Each row shows blood pressure (top/bottom) and the recorded heart rate value where available. The historical alert has no configured threshold.</p>}
      </> : <div className={styles.chartEmpty}>No dated measurement rows are available. The alert’s recorded value is shown above.</div>}
    </section>

    <section className={styles.detailSection}>
      <div className={styles.sectionHeading}><span className={styles.sectionNumber}>02</span><div><h2>How to work on this alert</h2><p>Use approved mission procedures and record what you observe.</p></div></div>
      <div className={styles.guidanceGrid}>
        <article className={styles.guidanceCard}><h3>What to do right now</h3><ol>{guidance.steps.map((step) => <li key={step}>{step}</li>)}</ol></article>
        <article className={styles.guidanceCard}><h3>What to check</h3><ul>{guidance.check.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className={styles.guidanceCard}><h3>When to get help immediately</h3><p>{guidance.redFlags}</p></article>
        <article className={styles.guidanceCard}><h3>Medicine</h3><p>No medicine recommendation for this alert. Follow the physical steps and the mission-approved procedure.</p></article>
      </div>
    </section>

    <footer className={styles.detailFooter}>
      {selected.status === "ACTIVE" ? <button className={styles.ackButton} onClick={() => void handleAcknowledge(selected.id)}><CheckCircle size={17}/> Acknowledge</button> : <span className={styles.acknowledgedBy}><CheckCircle size={16}/> Acknowledged by {selected.acknowledgedBy ?? "Mission Control"}</span>}
      <span className={styles.safety}>Simulated alert data · Follow approved mission medical procedures.</span>
    </footer>
  </main>;

  return <main className={styles.page}>
    {undoToast}
    <header className={styles.pageHeader}><div><p className={styles.kicker}>MISSION CONTROL</p><h1>Alerts</h1><p className={styles.counts}>{active.length} active · {acknowledged.length} acknowledged</p></div></header>
    {loadError && <div role="status" className={styles.notice}><span>{loadError}</span><button className={styles.detailButton} onClick={loadAlerts}>Reload alerts</button></div>}
    <div className={styles.notice}><AlertTriangle size={17}/><span>{simulated ? "All alerts are simulated demo data. Acknowledgements are saved in this browser and cleared by Demo reset." : "Health alerts contain sensitive data. This demonstration portal does not provide authenticated access controls."}</span></div>
    {active.length > 0 && <section className={styles.alertSection}><div className={styles.sectionTitle}><AlertTriangle size={17}/><h2>ACTIVE ALERTS ({active.length})</h2></div><div className={styles.alertList}>{active.map((alert) => <AlertItem key={alert.id} alert={alert} person={crew.find((astronaut) => astronaut.id === alert.userId)} onOpen={() => setSelectedId(alert.id)} onAcknowledge={() => void handleAcknowledge(alert.id)}/>)}</div></section>}
    {acknowledged.length > 0 && <section className={styles.alertSection}><div className={styles.sectionTitle}><CheckCircle size={17}/><h2>ACKNOWLEDGED ({acknowledged.length})</h2></div><div className={styles.alertList}>{acknowledged.map((alert) => <AlertItem key={alert.id} alert={alert} person={crew.find((astronaut) => astronaut.id === alert.userId)} onOpen={() => setSelectedId(alert.id)}/>)}</div></section>}
    {allAlerts.length === 0 && <div className={styles.chartEmpty}>No active alerts — all clear.</div>}
  </main>;
}

function AlertItem({ alert, person, onOpen, onAcknowledge }: { alert: Alert; person?: Astronaut; onOpen: () => void; onAcknowledge?: () => void }) {
  const openKey = (event: React.KeyboardEvent<HTMLElement>) => { if (event.target instanceof HTMLButtonElement) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } };
  return <article className={styles.alertCard} tabIndex={0} role="button" onClick={onOpen} onKeyDown={openKey} aria-label={`View details for ${alert.title}`}>
    <div className={styles.cardMeta}><span className={styles.severity}><i/>{alert.severity[0] + alert.severity.slice(1).toLowerCase()}</span><span>{alert.status === "ACTIVE" ? "Active" : "Acknowledged"}</span>{person && <span className={styles.person}>{person.callsign} · {person.name}</span>}</div>
    <h3>{alert.title}</h3><p>{alert.message}</p><a href="/astronaut/learn#nasa-data-sources" onClick={(event) => event.stopPropagation()} style={{ display: "inline-block", marginTop: 8, color: "#08784f", fontSize: 12, textUnderlineOffset: 2 }}>Source: CrewCare demo alert rule · NASA HRP risk context</a>
    {alert.status === "ACKNOWLEDGED" && <small className={styles.ackLine}>Acknowledged by {alert.acknowledgedBy ?? "Mission Control"}</small>}
    <div className={styles.cardActions}><button className={styles.detailButton} onClick={(event) => { event.stopPropagation(); onOpen(); }}>View detail <ArrowRight size={16}/></button>{onAcknowledge && <button className={styles.ackButton} onClick={(event) => { event.stopPropagation(); onAcknowledge(); }}><CheckCircle size={16}/> Acknowledge</button>}</div>
  </article>;
}
