import Link from "next/link";
import { ChevronRight, AlertTriangle, Users } from "lucide-react";
import { DEMO_MISSION } from "@/lib/demo-data";
import { getAllAlerts, getAstronauts } from "@/lib/db-data";

function statusColor(s?: string) {
  if (s === "GREEN") return "#10b981";
  if (s === "AMBER") return "#f59e0b";
  if (s === "RED")   return "#ef4444";
  return "var(--teal)";
}

export default async function MissionControlDashboard() {
  const [astronauts, alerts] = await Promise.all([getAstronauts(), getAllAlerts()]);
  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE");
  const needsAttention = astronauts.filter(
    (a) => a.latestAssessment?.status === "AMBER" || a.latestAssessment?.status === "RED"
  );

  return (
    <>
      {/* Header row */}
      <div style={{ marginBottom: 28 }}>
        <p className="section-kicker">{DEMO_MISSION.code} · {astronauts.every((a) => a.isSimulated) ? "ALL DATA SIMULATED" : "CREW HEALTH OVERVIEW"}</p>
        <h1 style={{ margin: "0 0 6px", font: "500 28px/1.2 Manrope", letterSpacing: "-0.025em" }}>
          {DEMO_MISSION.name}
        </h1>
        <p style={{ margin: 0, color: "#77908d", fontSize: 12 }}>
          Crew health overview · {astronauts.length} crew members
        </p>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 28 }}>
        {[
          { label: "TOTAL CREW",    value: astronauts.length, color: "var(--teal)" },
          { label: "STATUS GREEN",  value: astronauts.filter((a) => a.latestAssessment?.status === "GREEN").length, color: "#10b981" },
          { label: "NEEDS REVIEW",  value: needsAttention.length, color: needsAttention.length ? "#f59e0b" : "#10b981" },
          { label: "ACTIVE ALERTS", value: activeAlerts.length, color: activeAlerts.length ? "#ef4444" : "#10b981" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "14px 16px" }}>
            <span className="section-kicker">{s.label}</span>
            <strong style={{ display: "block", marginTop: 6, font: "600 26px Manrope", color: s.color }}>
              {s.value}
            </strong>
          </div>
        ))}
      </div>

      {/* Needs attention banner */}
      {needsAttention.length > 0 && (
        <div style={{
          padding: "11px 16px", marginBottom: 24,
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <AlertTriangle size={16} strokeWidth={1.7} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.06em" }}>NEEDS ATTENTION — </span>
            <span style={{ fontSize: 12, color: "#a8c5c1" }}>
              {needsAttention.map((a) => a.callsign).join(", ")} · Review their health profiles
            </span>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

        {/* Crew grid */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Users size={15} strokeWidth={1.7} style={{ color: "var(--teal)" }} />
            <span className="section-kicker" style={{ margin: 0 }}>CREW OVERVIEW</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {astronauts.map((a) => {
              const latest = a.healthRecords?.slice(-1)[0];
              const sc = statusColor(a.latestAssessment?.status);
              const activeCount = (a.activeAlerts ?? []).filter((x) => x.status === "ACTIVE").length;
              return (
                <Link key={a.id} href={`/mission-control/crew/${a.id}`} style={{ textDecoration: "none" }}>
                  <article className="card" style={{
                    padding: "18px 18px 14px",
                    borderTop: `3px solid ${sc}`,
                    cursor: "pointer", transition: "0.15s",
                  }}>
                    {/* Name row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <p style={{ margin: "0 0 2px", font: "600 14px Manrope", color: "#edf8f8" }}>{a.name}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "var(--teal)", fontWeight: 600, letterSpacing: "0.08em" }}>{a.callsign}</p>
                      </div>
                      {a.latestAssessment && (
                        <span className={`status-badge status-${a.latestAssessment.status.toLowerCase()}`} style={{ fontSize: 9 }}>
                          {a.latestAssessment.status}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--muted)" }}>
                      {a.rank} · {a.specialty}
                    </p>

                    {/* Quick vitals */}
                    {latest && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                        {[
                          { label: "HR", val: latest.heartRate?.toFixed(0), unit: "BPM", warn: (latest.heartRate ?? 0) > 100 },
                          { label: "BP",  val: latest.systolicBP != null ? `${latest.systolicBP}/${latest.diastolicBP}` : null, unit: "", warn: (latest.systolicBP ?? 0) > 130 },
                          { label: "SpO₂", val: latest.oxygenSat?.toFixed(0), unit: "%", warn: (latest.oxygenSat ?? 100) < 95 },
                        ].map((v) => (
                          <div key={v.label} style={{ textAlign: "center", padding: "7px 4px", background: "rgba(255,255,255,0.025)", borderRadius: 6 }}>
                            <div style={{ fontSize: 8, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 3 }}>{v.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: v.warn ? "#f59e0b" : "#edf8f8" }}>
                              {v.val ?? "—"}
                              {v.unit && <span style={{ fontSize: 9, fontWeight: 400, color: "var(--muted)", marginLeft: 1 }}>{v.unit}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {activeCount > 0 ? (
                        <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                          <AlertTriangle size={12} strokeWidth={1.7} /> {activeCount} alert{activeCount > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>No active alerts</span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--teal)", display: "flex", alignItems: "center", gap: 3 }}>
                        Profile <ChevronRight size={12} strokeWidth={1.7} />
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Alerts sidebar */}
        <section style={{ position: "sticky", top: 90 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span className="section-kicker" style={{ margin: 0 }}>RECENT ALERTS</span>
            <Link href="/mission-control/alerts" style={{ fontSize: 11, color: "var(--teal)", display: "flex", alignItems: "center", gap: 3 }}>
              All <ChevronRight size={12} strokeWidth={1.7} />
            </Link>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {alerts.slice(0, 5).map((alert) => {
              const aAstro = astronauts.find((x) => x.id === alert.userId);
              const bc = alert.severity === "HIGH" || alert.severity === "CRITICAL" ? "#ef4444"
                : alert.severity === "MEDIUM" ? "#f59e0b" : "#10b981";
              return (
                <article key={alert.id} className="card" style={{ padding: "11px 13px", borderLeft: `3px solid ${bc}` }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap", alignItems: "center" }}>
                    <span className={`status-badge status-${alert.severity.toLowerCase()}`} style={{ fontSize: 9 }}>{alert.severity}</span>
                    <span className={`status-badge status-${alert.status.toLowerCase()}`} style={{ fontSize: 9 }}>{alert.status}</span>
                    {aAstro && <span style={{ fontSize: 10, color: "var(--teal)", fontWeight: 600 }}>{aAstro.callsign}</span>}
                  </div>
                  <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 600, color: "#edf8f8" }}>{alert.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{alert.message}</p>
                </article>
              );
            })}
          </div>

          {/* Disclaimer */}
          <p style={{ marginTop: 16, fontSize: 10, color: "#3e5a57", lineHeight: 1.5 }}>
            ⚠ {astronauts.every((a) => a.isSimulated) ? "All crew records are fictional and simulated. " : "This demonstration portal is not authenticated. "}Thresholds are illustrative; not a medical device.
          </p>
        </section>
      </div>
    </>
  );
}
