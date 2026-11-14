"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { useAstronaut } from "@/lib/astronaut-context";
import { generateHealthIntelligence } from "@/lib/health/historical-analytics";
import type { HealthRecord } from "@/types";

type Days = 7 | 14 | 30 | 90 | 365;

const MOOD_NUM: Record<string, number> = {
  VERY_LOW: 1, LOW: 2, NEUTRAL: 3, GOOD: 4, EXCELLENT: 5,
};
const MOOD_LABEL: Record<number, string> = {
  1: "Very Low", 2: "Low", 3: "Neutral", 4: "Good", 5: "Excellent",
};
const FATIGUE_NUM: Record<string, number> = {
  EXHAUSTED: 1, VERY_TIRED: 2, TIRED: 3, MODERATE: 4, REFRESHED: 5,
};

function tooltipStyle() {
  return {
    contentStyle: {
      background: "#0d201e", border: "1px solid rgba(103,222,214,0.18)",
      borderRadius: 8, fontSize: 12, color: "#edf8f8",
    },
    labelStyle: { color: "var(--muted)", fontSize: 10 },
  };
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: "var(--muted)", fontSize: 12 }}>
      No {label} data for this period
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="card" style={{ padding: "16px 18px" }}>
      <span className="section-kicker" style={{ marginBottom: 12, display: "block" }}>{title}</span>
      {children}
    </article>
  );
}

