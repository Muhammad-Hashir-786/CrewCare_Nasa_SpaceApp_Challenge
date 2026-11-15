"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Minus, Activity, Moon, Brain, Smile, Info, AlertCircle } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAstronaut } from "@/lib/astronaut-context";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { HealthRecord } from "@/types";
import styles from "./analytics.module.css";

type Days = 7 | 14 | 30 | 90 | 365;
type MetricKey = "heartRate" | "systolicBP" | "bodyTemp" | "oxygenSat";
interface ChartPoint { date: string; sourceRecordId: string; value: number | null; secondaryValue?: number | null; unusual?: boolean; secondaryUnusual?: boolean; }

const baselineIcons = { heartRate: Activity, sleepDuration: Moon, stressLevel: Brain, mood: Smile } as const;
const baselineTitles: Record<string, string> = { heartRate: "Heart rate", sleepDuration: "Sleep", stressLevel: "Stress", mood: "Mood" };

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function trendText(direction?: string) {
  if (direction === "increasing") return { label: "Going up", Icon: ArrowUp };
  if (direction === "decreasing") return { label: "Going down", Icon: ArrowDown };
  if (direction === "stable") return { label: "Steady", Icon: Minus };
  return { label: "Not enough records", Icon: Minus };
}

function ChartDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: ChartPoint }) {
  if (cx == null || cy == null) return null;
  if (payload?.unusual) return <g><circle cx={cx} cy={cy} r={6} fill="#f1c66a" stroke="#172622" strokeWidth={2} /><text x={cx + 9} y={cy - 9} fill="#f5d990" fontSize={12}>Unusual · {payload.date}</text></g>;
  return <circle cx={cx} cy={cy} r={3.5} fill="#67ded6" stroke="#071715" strokeWidth={1.5} />;
}

function PlainTooltip({ active, payload, label, unit }: { active?: boolean; payload?: ReadonlyArray<{ value?: unknown; name?: unknown }>; label?: string | number; unit: string }) {
  if (!active || !payload?.length) return null;
  return <div className={styles.tooltip}><strong>{String(label??"")}</strong>{payload.map((item,index)=><span key={index}>{String(item.name??"")}: {String(item.value??"—")} {unit}</span>)}</div>;
}

function TrendChart({ title, unit, records, metric, anomalies, caption }: {
  title: string; unit: string; records: HealthRecord[]; metric: MetricKey; anomalies: Array<{ sourceRecordId: string; indicator: string }>;
  caption: string;
}) {
  const anomalyIds = new Set(anomalies.filter((item)=>item.indicator===metric).map((item) => item.sourceRecordId));
  const secondaryAnomalyIds = new Set(anomalies.filter((item)=>item.indicator==="diastolicBP").map((item)=>item.sourceRecordId));
  const chartData: ChartPoint[] = records.map((record) => ({
    date: formatDate(record.recordedAt), sourceRecordId: record.id,
    value: (record[metric] as number | null | undefined) ?? null,
    secondaryValue: metric==="systolicBP"?(record.diastolicBP??null):undefined,
    unusual: anomalyIds.has(record.id), secondaryUnusual: secondaryAnomalyIds.has(record.id),
  }));
  const populated = chartData.some((point) => point.value != null);
  return <article className={styles.chartCard}>
    <div className={styles.chartHeader}><div><span className={styles.eyebrow}>YOUR CHART</span><h3>{title}</h3></div><span className={styles.chartUnit}>{unit}</span></div>
    {populated ? <ResponsiveContainer width="100%" height={285}>
      <LineChart data={chartData} margin={{ top: 23, right: 25, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="rgba(194,220,215,.11)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#b5c9c6" }} axisLine={{ stroke: "#36504c" }} tickLine={false} minTickGap={14} />
        <YAxis tick={{ fontSize: 12, fill: "#b5c9c6" }} axisLine={false} tickLine={false} width={48} domain={["auto", "auto"]} />
        <Tooltip content={({ active, payload, label }) => <PlainTooltip active={active} payload={payload?.map((item) => ({ value: item.value, name: item.name }))} label={label} unit={unit} />} />
        {metric==="systolicBP"&&<Legend wrapperStyle={{fontSize:13,color:"#bfd3d0"}}/>}
        <Line type="monotone" dataKey="value" name={metric==="systolicBP"?"Systolic":title} stroke="#67ded6" strokeWidth={3} connectNulls dot={(props) => <ChartDot {...props} />} activeDot={{ r: 6, fill: "#a8fff7", stroke: "#071715", strokeWidth: 2 }} />
        {metric==="systolicBP"&&<Line type="monotone" dataKey="secondaryValue" name="Diastolic" stroke="#c0d3d0" strokeWidth={2} strokeDasharray="6 4" connectNulls dot={(props)=><ChartDot {...props} payload={{...props.payload,unusual:props.payload?.secondaryUnusual}}/>}/>}
      </LineChart>
    </ResponsiveContainer> : <div className={styles.emptyChart}>No {title.toLowerCase()} readings in this time range.</div>}
    <p className={styles.chartCaption}>{caption}</p>
  </article>;
}

