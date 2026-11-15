"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Check, Save, Users } from "lucide-react";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { HealthRecord } from "@/types";
import { APP_NOW, APP_NOW_ISO, countAnomalyDays, mergeDailyRecords } from "@/lib/health/checkin-store";
import styles from "./MissionAnalyticsPage.module.css";

type Trend = { direction: string; percentChange: number | null; completeness?: number };
type Member = {
  astronautId: string; name: string; callsign: string; phase3Status: string | null;
  recordCount: number; isSimulated: boolean; sleepTrend?: Trend; stressTrend?: Trend; heartRateTrend?: Trend;
  heartRateBaseline?: { sufficient: boolean; median: number | null; minimum?: number | null; maximum?: number | null; unit: string; standardDeviation?: number | null };
  latestHeartRate: number | null; personalHeartRateDeviation: number | null;
  anomalyCount: number; repeatedAnomalyCount: number; patterns: { category: string; explanation: string; priority: string }[]; dataCompleteness: number;
  observations: { category: string; explanation: string; suggestedFollowUp: string; priority: string; reliability: number }[];
  records?: HealthRecord[];
};
type Report = { generatedAt: string; mission: { name: string; code: string }; crewCount: number; totalRecords: number; meanDataCompleteness: number; totalAnomalies: number; repeatedAnomalies: number; members: Member[]; notes: string[] };
type Point = { date: string; value: number; id: string };

const change = (value: number | null | undefined) => value == null ? "—" : `${value > 0 ? "+" : ""}${value}%`;
const directionLabel = (direction?: string) => direction === "increasing" ? "Going up" : direction === "decreasing" ? "Going down" : direction === "stable" ? "Steady" : "No data";
const directionIcon = (direction?: string) => direction === "increasing" ? ArrowUpRight : direction === "decreasing" ? ArrowDownRight : ArrowRight;
const status = (value: string | null) => value === "RED" ? { text: "Act now", className: styles.statusRed } : value === "AMBER" ? { text: "Needs attention", className: styles.statusAmber } : { text: "All clear", className: styles.statusGreen };
const formatUnit = (value: number | null | undefined, unit: string) => value == null ? "—" : `${value} ${unit}`;

function toPoints(records: HealthRecord[], key: keyof HealthRecord): Point[] {
  return records.map((record) => ({ date: record.recordedAt, value: record[key], id: record.id }))
    .filter((point): point is Point => typeof point.value === "number");
}

function Sparkline({ points, color = "#67ded6", band, unusualIds = [], label }: { points: Point[]; color?: string; band?: [number | null | undefined, number | null | undefined]; unusualIds?: string[]; label: string }) {
  if (!points.length) return <div className={styles.noDataChart}>No recorded readings</div>;
  const values = [...points.map((point) => point.value), ...(band?.filter((value): value is number => typeof value === "number") ?? [])];
  const low = Math.min(...values), high = Math.max(...values), span = high - low || Math.max(1, Math.abs(high) * .08);
  const x = (index: number) => points.length < 2 ? 160 : 6 + index / (points.length - 1) * 308;
  const y = (value: number) => 68 - ((value - low) / span) * 56;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const lowBand = band?.[0] ?? null, highBand = band?.[1] ?? null;
  const bandY = highBand != null ? y(highBand) : 0;
  const bandHeight = lowBand != null && highBand != null ? Math.max(2, y(lowBand) - y(highBand)) : 0;
  return <svg className={styles.sparkline} viewBox="0 0 320 80" preserveAspectRatio="none" role="img" aria-label={`${label} trend sparkline`}>
    <line x1="4" x2="316" y1="69" y2="69" className={styles.chartBaseline}/>
    {lowBand != null && highBand != null && <rect x="4" y={bandY} width="312" height={bandHeight} rx="4" className={styles.rangeBand}/>}
    <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    {points.map((point, index) => unusualIds.includes(point.id) ? <circle key={point.id} cx={x(index)} cy={y(point.value)} r="4" className={styles.unusualDot}><title>Unusual reading</title></circle> : null)}
    <circle cx={x(points.length - 1)} cy={y(points.at(-1)!.value)} r="3.3" fill={color}/>
  </svg>;
}

