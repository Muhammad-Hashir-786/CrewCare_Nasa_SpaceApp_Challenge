"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import styles from "./password.module.css";

const DEMO_PASSWORDS: Record<string, string> = {
  NOVA: "nova123",
  ATLAS: "atlas123",
  CIPHER: "cipher123",
  VECTOR: "vector123",
};

export default function CrewPasswordPage() {
  const params = useParams<{ callsign: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const crewMember = DEMO_ASTRONAUTS.find((member) => member.callsign.toLowerCase() === params.callsign.toLowerCase());
  const expectedPassword = crewMember ? DEMO_PASSWORDS[crewMember.callsign.toUpperCase()] : undefined;
  const initials = crewMember?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const status = crewMember?.latestAssessment?.status;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!crewMember || !expectedPassword || password !== expectedPassword) {
      setError("Wrong password — the demo password is shown on this page, try again.");
      return;
    }
    localStorage.setItem("crewcare_astronaut_id", crewMember.id);
    router.push("/astronaut");
  };

  if (!crewMember || !expectedPassword) {
    return <main className={styles.page}><div className={styles.notFound}><p>That crew profile could not be found.</p><Link href="/select"><ArrowLeft size={17} /> Back to crew select</Link></div></main>;
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.container}>
        <Link href="/select" className={styles.backLink}><ArrowLeft size={18} /> Back to crew select</Link>

        <section className={styles.signInLayout} aria-label={`Sign in as ${crewMember.name}`}>
          <article className={styles.personCard}>
            <div className={styles.personAccent} />
            <span className={styles.profileKicker}>HORIZON-7 · CREW PROFILE</span>
            <div className={styles.avatar}>{initials}</div>
            <h1>{crewMember.name}</h1>
            <p className={styles.callsign}>{crewMember.callsign}</p>
            <p className={styles.role}>{[crewMember.rank, crewMember.specialty].filter(Boolean).join(" · ")}</p>
            {status && <span className={`${styles.status} ${status === "AMBER" ? styles.amber : status === "GREEN" ? styles.green : styles.otherStatus}`}>{status}</span>}
          </article>

          <section className={styles.passwordCard}>
            <span className={styles.sectionKicker}><ShieldCheck size={16} /> DEMO PROFILE ACCESS</span>
            <h2>Enter password</h2>
            <p className={styles.prompt}>Enter the password shown on this page to open your portal.</p>

            <div className={styles.entryLayout}>
              <form className={styles.form} onSubmit={submit}>
                <label className={styles.field}>
                  <span>Password</span>
                  <span className={styles.inputWrap}>
                    <input type={showPassword ? "text" : "password"} value={password} autoComplete="off" autoFocus onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Enter demo password" aria-invalid={Boolean(error)} aria-describedby={error ? "password-error" : undefined} />
                    <button type="button" className={styles.showPassword} onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={21} /> : <Eye size={21} />}</button>
                  </span>
                </label>
                {error && <p className={styles.error} id="password-error" role="alert">{error}</p>}
                <button type="submit" className={styles.openButton}>Open portal <span aria-hidden="true">→</span></button>
                <p className={styles.disclaimer}>This is not real authentication — demo mode.</p>
              </form>

              <aside className={styles.demoPassword} aria-label="Demo password">
                <span>DEMO PASSWORD</span>
                <strong>{expectedPassword}</strong>
                <p>Demo password: {expectedPassword} — shown here because this is a demo.</p>
              </aside>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
