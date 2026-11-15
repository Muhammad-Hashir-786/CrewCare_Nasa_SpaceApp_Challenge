"use client";

import { Fragment, useMemo, useState } from "react";
import { Activity, AlertTriangle, Check, ChevronDown, ChevronUp, Filter, Table2 } from "lucide-react";
import { useAstronaut } from "@/lib/astronaut-context";
import { DEMO_THRESHOLDS, assessHealth } from "@/services/health-assessment";
import type { HealthRecord } from "@/types";
import { formatAppDate } from "@/lib/health/checkin-store";
import styles from "./history.module.css";

type DayStatus = "GREEN" | "AMBER" | "RED";
type Measurement = { key: string; label: string; value: number; unit: string; direction: "High" | "Low" | null; level: "normal" | "warn" | "critical" };

const moodMap: Record<string, string> = { VERY_LOW: "Very low", LOW: "Low", NEUTRAL: "Neutral", GOOD: "Good", EXCELLENT: "Excellent" };
const fatigueMap: Record<string, string> = { EXHAUSTED: "Exhausted", VERY_TIRED: "Very tired", TIRED: "Tired", MODERATE: "Moderate", REFRESHED: "Refreshed" };
const dateLong = (value: Date | string) => formatAppDate(value, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const dateShort = (value: Date | string) => formatAppDate(value, { month: "short", day: "numeric" });

function measurements(record: HealthRecord): Measurement[] {
  const configs: Array<{ key: keyof HealthRecord; label: string; unit: string; threshold: keyof typeof DEMO_THRESHOLDS }> = [
    { key: "heartRate", label: "Heart rate", unit: "bpm", threshold: "heartRate" },
    { key: "systolicBP", label: "Systolic BP", unit: "mmHg", threshold: "systolicBP" },
    { key: "diastolicBP", label: "Diastolic BP", unit: "mmHg", threshold: "diastolicBP" },
    { key: "bodyTemp", label: "Temperature", unit: "°C", threshold: "bodyTemp" },
    { key: "oxygenSat", label: "Oxygen saturation", unit: "%", threshold: "oxygenSat" },
    { key: "sleepDuration", label: "Sleep", unit: "hours", threshold: "sleepDuration" },
    { key: "bloodGlucose", label: "Blood sugar", unit: "mg/dL", threshold: "bloodGlucose" },
  ];
  return configs.flatMap((config) => {
    const value = record[config.key];
    if (typeof value !== "number") return [];
    const threshold = DEMO_THRESHOLDS[config.threshold];
    const direction = threshold.warnMin !== undefined && value < threshold.warnMin ? "Low" : threshold.warnMax !== undefined && value > threshold.warnMax ? "High" : null;
    const critical = threshold.critMin !== undefined && value < threshold.critMin || threshold.critMax !== undefined && value > threshold.critMax;
    return [{ key: config.key, label: config.label, value, unit: config.unit, direction, level: critical ? "critical" : direction ? "warn" : "normal" }];
  });
}

function statusOf(record: HealthRecord): DayStatus {
  const result = assessHealth(record, []);
  if (result.status === "RED") return "RED";
  if (result.status === "AMBER" || Boolean(record.symptoms?.trim())) return "AMBER";
  return "GREEN";
}

function RecordDetails({ record }: { record: HealthRecord }) {
  const readings = measurements(record);
  return <div className={styles.detailGrid}>
    {readings.map((item) => <div className={`${styles.detailTile} ${item.level !== "normal" ? styles[`tile_${item.level}`] : ""}`} key={item.key}>
      <span>{item.label}</span><strong>{item.value} <small>{item.unit}</small></strong><em>{item.direction ? `${item.direction} · outside usual demo range` : "Within usual demo range"}</em>
    </div>)}
    {record.sleepQuality != null && <div className={styles.detailTile}><span>Sleep quality</span><strong>{record.sleepQuality}<small> / 5</small></strong><em>Self-reported</em></div>}
    {record.mood && <div className={styles.detailTile}><span>Mood</span><strong>{moodMap[record.mood] ?? record.mood}</strong><em>Self-reported</em></div>}
    {record.fatigue && <div className={styles.detailTile}><span>Energy</span><strong>{fatigueMap[record.fatigue] ?? record.fatigue}</strong><em>Self-reported</em></div>}
    {record.stressLevel != null && <div className={styles.detailTile}><span>Stress</span><strong>{record.stressLevel}<small> / 5</small></strong><em>Self-reported</em></div>}
    {record.anxietyLevel != null && <div className={styles.detailTile}><span>Anxiety</span><strong>{record.anxietyLevel}<small> / 5</small></strong><em>Self-reported</em></div>}
    {record.symptoms && <div className={`${styles.detailTile} ${styles.symptomDetails}`}><span>Symptoms reported</span><strong>{record.symptoms}</strong>{record.symptomSeverity && <em>Reported severity: {record.symptomSeverity.toLowerCase()}</em>}</div>}
    {record.notes && <div className={`${styles.detailTile} ${styles.symptomDetails}`}><span>Notes</span><strong>{record.notes}</strong></div>}
  </div>;
}

function StatusWord({ status }: { status: DayStatus }) {
  return <span className={`${styles.statusWord} ${styles[`status_${status.toLowerCase()}`]}`}><span/> {status === "GREEN" ? "All clear" : status === "RED" ? "Act now" : "Needs attention"}</span>;
}

export default function HistoryPage() {
  const { astronaut } = useAstronaut();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterDays, setFilterDays] = useState<7 | 14 | 30>(14);
  const [filterSymptoms, setFilterSymptoms] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const allRecords = useMemo(() => [...(astronaut.healthRecords ?? [])].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()), [astronaut.healthRecords]);
  const records = useMemo(() => {
    if (!allRecords.length) return [];
    const newestTime = new Date(allRecords[0].recordedAt).getTime();
    const cutoff = newestTime - filterDays * 86_400_000;
    const result = allRecords.filter((record) => new Date(record.recordedAt).getTime() >= cutoff);
    return filterSymptoms ? result.filter((record) => Boolean(record.symptoms?.trim())) : result;
  }, [allRecords, filterDays, filterSymptoms]);
  const markedDays = records.map((record) => ({ record, status: statusOf(record), readings: measurements(record) }));
  const needsLook = markedDays.filter(({ record, status }) => status !== "GREEN" || Boolean(record.symptoms?.trim()));
  const normalDays = markedDays.filter(({ record, status }) => status === "GREEN" && !record.symptoms?.trim());
  const counts = { clear: markedDays.filter((day) => day.status === "GREEN" && !day.record.symptoms?.trim()).length, watch: markedDays.filter((day) => day.status === "AMBER" || (day.status === "GREEN" && Boolean(day.record.symptoms?.trim()))).length, urgent: markedDays.filter((day) => day.status === "RED").length };

  const jumpTo = (record: HealthRecord) => {
    const id = `history-day-${record.id}`;
    setExpanded(record.id);
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.kicker}>HEALTH RECORDS · {astronaut.callsign}</p><h1>Health history</h1><p>{astronaut.name} · {records.length} {records.length === 1 ? "record" : "records"} shown · Newest first.</p></div>
      <button type="button" className={styles.tableToggle} onClick={() => setShowTable((visible) => !visible)}><Table2 size={18}/>{showTable ? "Hide table" : "View as table"}</button>
    </header>

    <aside className={styles.notice}><Activity size={19}/><div><strong>{astronaut.isSimulated ? "Simulated demo data" : "Demonstration portal"}</strong><span>Amber and red markers use illustrative thresholds, not validated medical limits.</span></div></aside>

    <section className={`${styles.summary} ${styles.card}`} aria-label="History summary">
      <div className={styles.summaryHeading}><div><span className={styles.kicker}>YOUR RECENT CHECK-INS</span><h2>{records.length} days shown</h2></div><div className={styles.counts}>
        <div className={styles.countClear}><strong>{counts.clear}</strong><span>days all clear</span></div><div className={styles.countWatch}><strong>{counts.watch}</strong><span>days need attention</span></div>{counts.urgent > 0 && <div className={styles.countUrgent}><strong>{counts.urgent}</strong><span>act now</span></div>}
      </div></div>
      {records.length ? <div className={styles.dayStrip} aria-label="Day-by-day status, newest first">{markedDays.map(({ record, status }) => <button type="button" key={record.id} className={`${styles.daySquare} ${styles[`square_${status.toLowerCase()}`]}`} onClick={() => jumpTo(record)} aria-label={`${dateLong(record.recordedAt)}: ${status === "GREEN" ? "all clear" : status === "RED" ? "act now" : "needs attention"}`} title={`${dateShort(record.recordedAt)} · ${status === "GREEN" ? "All clear" : status === "RED" ? "Act now" : "Needs attention"}`}><span>{formatAppDate(record.recordedAt, { day: "numeric" })}</span></button>)}</div> : <p className={styles.emptyInline}>No health records are available for this profile.</p>}
      <div className={styles.legend}><span><i className={styles.greenDot}/>All clear</span><span><i className={styles.amberDot}/>Needs attention</span><span><i className={styles.redDot}/>Act now</span><span className={styles.newestLabel}>Newest first</span></div>
    </section>

    <FilterBar filterDays={filterDays} setFilterDays={setFilterDays} filterSymptoms={filterSymptoms} setFilterSymptoms={setFilterSymptoms}/>

    {showTable && <section className={`${styles.tableCard} ${styles.card}`}>
      <div className={styles.sectionHead}><div><h2>Health history table</h2><p>The same records and filters, in table form.</p></div><span>{records.length} records</span></div>
      {records.length ? <div className={styles.tableScroll}><table><thead><tr>{["Date", "Status", "HR", "BP", "Temp", "SpO₂", "Sleep", "Symptoms", ""].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{records.map((record) => {
        const status = statusOf(record);
        return <Fragment key={record.id}><tr onClick={() => setExpanded((current) => current === record.id ? null : record.id)}><td>{dateShort(record.recordedAt)}</td><td><StatusWord status={status}/></td><td>{record.heartRate ?? "—"}</td><td>{record.systolicBP != null ? `${record.systolicBP}/${record.diastolicBP ?? "—"}` : "—"}</td><td>{record.bodyTemp ?? "—"}</td><td>{record.oxygenSat ?? "—"}</td><td>{record.sleepDuration ?? "—"}</td><td className={styles.tableSymptom}>{record.symptoms ?? "None"}</td><td>{expanded === record.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</td></tr>{expanded === record.id && <tr className={styles.expandedRow}><td colSpan={9}><RecordDetails record={record}/></td></tr>}</Fragment>;
      })}</tbody></table></div> : <p className={styles.empty}>No records found for the selected filters.</p>}
    </section>}

    {records.length === 0 ? <section className={`${styles.card} ${styles.empty}`}><p>No records found for the selected filters.</p></section> : <>
      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>Days to look at</h2><p>Days with an out-of-range reading or a reported symptom.</p></div><span>{needsLook.length} {needsLook.length === 1 ? "day" : "days"}</span></div>
        {needsLook.length ? <div className={styles.flaggedList}>{needsLook.map(({ record, status, readings }) => <article id={`history-day-${record.id}`} key={record.id} className={`${styles.flaggedCard} ${styles.card} ${status === "RED" ? styles.urgentCard : ""}`}>
          <div className={styles.flaggedHeader}><div><time>{dateLong(record.recordedAt)}</time><StatusWord status={status === "GREEN" ? "AMBER" : status}/></div><button type="button" aria-label={expanded === record.id ? "Collapse full readings" : "Expand full readings"} onClick={() => setExpanded((current) => current === record.id ? null : record.id)}>{expanded === record.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button></div>
          {readings.some((item) => item.level !== "normal") ? <div className={styles.metricTiles}>{readings.filter((item) => item.level !== "normal").map((item) => <div className={`${styles.metricTile} ${styles[`metric_${item.level}`]}`} key={item.key}><span>{item.label}</span><strong>{item.value} <small>{item.unit}</small></strong><em>{item.direction ?? (item.level === "critical" ? "Critical" : "Outside range")}</em></div>)}</div> : <p className={styles.symptomOnly}>No out-of-range measurements recorded for this day.</p>}
          {record.symptoms && <div className={styles.symptoms}><span>Reported symptoms</span>{record.symptoms.split(/[,;.]+/).map((symptom) => symptom.trim()).filter(Boolean).map((symptom, i) => <span className={styles.symptomChip} key={`${i}-${symptom}`}>{symptom}</span>)}</div>}
          {expanded === record.id && <RecordDetails record={record}/>}
        </article>)}</div> : <div className={`${styles.card} ${styles.calm}`}><Check size={20}/><p>Nothing to flag — there are no symptom days or out-of-range readings in this period.</p></div>}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>The rest of your days</h2><p>Tap a day to expand every available reading.</p></div><span>{normalDays.length} {normalDays.length === 1 ? "day" : "days"}</span></div>
        {normalDays.length ? <div className={`${styles.timeline} ${styles.card}`}>{normalDays.map(({ record }) => <article className={styles.timelineItem} id={`history-day-${record.id}`} key={record.id}>
          <button type="button" className={styles.timelineButton} onClick={() => setExpanded((current) => current === record.id ? null : record.id)} aria-expanded={expanded === record.id}><i className={styles.greenDot}/><time>{dateShort(record.recordedAt)}</time><span className={styles.keyNumbers}>HR {record.heartRate ?? "—"} · BP {record.systolicBP != null ? `${record.systolicBP}/${record.diastolicBP ?? "—"}` : "—"} · Sleep {record.sleepDuration != null ? `${record.sleepDuration}h` : "—"} · {record.symptoms ? record.symptoms : "No symptoms"}</span>{expanded === record.id ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button>
          {expanded === record.id && <div className={styles.timelineDetails}><div className={styles.detailHeader}><strong>{dateLong(record.recordedAt)}</strong><StatusWord status={statusOf(record)}/></div><RecordDetails record={record}/></div>}
        </article>)}</div> : <div className={`${styles.card} ${styles.calm}`}><Check size={20}/><p>No other clear days in this filtered period.</p></div>}
      </section>
    </>}
    <p className={styles.disclaimer}>CrewCare is not a medical device. Health thresholds shown are illustrative and are not validated medical limits.</p>
  </main>;
}

function FilterBar({ filterDays, setFilterDays, filterSymptoms, setFilterSymptoms }: { filterDays: 7 | 14 | 30; setFilterDays: (value: 7 | 14 | 30) => void; filterSymptoms: boolean; setFilterSymptoms: (value: boolean | ((previous: boolean) => boolean)) => void }) {
  return <div className={styles.filters}><div className={styles.filterLabel}><Filter size={17}/><span>Show</span></div>{([7, 14, 30] as const).map((days) => <button type="button" key={days} aria-pressed={filterDays === days} onClick={() => setFilterDays(days)} className={`${styles.filterButton} ${filterDays === days ? styles.selectedFilter : ""}`}>{days} days</button>)}<button type="button" aria-pressed={filterSymptoms} onClick={() => setFilterSymptoms((current) => !current)} className={`${styles.filterButton} ${filterSymptoms ? styles.selectedFilter : ""}`}><AlertTriangle size={15}/>Symptoms only</button></div>;
}
