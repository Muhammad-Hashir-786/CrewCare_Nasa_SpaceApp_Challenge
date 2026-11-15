"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Check, ChevronRight, Copy, Shield } from "lucide-react";
import { DEMO_ASTRONAUTS, DEMO_MISSION } from "@/lib/demo-data";
import { DemoResetButton } from "@/components/demo/DemoResetButton";
import styles from "./select.module.css";

interface CrewCardData {
  id: string;
  name: string;
  callsign: string;
  rank?: string | null;
  specialty?: string | null;
  status?: string;
  heartRate?: number | null;
  systolicBP?: number | null;
  diastolicBP?: number | null;
  oxygenSat?: number | null;
  activeAlertCount: number;
}

const DEMO_PASSWORDS: Record<string, string> = {
  NOVA: "nova123",
  ATLAS: "atlas123",
  CIPHER: "cipher123",
  VECTOR: "vector123",
};

const demoCards: CrewCardData[] = DEMO_ASTRONAUTS.map((astronaut) => {
  const latest = astronaut.healthRecords?.at(-1);
  return {
    id: astronaut.id,
    name: astronaut.name,
    callsign: astronaut.callsign,
    rank: astronaut.rank,
    specialty: astronaut.specialty,
    status: astronaut.latestAssessment?.status,
    heartRate: latest?.heartRate,
    systolicBP: latest?.systolicBP,
    diastolicBP: latest?.diastolicBP,
    oxygenSat: latest?.oxygenSat,
    activeAlertCount: (astronaut.activeAlerts ?? []).filter((alert) => alert.status === "ACTIVE").length,
  };
});

function statusColor(status?: string) {
  if (status === "GREEN") return "#10b981";
  if (status === "AMBER") return "#f59e0b";
  if (status === "RED") return "#ef4444";
  return "var(--teal)";
}

function statusClass(status?: string) {
  if (status === "GREEN") return styles.green;
  if (status === "AMBER") return styles.amber;
  if (status === "RED") return styles.red;
  return "";
}

export default function SelectAstronautPage() {
  const router = useRouter();
  const [crew, setCrew] = useState<CrewCardData[]>(demoCards);
  const [copiedCallsign, setCopiedCallsign] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mission-control/crew").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.crew) || data.crew.length === 0) return;
      setCrew(data.crew.map((member: Record<string, unknown>) => ({
        id: member.id as string,
        name: member.name as string,
        callsign: member.callsign as string,
        rank: member.rank as string | null,
        specialty: member.specialty as string | null,
        status: member.overallStatus as string,
        heartRate: member.latestHeartRate as number | null,
        systolicBP: member.latestSystolicBP as number | null,
        diastolicBP: member.latestDiastolicBP as number | null,
        oxygenSat: member.latestOxygenSat as number | null,
        activeAlertCount: Number(member.activeAlertCount ?? 0),
      })));
    }).catch(() => {});
  }, []);

  const openPassword = (member: CrewCardData) => {
    router.push(`/select/${member.callsign.toLowerCase()}`);
  };

  const copyPassword = async (event: React.MouseEvent<HTMLButtonElement>, member: CrewCardData) => {
    event.stopPropagation();
    const value = DEMO_PASSWORDS[member.callsign.toUpperCase()];
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCallsign(member.callsign);
      window.setTimeout(() => setCopiedCallsign((current) => current === member.callsign ? null : current), 1600);
    } catch {
      setCopiedCallsign(null);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.container}>
        <header className={styles.topRow}>
          <Link href="/" className={styles.backButton}><ArrowLeft size={18} /> Back to home</Link>
          <span className={styles.missionTag}>{DEMO_MISSION.code}</span>
        </header>

        <section className={styles.intro}>
          <h1>Select crew member</h1>
          <span className={styles.headingAccent} aria-hidden="true" />
          <p>Select your profile to open the Astronaut Portal. All data is fictional and simulated.</p>
        </section>

        <aside className={styles.demoNotice}>
          <Shield size={20} strokeWidth={1.8} aria-hidden="true" />
          <p><strong>Demo mode</strong> — this is not real authentication. Selecting a profile gives you a demonstration view of that crew member&apos;s data.</p>
        </aside>

        <section className={styles.crewGrid} aria-label="Crew profiles">
          {crew.map((member) => {
            const accent = statusColor(member.status);
            const initials = member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
            const demoPassword = DEMO_PASSWORDS[member.callsign.toUpperCase()];
            const metrics = [
              { label: "HR", value: member.heartRate != null ? member.heartRate.toFixed(0) : "—", unit: "BPM" },
              { label: "BP", value: member.systolicBP != null ? `${member.systolicBP}/${member.diastolicBP ?? "—"}` : "—", unit: "mmHg" },
              { label: "SpO₂", value: member.oxygenSat != null ? member.oxygenSat.toFixed(0) : "—", unit: "%" },
            ];
            return (
              <article key={member.id} className={`${styles.crewCard} ${statusClass(member.status)}`} style={{ "--status-accent": accent } as React.CSSProperties}>
                <button className={styles.cardHitArea} type="button" aria-label={`Select ${member.name}`} onClick={() => openPassword(member)}><span className={styles.srOnly}>Select {member.name}</span></button>
                <div className={styles.cardTopLine} />
                <div className={styles.cardContent}>
                  <div className={styles.personRow}>
                    <div className={styles.avatar}>{initials}</div>
                    <div className={styles.personInfo}>
                      <h2>{member.name}</h2>
                      <p className={styles.callsign}>{member.callsign}</p>
                      <p className={styles.role}>{[member.rank, member.specialty].filter(Boolean).join(" · ")}</p>
                    </div>
                    {member.status && <span className={`${styles.status} ${statusClass(member.status)}`}>{member.status}</span>}
                  </div>

                  <div className={styles.stats}>
                    {metrics.map((metric) => <div className={styles.stat} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.unit}</small></div>)}
                  </div>

                  <div className={styles.passwordRow}>
                    <span>Demo password: <code>{demoPassword ?? "Not available"}</code></span>
                    {demoPassword && <button type="button" className={styles.copyButton} aria-label={`Copy ${member.callsign} demo password`} onClick={(event) => void copyPassword(event, member)}>{copiedCallsign === member.callsign ? <Check size={16} /> : <Copy size={16} />}<span>{copiedCallsign === member.callsign ? "Copied" : "Copy"}</span></button>}
                  </div>

                  <div className={styles.cardFooter}>
                    {member.activeAlertCount > 0 ? <span className={styles.alertLine}><AlertTriangle size={17} /> {member.activeAlertCount} active alerts</span> : <span className={styles.noAlerts}>No active alerts</span>}
                    <button type="button" className={styles.selectButton} onClick={() => openPassword(member)}>Select <ChevronRight size={19} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer className={styles.footer}>
          <p><span>Mission Control officer?</span><Link href="/mission-control">Go to Mission Control <ChevronRight size={17} /></Link></p>
          <DemoResetButton />
        </footer>
      </div>
    </main>
  );
}
