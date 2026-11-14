"use client";

import Link from "next/link";
import { Heart, Activity, Moon, Thermometer, Droplets, Zap, ArrowRight, Sparkles, ChevronRight } from "lucide-react";
import { VitalsChart } from "@/components/charts/VitalsChart";
import { useAstronaut } from "@/lib/astronaut-context";

function statusClass(status?: string) {
  if (status === "GREEN") return "status-green";
  if (status === "AMBER") return "status-amber";
  if (status === "RED")   return "status-red";
  return "";
}

function vitStatus(val: number | null | undefined, wMin?: number, wMax?: number) {
  if (val == null) return { label: "No data", good: false };
  if ((wMin !== undefined && val < wMin) || (wMax !== undefined && val > wMax))
    return { label: "Needs review", good: false };
  return { label: "Within baseline", good: true };
}

export default function AstronautDashboard() {
  const { astronaut } = useAstronaut();
  const records = astronaut.healthRecords ?? [];
  const latest = records[records.length - 1];
  const assessment = astronaut.latestAssessment;
  const alerts = astronaut.activeAlerts ?? [];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dayLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const hrStatus  = vitStatus(latest?.heartRate, 50, 100);
  const o2Status  = vitStatus(latest?.oxygenSat, 95);
  const slpStatus = vitStatus(latest?.sleepDuration, 6);
  const tmpStatus = vitStatus(latest?.bodyTemp, 36.1, 37.2);

  return (
    <>
      {/* Welcome row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, minHeight: 74, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="section-kicker">{dayLabel.toUpperCase()} · MISSION TIME</p>
          <h1 style={{ margin: 0, font: "500 28px/1.2 Manrope", letterSpacing: "-0.025em" }}>
            {greeting}, {astronaut.name.split(" ")[1]}.
          </h1>
          <p style={{ margin: "7px 0 0", color: "#77908d", fontSize: 12 }}>
            {astronaut.callsign} · {astronaut.rank} · {astronaut.specialty}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/select" style={{ textDecoration: "none" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 12px", border: "1px solid var(--line)",
              borderRadius: 8, background: "transparent", cursor: "pointer",
              color: "var(--muted)", fontSize: 10, fontWeight: 600,
            }}>
              Switch crew member
            </button>
          </Link>
          <Link href="/astronaut/checkin" style={{ textDecoration: "none" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 11,
              padding: "10px 14px", border: "1px solid var(--line)",
              borderRadius: 10, background: "rgba(17,39,36,0.55)", cursor: "pointer",
              transition: "0.2s", color: "inherit",
            }}>
              <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(91,211,200,0.1)", color: "var(--teal)" }}>
                <Sparkles size={17} strokeWidth={1.7} />
              </span>
              <span style={{ textAlign: "left" }}>
                <span style={{ display: "block", color: "#67837f", font: "600 8px Manrope", letterSpacing: "0.14em" }}>DAILY CHECK-IN</span>
                <span style={{ display: "block", color: "#c3d5d2", fontSize: 10, fontWeight: 500, marginTop: 2 }}>Start today&apos;s check-in</span>
              </span>
              <ArrowRight size={18} strokeWidth={1.7} style={{ color: "#57736f" }} />
            </button>
          </Link>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(360px, 1.6fr) minmax(240px, 1fr)", gap: 18, alignItems: "start" }}>

        {/* ── Left: vitals ── */}
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <span className="section-kicker">LIVE TELEMETRY</span>
            <h2 className="section-h2">Your vitals</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <article className="card" style={{ padding: 15, minHeight: 118 }}>
              <div className="vital-icon vital-coral" style={{ marginBottom: 10 }}>
                <Heart size={18} strokeWidth={1.7} />
              </div>
              <small className="section-kicker" style={{ marginBottom: 3 }}>HEART RATE</small>
              <strong style={{ display: "block", font: "500 21px Manrope" }}>
                {latest?.heartRate?.toFixed(0) ?? "—"} <span style={{ color: "#809996", fontSize: 9, fontWeight: 500 }}>BPM</span>
              </strong>
              <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "5px 0 0", color: hrStatus.good ? "#66807c" : "#f59e0b", fontSize: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: hrStatus.good ? "#63dec1" : "#f59e0b", display: "inline-block" }} />
                {hrStatus.label}
              </p>
            </article>

            <article className="card" style={{ padding: 15, minHeight: 118 }}>
              <div className="vital-icon vital-cyan" style={{ marginBottom: 10 }}>
                <Activity size={18} strokeWidth={1.7} />
              </div>
              <small className="section-kicker" style={{ marginBottom: 3 }}>OXYGEN</small>
              <strong style={{ display: "block", font: "500 21px Manrope" }}>
                {latest?.oxygenSat?.toFixed(0) ?? "—"} <span style={{ color: "#809996", fontSize: 9, fontWeight: 500 }}>%</span>
              </strong>
              <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "5px 0 0", color: o2Status.good ? "#66807c" : "#f59e0b", fontSize: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: o2Status.good ? "#63dec1" : "#f59e0b", display: "inline-block" }} />
                {o2Status.label}
              </p>
            </article>

            <article className="card" style={{ padding: 15, minHeight: 118 }}>
              <div className="vital-icon vital-violet" style={{ marginBottom: 10 }}>
                <Moon size={18} strokeWidth={1.7} />
              </div>
              <small className="section-kicker" style={{ marginBottom: 3 }}>LAST SLEEP</small>
              <strong style={{ display: "block", font: "500 21px Manrope" }}>
                {latest?.sleepDuration != null
                  ? `${Math.floor(latest.sleepDuration)}h ${Math.round((latest.sleepDuration % 1) * 60)}m`
                  : "—"}
              </strong>
              <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "5px 0 0", color: slpStatus.good ? "#66807c" : "#f59e0b", fontSize: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: slpStatus.good ? "#63dec1" : "#f59e0b", display: "inline-block" }} />
                {slpStatus.label}
              </p>
            </article>

            <article className="card" style={{ padding: 15, minHeight: 118 }}>
              <div className="vital-icon vital-amber" style={{ marginBottom: 10 }}>
                <Thermometer size={18} strokeWidth={1.7} />
              </div>
              <small className="section-kicker" style={{ marginBottom: 3 }}>TEMPERATURE</small>
              <strong style={{ display: "block", font: "500 21px Manrope" }}>
                {latest?.bodyTemp?.toFixed(1) ?? "—"} <span style={{ color: "#809996", fontSize: 9, fontWeight: 500 }}>°C</span>
              </strong>
              <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "5px 0 0", color: tmpStatus.good ? "#66807c" : "#f59e0b", fontSize: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: tmpStatus.good ? "#63dec1" : "#f59e0b", display: "inline-block" }} />
                {tmpStatus.label}
              </p>
            </article>
          </div>

          <article className="card card-elevated" style={{ padding: 17 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Sparkles size={17} strokeWidth={1.7} style={{ color: "var(--teal)" }} />
              <small className="section-kicker" style={{ margin: 0 }}>DAILY CHECK-IN</small>
              <em style={{ marginLeft: "auto", color: "#63817e", fontSize: 8, fontStyle: "normal" }}>2 min</em>
            </div>
            <h3 style={{ margin: "15px 0 4px", font: "500 15px Manrope" }}>How did you sleep?</h3>
            <p style={{ margin: 0, color: "#718d89", fontSize: 9 }}>A short check-in helps track your recovery.</p>
            <Link href="/astronaut/checkin" style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, marginTop: 14, padding: "9px 0", border: 0, borderRadius: 8,
                color: "#0c2421", background: "#8be8df", fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}>
                Continue check-in <ArrowRight size={17} strokeWidth={1.7} />
              </button>
            </Link>
          </article>
        </div>

        {/* ── Center: assessment + charts ── */}
        <div style={{ display: "grid", gap: 16 }}>
          {assessment && (
            <article className="card" style={{
              padding: "20px 24px",
              borderColor: assessment.status === "GREEN" ? "rgba(16,185,129,0.2)"
                : assessment.status === "AMBER" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span className={`status-badge ${statusClass(assessment.status)}`}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                  {assessment.status}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  Latest Assessment · {new Date(assessment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: "0 0 10px", font: "500 15px Manrope", color: "#edf8f8" }}>
                {assessment.summary}
              </p>
              {assessment.guidance && (
                <div style={{ padding: "10px 14px", background: "rgba(103,222,214,0.05)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "#a8c5c1", lineHeight: 1.6 }}>
                  <span style={{ color: "var(--teal)", fontWeight: 600 }}>Guidance: </span>
                  {assessment.guidance}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { metric: "heartRate" as const, label: "Heart Rate", unit: "BPM", color: "#ef4444", warnMax: 100 },
              { metric: "oxygenSat" as const, label: "SpO₂", unit: "%", color: "var(--teal)", warnMin: 95 },
              { metric: "systolicBP" as const, label: "Systolic BP", unit: "mmHg", color: "#3b82f6", warnMax: 130 },
              { metric: "sleepDuration" as const, label: "Sleep", unit: "hrs", color: "#a9a0f4", warnMin: 6 },
            ].map((c) => (
              <article key={c.metric} className="card" style={{ padding: "14px 16px" }}>
                <VitalsChart records={records} {...c} />
              </article>
            ))}
          </div>

          {latest?.symptoms && (
            <article className="card" style={{ padding: "14px 18px", borderColor: "rgba(245,158,11,0.25)" }}>
              <span className="section-kicker" style={{ color: "#f59e0b" }}>REPORTED SYMPTOMS</span>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#a8c5c1", lineHeight: 1.5 }}>{latest.symptoms}</p>
            </article>
          )}
        </div>

        {/* ── Right: score + alerts + links ── */}
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <span className="section-kicker">PERSONAL BASELINE</span>
            <h2 className="section-h2">Health overview</h2>
          </div>

          <article className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 64, height: 64, flexShrink: 0,
                display: "flex", alignItems: "baseline", justifyContent: "center", paddingTop: 17,
                border: "4px solid #25423f", borderTopColor: "#67d8cd", borderRightColor: "#67d8cd",
                borderRadius: "50%", transform: "rotate(25deg)",
              }}>
                <strong style={{ font: "600 20px Manrope", transform: "rotate(-25deg)" }}>
                  {assessment?.status === "GREEN" ? "92" : assessment?.status === "AMBER" ? "71" : "55"}
                </strong>
                <span style={{ transform: "rotate(-25deg)", marginLeft: -2, color: "#66817e", fontSize: 7 }}>/100</span>
              </div>
              <div>
                <span className="section-kicker">READINESS</span>
                <h3 style={{ margin: "4px 0 2px", font: "500 14px Manrope" }}>
                  {assessment?.status === "GREEN" ? "Mission ready" : assessment?.status === "AMBER" ? "Monitor closely" : "Attention needed"}
                </h3>
                <p style={{ margin: 0, color: "#62807c", fontSize: 8 }}>
                  {assessment?.flags.length ? `${assessment.flags.length} flag(s) active` : "Stable across indicators"}
                </p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, marginTop: 15 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ height: 3, borderRadius: 3, background: i === 2 ? "#54c9bd" : "#255c55" }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, color: "#5e7975", fontSize: 7 }}>
              <span>Recovery</span>
              <span style={{ color: "#70cfc5" }}>Strong</span>
            </div>
          </article>

          {alerts.length > 0 && (
            <>
              <span className="section-kicker" style={{ marginTop: 4 }}>ACTIVE ALERTS</span>
              {alerts.map((a) => (
                <article key={a.id} className="card" style={{
                  padding: "13px 15px",
                  borderLeft: `3px solid ${a.severity === "HIGH" || a.severity === "CRITICAL" ? "#ef4444" : "#f59e0b"}`,
                }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className={`status-badge status-${a.severity.toLowerCase()}`}>{a.severity}</span>
                    <span className={`status-badge status-${a.status.toLowerCase()}`}>{a.status}</span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#edf8f8" }}>{a.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#779390", lineHeight: 1.5 }}>{a.message}</p>
                </article>
              ))}
            </>
          )}

          <article className="card" style={{ padding: "14px 16px 8px" }}>
            <span className="section-kicker">QUICK ACTIONS</span>
            {[
              { href: "/astronaut/history", label: "View health history", Icon: Activity },
              { href: "/astronaut/learn",   label: "Health education",    Icon: Zap },
              { href: "/mission-control",   label: "Mission Control view", Icon: Droplets },
            ].map(({ href, label, Icon }) => (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 0", borderTop: "1px solid var(--line)",
                  color: "#a8c5c1", fontSize: 12,
                }}>
                  <Icon size={15} strokeWidth={1.7} style={{ color: "var(--teal)", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  <ChevronRight size={14} strokeWidth={1.7} style={{ color: "#526b68" }} />
                </div>
              </Link>
            ))}
          </article>

          <p style={{ fontSize: 10, color: "#3e5a57", lineHeight: 1.5, margin: 0, padding: "0 2px" }}>
            ⚠ Demo thresholds only. Not a medical device. {astronaut.isSimulated ? "All data is simulated." : "This demonstration portal is not authenticated."}
          </p>
        </div>
      </div>
    </>
  );
}
