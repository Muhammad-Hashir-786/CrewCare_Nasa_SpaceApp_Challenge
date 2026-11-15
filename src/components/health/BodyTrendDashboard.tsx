"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { Astronaut, HealthRecord } from "@/types";
import type { EmergencyType } from "@/lib/emergency/first-aid-guidance";
import styles from "./body-trend-dashboard.module.css";

type Period = 7 | 14 | 30 | 90 | 365;
type DashboardPerson = Pick<Astronaut, "id" | "name" | "callsign" | "rank" | "specialty">;
type BodySystem = "head" | "eyes" | "heart" | "lungs" | "metabolism" | "arms" | "legs";
type Tone = "green" | "amber" | "red" | "neutral";
type GaugeDefinition = { key: string; label: string; unit: string; min: number; max: number; chartMax: number; secondKey?: string; secondMin?: number; secondMax?: number };

const periodChoices: Array<{ value: Period; label: string }> = [
  { value: 7, label: "7 days" }, { value: 14, label: "14 days" }, { value: 30, label: "30 days" },
  { value: 90, label: "90 days" }, { value: 365, label: "Mission view" },
];
const chartSpecs = [
  { key: "heartRate", label: "Heart rate", unit: "bpm", color: "#08784f" },
  { key: "systolicBP", label: "Blood pressure", unit: "mmHg", color: "#08784f", second: "diastolicBP" },
  { key: "oxygenSat", label: "Oxygen saturation", unit: "%", color: "#08784f" },
  { key: "sleepDuration", label: "Sleep", unit: "hours", color: "#08784f" },
] as const;
const bodySystems: Array<{ id: BodySystem; name: string; metricKeys: string[] }> = [
  { id: "head", name: "Brain & wellbeing", metricKeys: ["mood", "anxietyLevel", "stressLevel", "sleepDuration"] },
  { id: "eyes", name: "Vision", metricKeys: [] },
  { id: "heart", name: "Heart & circulation", metricKeys: ["heartRate", "systolicBP", "diastolicBP"] },
  { id: "lungs", name: "Breathing & oxygen", metricKeys: ["oxygenSat"] },
  { id: "metabolism", name: "Blood sugar & temperature", metricKeys: ["bloodGlucose", "bodyTemp"] },
  { id: "arms", name: "Arms & joints", metricKeys: [] },
  { id: "legs", name: "Legs & mobility", metricKeys: [] },
];
const emergencySystem: Partial<Record<EmergencyType, BodySystem>> = {
  radiation: "head", "decompression-sickness": "legs", "chest-pain": "heart", collapsed: "heart",
  "breathing-trouble": "lungs", "vision-change": "eyes", "heavy-bleeding": "arms", "broken-bone": "legs",
  "fever-infection": "metabolism", "toxic-air": "lungs", "panic-confusion": "head", choking: "lungs", burn: "arms",
};
const dateLabel = (date: string | Date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const scoreMap: Record<string, number> = { VERY_LOW: 1, LOW: 2, NEUTRAL: 3, GOOD: 4, EXCELLENT: 5, EXHAUSTED: 1, VERY_TIRED: 2, TIRED: 3, MODERATE: 4, REFRESHED: 5 };

function valueFor(record: HealthRecord, key: string): number | null {
  const raw = (record as unknown as Record<string, unknown>)[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && key === "mood") return scoreMap[raw] ?? null;
  if (typeof raw === "string" && key === "fatigue") return scoreMap[raw] ?? null;
  return null;
}

function Gauge({ label, value, unit, verdict, tone, fill }: { label: string; value: string | null; unit: string; verdict: string; tone: Tone; fill: number | null }) {
  const circumference = 2 * Math.PI * 39;
  const offset = fill == null ? circumference : circumference * (1 - Math.max(0.06, Math.min(0.94, fill)));
  return <article className={`${styles.gaugeCard} ${styles[`tone_${tone}`]}`}>
    <div className={styles.gaugeVisual} aria-hidden="true"><svg viewBox="0 0 100 100"><circle className={styles.gaugeTrack} cx="50" cy="50" r="39"/><circle className={styles.gaugeArc} cx="50" cy="50" r="39" strokeDasharray={circumference} strokeDashoffset={offset}/></svg><div className={styles.gaugeValue}>{value == null ? <span className={styles.noValue}>—</span> : <><strong>{value}</strong><small>{unit}</small></>}</div></div>
    <h3>{label}</h3><p>{verdict}</p>
  </article>;
}

function EmergencyGauge({ label, value, unit, verdict, tone, fill }: { label: string; value: string | null; unit: string; verdict: string; tone: Tone; fill: number | null }) {
  return <article className={`${styles.gaugeCard} ${styles.emergencyGaugeCard} ${styles[`tone_${tone}`]}`}>
    <div className={styles.emergencyReadingValue}>{value == null ? <strong aria-label="No reading">—</strong> : <><strong>{value}</strong><span>{unit}</span></>}</div>
    <div className={styles.emergencyReadingTrack} aria-hidden="true"><span style={{ width: fill == null ? "0%" : `${Math.max(6, Math.min(100, fill * 100))}%` }}/></div>
    <h3>{label}</h3><p>{verdict}</p>
  </article>;
}

function HumanFigure({ tones, highlighted, onSelect, emergency = false }: { tones: Record<BodySystem, Tone>; highlighted?: BodySystem | null; onSelect: (id: BodySystem) => void; emergency?: boolean }) {
  const activate = (id: BodySystem) => (event: React.KeyboardEvent<SVGGElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(id); } };
  const region = (id: BodySystem, shape: React.ReactNode, label: string) => <g key={id} className={`${styles.bodyPart} ${styles[`body_${id}`]} ${styles[`part_${tones[id]}`]} ${highlighted === id ? (emergency ? styles.part_emergency : styles.part_selected) : ""}`} role="button" tabIndex={0} aria-label={`${label}: ${tones[id] === "neutral" ? "No data" : tones[id]}${emergency && highlighted === id ? ", emergency area selected" : ""}`} onClick={() => onSelect(id)} onKeyDown={activate(id)}>{shape}<title>{`${label}${tones[id] === "neutral" ? " — No data" : ` — ${tones[id]}`}`}</title></g>;
  return <svg className={styles.figure} viewBox="0 0 220 430" role="group" aria-label="Interactive front-view body map">
    <defs><radialGradient id="bodyGlow"><stop stopColor="#67ded6" stopOpacity=".15"/><stop offset="1" stopColor="#67ded6" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="110" cy="226" rx="94" ry="192" fill="url(#bodyGlow)"/>
    {region("head", <><circle className={styles.silhouette} cx="110" cy="49" r="31"/><path className={styles.partFill} d="M91 56q19-13 38 0v13q-19 12-38 0z"/></>, "Brain and wellbeing")}
    {region("eyes", <><path className={styles.partFill} d="M91 48q9-8 18 0-9 8-18 0zm20 0q9-8 18 0-9 8-18 0z"/><circle cx="100" cy="48" r="2.2" className={styles.silhouette}/><circle cx="120" cy="48" r="2.2" className={styles.silhouette}/></>, "Eyes and vision")}
    {region("arms", <><path className={styles.silhouette} d="M72 104q-12 4-17 19l-21 90q-4 14 7 19 11 4 16-11l25-76 12-22z"/><path className={styles.silhouette} d="M148 104q12 4 17 19l21 90q4 14-7 19-11 4-16-11l-25-76-12-22z"/><path className={styles.partFill} d="M48 212l-9 19q-2 7 4 9 7 1 10-7l7-18zM172 212l9 19q2 7-4 9-7 1-10-7l-7-18z"/></>, "Arms and joints")}
    {region("heart", <><path className={styles.silhouette} d="M77 102q33-18 66 0l11 65q-44 22-88 0z"/><path className={styles.partFill} d="M110 130c-12-15-28 1-16 13l16 16 16-16c12-12-4-28-16-13z"/></>, "Heart and circulation")}
    {region("lungs", <><path className={styles.partFill} d="M105 119q-13 1-19 22l-6 29q16 9 28-6v-44zm10 0q13 1 19 22l6 29q-16 9-28-6v-44z"/><path className={styles.silhouette} d="M110 106v66"/></>, "Lungs and oxygen")}
    {region("metabolism", <><path className={styles.silhouette} d="M77 169q33 13 66 0l-4 54q-29 15-58 0z"/><path className={styles.partFill} d="M88 190q22-13 44 0v19q-22 12-44 0z"/></>, "Blood sugar and temperature")}
    {region("legs", <><path className={styles.silhouette} d="M80 220q15 6 29 0v93l-9 92q-2 15-14 14-12-1-11-16l-7-92zm31 0q15 6 29 0l12 91-7 92q1 15-11 16-12 1-14-14l-9-92z"/><path className={styles.partFill} d="M75 403h25q7 11-2 15H72q-7-6 3-15zm45 0h25q10 9 3 15h-26q-9-4-2-15z"/></>, "Legs and mobility")}
  </svg>;
}