function MiniTrend({ label, trend, points, tone }: { label: string; trend?: Trend; points: Point[]; tone: string }) {
  const Arrow = directionIcon(trend?.direction);
  return <div className={styles.miniTrend}>
    <span className={styles.miniTrendLabel}>{label}</span>
    <Sparkline points={points} color={tone} label={`${label} 30-day`}/>
    <div className={styles.miniTrendFooter}><span><Arrow size={14}/>{directionLabel(trend?.direction)}</span><small>{change(trend?.percentChange)}</small></div>
  </div>;
}

function RangeBar({ value, minimum, maximum }: { value: number | null; minimum?: number | null; maximum?: number | null }) {
  if (value == null || minimum == null || maximum == null) return <div className={styles.rangeBarEmpty}>Personal range unavailable</div>;
  const spread = Math.max(maximum - minimum, 1);
  const position = Math.max(0, Math.min(100, ((value - (minimum - spread * .25)) / (spread * 1.5)) * 100));
  return <div className={styles.rangeBarWrap} aria-label={`Current reading position against personal range ${minimum} to ${maximum}`}>
    <div className={styles.rangeBar}><span className={styles.rangeBarUsual}/><i style={{ left: `${position}%` }}/></div>
    <div className={styles.rangeBarLabels}><span>Below</span><span>Usual range</span><span>Above</span></div>
  </div>;
}

function buildFindings(member: Member, records: HealthRecord[]) {
  const report = generateHealthIntelligence(records, { phase3Status: member.phase3Status as "GREEN" | "AMBER" | "RED" | null });
  const byKey = new Map<string, typeof report.anomalies>();
  for (const anomaly of report.anomalies) {
    const baseline = report.baselines.find((item) => item.indicator === anomaly.indicator);
    const source = records.find((record) => record.id === anomaly.sourceRecordId);
    if (!baseline?.sufficient || baseline.minimum == null || baseline.maximum == null || !source || new Date(source.recordedAt).getTime() < APP_NOW.getTime() - 30 * 86_400_000) continue;
    if (anomaly.actualValue >= baseline.minimum && anomaly.actualValue <= baseline.maximum) continue;
    const direction = anomaly.actualValue >= (baseline?.mean ?? anomaly.actualValue) ? "higher" : "lower";
    const key = `${anomaly.indicator}:${direction}`;
    byKey.set(key, [...(byKey.get(key) ?? []), anomaly]);
  }
  return [...byKey.values()].map((items) => items.sort((a, b) => b.deviationScore - a.deviationScore)[0])
    .sort((a, b) => b.deviationScore - a.deviationScore).slice(0, 3).map((top) => {
      const baseline = report.baselines.find((item) => item.indicator === top.indicator);
      const direction = top.actualValue >= (baseline?.mean ?? top.actualValue) ? "higher" : "lower";
      const count = byKey.get(`${top.indicator}:${direction}`)?.length ?? 1;
      return { key: `${top.indicator}:${direction}`, label: top.label, direction, count, reliability: top.severity, method: top.method, explanation: top.explanation };
    });
}

function reportFromSharedStore() {
  const members = DEMO_ASTRONAUTS.map((astronaut) => {
    let local: HealthRecord[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(`crewcare_checkins_${astronaut.id}`) ?? "[]");
      if (Array.isArray(parsed)) local = parsed.filter((record) => record?.userId === astronaut.id && record?.id);
    } catch { /* Keep the canonical demo fixture. */ }
    const records = mergeDailyRecords(astronaut.healthRecords ?? [], local);
    const intelligence = generateHealthIntelligence(records, { phase3Status: astronaut.latestAssessment?.status });
    const baselines = intelligence.baselines;
    const outDays = countAnomalyDays(intelligence.anomalies);
    const trend = (indicator: string) => intelligence.trends.find((item) => item.indicator === indicator && item.period === "30d");
    const statusValue = astronaut.latestAssessment?.status === "RED" ? "RED" : astronaut.latestAssessment?.status === "AMBER" || outDays.days > 0 ? "AMBER" : astronaut.latestAssessment?.status ?? null;
    const latest = records.at(-1);
    const hrBaseline = baselines.find((item) => item.indicator === "heartRate");
    const deviation = latest?.heartRate != null && hrBaseline?.sufficient && hrBaseline.standardDeviation ? Number(((latest.heartRate - hrBaseline.median!) / hrBaseline.standardDeviation).toFixed(2)) : null;
    return {
      astronautId: astronaut.id, name: astronaut.name, callsign: astronaut.callsign, phase3Status: statusValue,
      recordCount: records.length, isSimulated: true, sleepTrend: trend("sleepDuration"), stressTrend: trend("stressLevel"), heartRateTrend: trend("heartRate"),
      heartRateBaseline: hrBaseline, latestHeartRate: latest?.heartRate ?? null, personalHeartRateDeviation: deviation,
      anomalyCount: outDays.days, repeatedAnomalyCount: outDays.repeatedDays,
      patterns: intelligence.patterns, observations: intelligence.observations, dataCompleteness: trend("heartRate")?.completeness ?? 0,
      records,
    };
  });
  const totalRecords = members.reduce((total, member) => total + member.recordCount, 0);
  return {
    generatedAt: APP_NOW_ISO, mission: { name: "Horizon VII", code: "HORIZON-7" }, crewCount: members.length, totalRecords,
    meanDataCompleteness: members.length ? Number((members.reduce((sum, member) => sum + member.dataCompleteness, 0) / members.length).toFixed(2)) : 0,
    totalAnomalies: members.reduce((sum, member) => sum + member.anomalyCount, 0), repeatedAnomalies: members.reduce((sum, member) => sum + member.repeatedAnomalyCount, 0),
    members,
    notes: ["Crew patterns are summarized from person-specific baselines; raw values are not treated as directly comparable between astronauts.", "Statistical deviations and projections are not medical diagnoses or validated medical limits.", "Correlations do not establish causation. Phase 3 remains authoritative for configured safety alerts."],
  };
}

