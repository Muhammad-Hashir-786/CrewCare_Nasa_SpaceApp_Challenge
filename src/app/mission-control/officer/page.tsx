"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import styles from "../access.module.css";

export default function ChangeOfficerPage() {
  const router = useRouter();
  const choose = (callsign: string) => router.push(`/mission-control/officer/${callsign.toLowerCase()}`);
  return <main className={styles.accessPage}><section className={styles.accessContainer}>
    <Link href="/mission-control" className={styles.backLink}>← Back to Mission Control</Link>
    <span className={styles.demoPill}>CrewCare · Demo</span><p className={styles.kicker}>CHANGE OFFICER</p>
    <h1>Who is the mission officer on duty?</h1><p className={styles.intro}>Choose a crew profile, then confirm its demo password.</p>
    <div className={styles.officerGrid}>{DEMO_ASTRONAUTS.map((member) => <button type="button" key={member.id} className={styles.officerCard} onClick={() => choose(member.callsign)}>
      <span className={styles.initials}>{member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span className={styles.officerInfo}><strong>{member.name}</strong><b>{member.callsign}</b><small>{[member.rank, member.specialty].filter(Boolean).join(" · ")}</small></span><span className={styles.chevron}>›</span>
    </button>)}</div><p className={styles.notice}>This is not real authentication — demo mode.</p>
  </section></main>;
}
