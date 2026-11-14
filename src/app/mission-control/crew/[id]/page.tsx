import { notFound } from "next/navigation";
import Link from "next/link";
import { Heart, Activity, Moon, Thermometer, Droplets, ChevronLeft, AlertTriangle } from "lucide-react";
import { VitalsChart } from "@/components/charts/VitalsChart";
import { getAstronautWithHistory } from "@/lib/db-data";

function warnColor(val: number | null | undefined, min?: number, max?: number) {
  if (val == null) return "var(--muted)";
  if ((min !== undefined && val < min) || (max !== undefined && val > max)) return "#f59e0b";
  return "#edf8f8";
}

export default async function CrewMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const astro = await getAstronautWithHistory(id, 180);
  if (!astro) notFound();

  const records = astro.healthRecords ?? [];
  const latest  = records[records.length - 1];
  const assessment = astro.latestAssessment;
  const alerts  = astro.activeAlerts ?? [];

  const moodMap: Record<string, string> = {
    VERY_LOW: "Very Low", LOW: "Low", NEUTRAL: "Neutral", GOOD: "Good", EXCELLENT: "Excellent",
  };

  const statusColor = assessment?.status === "GREEN" ? "#10b981"
    : assessment?.status === "AMBER" ? "#f59e0b" : "#ef4444";

  return (
    <>
      {/* Back + header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/mission-control" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--teal)", marginBottom: 12, textDecoration: "none" }}>
          <ChevronLeft size={14} strokeWidth={1.7} /> Crew Overview
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <span className="section-kicker">ASTRONAUT PROFILE</span>
            <h1 style={{ margin: "0 0 4px", font: "500 26px Manrope" }}>{astro.name}</h1>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
              {astro.rank} · {astro.specialty} · <span style={{ color: "var(--teal)", fontWeight: 600 }}>{astro.callsign}</span>
            </p>
          </div>
          {assessment && (
            <span className={`status-badge status-${assessment.status.toLowerCase()}`} style={{ fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
              {assessment.status}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 7, fontSize: 11, color: "#526b68", marginBottom: 24 }}>
        ⚠ {astro.isSimulated ? "All data is simulated. " : "This demonstration portal is not authenticated. "}Thresholds are demonstration values only.
      </div>

      {/* Assessment */}
      {assessment && (
        <article className="card" style={{
          padding: "18px 22px", marginBottom: 24,
          borderColor: `${statusColor}30`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span className={`status-badge status-${assessment.status.toLowerCase()}`}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
              {assessment.status}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Assessment · {astro.isSimulated ? "Simulated" : "Rule based"}</span>
          </div>
          <p style={{ margin: "0 0 10px", font: "500 15px Manrope", color: "#edf8f8" }}>{assessment.summary}</p>
          {assessment.details && (
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#a8c5c1", lineHeight: 1.6 }}>{assessment.details}</p>
          )}
          {assessment.guidance && (
            <div style={{ padding: "10px 14px", background: "rgba(103,222,214,0.05)", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12, color: "#a8c5c1" }}>
              <span style={{ color: "var(--teal)", fontWeight: 600 }}>Guidance: </span>{assessment.guidance}
            </div>
          )}
          {assessment.flags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {assessment.flags.map((f) => (
                <span key={f} style={{ padding: "2px 8px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 4, fontSize: 10, color: "#f59e0b" }}>
                  {f.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </article>
      )}

      {/* Vitals grid */}
      <span className="section-kicker" style={{ display: "block", marginBottom: 12 }}>LATEST MEASUREMENTS</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 28 }}>
        {[
          { label: "Heart Rate", val: latest?.heartRate?.toFixed(0), unit: "BPM", Icon: Heart, cls: "vital-coral", min: 50, max: 100 },
          { label: "Systolic BP", val: latest?.systolicBP?.toFixed(0), unit: "mmHg", Icon: Activity, cls: "vital-teal", min: 90, max: 130 },
          { label: "Diastolic BP", val: latest?.diastolicBP?.toFixed(0), unit: "mmHg", Icon: Activity, cls: "vital-cyan", min: 60, max: 85 },
          { label: "Temp", val: latest?.bodyTemp?.toFixed(1), unit: "°C", Icon: Thermometer, cls: "vital-amber", min: 36.1, max: 37.2 },
          { label: "SpO₂", val: latest?.oxygenSat?.toFixed(0), unit: "%", Icon: Droplets, cls: "vital-cyan", min: 95 },
          { label: "Sleep", val: latest?.sleepDuration?.toFixed(1), unit: "hrs", Icon: Moon, cls: "vital-violet", min: 6 },
          { label: "Mood", val: latest?.mood ? moodMap[latest.mood] : null, unit: "", Icon: Activity, cls: "vital-teal" },
        ].map((v) => {
          const numVal = parseFloat(v.val ?? "");
          const warn = !isNaN(numVal) && ((v.min !== undefined && numVal < v.min) || (v.max !== undefined && numVal > v.max));
          return (
            <article key={v.label} className="card" style={{ padding: "14px 14px", borderLeft: `3px solid ${warn ? "#f59e0b" : "var(--line)"}` }}>
              <div className={`vital-icon ${v.cls}`} style={{ marginBottom: 10, width: 28, height: 28 }}>
                <v.Icon size={15} strokeWidth={1.7} />
              </div>
              <span className="section-kicker" style={{ marginBottom: 3 }}>{v.label}</span>
              <strong style={{ display: "block", font: "500 18px Manrope", color: warn ? "#f59e0b" : "#edf8f8" }}>
                {v.val ?? "—"} <span style={{ fontSize: 9, fontWeight: 400, color: "var(--muted)" }}>{v.unit}</span>
              </strong>
            </article>
          );
        })}
      </div>

      {/* Charts */}
      <span className="section-kicker" style={{ display: "block", marginBottom: 12 }}>7-DAY TRENDS</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { metric: "heartRate" as const, label: "Heart Rate", unit: "BPM", color: "#ef4444", warnMax: 100 },
          { metric: "systolicBP" as const, label: "Systolic BP", unit: "mmHg", color: "#3b82f6", warnMax: 130 },
          { metric: "oxygenSat" as const, label: "SpO₂", unit: "%", color: "var(--teal)", warnMin: 95 },
          { metric: "sleepDuration" as const, label: "Sleep", unit: "hrs", color: "#a9a0f4", warnMin: 6 },
        ].map((c) => (
          <article key={c.metric} className="card" style={{ padding: "14px 16px" }}>
            <VitalsChart records={records} {...c} />
          </article>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <>
          <span className="section-kicker" style={{ display: "block", marginBottom: 12 }}>
            <AlertTriangle size={12} strokeWidth={1.7} style={{ color: "#ef4444", display: "inline", marginRight: 5 }} />
            ACTIVE ALERTS
          </span>
          <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
            {alerts.map((a) => (
              <article key={a.id} className="card" style={{ padding: "12px 16px", borderLeft: `3px solid ${a.severity === "HIGH" ? "#ef4444" : "#f59e0b"}` }}>
                <div style={{ display: "flex", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
                  <span className={`status-badge status-${a.severity.toLowerCase()}`}>{a.severity}</span>
                  <span className={`status-badge status-${a.status.toLowerCase()}`}>{a.status}</span>
                </div>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#edf8f8" }}>{a.title}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{a.message}</p>
              </article>
            ))}
          </div>
        </>
      )}

      {/* History table */}
      <span className="section-kicker" style={{ display: "block", marginBottom: 12 }}>HEALTH RECORD HISTORY</span>
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Date", "HR", "BP", "Temp", "SpO₂", "Sleep", "Symptoms"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", font: "600 9px Manrope", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...records].reverse().map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{new Date(r.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                <td style={{ padding: "10px 14px", color: warnColor(r.heartRate, 50, 100) }}>{r.heartRate ?? "—"}</td>
                <td style={{ padding: "10px 14px", color: warnColor(r.systolicBP, 90, 130) }}>{r.systolicBP != null ? `${r.systolicBP}/${r.diastolicBP}` : "—"}</td>
                <td style={{ padding: "10px 14px", color: warnColor(r.bodyTemp, 36.1, 37.2) }}>{r.bodyTemp ?? "—"}</td>
                <td style={{ padding: "10px 14px", color: warnColor(r.oxygenSat, 95) }}>{r.oxygenSat ?? "—"}</td>
                <td style={{ padding: "10px 14px", color: warnColor(r.sleepDuration, 6) }}>{r.sleepDuration ?? "—"}</td>
                <td style={{ padding: "10px 14px", color: r.symptoms ? "#f59e0b" : "var(--muted)" }}>{r.symptoms ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
