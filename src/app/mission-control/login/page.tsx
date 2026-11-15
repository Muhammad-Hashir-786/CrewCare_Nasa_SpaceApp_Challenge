"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import styles from "../access.module.css";

const OFFICER_SESSION_KEY = "crewcare_mission_officer_session";
const DUTY_OFFICER_KEY = "crewcare_mission_officer_duty_v2";
const passwordByCallsign: Record<string, string> = { NOVA: "nova123", ATLAS: "atlas123", CIPHER: "cipher123", VECTOR: "vector123" };

export default function MissionControlLoginPage() {
  const router = useRouter();
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const officer = DEMO_ASTRONAUTS.find((member) => member.id === officerId) ?? null;
  const expectedPassword = officer ? passwordByCallsign[officer.callsign] : undefined;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedDuty = window.localStorage.getItem(DUTY_OFFICER_KEY);
      const duty = DEMO_ASTRONAUTS.find((member) => member.id === savedDuty) ?? DEMO_ASTRONAUTS[0];
      if (!savedDuty) window.localStorage.setItem(DUTY_OFFICER_KEY, duty.id);
      const active = window.sessionStorage.getItem(OFFICER_SESSION_KEY);
      if (active === duty.id) router.replace("/mission-control");
      else if (active) window.sessionStorage.removeItem(OFFICER_SESSION_KEY);
      setOfficerId(duty.id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!officer || !expectedPassword || password !== expectedPassword) {
      setError("Wrong password — the demo password is shown on the page, try again");
      return;
    }
    window.sessionStorage.setItem(OFFICER_SESSION_KEY, officer.id);
    window.dispatchEvent(new Event("crewcare-mission-officer-change"));
    router.replace("/mission-control");
  };

  if (!officer || !expectedPassword) return <main className={styles.loading}><span className={styles.loadingMark}/>Loading officer access…</main>;
  const initials = officer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <main className={styles.accessPage}>
    <div className={styles.accessGlow}/>
    <section className={styles.accessContainer}>
      <Link href="/" className={styles.backLink}>← Back to CrewCare</Link>
      <span className={styles.demoPill}>CrewCare · Demo</span>
      <div className={styles.signInGrid}>
        <article className={styles.identityCard}>
          <span className={styles.kicker}>MISSION CONTROL OFFICER</span>
          <span className={styles.largeInitials}>{initials}</span>
          <h1>{officer.name}</h1>
          <strong className={styles.callsign}>{officer.callsign}</strong>
          <p>Commander · Flight Medicine</p>
          <span className={styles.identityStatus}><i/> Mission Control Officer</span>
        </article>
        <section className={styles.passwordCard}>
          <span className={styles.kicker}>MISSION CONTROL ACCESS</span>
          <h2>Enter password</h2>
          <p className={styles.intro}>Sign in as the mission officer to open Mission Control.</p>
          <form className={styles.passwordForm} onSubmit={submit}>
            <label htmlFor="officer-password">Password</label>
            <span className={styles.passwordInput}>
              <input id="officer-password" autoFocus autoComplete="off" type={visible ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Enter demo password" aria-invalid={Boolean(error)}/>
              <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
            </span>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={styles.openButton} type="submit">Open Mission Control <span>→</span></button>
            <p className={styles.note}>This is not real authentication — demo mode.</p>
          </form>
          <aside className={styles.passwordNote}><span>DEMO PASSWORD</span><strong>{expectedPassword}</strong><p>Demo password: {expectedPassword} — shown here because this is a demo.</p></aside>
        </section>
      </div>
    </section>
  </main>;
}
