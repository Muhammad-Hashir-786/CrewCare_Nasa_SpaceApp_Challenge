"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import type { Astronaut } from "@/types";
import styles from "./access.module.css";

const OFFICER_KEY = "crewcare_mission_officer";

export function MissionControlShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [officer, setOfficer] = useState<Astronaut | null>(null);
  const isOfficerEntry = pathname === "/mission-control/officer" || pathname.startsWith("/mission-control/officer/");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const id = window.localStorage.getItem(OFFICER_KEY);
      setOfficer(DEMO_ASTRONAUTS.find((member) => member.id === id) ?? null);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const signOut = () => {
    window.localStorage.removeItem(OFFICER_KEY);
    setOfficer(null);
    setReady(true);
    router.replace("/mission-control");
  };

  if (!ready) return <main className={styles.loading}><span className={styles.loadingMark}/>Checking officer access…</main>;
  if (isOfficerEntry) return <>{children}</>;
  if (!officer) return <OfficerChooser onChoose={(callsign) => router.push(`/mission-control/officer/${callsign.toLowerCase()}`)} />;

  return <div className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <Topbar
      astronautName={`On duty: ${officer.name}`}
      astronautRole={[officer.rank, officer.specialty].filter(Boolean).join(" · ") || "Mission officer"}
      astronautInitials={officer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
      profileHref="/mission-control/officer"
      onSignOut={signOut}
    />
    <Sidebar mode="mission-control"/>
    <main className="page-shell">{children}</main>
  </div>;
}

function OfficerChooser({ onChoose }: { onChoose: (callsign: string) => void }) {
  return <main className={styles.accessPage}>
    <div className={styles.accessGlow}/>
    <section className={styles.accessContainer}>
      <span className={styles.demoPill}>CrewCare · Demo</span>
      <p className={styles.kicker}>MISSION CONTROL ACCESS</p>
      <h1>Who is the mission officer on duty?</h1>
      <p className={styles.intro}>Choose your crew profile to continue. This is a demo sign-in, not real authentication.</p>
      <div className={styles.officerGrid}>
        {DEMO_ASTRONAUTS.map((member) => <button type="button" key={member.id} className={styles.officerCard} onClick={() => onChoose(member.callsign)}>
          <span className={styles.initials}>{member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
          <span className={styles.officerInfo}><strong>{member.name}</strong><b>{member.callsign}</b><small>{[member.rank, member.specialty].filter(Boolean).join(" · ")}</small></span>
          <span className={styles.chevron}>›</span>
        </button>)}
      </div>
      <p className={styles.notice}>All crew information is fictional and simulated for this demonstration.</p>
    </section>
  </main>;
}
