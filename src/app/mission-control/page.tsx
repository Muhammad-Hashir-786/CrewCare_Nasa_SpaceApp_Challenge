import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, Users } from "lucide-react";
import { DEMO_ALERTS, DEMO_ASTRONAUTS } from "@/lib/demo-data";
import type { Alert, Astronaut, HealthRecord } from "@/types";
import styles from "./mission-control.module.css";

type AlertWithCrew = Alert & { astronaut: Astronaut };
const priority: Record<Alert["severity"], number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const dateTime = (value: Date | string) => new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function statusText(status?: string) { return status === "RED" ? "Act now" : status === "AMBER" ? "Needs attention" : "All clear"; }
function statusClass(status?: string) { return status === "RED" ? styles.statusRed : status === "AMBER" ? styles.statusAmber : styles.statusGreen; }
function readingVerdict(value: number | null | undefined, min: number, max?: number) {
  if (value == null) return "Not recorded";
  return value < min ? "Low" : max !== undefined && value > max ? "High" : "Within range";
}
function bpVerdict(record?: HealthRecord) {
  if (!record || record.systolicBP == null) return "Not recorded";
  if (record.systolicBP < 90 || (record.diastolicBP ?? 0) < 60) return "Low";
  if (record.systolicBP > 130 || (record.diastolicBP ?? 0) > 85) return "High";
  return "Within range";
}

export default function MissionControlDashboard() {
  // Shared canonical fictional roster: deterministic on every open/reload.
  const crew = DEMO_ASTRONAUTS;
  const needsReview = crew.filter((member) => member.latestAssessment?.status === "AMBER" || member.latestAssessment?.status === "RED");
  const alerts: AlertWithCrew[] = DEMO_ALERTS.filter((alert) => alert.status === "ACTIVE").flatMap((alert) => {
    const astronaut = crew.find((member) => member.id === alert.userId);
    return astronaut ? [{ ...alert, astronaut }] : [];
  })
    .sort((a, b) => priority[a.severity] - priority[b.severity] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const clearCount = crew.filter((member) => (member.latestAssessment?.status ?? "GREEN") === "GREEN").length;

  return <div className={styles.dashboard}>
    <header className={styles.pageHeader}><div><p className={styles.kicker}>CREWCARE · MISSION OPERATIONS</p><h1>Mission Control</h1><p>Crew health overview · {crew.length} crew members · All data simulated.</p></div><span className={styles.demoTag}><i/> Simulated data</span></header>

    <section className={styles.summaryGrid} aria-label="Crew summary">
      {[
        { label: "Total crew", value: crew.length },
        { label: "All clear", value: clearCount },
        { label: "Needs attention", value: needsReview.length },
        { label: "Active alerts", value: alerts.length },
      ].map((item) => <article className={styles.summaryCard} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}
    </section>

    {needsReview.map((member) => <section className={styles.attentionBanner} key={member.id}><AlertTriangle size={20}/><p><strong>{member.name} needs a review</strong><span>{member.latestAssessment?.summary ?? "Review the latest recorded health information."}</span></p><Link href={`/mission-control/crew/${member.id}`}>View profile <ArrowRight size={16}/></Link></section>)}

    <div className={styles.contentGrid}>
      <section>
        <div className={styles.sectionHeading}><Users size={19}/><div><h2>Crew overview</h2><p>Four crew profiles · latest recorded measurements</p></div></div>
        <div className={styles.crewGrid}>{crew.map((member) => {
          const latest = member.healthRecords?.at(-1);
          const alertCount = (member.activeAlerts ?? []).filter((alert) => alert.status === "ACTIVE").length;
          return <Link key={member.id} href={`/mission-control/crew/${member.id}`} className={styles.crewLink}><article className={styles.crewCard}>
            <div className={styles.crewIdentity}><div className={styles.avatar}>{member.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</div><div><h3>{member.name}</h3><p>{member.callsign} <span>·</span> {[member.rank, member.specialty].filter(Boolean).join(" · ")}</p></div></div>
            <span className={`${styles.status} ${statusClass(member.latestAssessment?.status)}`}><i/>{statusText(member.latestAssessment?.status)}</span>
            <div className={styles.vitals}>
              <Reading label="HR" value={latest?.heartRate != null ? `${latest.heartRate} bpm` : "—"} verdict={readingVerdict(latest?.heartRate, 50, 100)}/>
              <Reading label="BP" value={latest?.systolicBP != null ? `${latest.systolicBP}/${latest.diastolicBP ?? "—"} mmHg` : "—"} verdict={bpVerdict(latest)}/>
              <Reading label="SpO₂" value={latest?.oxygenSat != null ? `${latest.oxygenSat}%` : "—"} verdict={readingVerdict(latest?.oxygenSat, 95, 100)}/>
            </div>
            <div className={styles.cardFooter}><span>{alertCount ? <><Bell size={15}/>{alertCount} active alert{alertCount === 1 ? "" : "s"}</> : "No active alerts"}</span><b>Open profile <ArrowRight size={15}/></b></div>
          </article></Link>;
        })}</div>
      </section>

      <aside className={styles.alertPanel}>
        <div className={styles.alertHeading}><div><h2>Recent alerts</h2><p>Active crew alerts, most urgent first</p></div><Link href="/mission-control/alerts" aria-label="View all alerts"><ArrowRight size={18}/></Link></div>
        {alerts.length ? <div className={styles.alertList}>{alerts.map((alert) => <article className={styles.alertItem} key={alert.id}><div className={styles.alertMeta}><span>{alert.astronaut.name} · {alert.astronaut.callsign}</span><time>{dateTime(alert.createdAt)}</time></div><h3>{alert.title}</h3><p>{alert.message}</p><small>{alert.severity.toLowerCase()} priority · active</small></article>)}</div> : <p className={styles.noAlerts}>No recent alerts — all clear.</p>}
        <p className={styles.panelSafety}>CrewCare is not a doctor — this is guidance until professional help arrives.</p>
      </aside>
    </div>
    <p className={styles.footerNote}>All crew records and thresholds are simulated for demonstration; this is not a medical device.</p>
  </div>;
}

function Reading({ label, value, verdict }: { label: string; value: string; verdict: string }) {
  const isOut = verdict === "High" || verdict === "Low";
  return <div className={styles.reading}><span>{label}</span><strong>{value}</strong>{isOut && <small>{verdict}</small>}</div>;
}