export function BodyTrendDashboard({
  person, records, assessmentStatus, heading = "Trend Analysis", initialPeriod = 14, mode = "full", emergencyType, onEmergencyPartClick, onSaveReport, savingReport = false, reportMessage,
}: {
  person: DashboardPerson | null; records: HealthRecord[]; assessmentStatus?: string | null; heading?: string; initialPeriod?: Period;
  mode?: "full" | "emergency"; emergencyType?: EmergencyType | null; onEmergencyPartClick?: (system: BodySystem) => void;
  onSaveReport?: () => void; savingReport?: boolean; reportMessage?: string | null;
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [selectedSystem, setSelectedSystem] = useState<BodySystem | null>(null);
  const filtered = useMemo(() => {
    const lastRecorded = records.reduce((latestTimestamp, record) => Math.max(latestTimestamp, new Date(record.recordedAt).getTime()), 0);
    const cutoff = lastRecorded - period * 86_400_000;
    return (period === 365 ? [...records] : [...records].filter((record) => new Date(record.recordedAt).getTime() >= cutoff))
      .sort((a,b)=>new Date(a.recordedAt).getTime()-new Date(b.recordedAt).getTime());
  }, [records, period]);
  const report = useMemo(() => generateHealthIntelligence(records, { phase3Status: (assessmentStatus as "GREEN" | "AMBER" | "RED" | null) ?? null }), [records, assessmentStatus]);
  const latest = filtered.at(-1);
  const gaugeDefinitions: GaugeDefinition[] = [
    { key: "heartRate", label: "Heart rate", unit: "bpm", min: 50, max: 100, chartMax: 180 },
    { key: "systolicBP", label: "Blood pressure", unit: "mmHg", min: 90, max: 130, chartMax: 200, secondKey: "diastolicBP", secondMin: 60, secondMax: 85 },
    { key: "oxygenSat", label: "SpO₂", unit: "%", min: 95, max: 100, chartMax: 100 },
    { key: "sleepDuration", label: "Sleep", unit: "h", min: 6, max: 12, chartMax: 12 },
    { key: "bloodGlucose", label: "Blood sugar", unit: "mg/dL", min: 70, max: 110, chartMax: 250 },
    { key: "bodyTemp", label: "Temperature", unit: "°C", min: 36.1, max: 37.2, chartMax: 42 },
  ];
  const getMetricStatus = (key: string, value: number | null) => {
    if (value == null) return { tone: "neutral" as Tone, verdict: "No data" };
    const gauge = gaugeDefinitions.find((item) => item.key === key);
    const second = gauge?.secondKey && latest ? valueFor(latest, gauge.secondKey) : null;
    const personalBaseline = report.baselines.find((item) => item.indicator === key);
    const outsidePersonal = personalBaseline?.sufficient && personalBaseline.minimum != null && personalBaseline.maximum != null && (value < personalBaseline.minimum || value > personalBaseline.maximum);
    const low = gauge ? value < gauge.min || (second != null && gauge.secondMin != null && second < gauge.secondMin) : false;
    const high = gauge ? value > gauge.max || (second != null && gauge.secondMax != null && second > gauge.secondMax) : false;
    const trend = report.trends.find((item) => item.indicator === key && item.period === "mission");
    if (assessmentStatus === "RED" && (low || high || outsidePersonal)) return { tone: "red" as Tone, verdict: high ? "High" : low ? "Low" : "Act now" };
    if (high || low) return { tone: "amber" as Tone, verdict: high ? "High" : "Low" };
    if (outsidePersonal) return { tone: "amber" as Tone, verdict: value > (personalBaseline?.maximum ?? value) ? "High" : "Low" };
    if (assessmentStatus === "GREEN") return { tone: "green" as Tone, verdict: "In range" };
    if (trend?.direction === "increasing") return { tone: "amber" as Tone, verdict: "Going up" };
    if (trend?.direction === "decreasing") return { tone: "amber" as Tone, verdict: "Going down" };
    return { tone: "green" as Tone, verdict: "In range" };
  };
  const gauges = gaugeDefinitions.map((definition) => {
    const value = latest ? valueFor(latest, definition.key) : null;
    const status = getMetricStatus(definition.key, value);
    const second = latest && definition.secondKey ? valueFor(latest, definition.secondKey) : null;
    const shown = value == null ? null : definition.key === "systolicBP" ? `${value}/${second ?? "—"}` : Number.isInteger(value) ? `${value}` : value.toFixed(1);
    const fill = value == null ? null : Math.max(0.07, Math.min(0.93, value / definition.chartMax));
    return { ...definition, shown, status, fill };
  });
  const tones = Object.fromEntries(bodySystems.map((system) => {
    const related = system.metricKeys.map((key) => {
      const value = latest ? valueFor(latest, key) : null;
      return value == null ? null : getMetricStatus(key, value).tone;
    }).filter((tone): tone is Tone => tone !== null);
    const status = related.includes("red") ? "red" : related.includes("amber") ? "amber" : related.length ? "green" : "neutral";
    return [system.id, status];
  })) as Record<BodySystem, Tone>;
  const selectedHighlight = emergencyType ? emergencySystem[emergencyType] ?? null : null;
  const systemMetrics = selectedSystem ? bodySystems.find((system) => system.id === selectedSystem)?.metricKeys ?? [] : [];
  const systemDetails = selectedSystem ? systemMetrics.map((key) => {
    const baseline = report.baselines.find((item) => item.indicator === key);
    const trend = report.trends.find((item) => item.indicator === key && item.period === "mission");
    const latestValue = latest ? valueFor(latest, key) : null;
    const anomalies = report.anomalies.filter((item) => item.indicator === key).sort((a,b)=>b.deviationScore-a.deviationScore).slice(0, 1);
    return { key, baseline, trend, latestValue, anomaly: anomalies[0] };
  }) : [];
  const standout = useMemo(() => {
    const groups = new Map<string, typeof report.anomalies>();
    const selectedRecordIds = new Set(filtered.map((record) => record.id));
    for (const anomaly of report.anomalies.filter((item) => selectedRecordIds.has(item.sourceRecordId))) {
      const baseline = report.baselines.find((item) => item.indicator === anomaly.indicator);
      if (!baseline?.sufficient) continue;
      const direction = anomaly.actualValue >= (baseline.mean ?? anomaly.actualValue) ? "higher" : "lower";
      const key = `${anomaly.indicator}:${direction}`;
      groups.set(key, [...(groups.get(key) ?? []), anomaly]);
    }
    return [...groups.entries()].map(([key, items]) => {
      const direction = key.endsWith(":higher") ? "higher" : "lower";
      const unique = [...new Map(items.map((item) => [item.sourceRecordId, item])).values()];
      const biggest = unique.reduce((best, item) => direction === "higher" ? item.actualValue > best.actualValue ? item : best : item.actualValue < best.actualValue ? item : best);
      const baseline = report.baselines.find((item) => item.indicator === biggest.indicator)!;
        return { key, label: biggest.label, unit: biggest.unit, direction, unique, biggest, baseline, rank: Math.max(...unique.map((item) => item.deviationScore)) };
    }).sort((a,b)=>b.rank-a.rank).slice(0,5);
  }, [report, filtered]);
  const onBodySelect = (system: BodySystem) => {
    if (mode === "emergency") { onEmergencyPartClick?.(system); return; }
    setSelectedSystem((current) => current === system ? null : system);
  };

  if (mode === "emergency") return <section className={`${styles.emergencyPanel} ${person ? "" : styles.emergencyPanelNoReadings}`} aria-label="Crew health triage map">
    <div className={styles.emergencyBodyColumn}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>TRIAGE MAP · SIMULATED</span><h2>{person ? `${person.callsign} · Body map` : "Emergency area"}</h2></div>{person && <span className={styles.avatar}>{person.name.split(/\s+/).map((part)=>part[0]).join("").slice(0,2)}</span>}</div>
      <div className={styles.figureWrap}><HumanFigure tones={tones} highlighted={selectedHighlight} onSelect={onBodySelect} emergency/></div>
      {person ? <p className={styles.personLine}>{person.name} · {[person.rank, person.specialty].filter(Boolean).join(" · ")}</p> : <p className={styles.selectHint}>Select a crew member to see their vitals.</p>}
    </div>
    {person && <div className={styles.emergencyGaugeColumn}><h3>Current readings</h3><div className={styles.emergencyGaugeGrid}>{gauges.filter((gauge)=>["heartRate","systolicBP","oxygenSat","bloodGlucose","bodyTemp"].includes(gauge.key)).map((gauge)=><EmergencyGauge key={gauge.key} label={gauge.label} value={gauge.shown} unit={gauge.unit} verdict={gauge.status.verdict} tone={gauge.status.tone} fill={gauge.fill}/>)}</div></div>}
  </section>;

  return <div className={styles.dashboard}>
    <header className={styles.dashboardHeader}><div className={styles.personIdentity}><span className={styles.avatar}>{person ? person.name.split(/\s+/).map((part)=>part[0]).join("").slice(0,2).toUpperCase() : "?"}</span><div><h1>{person?.name ?? "No crew member selected"}</h1><p>{person ? <><strong>{person.callsign}</strong>{" · "}{[person.rank, person.specialty].filter(Boolean).join(" · ")}</> : "Select a crew profile to view personal trends."}</p></div></div><div className={styles.titleAndPeriods}><h2>{heading}</h2><div className={styles.headerActions}><div className={styles.periods} aria-label="Trend period">{periodChoices.map((choice)=><button key={choice.value} type="button" aria-pressed={period===choice.value} className={period===choice.value?styles.periodSelected:styles.periodButton} onClick={()=>setPeriod(choice.value)}>{choice.label}</button>)}</div>{onSaveReport&&<button className={styles.saveButton} type="button" onClick={onSaveReport} disabled={savingReport}>{savingReport?"Saving report…":"Recalculate & save report"}<ArrowRight size={16}/></button>}</div></div>{reportMessage&&<p className={styles.reportMessage} role="status">{reportMessage}</p>}</header>
    <div className={styles.dashboardGrid}>
      <section className={styles.chartColumn} aria-label="Personal trend charts"><div className={styles.columnHeading}><span className={styles.eyebrow}>RECORDED HISTORY</span><h2>Your trends</h2></div>{chartSpecs.map((chart)=>{
        const data = filtered.map((record)=>({date:dateLabel(record.recordedAt), id:record.id, value:valueFor(record, chart.key), second:"second" in chart ? valueFor(record, chart.second) : null})).filter((point)=>point.value!=null || point.second!=null);
        const start=data[0]?.value, end=data.at(-1)?.value;
        const caption=!data.length?"No readings recorded for this period.":start===end?`${chart.label} has stayed close to ${end} ${chart.unit}.`:`${chart.label} is ${end!>start! ? "rising" : "going down"} — from ${start} to ${end} ${chart.unit}.`;
        return <article className={styles.chartCard} key={chart.key}><div className={styles.chartTop}><h3>{chart.label}</h3><span>{chart.unit}</span></div>{data.length?<ResponsiveContainer width="100%" height={190}><LineChart data={data} margin={{top:12,right:10,bottom:0,left:-15}}><CartesianGrid stroke="rgba(80,110,105,.16)" vertical={false}/><XAxis dataKey="date" tick={{fontSize:10,fill:"#526360"}} axisLine={{stroke:"#dce6e4"}} tickLine={false} minTickGap={20}/><YAxis tick={{fontSize:10,fill:"#526360"}} axisLine={false} tickLine={false} width={43} domain={chart.key === "oxygenSat" ? [96, 99] : ["auto","auto"]}/><Tooltip contentStyle={{background:"#ffffff",border:"1px solid #dce6e4",borderRadius:9,color:"#1f2e2c"}} formatter={(value)=>[`${value ?? "—"} ${chart.unit}`, chart.label]}/><Line type="monotone" dataKey="value" name={chart.label} stroke={chart.color} strokeWidth={2.5} connectNulls dot={{r:2.5,fill:chart.color,strokeWidth:0}} activeDot={{r:5}}/>{"second" in chart&&<Line type="monotone" dataKey="second" name="Diastolic" stroke="#71817e" strokeDasharray="5 4" strokeWidth={2} connectNulls dot={false}/>}</LineChart></ResponsiveContainer>:<div className={styles.chartEmpty}>No data</div>}<p>{caption}</p></article>;
      })}</section>

      <section className={styles.bodyColumn}><div className={styles.columnHeading}><span className={styles.eyebrow}>PERSONAL HEALTH MAP</span><h2>Tap a body system</h2></div><div className={styles.bodyCard}><div className={styles.bodyLegend}><span><i className={styles.legend_green}/> Steady</span><span><i className={styles.legend_amber}/> Needs attention</span><span><i className={styles.legend_red}/> Act now</span><span><i className={styles.legend_neutral}/> No data</span></div><div className={styles.figureWrap}><HumanFigure tones={tones} onSelect={onBodySelect}/></div><p className={styles.tapHint}>Gray areas show No data. Tap an area to view its baseline and trend.</p>{selectedSystem&&<article className={styles.systemDetails}><div><h3>{bodySystems.find((system)=>system.id===selectedSystem)?.name}</h3><button type="button" onClick={()=>setSelectedSystem(null)} aria-label="Close system details">×</button></div>{systemDetails.length?systemDetails.map(({key,baseline,trend,latestValue,anomaly})=><p key={key}><strong>{baseline?.label ?? key}</strong> · {latestValue==null?"No data":`Latest ${latestValue} ${baseline?.unit??""}`} · {baseline?.sufficient?`Usual ${baseline.minimum}–${baseline.maximum} ${baseline.unit}`:"Not enough personal history"} · {trend?trend.direction==="increasing"?"Going up":trend.direction==="decreasing"?"Going down":trend.direction==="stable"?"Steady":"Not enough records":"No trend available"}{anomaly&&<> · Biggest unusual reading <b>{anomaly.actualValue} {anomaly.unit}</b> on {dateLabel(anomaly.timestamp)}</>}</p>):<p>No data — no recorded measurements are linked to this system in the current records.</p>}<a href="/astronaut/learn#nasa-data-sources" className={styles.honesty} style={{ display: "inline-block", color: "#08784f" }}>Source: personal CrewCare records · NASA HRP context only</a></article>}</div>
        <section className={styles.findingPanel}><div className={styles.panelTitle}><div><span className={styles.eyebrow}>PERSONAL FLUCTUATIONS</span><h2>What stands out</h2></div><span>{standout.length?standout.length:"—"}</span></div>{standout.length?standout.map((item)=><p className={styles.findingRow} key={item.key}><span className={styles.findingDot}/><span>{item.label} — {item.direction} than usual {item.unique.length} {item.unique.length===1?"time":"times"} ({item.unique.map((row)=>dateLabel(row.timestamp)).join(", ")}) — {item.direction === "higher" ? "highest" : "lowest"} <strong>{item.biggest.actualValue} {item.unit}</strong> on {dateLabel(item.biggest.timestamp)}; usual about {item.baseline.minimum}–{item.baseline.maximum} {item.unit}.</span></p>):<p className={styles.calmFinding}>Nothing unusual — no personal-range deviations were found in this period.</p>}<p className={styles.honesty}>Past records only — not a diagnosis.</p></section>
      </section>

      <aside className={styles.gaugeColumn}><div className={styles.columnHeading}><span className={styles.eyebrow}>LATEST RECORDED VALUES</span><h2>At a glance</h2><p>{latest?`Recorded ${dateLabel(latest.recordedAt)}`:"No readings recorded"}</p><a href="/astronaut/learn#nasa-data-sources" className={styles.honesty} style={{ color: "#08784f" }}>Source: recorded CrewCare check-ins · demo ranges are not NASA thresholds</a></div><div className={styles.gaugeGrid}>{gauges.map((gauge)=><Gauge key={gauge.key} label={gauge.label} value={gauge.shown} unit={gauge.unit} verdict={gauge.status.verdict} tone={gauge.status.tone} fill={gauge.fill}/>)}</div><section className={styles.forecastPanel}><div className={styles.panelTitle}><div><span className={styles.eyebrow}>BASED ON PAST RECORDS</span><h2>What might happen next</h2></div></div>{report.forecasts.length?report.forecasts.slice(0,3).map((forecast)=><div className={styles.forecastRow} key={forecast.indicator}><p><ArrowRight size={15}/><span>{forecast.label}: about <strong>{forecast.projectedValue} {forecast.unit}</strong> in five days (likely {forecast.lowerBound}–{forecast.upperBound} {forecast.unit}). Confidence: {Math.round(forecast.confidence*100)}%.</span></p><small>This forecast is worked out from this astronaut&apos;s actual recorded check-ins — it is a projection from past data, not a prediction or a diagnosis.</small><details><summary>How this is calculated</summary><p>The projection is calculated from this astronaut&apos;s recorded check-in history for the selected period. No NASA telemetry or external live feed is used.</p></details></div>):<p className={styles.noForecast}>Not enough records to estimate a trend.</p>}<p className={styles.honesty}>Projection from past data, not a prediction or diagnosis.</p></section></aside>
    </div>
    <p className={styles.simulatedNote}>Simulated health data · CrewCare is not a medical device and does not diagnose conditions.</p>
  </div>;
}
