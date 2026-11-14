"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ChevronRight, AlertTriangle } from "lucide-react";
import { DEMO_ASTRONAUTS, DEMO_MISSION } from "@/lib/demo-data";
import { useEffect, useState } from "react";
import { DemoResetButton } from "@/components/demo/DemoResetButton";

interface CrewCardData {
  id: string; name: string; callsign: string; rank?: string | null; specialty?: string | null;
  status?: string; heartRate?: number | null; systolicBP?: number | null; diastolicBP?: number | null;
  oxygenSat?: number | null; activeAlertCount: number;
}

const demoCards: CrewCardData[] = DEMO_ASTRONAUTS.map((a) => {
  const latest = a.healthRecords?.at(-1);
  return { id: a.id, name: a.name, callsign: a.callsign, rank: a.rank, specialty: a.specialty,
    status: a.latestAssessment?.status, heartRate: latest?.heartRate, systolicBP: latest?.systolicBP,
    diastolicBP: latest?.diastolicBP, oxygenSat: latest?.oxygenSat,
    activeAlertCount: (a.activeAlerts ?? []).filter((alert) => alert.status === "ACTIVE").length };
});

function statusColor(s?: string) {
  if (s === "GREEN") return "#10b981";
  if (s === "AMBER") return "#f59e0b";
  if (s === "RED") return "#ef4444";
  return "var(--teal)";
}

function statusClass(s?: string) {
  if (s === "GREEN") return "status-green";
  if (s === "AMBER") return "status-amber";
  if (s === "RED") return "status-red";
  return "";
}

export default function SelectAstronautPage() {
  const router = useRouter();
  const [crew, setCrew] = useState<CrewCardData[]>(demoCards);

  useEffect(() => {
    fetch("/api/mission-control/crew").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.crew) || data.crew.length === 0) return;
      setCrew(data.crew.map((member: Record<string, unknown>) => ({
        id: member.id as string, name: member.name as string, callsign: member.callsign as string,
        rank: member.rank as string | null, specialty: member.specialty as string | null,
        status: member.overallStatus as string, heartRate: member.latestHeartRate as number | null,
        systolicBP: member.latestSystolicBP as number | null, diastolicBP: member.latestDiastolicBP as number | null,
        oxygenSat: member.latestOxygenSat as number | null, activeAlertCount: Number(member.activeAlertCount ?? 0),
      })));
    }).catch(() => {});
  }, []);

  const select = (id: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("crewcare_astronaut_id", id);
    }
    router.push("/astronaut");
  };

  return (
    <div className="app-shell" style={{ minHeight: "100vh", padding: "60px 32px" }}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--teal)", marginBottom: 24, textDecoration: "none" }}>
            ← Back to home
          </Link>
          <div className="mission-pill" style={{ display: "inline-flex", marginBottom: 18 }}>
            <span className="live-dot" />
            <span>{DEMO_MISSION.code}</span>
            <span className="mission-pill-sep" />
            <span className="muted-text">SELECT CREW MEMBER</span>
          </div>
          <h1 style={{ margin: "0 0 8px", font: "500 32px/1.2 Manrope", letterSpacing: "-0.025em" }}>
            Who are you?
          </h1>
          <p style={{ margin: 0, color: "#77908d", fontSize: 13 }}>
            Select your crew profile to access the Astronaut Portal. All data is fictional and simulated.
          </p>
        </div>

        {/* Disclaimer */}
        <div style={{
          padding: "10px 14px", marginBottom: 32,
          background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: 8, fontSize: 11, color: "#526b68", display: "flex", gap: 8,
        }}>
          <Shield size={14} strokeWidth={1.7} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
          Demo mode. This is not real authentication. Selecting a profile gives you a demonstration view of that crew member&apos;s data.
        </div>

        {/* Crew cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {crew.map((a) => {
            const sc = statusColor(a.status);
            const alertCount = a.activeAlertCount;
            const initials = a.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

            return (
              <button
                key={a.id}
                onClick={() => select(a.id)}
                style={{
                  all: "unset",
                  display: "block",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: `1px solid var(--line)`,
                  background: "var(--panel)",
                  transition: "0.15s",
                  position: "relative",
                }}
              >
                {/* Top color strip */}
                <div style={{ height: 3, background: sc }} />
                <div style={{ padding: "20px 20px 16px" }}>
                  {/* Avatar + name */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                      display: "grid", placeItems: "center",
                      border: `2px solid ${sc}40`,
                      background: `linear-gradient(145deg, ${sc}18, ${sc}08)`,
                      font: "600 14px Manrope", color: sc,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", font: "600 14px Manrope", color: "#edf8f8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.name}
                      </p>
                      <p style={{ margin: "0 0 3px", fontSize: 10, color: "var(--teal)", fontWeight: 600, letterSpacing: "0.08em" }}>
                        {a.callsign}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--muted)" }}>
                        {a.rank} · {a.specialty}
                      </p>
                    </div>
                    {a.status && (
                      <span className={`status-badge ${statusClass(a.status)}`} style={{ fontSize: 9, flexShrink: 0 }}>
                        {a.status}
                      </span>
                    )}
                  </div>

                  {/* Quick vitals strip */}
                  {(a.heartRate != null || a.systolicBP != null || a.oxygenSat != null) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
                      {[
                        { label: "HR", val: a.heartRate?.toFixed(0), unit: "BPM", warn: (a.heartRate ?? 0) > 100 },
                        { label: "BP", val: a.systolicBP != null ? `${a.systolicBP}/${a.diastolicBP ?? "—"}` : null, unit: "", warn: (a.systolicBP ?? 0) > 130 },
                        { label: "SpO₂", val: a.oxygenSat?.toFixed(0), unit: "%", warn: (a.oxygenSat ?? 100) < 95 },
                      ].map((v) => (
                        <div key={v.label} style={{ padding: "7px 6px", background: "rgba(255,255,255,0.025)", borderRadius: 6, textAlign: "center" }}>
                          <div style={{ fontSize: 7, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 3 }}>{v.label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: v.warn ? "#f59e0b" : "#edf8f8" }}>
                            {v.val ?? "—"}{v.unit && <span style={{ fontSize: 8, fontWeight: 400, color: "var(--muted)", marginLeft: 1 }}>{v.unit}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {alertCount > 0 ? (
                      <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={11} strokeWidth={1.7} /> {alertCount} active alert{alertCount > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>No active alerts</span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--teal)", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                      Select <ChevronRight size={12} strokeWidth={1.7} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mission Control link */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Mission Control officer?</span>
          <Link href="/mission-control" style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
            Go to Mission Control <ChevronRight size={13} strokeWidth={1.7} />
          </Link>
        </div>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}><DemoResetButton /></div>
      </div>
    </div>
  );
}
