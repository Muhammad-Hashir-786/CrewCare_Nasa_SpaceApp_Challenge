"use client";

import { useState } from "react";
import { useAstronaut } from "@/lib/astronaut-context";
import { BodyTrendDashboard } from "@/components/health/BodyTrendDashboard";

export default function AnalyticsPage() {
  const { astronaut } = useAstronaut();
  const [savingReport, setSavingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const saveReport = async () => {
    setSavingReport(true); setReportMessage(null);
    try {
      const response = await fetch(`/api/analytics/${encodeURIComponent(astronaut.id)}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Analytics could not be saved.");
      setReportMessage(result.persisted ? "Analytics report saved to the mission database." : "Calculated for this demo session; connect PostgreSQL to save report history.");
    } catch (error) { setReportMessage(error instanceof Error ? error.message : "Analytics could not be saved."); }
    finally { setSavingReport(false); }
  };
  return <BodyTrendDashboard person={astronaut} records={astronaut.healthRecords ?? []} assessmentStatus={astronaut.latestAssessment?.status} heading="Trend Analysis" initialPeriod={14} onSaveReport={saveReport} savingReport={savingReport} reportMessage={reportMessage}/>;
}
