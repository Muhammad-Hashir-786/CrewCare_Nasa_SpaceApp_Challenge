"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { useAstronaut } from "@/lib/astronaut-context";
import type { HealthRecord } from "@/types";

const moodMap: Record<string, string> = {
  VERY_LOW: "Very Low", LOW: "Low", NEUTRAL: "Neutral", GOOD: "Good", EXCELLENT: "Excellent",
};
const fatigueMap: Record<string, string> = {
  EXHAUSTED: "Exhausted", VERY_TIRED: "Very Tired", TIRED: "Tired", MODERATE: "Moderate", REFRESHED: "Refreshed",
};

function warnColor(val: number | null | undefined, min?: number, max?: number): string {
  if (val == null) return "var(--muted)";
  if ((min !== undefined && val < min) || (max !== undefined && val > max)) return "#f59e0b";
  return "#edf8f8";
}

function ExpandedRecord({ r }: { r: HealthRecord }) {
  return (
    <tr style={{ background: "rgba(103,222,214,0.03)" }}>
      <td colSpan={8} style={{ padding: "12px 20px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {r.diastolicBP != null && (
            <div>
              <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>DIASTOLIC BP</span>
              <div style={{ fontSize: 13, color: warnColor(r.diastolicBP, 60, 85) }}>
                {r.diastolicBP} <span style={{ fontSize: 10, color: "var(--muted)" }}>mmHg</span>
              </div>
            </div>
          )}
          {r.bloodGlucose != null && (
            <div>
              <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>BLOOD GLUCOSE</span>
              <div style={{ fontSize: 13, color: warnColor(r.bloodGlucose, 70, 110) }}>
                {r.bloodGlucose} <span style={{ fontSize: 10, color: "var(--muted)" }}>mg/dL</span>
              </div>
            </div>
          )}
          {r.mood && (
            <div>
              <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>MOOD</span>
              <div style={{ fontSize: 13, color: "#edf8f8" }}>{moodMap[r.mood] ?? r.mood}</div>
            </div>
          )}
          {r.fatigue && (
            <div>
              <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>FATIGUE</span>
              <div style={{ fontSize: 13, color: "#edf8f8" }}>{fatigueMap[r.fatigue] ?? r.fatigue}</div>
            </div>
          )}
          {r.symptoms && (
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>SYMPTOMS</span>
              <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 2, lineHeight: 1.5 }}>{r.symptoms}</div>
            </div>
          )}
          {r.notes && (
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>NOTES</span>
              <div style={{ fontSize: 12, color: "#a8c5c1", marginTop: 2, lineHeight: 1.5 }}>{r.notes}</div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function HistoryPage() {
  const { astronaut } = useAstronaut();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterDays, setFilterDays] = useState<7 | 14 | 30>(14);
  const [filterSymptoms, setFilterSymptoms] = useState(false);

  const allRecords = [...(astronaut.healthRecords ?? [])].reverse();

  const records = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filterDays);
    let result = allRecords.filter((r) => new Date(r.recordedAt) >= cutoff);
    if (filterSymptoms) result = result.filter((r) => r.symptoms);
    return result;
  }, [allRecords, filterDays, filterSymptoms]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <span className="section-kicker">HEALTH RECORDS · {astronaut.callsign}</span>
        <h1 style={{ margin: 0, font: "500 24px Manrope" }}>Health History</h1>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          {astronaut.name} · {records.length} records shown
        </p>
      </div>

      <div style={{ padding: "9px 14px", marginBottom: 16, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 7, fontSize: 11, color: "#526b68" }}>
        ⚠ {astronaut.isSimulated ? "Demo data only. " : "This demonstration portal is not authenticated. "}Amber values use illustrative thresholds, not validated medical limits.
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Filter size={13} strokeWidth={1.7} style={{ color: "var(--muted)" }} />
        <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.08em" }}>SHOW:</span>
        {([7, 14, 30] as const).map((d) => (
          <button key={d} onClick={() => setFilterDays(d)} style={{
            padding: "5px 12px", border: `1px solid ${filterDays === d ? "var(--teal)" : "var(--line)"}`,
            borderRadius: 5, background: filterDays === d ? "rgba(103,222,214,0.1)" : "transparent",
            color: filterDays === d ? "var(--teal-bright)" : "var(--muted)",
            fontSize: 10, cursor: "pointer", fontWeight: 600,
          }}>{d}d</button>
        ))}
        <div style={{ width: 1, height: 18, background: "var(--line)" }} />
        <button onClick={() => setFilterSymptoms((v) => !v)} style={{
          padding: "5px 12px", border: `1px solid ${filterSymptoms ? "rgba(245,158,11,0.5)" : "var(--line)"}`,
          borderRadius: 5, background: filterSymptoms ? "rgba(245,158,11,0.08)" : "transparent",
          color: filterSymptoms ? "#f59e0b" : "var(--muted)",
          fontSize: 10, cursor: "pointer", fontWeight: 600,
        }}>Symptoms only</button>
      </div>

      {records.length === 0 ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ margin: 0, fontSize: 14 }}>No records found for the selected filters.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Date", "HR (BPM)", "BP (mmHg)", "Temp (°C)", "SpO₂ (%)", "Sleep (h)", "Symptoms", ""].map((h) => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", font: "600 9px Manrope", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <>
                  <tr
                    key={r.id}
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    style={{ borderBottom: "1px solid var(--line)", cursor: "pointer", transition: "0.1s" }}
                  >
                    <td style={{ padding: "11px 14px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {new Date(r.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "11px 14px", color: warnColor(r.heartRate, 50, 100) }}>{r.heartRate ?? "—"}</td>
                    <td style={{ padding: "11px 14px", color: warnColor(r.systolicBP, 90, 130) }}>
                      {r.systolicBP != null ? `${r.systolicBP}/${r.diastolicBP}` : "—"}
                    </td>
                    <td style={{ padding: "11px 14px", color: warnColor(r.bodyTemp, 36.1, 37.2) }}>{r.bodyTemp ?? "—"}</td>
                    <td style={{ padding: "11px 14px", color: warnColor(r.oxygenSat, 95) }}>{r.oxygenSat ?? "—"}</td>
                    <td style={{ padding: "11px 14px", color: warnColor(r.sleepDuration, 6, 10) }}>{r.sleepDuration ?? "—"}</td>
                    <td style={{ padding: "11px 14px", color: r.symptoms ? "#f59e0b" : "var(--muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.symptoms ?? "—"}
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--muted)" }}>
                      {expanded === r.id
                        ? <ChevronUp size={14} strokeWidth={1.7} />
                        : <ChevronDown size={14} strokeWidth={1.7} />}
                    </td>
                  </tr>
                  {expanded === r.id && <ExpandedRecord key={`exp-${r.id}`} r={r} />}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
