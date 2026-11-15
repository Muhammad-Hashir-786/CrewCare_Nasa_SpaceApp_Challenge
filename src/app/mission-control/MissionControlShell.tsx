"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import type { Astronaut } from "@/types";
import styles from "./access.module.css";

const OFFICER_SESSION_KEY = "crewcare_mission_officer_session";
const DUTY_OFFICER_KEY = "crewcare_mission_officer_duty_v2";

export function MissionControlShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [officer, setOfficer] = useState<Astronaut | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const isLoginPage = pathname === "/mission-control/login";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.removeItem("crewcare_mission_officer");
      const knownDuty = window.localStorage.getItem(DUTY_OFFICER_KEY);
      const duty = DEMO_ASTRONAUTS.find((member) => member.id === knownDuty) ?? DEMO_ASTRONAUTS[0];
      if (!knownDuty) window.localStorage.setItem(DUTY_OFFICER_KEY, duty.id);
      const id = window.sessionStorage.getItem(OFFICER_SESSION_KEY);
      if (id && id !== duty.id) window.sessionStorage.removeItem(OFFICER_SESSION_KEY);
      const active = id === duty.id ? duty : null;
      setOfficer(active);
      const notice = window.sessionStorage.getItem("crewcare_mission_action_notice");
      if (notice) { setActionNotice(notice); window.sessionStorage.removeItem("crewcare_mission_action_notice"); }
      setReady(true);
    }, 0);
    const refreshOfficer = () => setOfficer(DEMO_ASTRONAUTS.find((member) => member.id === window.sessionStorage.getItem(OFFICER_SESSION_KEY)) ?? null);
    window.addEventListener("crewcare-mission-officer-change", refreshOfficer);
    return () => { window.clearTimeout(timer); window.removeEventListener("crewcare-mission-officer-change", refreshOfficer); };
  }, []);

  useEffect(() => {
    if (!ready || officer || isLoginPage) return;
    router.replace("/mission-control/login");
  }, [ready, officer, isLoginPage, router]);

  const signOut = () => {
    window.sessionStorage.removeItem(OFFICER_SESSION_KEY);
    setOfficer(null);
    router.replace("/mission-control/login");
  };

  if (!ready) return <main className={styles.loading}><span className={styles.loadingMark}/>Checking officer access…</main>;
  if (isLoginPage) return <>{children}</>;
  if (!officer) {
    return <main className={styles.loading}><span className={styles.loadingMark}/>Opening officer access…</main>;
  }

  return <div className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <Topbar
      astronautName={`On duty: ${officer.name}`}
      astronautRole={[officer.rank, officer.specialty].filter(Boolean).join(" · ") || "Mission officer"}
      astronautInitials={officer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
      profileHref="/mission-control/command"
      onSignOut={signOut}
    />
    <Sidebar mode="mission-control"/>
    <main className="page-shell">{actionNotice && <div className={styles.actionNotice} role="status" aria-live="polite"><span>{actionNotice}</span><button type="button" aria-label="Dismiss confirmation" onClick={() => setActionNotice("")}>×</button></div>}{children}</main>
  </div>;
}
