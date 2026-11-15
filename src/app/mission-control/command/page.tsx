"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import styles from "./command.module.css";

const OFFICER_SESSION_KEY = "crewcare_mission_officer_session";
const DUTY_OFFICER_KEY = "crewcare_mission_officer_duty_v2";
const HISTORY_KEY = "crewcare_mission_command_history";
const passwords: Record<string, string> = { NOVA: "nova123", ATLAS: "atlas123", CIPHER: "cipher123", VECTOR: "vector123" };
type Handover = { from: string; to: string; at: string };

export default function MissionCommandPage() {
  const router = useRouter();
  const [currentId, setCurrentId] = useState("");
  const [onDutySince, setOnDutySince] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Handover[]>([]);
  const current = DEMO_ASTRONAUTS.find((member) => member.id === currentId) ?? DEMO_ASTRONAUTS[0];
  const selected = DEMO_ASTRONAUTS.find((member) => member.id === selectedId) ?? null;
  const others = useMemo(() => DEMO_ASTRONAUTS.filter((member) => member.id !== current.id), [current.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const id = localStorage.getItem(DUTY_OFFICER_KEY) ?? sessionStorage.getItem(OFFICER_SESSION_KEY) ?? DEMO_ASTRONAUTS[0].id;
      setCurrentId(id);
      const since = localStorage.getItem("crewcare_mission_officer_since") ?? String(Date.now());
      localStorage.setItem("crewcare_mission_officer_since", since); setOnDutySince(since);
      try { const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); setHistory(Array.isArray(saved) ? saved : []); } catch { setHistory([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const passCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    if (password !== passwords[selected.callsign]) { setError("Wrong password — enter the selected crew member’s demo password."); return; }
    const at = new Date().toISOString();
    const entry = { from: current.name, to: selected.name, at };
    const nextHistory = [entry, ...history].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    localStorage.setItem(DUTY_OFFICER_KEY, selected.id);
    sessionStorage.setItem(OFFICER_SESSION_KEY, selected.id);
    localStorage.setItem("crewcare_mission_officer_since", at); setOnDutySince(at);
    sessionStorage.setItem("crewcare_mission_action_notice", `Command passed from ${current.name} to ${selected.name}.`);
    setHistory(nextHistory);
    window.dispatchEvent(new Event("crewcare-mission-officer-change"));
    router.replace("/mission-control");
  };

  if (!currentId) return <main className={styles.page}><p>Loading command status…</p></main>;
  return <main className={styles.page}>
    <header className={styles.header}><div><p className={styles.kicker}>MISSION CONTROL · COMMAND</p><h1>Command handover</h1><p>Transfer the on-duty role only after the incoming officer confirms their demo password.</p></div><span className={styles.demo}><i/> CrewCare · Demo</span></header>
    <section className={styles.current}>
      <span className={styles.currentIcon}><ShieldCheck size={23}/></span><div><span className={styles.label}>CURRENT OFFICER ON DUTY</span><h2>{current.name}</h2><p>{current.callsign} · {[current.rank, current.specialty].filter(Boolean).join(" · ")}</p><small>On duty since {onDutySince ? new Date(Number(onDutySince)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Loading"}</small></div>
    </section>
    <section className={styles.section}>
      <div className={styles.sectionHeading}><h2>Pass command</h2><p>Choose one of the other crew members. Your command stays active until they confirm.</p></div>
      <div className={styles.memberGrid}>{others.map((member) => <button type="button" key={member.id} onClick={() => { setSelectedId(member.id); setPassword(""); setError(""); }} className={`${styles.member}${selectedId === member.id ? ` ${styles.selected}` : ""}`} aria-pressed={selectedId === member.id}>
        <span className={styles.initials}>{member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span><strong>{member.name}</strong><small>{member.callsign} · {[member.rank, member.specialty].filter(Boolean).join(" · ")}</small></span>{selectedId === member.id && <Check size={19} className={styles.check}/>}
      </button>)}</div>
      {selected && <form className={styles.confirm} onSubmit={passCommand}>
        <div className={styles.confirmCopy}><h3>Confirm handover to {selected.name}</h3><p>Command will transfer only after the password is confirmed.</p><aside><span>DEMO PASSWORD</span><strong>{passwords[selected.callsign]}</strong><small>Demo password: {passwords[selected.callsign]} — shown here because this is a demo.</small></aside></div>
        <div className={styles.passwordArea}><label htmlFor="handover-password">{selected.callsign} password</label><span className={styles.password}><input id="handover-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} type={visible ? "text" : "password"} autoComplete="off"/><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span>{error && <p role="alert" className={styles.error}>{error}</p>}<button type="submit" className={styles.passButton}><ArrowLeftRight size={17}/> Confirm and pass command</button></div>
      </form>}
    </section>
    <section className={styles.section}><div className={styles.sectionHeading}><h2>Command history</h2><p>Recent confirmed handovers on this browser.</p></div>{history.length ? <div className={styles.history}>{history.map((item, index) => <article key={`${item.at}-${index}`}><span className={styles.historyIcon}><ArrowLeftRight size={16}/></span><p>Command passed from <strong>{item.from}</strong> to <strong>{item.to}</strong><time>{new Date(item.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></p></article>)}</div> : <p className={styles.empty}>No command handovers have been recorded.</p>}</section>
    <p className={styles.notice}>This is not real authentication — demo mode. All crew names and records are simulated.</p>
  </main>;
}