export default function MissionAnalyticsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadReport = useCallback(async () => {
    setLoading(true); setLoadFailed(false); setMessage("");
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch("/api/analytics/mission", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Analytics unavailable");
        if (!data.report || !Array.isArray(data.report.members) || data.report.members.length === 0) throw new Error("Crew data is empty.");
        const shared = reportFromSharedStore();
        setReport(shared); setLoading(false); return;
      } catch (error) { lastError = error; }
    }
    setMessage(lastError instanceof Error ? lastError.message : "Crew data could not be loaded.");
    setLoadFailed(true); setLoading(false);
  }, []);
  useEffect(() => { void loadReport(); }, [loadReport]);

  const save = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/analytics/mission", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demoStates: DEMO_ASTRONAUTS.map((astronaut) => ({ astronautId: astronaut.id, records: JSON.parse(localStorage.getItem(`crewcare_checkins_${astronaut.id}`) ?? "[]") })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save report");
      setReport(reportFromSharedStore());
      setMessage(data.persisted ? "Report saved." : "Demo report calculated for this session.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save report"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="card" role="status" style={{ padding: 24 }}>Loading crew…</div>;
  if (!report) return <div className="card" style={{ padding: 24 }}>{loadFailed ? <><p>Could not load the crew analytics after retrying. {message}</p><button className="btn btn-primary" onClick={() => void loadReport()}>Reload crew data</button></> : message}</div>;

  return <main className={styles.page}>
    <header className={styles.pageHeader}>
      <div><p className="section-kicker">{report.mission.code} · MISSION HEALTH</p><h1>Crew analytics</h1><p className={styles.subtitle}>Four crew members · Simulated demo data · Not a medical device</p></div>
      <button className="btn btn-primary" onClick={save} disabled={busy}><Save size={15}/>{busy ? "Saving…" : "Save report"}</button>
    </header>
    {message && <p role="status" className={styles.statusMessage}>{message}</p>}
    <section className={styles.statsGrid} aria-label="Crew analytics summary">
      {[{ label: "CREW", value: report.crewCount, Icon: Users }, { label: "HEALTH RECORDS", value: report.totalRecords, Icon: Activity }, { label: "30-DAY COVERAGE", value: `${Math.round(report.meanDataCompleteness * 100)}%`, Icon: BarChart3 }, { label: "DEVIATIONS", value: report.totalAnomalies, Icon: AlertTriangle }].map(({ label, value, Icon }) => <article key={label} className={styles.statCard}><Icon size={17}/><span>{label}</span><strong>{value}</strong></article>)}
    </section>
    {report.repeatedAnomalies > 0 && <section className={styles.repeatBanner}><strong>{report.repeatedAnomalies}</strong><span>Repeated changes from personal ranges</span><AlertTriangle size={20}/></section>}
    <section className={styles.crewGrid} aria-label="Crew member visual analytics">{report.members.map((member) => {
      const records = (member as Member & { records?: HealthRecord[] }).records ?? [];
      const heartPoints = toPoints(records, "heartRate");
      const sleepPoints = toPoints(records, "sleepDuration");
      const stressPoints = toPoints(records, "stressLevel");
      const findings = buildFindings(member, records);
      const memberStatus = status(member.phase3Status);
      const heartAnomalies = new Set(generateHealthIntelligence(records, { phase3Status: member.phase3Status as "GREEN" | "AMBER" | "RED" | null }).anomalies.filter((item) => item.indicator === "heartRate").map((item) => item.sourceRecordId));
      const baseline = member.heartRateBaseline;
      const rangeText = baseline?.sufficient && baseline.minimum != null && baseline.maximum != null ? `${baseline.minimum}–${baseline.maximum} ${baseline.unit}` : "No personal range yet";
      return <article className={styles.crewCard} key={member.astronautId}>
        <header className={styles.crewCardHeader}><div><span className={styles.callsign}>{member.callsign} <i className={`${styles.statusDot} ${memberStatus.className}`}/><b className={memberStatus.className}>{memberStatus.text}</b></span><h2>{member.name}</h2></div><span className={styles.recordPill}>{member.recordCount} records</span></header>
        <div className={styles.heartChartHeader}><div><span className={styles.metricLabel}>HEART RATE · 30 DAYS</span><span className={styles.chartLegend}><i/> Usual range</span></div><strong>{formatUnit(member.latestHeartRate, baseline?.unit ?? "BPM")}</strong></div>
        <div className={styles.heartChart}><Sparkline points={heartPoints} band={[baseline?.minimum, baseline?.maximum]} unusualIds={[...heartAnomalies]} label={`${member.callsign} heart rate`}/><div className={styles.chartAxis}><span>30 days ago</span><span>Latest</span></div></div>
        <div className={styles.miniTrendGrid}>
          <MiniTrend label="SLEEP" trend={member.sleepTrend} points={sleepPoints} tone="#8fd8c8"/>
          <MiniTrend label="STRESS" trend={member.stressTrend} points={stressPoints} tone="#a9c9e6"/>
          <MiniTrend label="HEART RATE" trend={member.heartRateTrend} points={heartPoints} tone="#67ded6"/>
        </div>
        <div className={styles.currentReading}><div><strong>{member.latestHeartRate ?? "—"}</strong><span>BPM</span><small>Latest heart rate</small></div><RangeBar value={member.latestHeartRate} minimum={baseline?.minimum} maximum={baseline?.maximum}/></div>
        <div className={styles.deviationRow}><div className={styles.deviationShare}><span style={{ width: `${member.recordCount ? Math.max(0, Math.min(100, member.anomalyCount / member.recordCount * 100)) : 0}%` }}/></div><div><strong>{member.anomalyCount}</strong><span>Out of range days</span></div><div><strong>{member.repeatedAnomalyCount}</strong><span>Repeated</span></div></div>
        <section className={styles.findings}><h3>What stands out</h3>{findings.length ? findings.map((finding) => <p key={finding.key}>{finding.direction === "higher" ? <ArrowUpRight size={15}/> : <ArrowDownRight size={15}/>}<span>{finding.label} {finding.direction} than usual — {finding.count} {finding.count === 1 ? "time" : "times"}</span></p>) : <p><Check size={15}/><span>No unusual readings in the recent history.</span></p>}<small>Check these readings again — past data, not a diagnosis.</small></section>
        <details className={styles.details}><summary>How this is calculated</summary><p>Personal range: {rangeText}. Values are compared with this person’s recorded history.</p><p>Latest reading: {formatUnit(member.latestHeartRate, baseline?.unit ?? "BPM")}{baseline?.median != null ? ` · Typical midpoint ${baseline.median} ${baseline.unit}` : ""}{member.personalHeartRateDeviation != null ? ` · Distance from typical pattern ${member.personalHeartRateDeviation}` : ""}.</p>{member.observations.slice(0, 3).map((observation, index) => <p key={`${observation.category}-${index}`}>{observation.explanation} Follow-up: {observation.suggestedFollowUp} Confidence: {Math.round(observation.reliability * 100)}%.</p>)}</details>
        <Link className={styles.profileLink} href={`/mission-control/crew/${encodeURIComponent(member.astronautId)}`}>Open crew profile <ArrowRight size={15}/></Link>
      </article>;
    })}</section>
    <section className={styles.notes}><h2>Interpretation notes</h2><p>Patterns describe past readings. They are not a diagnosis.</p><details className={styles.details}><summary>How this is calculated</summary>{report.notes.map((note) => <p key={note}>{note}</p>)}</details></section>
  </main>;
}