export default function AnalyticsPage() {
  const { astronaut } = useAstronaut();
  const [days, setDays] = useState<Days>(14);
  const [savingReport, setSavingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const intelligence = useMemo(() => generateHealthIntelligence(astronaut.healthRecords ?? [], { phase3Status: astronaut.latestAssessment?.status }), [astronaut]);
  const saveReport = async () => {
    setSavingReport(true); setReportMessage(null);
    try {
      const response = await fetch(`/api/analytics/${encodeURIComponent(astronaut.id)}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Analytics could not be saved.");
      setReportMessage(result.persisted ? "Analytics report saved to the mission database." : "Calculated for this demo session; connect PostgreSQL to save report history.");
    } catch (error) { setReportMessage(error instanceof Error ? error.message : "Analytics could not be saved."); }
    finally { setSavingReport(false); }
  };
  const records: HealthRecord[] = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return [...(astronaut.healthRecords ?? [])].filter((record) => new Date(record.recordedAt) >= cutoff).sort((a,b) => new Date(a.recordedAt).getTime()-new Date(b.recordedAt).getTime());
  }, [astronaut, days]);

  const baselines = ["heartRate", "sleepDuration", "stressLevel", "mood"];
  const charts: Array<{ key: MetricKey; label: string; unit: string }> = [
    { key: "heartRate", label: "Heart rate", unit: "bpm" },
    { key: "systolicBP", label: "Blood pressure · systolic", unit: "mmHg" },
    { key: "bodyTemp", label: "Body temperature", unit: "°C" },
    { key: "oxygenSat", label: "Oxygen saturation", unit: "%" },
  ];
  const captions = (key: MetricKey, unit: string) => {
    const values = records.map((record) => ({ value: record[key], date: formatDate(record.recordedAt) })).filter((item): item is { value: number; date: string } => item.value != null);
    if (!values.length) return "No readings are available for this time range.";
    const peak = values.reduce((best, item) => item.value > best.value ? item : best);
    const first = values[0], latest = values[values.length - 1];
    const change = first.value === latest.value ? "has stayed level" : latest.value > first.value ? "has moved up" : "has moved down";
    return "Your readings " + change + " across this period. Highest: " + peak.value + " " + unit + " on " + peak.date + "; latest: " + latest.value + " " + unit + ".";
  };
  const periodRecordIds = new Set(records.map((record) => record.id));
  const groupedFindings = new Map<string, typeof intelligence.anomalies>();
  for (const anomaly of intelligence.anomalies) {
    if (!periodRecordIds.has(anomaly.sourceRecordId)) continue;
    const baseline = intelligence.baselines.find((item) => item.indicator === anomaly.indicator);
    if (baseline?.mean == null) continue;
    const direction = anomaly.actualValue >= baseline.mean ? "higher" : "lower";
    const key = anomaly.indicator + ":" + direction;
    groupedFindings.set(key, [...(groupedFindings.get(key) ?? []), anomaly]);
  }
  const standoutGroups = [...groupedFindings.entries()].map(([key, items]) => {
    const direction = key.endsWith(":higher") ? "higher" : "lower";
    const uniqueItems = [...new Map(items.map((item) => [item.sourceRecordId, item])).values()];
    const mostExtreme = uniqueItems.reduce((best, item) => direction === "higher"
      ? item.actualValue > best.actualValue ? item : best
      : item.actualValue < best.actualValue ? item : best);
    return {
      key,
      direction,
      items: uniqueItems,
      mostExtreme,
      rank: Math.max(...uniqueItems.map((item) => item.deviationScore)),
    };
  }).sort((a, b) => b.rank - a.rank).slice(0, 5);

  return <div className={styles.analyticsPage}>
    <header className={styles.pageHeader}>
      <div><span className={styles.eyebrow}>HEALTH ANALYTICS · {astronaut.callsign}</span><h1>Trend analysis</h1><p>{astronaut.name} · Simulated demo data — not a medical device.</p></div>
      <div className={styles.rangeSelector} aria-label="Choose time range">{([7,14,30,90,365] as const).map((value)=><button key={value} type="button" aria-pressed={days===value} className={days===value?styles.rangeSelected:styles.rangeButton} onClick={()=>setDays(value)}>{value===365?"Mission view":value+"-day"}</button>)}</div>
    </header>

    <section className={styles.section}>
      <div className={styles.sectionHeader}><div><span className={styles.sectionNumber}>01</span><h2>Your baselines</h2><p>Your usual readings, based on your personal records.</p></div><button className={styles.saveButton} onClick={saveReport} disabled={savingReport}>{savingReport?"Saving…":"Recalculate & save report"}<ArrowRight size={18}/></button></div>
      {reportMessage&&<p className={styles.reportMessage} role="status">{reportMessage}</p>}
      <div className={styles.baselineGrid}>{baselines.map((key)=>{
        const baseline=intelligence.baselines.find((item)=>item.indicator===key);
        if(!baseline)return null;
        const trend=trendText(intelligence.trends.find((item)=>item.indicator===key&&item.period==="mission")?.direction);
        const Icon=baselineIcons[key as keyof typeof baselineIcons];
        const mean=baseline.mean;
        const value=mean==null?"—":key==="mood"?(mean.toFixed(1)+" /5"):mean+" "+baseline.unit;
        return <article className={styles.baselineCard} key={key}><div className={styles.baselineTitle}><span><Icon size={19}/></span><h3>{baselineTitles[key]}</h3></div><strong className={styles.baselineValue}>{value}</strong>{baseline.sufficient?<><p className={styles.usualRange}>Your usual: {baseline.minimum}–{baseline.maximum} {baseline.unit} · {baseline.count} records</p><div className={styles.trendLine}><trend.Icon size={17}/><span>{trend.label}</span></div></>:<p className={styles.usualRange}>Not enough history yet · {baseline.count} of {baseline.minimumRequired} records</p>}</article>;
      })}</div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeader}><div><span className={styles.sectionNumber}>02</span><h2>What stands out</h2><p>Changes compared with earlier records.</p></div></div>
      {standoutGroups.length ? <div className={styles.findingsList}>{standoutGroups.map((group) => {
        const { mostExtreme } = group;
        const dates = group.items.map((item) => formatDate(item.timestamp)).join(", ");
        const valueWord = group.direction === "higher" ? "highest" : "lowest";
        return <p className={styles.findingLine} key={group.key}><span className={styles.findingIcon}><AlertCircle size={19}/></span><span>{mostExtreme.label} — {group.direction} than usual {group.items.length} {group.items.length === 1 ? "time" : "times"} ({dates}) — {valueWord} <strong>{mostExtreme.actualValue} {mostExtreme.unit}</strong> on {formatDate(mostExtreme.timestamp)}, usual about {mostExtreme.expectedMinimum}–{mostExtreme.expectedMaximum} {mostExtreme.unit}.</span></p>;
      })}</div> : <div className={styles.nothingUnusual}><span className={styles.findingIcon}><Info size={19}/></span><p>Nothing unusual — all readings are in your usual range this period.</p></div>}
      <p className={styles.honestyLine}>This describes past records — not a diagnosis.</p>
      <details className={styles.methodDetails}><summary>How this is calculated</summary><p>Unusual readings are compared with earlier personal records using robust statistical ranges. Baselines use the same historical calculation as before. A small number of records can make these comparisons less reliable.</p><p>Records analyzed: {intelligence.recordCount}. {intelligence.limitations[1]}</p></details>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeader}><div><span className={styles.sectionNumber}>03</span><h2>What might happen next</h2><p>Five-day estimates based on the recorded trend.</p></div></div>
      <div className={styles.forecastList}>{intelligence.forecasts.length?intelligence.forecasts.map((item)=><article className={styles.forecastLine} key={item.indicator}><span className={styles.forecastIcon}><ArrowRight size={20}/></span><p>{item.label} in 5 days: about <strong>{item.projectedValue} {item.unit}</strong> — most likely between {item.lowerBound} and {item.upperBound} {item.unit}. Confidence: {Math.round(item.confidence*100)}%.</p></article>):<p className={styles.emptyNote}>Not enough records are available to show a projection for this period.</p>}</div>
      <p className={styles.honestyLine}>This is a projection from past data, not a prediction or a diagnosis.</p>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHeader}><div><span className={styles.sectionNumber}>04</span><h2>Your charts</h2><p>Readings recorded during the selected time range.</p></div></div>
      <div className={styles.chartGrid}>{charts.map((chart)=><TrendChart key={chart.key} title={chart.label} unit={chart.unit} records={records} metric={chart.key} anomalies={intelligence.anomalies.filter((item)=>item.indicator===chart.key)} caption={captions(chart.key,chart.unit)}/>)}</div>
      <p className={styles.honestyLine}>These charts display recorded history. They do not diagnose a condition or confirm what will happen next.</p>
    </section>
  </div>;
}
