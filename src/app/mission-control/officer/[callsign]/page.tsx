"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import styles from "../../access.module.css";

const passwords: Record<string, string> = { NOVA: "nova123", ATLAS: "atlas123", CIPHER: "cipher123", VECTOR: "vector123" };
const OFFICER_KEY = "crewcare_mission_officer";

export default function MissionOfficerPasswordPage() {
  const { callsign } = useParams<{ callsign: string }>();
  const router = useRouter();
  const member = DEMO_ASTRONAUTS.find((person) => person.callsign.toLowerCase() === callsign.toLowerCase());
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const expectedPassword = member ? passwords[member.callsign] : undefined;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member || !expectedPassword || password !== expectedPassword) {
      setError("Wrong password — the demo password is shown on this page, try again.");
      return;
    }
    localStorage.setItem(OFFICER_KEY, member.id);
    router.replace("/mission-control");
  };

  if (!member || !expectedPassword) return <main className={styles.accessPage}><section className={styles.accessContainer}><h1>Crew profile not found</h1><Link href="/mission-control/officer" className={styles.backLink}>← Back to officer selection</Link></section></main>;
  const initials = member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const status = member.latestAssessment?.status ?? "NOT AVAILABLE";

  return <main className={styles.accessPage}><div className={styles.accessGlow}/><section className={styles.accessContainer}>
    <Link href="/mission-control/officer" className={styles.backLink}>← Back to officer selection</Link>
    <span className={styles.demoPill}>CrewCare · Demo</span>
    <div className={styles.signInGrid}>
      <article className={styles.identityCard}><span className={styles.kicker}>OFFICER ON DUTY</span><span className={styles.largeInitials}>{initials}</span><h1>{member.name}</h1><strong className={styles.callsign}>{member.callsign}</strong><p>{[member.rank, member.specialty].filter(Boolean).join(" · ")}</p><span className={styles.identityStatus}><i/> {status === "GREEN" ? "All clear" : status === "AMBER" ? "Needs review" : status === "RED" ? "Act now" : status}</span></article>
      <section className={styles.passwordCard}><span className={styles.kicker}>MISSION CONTROL ACCESS</span><h2>Enter password</h2><p className={styles.intro}>Confirm your demo crew profile to open Mission Control.</p>
        <form className={styles.passwordForm} onSubmit={submit}>
          <label htmlFor="officer-password">Password</label>
          <span className={styles.passwordInput}><input id="officer-password" autoFocus autoComplete="off" type={visible ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Enter demo password" aria-invalid={Boolean(error)}/><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={20}/> : <Eye size={20}/>}</button></span>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.openButton} type="submit">Open Mission Control <span>→</span></button>
          <p className={styles.note}>This is not real authentication — demo mode.</p>
        </form>
        <aside className={styles.passwordNote}><span>DEMO PASSWORD</span><strong>{expectedPassword}</strong><p>Demo password: {expectedPassword} — shown here because this is a demo.</p></aside>
      </section>
    </div>
  </section></main>;
}
