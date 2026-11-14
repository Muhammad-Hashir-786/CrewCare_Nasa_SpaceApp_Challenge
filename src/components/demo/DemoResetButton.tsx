"use client";

import { RotateCcw } from "lucide-react";

export function DemoResetButton() {
  const reset = () => {
    if (!window.confirm("Reset this browser’s Crew Care demo state? This clears only simulated check-ins, assessments, alerts, AI conversations and recommendation statuses stored in this browser. It does not modify PostgreSQL.")) return;
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && (key === "crewcare_astronaut_id" || key.startsWith("crewcare_checkins_") || key.startsWith("crewcare_assessment_") || key.startsWith("crewcare_demo_alerts_") || key.startsWith("crewcare-ai-conversations:") || key.startsWith("crewcare-ai-recommendation-status:"))) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  return <button type="button" onClick={reset} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 11px", border: "1px solid var(--line)", borderRadius: 6, background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 10 }}>
    <RotateCcw size={12}/> Reset browser demo data
  </button>;
}
