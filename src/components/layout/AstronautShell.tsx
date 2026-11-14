"use client";

import { useAstronaut } from "@/lib/astronaut-context";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";

export function AstronautShell({ children }: { children: React.ReactNode }) {
  const { astronaut } = useAstronaut();
  const initials = astronaut.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Topbar
        astronautName={astronaut.name}
        astronautRole={`${astronaut.rank} · ${astronaut.callsign}`}
        astronautInitials={initials}
        missionName="HORIZON VII"
        missionSol={184}
        emergencyContext={{
          astronautId: astronaut.id,
          callsign: astronaut.callsign,
          assessment: astronaut.latestAssessment?.status ?? "NOT AVAILABLE",
          activeCriticalAlerts: (astronaut.activeAlerts ?? []).filter((alert) => alert.status === "ACTIVE" && alert.severity === "CRITICAL").map(({ title, message }) => ({ title, message })),
          lastMeasuredAt: astronaut.healthRecords?.at(-1)?.recordedAt ? new Date(astronaut.healthRecords.at(-1)!.recordedAt).toISOString() : null,
          healthRecords: astronaut.healthRecords ?? [],
          isSimulated: astronaut.isSimulated,
          latestAssessment: astronaut.latestAssessment ? { ...astronaut.latestAssessment, createdAt: new Date(astronaut.latestAssessment.createdAt).toISOString() } : null,
          activeAlerts: (astronaut.activeAlerts ?? []).map((alert) => ({ ...alert, createdAt: new Date(alert.createdAt).toISOString(), status: alert.status })),
        }}
      />
      <Sidebar mode="astronaut" />
      <main className="page-shell">{children}</main>
    </div>
  );
}