export default function AnalyticsPage() {
  const { astronaut } = useAstronaut();
  const [days, setDays] = useState<Days>(14);
  const [savingReport, setSavingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const intelligence = useMemo(() => generateHealthIntelligence(astronaut.healthRecords ?? [], { phase3Status: astronaut.latestAssessment?.status }), [astronaut]);

  const saveReport = async () => {
    setSavingReport(true);
    setReportMessage(null);
    try {
      const response = await fetch(`/api/analytics/${encodeURIComponent(astronaut.id)}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Analytics could not be saved.");
      setReportMessage(result.persisted ? "Analytics report saved to the mission database." : "Calculated for this demo session; connect PostgreSQL to save report history.");
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : "Analytics could not be saved.");
    } finally {
      setSavingReport(false);
    }
  };

  const records: HealthRecord[] = useMemo(() => {
    const all = [...(astronaut.healthRecords ?? [])];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return all
      .filter((r) => new Date(r.recordedAt) >= cutoff)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  }, [astronaut, days]);

  const data = records.map((r) => ({
    date: new Date(r.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    heartRate: r.heartRate ?? null,
    systolicBP: r.systolicBP ?? null,
    diastolicBP: r.diastolicBP ?? null,
    bodyTemp: r.bodyTemp ?? null,
    oxygenSat: r.oxygenSat ?? null,
    sleep: r.sleepDuration ?? null,
    mood: r.mood ? MOOD_NUM[r.mood] : null,
    fatigue: r.fatigue ? FATIGUE_NUM[r.fatigue] : null,
  }));

  const ttStyle = tooltipStyle();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <span className="section-kicker">HEALTH ANALYTICS · {astronaut.callsign}</span>
        <h1 style={{ margin: 0, font: "500 24px Manrope" }}>Trend Analysis</h1>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          {astronaut.name} · {astronaut.isSimulated ? "Simulated demo records. " : "Demo portal; unauthenticated. "}Illustrative thresholds only; not a medical device.
        </p>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {([7, 14, 30, 90, 365] as const).map((d) => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: "6px 14px", border: `1px solid ${days === d ? "var(--teal)" : "var(--line)"}`,
            borderRadius: 6, background: days === d ? "rgba(103,222,214,0.1)" : "transparent",
            color: days === d ? "var(--teal-bright)" : "var(--muted)",
            fontSize: 11, cursor: "pointer", fontWeight: 600,
          }}>{d === 365 ? "Mission view" : `${d}-day view`}</button>
        ))}
      </div>

      <section className="card" style={{ padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <span className="section-kicker">HISTORICAL HEALTH INTELLIGENCE</span>
            <h2 style={{ margin: "3px 0 0", font: "500 17px Manrope" }}>Personal baselines &amp; observations</h2>
            <p style={{ margin: "5px 0 0", fontSize: 11, color: "var(--muted)" }}>
              Based on {intelligence.recordCount} records · {intelligence.simulatedRecordCount} simulated · Updated {new Date(intelligence.generatedAt).toLocaleString()}
            </p>
          </div>
          <button onClick={saveReport} disabled={savingReport} style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 7, background: "rgba(103,222,214,0.07)", color: "var(--teal-bright)", fontSize: 11, cursor: savingReport ? "wait" : "pointer" }}>
            {savingReport ? "Saving…" : "Recalculate & save report"}
          </button>
        </div>
        {reportMessage && <p role="status" style={{ margin: "0 0 12px", fontSize: 11, color: "var(--teal-bright)" }}>{reportMessage}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 9 }}>
          {["heartRate", "sleepDuration", "stressLevel", "mood"].map((key) => {
            const baseline = intelligence.baselines.find((item) => item.indicator === key)!;
            const latestTrend = intelligence.trends.find((item) => item.indicator === key && item.period === "mission");
            return <div key={key} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.025)", border: "1px solid var(--line)", borderRadius: 7 }}>
              <span className="section-kicker">{baseline.label}</span>
              {baseline.sufficient ? <>
                <strong style={{ display: "block", marginTop: 5, fontSize: 15, color: "#edf8f8" }}>{baseline.mean} {baseline.unit} <span style={{ color: "var(--muted)", fontSize: 10 }}>mean</span></strong>
                <span style={{ display: "block", marginTop: 3, color: "var(--muted)", fontSize: 10 }}>Personal range {baseline.minimum}–{baseline.maximum} · {baseline.count} records</span>
                <span style={{ display: "block", marginTop: 3, color: latestTrend?.direction === "insufficient" ? "var(--muted)" : "var(--teal)", fontSize: 10 }}>Mission trend: {latestTrend?.direction ?? "insufficient"}</span>
              </> : <span style={{ display: "block", marginTop: 5, color: "var(--muted)", fontSize: 10 }}>Insufficient history: {baseline.count}/{baseline.minimumRequired} records</span>}
            </div>;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(245px, 1fr))", gap: 14, marginTop: 16 }}>
          <div>
            <span className="section-kicker">STATISTICAL DEVIATIONS</span>
            {intelligence.anomalies.length ? intelligence.anomalies.slice(-4).reverse().map((item) => <p key={`${item.sourceRecordId}-${item.indicator}`} style={{ margin: "7px 0 0", fontSize: 11, color: "#a8c5c1", lineHeight: 1.5 }}>{item.explanation}</p>) : <p style={{ margin: "7px 0 0", fontSize: 11, color: "var(--muted)" }}>No statistical deviations detected in available history. This is not a medical clearance.</p>}
          </div>
          <div>
            <span className="section-kicker">PATTERNS &amp; PROJECTIONS</span>
            {intelligence.patterns.length || intelligence.forecasts.length ? <>
              {intelligence.patterns.slice(0, 2).map((item) => <p key={item.category} style={{ margin: "7px 0 0", fontSize: 11, color: "#a8c5c1", lineHeight: 1.5 }}>{item.explanation}</p>)}
              {intelligence.forecasts.slice(0, 2).map((item) => <p key={item.indicator} style={{ margin: "7px 0 0", fontSize: 11, color: "#a8c5c1", lineHeight: 1.5 }}>Projection only: {item.label} about {item.projectedValue} {item.unit} in five days (range {item.lowerBound}–{item.upperBound}, {Math.round(item.confidence * 100)}% reliability).</p>)}
            </> : <p style={{ margin: "7px 0 0", fontSize: 11, color: "var(--muted)" }}>No combined pattern or sufficiently supported projection is available yet.</p>}
          </div>
        </div>
        <p style={{ margin: "14px 0 0", paddingTop: 10, borderTop: "1px solid var(--line)", color: "#657f7b", fontSize: 10, lineHeight: 1.5 }}>
          Statistical results describe recorded history and are not diagnoses, validated medical thresholds, or confirmed future outcomes. {intelligence.limitations[1]}
        </p>
      </section>

      {records.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ margin: 0 }}>No records found in the last {days} days.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Heart Rate */}
          <ChartCard title="HEART RATE (BPM)">
            {data.some((d) => d.heartRate != null) ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip {...ttStyle} formatter={(v: unknown) => [`${String(v)} BPM`, "Heart Rate"]} />
                  <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
                  <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
                  <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="heart rate" />}
          </ChartCard>

          {/* Blood Pressure */}
          <ChartCard title="BLOOD PRESSURE (mmHg)">
            {data.some((d) => d.systolicBP != null) ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip {...ttStyle} formatter={(v: unknown, name: unknown) => [`${String(v)} mmHg`, name === "systolicBP" ? "Systolic" : "Diastolic"]} />
                  <ReferenceLine y={130} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "#4a6a68" }} formatter={(v) => v === "systolicBP" ? "Systolic" : "Diastolic"} />
                  <Line type="monotone" dataKey="systolicBP" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} connectNulls />
                  <Line type="monotone" dataKey="diastolicBP" stroke="#3a9e98" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2, fill: "#3a9e98", strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="blood pressure" />}
          </ChartCard>

          {/* Body Temperature */}
          <ChartCard title="BODY TEMPERATURE (°C)">
            {data.some((d) => d.bodyTemp != null) ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} domain={[35, 39]} />
                  <Tooltip {...ttStyle} formatter={(v: unknown) => [`${String(v)} °C`, "Temp"]} />
                  <ReferenceLine y={37.2} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
                  <Line type="monotone" dataKey="bodyTemp" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="temperature" />}
          </ChartCard>

          {/* SpO2 */}
          <ChartCard title="OXYGEN SATURATION — SpO₂ (%)">
            {data.some((d) => d.oxygenSat != null) ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="o2grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#67ded6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#67ded6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} domain={[88, 101]} />
                  <Tooltip {...ttStyle} formatter={(v: unknown) => [`${String(v)}%`, "SpO₂"]} />
                  <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="oxygenSat" stroke="var(--teal)" fill="url(#o2grad)" strokeWidth={2} dot={{ r: 3, fill: "var(--teal)", strokeWidth: 0 }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="oxygen saturation" />}
          </ChartCard>

          {/* Sleep */}
          <ChartCard title="SLEEP DURATION (hours)">
            {data.some((d) => d.sleep != null) ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="sleepgrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a9a0f4" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#a9a0f4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} domain={[0, 12]} />
                  <Tooltip {...ttStyle} formatter={(v: unknown) => [`${String(v)}h`, "Sleep"]} />
                  <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="sleep" stroke="#a9a0f4" fill="url(#sleepgrad)" strokeWidth={2} dot={{ r: 3, fill: "#a9a0f4", strokeWidth: 0 }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="sleep" />}
          </ChartCard>

          {/* Mood & Fatigue */}
          <ChartCard title="MOOD & FATIGUE (self-reported)">
            {data.some((d) => d.mood != null) ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#4a6a68" }} axisLine={false} tickLine={false}
                    domain={[0, 6]} tickFormatter={(v) => MOOD_LABEL[v] ?? ""}
                  />
                  <Tooltip
                    {...ttStyle}
                    formatter={(v: unknown, name: unknown) => [
                      name === "mood" ? (MOOD_LABEL[Number(v)] ?? String(v)) : (["EXHAUSTED", "VERY_TIRED", "TIRED", "MODERATE", "REFRESHED"][5 - Number(v)] ?? String(v)),
                      name === "mood" ? "Mood" : "Energy",
                    ]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "#4a6a68" }} formatter={(v) => v === "mood" ? "Mood" : "Energy"} />
                  <Line type="monotone" dataKey="mood" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }} connectNulls />
                  <Line type="monotone" dataKey="fatigue" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2, fill: "#10b981", strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart label="mood" />}
          </ChartCard>

        </div>
      )}
    </>
  );
}
