"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Save, Users } from "lucide-react";

type Member = {
  astronautId: string; name: string; callsign: string; phase3Status: string | null;
  recordCount: number; isSimulated: boolean; sleepTrend: { direction: string; percentChange: number | null; completeness: number } | undefined;
  stressTrend: { direction: string; percentChange: number | null } | undefined;
  heartRateTrend: { direction: string; percentChange: number | null } | undefined;
  heartRateBaseline: { sufficient: boolean; median: number | null; unit: string } | undefined;
  latestHeartRate: number | null; personalHeartRateDeviation: number | null;
  anomalyCount: number; repeatedAnomalyCount: number; patterns: { category: string; explanation: string; priority: string }[]; dataCompleteness: number;
  observations: { category: string; explanation: string; suggestedFollowUp: string; priority: string; reliability: number }[];
};
type Report = { generatedAt: string; mission: { name: string; code: string }; crewCount: number; totalRecords: number; meanDataCompleteness: number; totalAnomalies: number; repeatedAnomalies: number; members: Member[]; notes: string[] };

const change = (value: number | null | undefined) => value == null ? "—" : `${value > 0 ? "+" : ""}${value}%`;
const color = (status: string | null) => status === "RED" ? "#ef4444" : status === "AMBER" ? "#f59e0b" : "#10b981";

export default function MissionAnalyticsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/analytics/mission").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analytics unavailable");
      setReport(data.report);
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Analytics unavailable"));
  }, []);
  const save = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/analytics/mission", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save report");
      setReport(data.report);
      setMessage(data.persisted ? "Crew analytics report saved." : "Calculated for this demo session. Configure PostgreSQL to save report history.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save report"); }
    finally { setBusy(false); }
  };

  if (!report) return <div className="card" style={{ padding: 24 }}>{message || "Calculating personal-baseline analytics…"}</div>;
  return <>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
      <div><p className="section-kicker">{report.mission.code} · HISTORICAL HEALTH INTELLIGENCE</p><h1 style={{ margin: "0 0 6px", font: "500 26px Manrope" }}>Crew analytics</h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Crew trends are compared with each person’s own history. Population raw values are not ranked.</p></div>
      <button className="btn btn-primary" onClick={save} disabled={busy} style={{ display: "flex", alignItems: "center", gap: 8 }}><Save size={14}/>{busy ? "Saving…" : "Save report"}</button>
    </header>
    {message && <p role="status" style={{ color: "var(--teal)", fontSize: 12, marginBottom: 14 }}>{message}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, marginBottom: 18 }}>
      {[{label:"CREW MEMBERS",value:report.crewCount,Icon:Users},{label:"HEALTH RECORDS",value:report.totalRecords,Icon:Activity},{label:"30-DAY COVERAGE",value:`${Math.round(report.meanDataCompleteness*100)}%`,Icon:BarChart3},{label:"DEVIATIONS",value:report.totalAnomalies,Icon:AlertTriangle}].map(({label,value,Icon})=><div className="card" key={label} style={{padding:"14px 16px"}}><Icon size={15} color="var(--teal)"/><p className="section-kicker" style={{margin:"8px 0 3px"}}>{label}</p><strong style={{font:"600 23px Manrope"}}>{value}</strong></div>)}
    </div>
    {report.repeatedAnomalies > 0 && <div className="card" style={{padding:"12px 16px",marginBottom:16,borderColor:"rgba(245,158,11,.3)",color:"#f2c578",fontSize:12}}><AlertTriangle size={14} style={{verticalAlign:"middle",marginRight:8}}/>{report.repeatedAnomalies} repeated personal-baseline deviations are present. Review each crew member’s timeline and Phase 3 assessment.</div>}
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:14}}>{report.members.map((member)=><article className="card" key={member.astronautId} style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:14}}><div><span className="section-kicker">{member.callsign} · {member.recordCount} RECORDS</span><h2 style={{font:"500 17px Manrope",margin:"4px 0"}}>{member.name}</h2></div><strong style={{fontSize:10,color:color(member.phase3Status)}}>{member.phase3Status ?? "NO ASSESSMENT"}</strong></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>{[{k:"SLEEP · 30D",v:change(member.sleepTrend?.percentChange),d:member.sleepTrend?.direction},{k:"STRESS · 30D",v:change(member.stressTrend?.percentChange),d:member.stressTrend?.direction},{k:"HR · 30D",v:change(member.heartRateTrend?.percentChange),d:member.heartRateTrend?.direction}].map((metric)=><div key={metric.k} style={{padding:9,background:"rgba(255,255,255,.025)",borderRadius:7}}><small className="section-kicker" style={{fontSize:8}}>{metric.k}</small><strong style={{display:"block",marginTop:5,fontSize:14}}>{metric.v}</strong><small style={{color:"var(--muted)",fontSize:9}}>{metric.d ?? "insufficient data"}</small></div>)}</div>
      <p style={{fontSize:11,color:"var(--muted)",margin:"0 0 7px"}}>Latest heart rate {member.latestHeartRate ?? "—"} {member.heartRateBaseline?.unit ?? "BPM"} · personal median {member.heartRateBaseline?.sufficient ? member.heartRateBaseline.median : "insufficient baseline"} · deviation {member.personalHeartRateDeviation == null ? "—" : `${member.personalHeartRateDeviation} SD`}</p>
      <p style={{fontSize:11,color:member.repeatedAnomalyCount?"#f2c578":"var(--muted)",margin:"0 0 9px"}}>{member.anomalyCount} deviations · {member.repeatedAnomalyCount} repeated · {Math.round(member.dataCompleteness*100)}% data coverage</p>
      {(member.observations.length ? member.observations.slice(0,2).map((observation,i)=><div key={`${observation.category}-${i}`} style={{margin:"8px 0",padding:"8px 10px",borderLeft:`2px solid ${observation.priority === "HIGH" ? "#ef4444" : "#f59e0b"}`,background:"rgba(255,255,255,.02)"}}><p style={{fontSize:11,lineHeight:1.45,color:"#a8c5c1",margin:0}}>{observation.explanation}</p><p style={{fontSize:10,lineHeight:1.4,color:"var(--muted)",margin:"4px 0 0"}}>Follow up: {observation.suggestedFollowUp} · {Math.round(observation.reliability*100)}% reliability</p></div>) : member.patterns.slice(0,2).map((pattern,i)=><p key={`${pattern.category}-${i}`} style={{fontSize:11,lineHeight:1.5,color:"#a8c5c1",margin:"6px 0"}}>{pattern.explanation}</p>))}
      <Link href={`/mission-control/crew/${encodeURIComponent(member.astronautId)}`} style={{fontSize:11,color:"var(--teal)"}}>Open crew profile →</Link>
    </article>)}</section>
    <div className="card" style={{padding:16,marginTop:18}}><p className="section-kicker">INTERPRETATION NOTES</p>{report.notes.map((note)=><p key={note} style={{fontSize:11,color:"var(--muted)",lineHeight:1.5,margin:"6px 0"}}>{note}</p>)}</div>
  </>;
}
