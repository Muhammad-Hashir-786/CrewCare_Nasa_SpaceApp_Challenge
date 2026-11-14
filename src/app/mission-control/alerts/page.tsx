"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { DEMO_ALERTS, DEMO_ASTRONAUTS } from "@/lib/demo-data";
import type { Alert, Astronaut } from "@/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS);
  const [crew, setCrew] = useState<Astronaut[]>(DEMO_ASTRONAUTS);
  const [simulated, setSimulated] = useState(true);

  useEffect(() => {
    const loadLocalDemoAlerts = () => DEMO_ASTRONAUTS.flatMap((astronaut) => {
      try { return JSON.parse(localStorage.getItem(`crewcare_demo_alerts_${astronaut.id}`) ?? "[]") as Alert[]; }
      catch { return []; }
    });
    const merge = (source: Alert[]) => {
      const byId = new Map(source.map((alert) => [alert.id, alert]));
      for (const alert of loadLocalDemoAlerts()) byId.set(alert.id, alert);
      setAlerts([...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };
    merge(DEMO_ALERTS);
    Promise.all([fetch("/api/alerts"), fetch("/api/mission-control/crew")]).then(async ([alertsResponse, crewResponse]) => {
      if (alertsResponse.ok) merge((await alertsResponse.json()).alerts ?? []);
      if (crewResponse.ok) {
        const data = await crewResponse.json();
        setSimulated(data.isSimulated === true);
        const roster = (data.crew ?? []).map((member: Record<string, unknown>) => ({
          id: member.id as string,
          name: member.name as string,
          callsign: member.callsign as string,
        }));
        setCrew(roster);
      }
    }).catch(() => {});
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/${id}/acknowledge`, { method: "POST" });
      if (!response.ok) return;
      setAlerts((prev) => {
        const updated = prev.map((a) => a.id === id
        ? { ...a, status: "ACKNOWLEDGED" as const, acknowledgedAt: new Date().toISOString(), acknowledgedBy: simulated ? "Mission Control (Demo)" : "Mission Control" }
        : a);
        const acknowledged = updated.find((alert) => alert.id === id);
        if (simulated && acknowledged) {
          const key = `crewcare_demo_alerts_${acknowledged.userId}`;
          try {
            const stored = JSON.parse(localStorage.getItem(key) ?? "[]") as Alert[];
            localStorage.setItem(key, JSON.stringify([...stored.filter((alert) => alert.id !== id), acknowledged]));
          } catch { localStorage.setItem(key, JSON.stringify([acknowledged])); }
        }
        return updated;
      });
    } catch { /* Keep the alert active when acknowledgement fails. */ }
  };

  const active = alerts.filter((a) => a.status === "ACTIVE");
  const acked  = alerts.filter((a) => a.status === "ACKNOWLEDGED");

  function bc(severity: string) {
    if (severity === "HIGH" || severity === "CRITICAL") return "#ef4444";
    if (severity === "MEDIUM") return "#f59e0b";
    return "#10b981";
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <span className="section-kicker">MISSION CONTROL</span>
        <h1 style={{ margin: 0, font: "500 24px Manrope" }}>Alerts</h1>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          {active.length} active · {acked.length} acknowledged
        </p>
      </div>

      <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 7, fontSize: 11, color: "#526b68", marginBottom: 24 }}>
        {simulated ? "⚠ All alerts are simulated demo data. Acknowledgements are saved in this browser and cleared by Demo reset." : "⚠ Health alerts contain sensitive data. This demonstration portal does not provide authenticated access controls."}
      </div>

      {active.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={14} strokeWidth={1.7} style={{ color: "#ef4444" }} />
            <span className="section-kicker" style={{ margin: 0, color: "#ef4444" }}>
              ACTIVE ALERTS ({active.length})
            </span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {active.map((a) => {
              const aAstro = crew.find((x) => x.id === a.userId);
              return (
                <article key={a.id} className="card" style={{ padding: "14px 16px", borderLeft: `3px solid ${bc(a.severity)}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 7, marginBottom: 7, flexWrap: "wrap", alignItems: "center" }}>
                        <span className={`status-badge status-${a.severity.toLowerCase()}`}>{a.severity}</span>
                        <span className={`status-badge status-${a.status.toLowerCase()}`}>{a.status}</span>
                        {aAstro && <span style={{ fontSize: 11, color: "var(--teal)", fontWeight: 600 }}>{aAstro.callsign} — {aAstro.name}</span>}
                      </div>
                      <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 600, color: "#edf8f8" }}>{a.title}</p>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{a.message}</p>
                      {a.metric && a.value != null && (
                        <p style={{ margin: 0, fontSize: 11, color: "#526b68" }}>
                          Metric: <span style={{ color: "var(--muted)" }}>{a.metric}</span>
                          {" · "}Value: <span style={{ color: "#f59e0b" }}>{a.value}</span>
                          {a.threshold != null && <> · Threshold: <span style={{ color: "var(--muted)" }}>{a.threshold}</span></>}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      style={{
                        flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", border: "1px solid var(--line)", borderRadius: 6,
                        background: "transparent", color: "var(--muted)", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      <CheckCircle size={13} strokeWidth={1.7} /> Acknowledge
                    </button>
                  </div>
                  <p style={{ margin: "10px 0 0", fontSize: 10, color: "#3e5a57" }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {acked.length > 0 && (
        <section style={{ opacity: 0.7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <CheckCircle size={14} strokeWidth={1.7} style={{ color: "#10b981" }} />
            <span className="section-kicker" style={{ margin: 0 }}>ACKNOWLEDGED ({acked.length})</span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {acked.map((a) => {
              const aAstro = crew.find((x) => x.id === a.userId);
              return (
                <article key={a.id} className="card" style={{ padding: "12px 16px", borderLeft: `3px solid ${bc(a.severity)}` }}>
                  <div style={{ display: "flex", gap: 7, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span className={`status-badge status-${a.severity.toLowerCase()}`}>{a.severity}</span>
                    <span className={`status-badge status-acknowledged`}>ACK&apos;D</span>
                    {aAstro && <span style={{ fontSize: 10, color: "var(--teal)", fontWeight: 600 }}>{aAstro.callsign}</span>}
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#edf8f8" }}>{a.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>{a.message}</p>
                  {a.acknowledgedBy && (
                    <p style={{ margin: "8px 0 0", fontSize: 10, color: "#3e5a57" }}>Acknowledged by {a.acknowledgedBy}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
