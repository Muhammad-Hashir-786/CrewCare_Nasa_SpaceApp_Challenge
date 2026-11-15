"use client";

import Link from "next/link";
import { Activity, ArrowRight, ChevronRight, Droplets, Heart, Moon, Shield, Sparkles, Thermometer, Zap } from "lucide-react";
import { VitalsChart } from "@/components/charts/VitalsChart";
import { useAstronaut } from "@/lib/astronaut-context";
import styles from "./dashboard.module.css";

function statusClass(status?: string) {
  if (status === "GREEN") return "status-green";
  if (status === "AMBER") return "status-amber";
  if (status === "RED") return "status-red";
  return "";
}

function vitStatus(value: number | null | undefined, minimum?: number, maximum?: number) {
  if (value == null) return { label: "No data", good: false };
  if ((minimum !== undefined && value < minimum) || (maximum !== undefined && value > maximum)) return { label: "Needs attention", good: false };
  return { label: "Within baseline", good: true };
}

export default function AstronautDashboard() {
  const { astronaut } = useAstronaut();
  const records = astronaut.healthRecords ?? [];
  const latest = records[records.length - 1];
  const assessment = astronaut.latestAssessment;
  const alerts = astronaut.activeAlerts ?? [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const vitals = [
    { key: "heart", label: "Heart rate", value: latest?.heartRate?.toFixed(0) ?? "—", unit: "BPM", icon: Heart, state: vitStatus(latest?.heartRate, 50, 100) },
    { key: "oxygen", label: "Oxygen", value: latest?.oxygenSat?.toFixed(0) ?? "—", unit: "%", icon: Activity, state: vitStatus(latest?.oxygenSat, 95) },
    { key: "sleep", label: "Last sleep", value: latest?.sleepDuration != null ? `${Math.floor(latest.sleepDuration)}h ${Math.round((latest.sleepDuration % 1) * 60)}m` : "—", unit: "", icon: Moon, state: vitStatus(latest?.sleepDuration, 6) },
    { key: "temperature", label: "Temperature", value: latest?.bodyTemp?.toFixed(1) ?? "—", unit: "°C", icon: Thermometer, state: vitStatus(latest?.bodyTemp, 36.1, 37.2) },
  ];
  const readiness = assessment?.status === "GREEN" ? "92" : assessment?.status === "AMBER" ? "71" : "55";
  const readinessLabel = assessment?.status === "GREEN" ? "Mission ready" : assessment?.status === "AMBER" ? "Monitor closely" : "Attention needed";
  const chartMetrics = [
    { metric: "heartRate" as const, label: "Heart rate", unit: "BPM", color: "#08784f", warnMax: 100 },
    { metric: "oxygenSat" as const, label: "SpO₂", unit: "%", color: "#08784f", warnMin: 95 },
    { metric: "systolicBP" as const, label: "Systolic blood pressure", unit: "mmHg", color: "#08784f", warnMax: 130 },
    { metric: "sleepDuration" as const, label: "Sleep", unit: "hours", color: "#08784f", warnMin: 6 },
  ];
  const actions = [
    { href: "/astronaut/history", label: "View health history", description: "Review your previous check-ins.", Icon: Activity },
    { href: "/astronaut/learn", label: "Health education", description: "Explore mission health guidance.", Icon: Zap },
    { href: "/mission-control", label: "Mission Control view", description: "See the wider crew picture.", Icon: Droplets },
  ];

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.missionDate}>HORIZON-7 · MISSION DAY</p>
          <h1>{greeting}, {astronaut.name.split(" ")[1]}.</h1>
          <p className={styles.crewLine}>{astronaut.callsign} · {astronaut.rank} · {astronaut.specialty}</p>
          <span className={styles.simulatedTag}><span /> Simulated demo data</span>
        </div>
        <Link href="/select" className={styles.switchCrew}>Switch crew member <ChevronRight size={17} /></Link>
      </header>

      <section className={styles.section} aria-labelledby="vitals-title">
        <div className={styles.sectionHeading}>
          <div><span className={styles.sectionKicker}>TODAY&apos;S READINGS</span><h2 id="vitals-title">Your vitals</h2><p className={styles.dataNote}>Simulated data for today, Saturday 14 November 2026 — no sensor data is connected.</p></div>
        </div>
        <p className={styles.sectionDescription}>A snapshot of your latest recorded health measurements.</p>
        <div className={styles.vitalsGrid}>
          {vitals.map(({ key, label, value, unit, icon: Icon, state }) => <article className={styles.vitalCard} key={key}>
            <span className={styles.vitalIcon}><Icon size={21} strokeWidth={1.8} /></span>
            <span className={styles.vitalLabel}>{label}</span>
            <strong className={styles.vitalValue}>{value}{unit && <small>{unit}</small>}</strong>
            <span className={`${styles.vitalState} ${state.good ? styles.good : styles.review}`}><i />{state.label}</span>
          </article>)}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="assessment-title">
        <div className={styles.sectionHeading}><div><span className={styles.sectionKicker}>MOST RECENT REVIEW</span><h2 id="assessment-title">Latest assessment</h2></div></div>
        <p className={styles.sectionDescription}>Your latest health summary and its suggested next steps.</p>
        {assessment ? <article className={`${styles.assessmentCard} ${styles[`assessment${assessment.status}`]}`}>
          <div className={styles.assessmentHeader}><span className={`status-badge ${statusClass(assessment.status)}`}><i />{assessment.status}</span><span>Latest assessment · {new Date(assessment.createdAt).toISOString().slice(0, 10)}</span></div>
          <h3>{assessment.summary}</h3>
          {assessment.guidance && <p className={styles.guidance}><strong>Guidance</strong>{assessment.guidance}</p>}
          {assessment.flags.length > 0 && <div className={styles.flags}>{assessment.flags.map((flag) => <span key={flag}>{flag.replace(/_/g, " ")}</span>)}</div>}
          {latest?.symptoms && <p className={styles.symptoms}><strong>Reported symptoms</strong>{latest.symptoms}</p>}
          {alerts.length > 0 && <div className={styles.alerts}><strong>Active alerts</strong>{alerts.map((alert) => <div key={alert.id}><span>{alert.severity}</span><b>{alert.title}</b><p>{alert.message}</p></div>)}</div>}
        </article> : <article className={styles.assessmentCard}><h3>No assessment recorded yet</h3><p className={styles.guidance}>Complete a daily check-in to see your latest assessment here.</p></article>}
      </section>

      <section className={styles.section} aria-labelledby="trends-title">
        <div className={styles.sectionHeading}><div><span className={styles.sectionKicker}>HEALTH HISTORY</span><h2 id="trends-title">Your trends</h2></div></div>
        <p className={styles.sectionDescription}>Follow changes across your recorded check-ins from 18 October to 14 November.</p>
        <div className={styles.trendsGrid}>
          {chartMetrics.map((chart) => <article className={styles.chartCard} key={chart.metric}><VitalsChart records={records} {...chart} height={220} axisLabelColor="#b9cbc7" axisLabelFontSize={12} /></article>)}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="overview-title">
        <div className={styles.sectionHeading}><div><span className={styles.sectionKicker}>PERSONAL BASELINE</span><h2 id="overview-title">Health overview</h2></div></div>
        <p className={styles.sectionDescription}>A simple summary of your current readiness across health indicators.</p>
        <article className={styles.overviewCard}>
          <div className={styles.readinessRing}><div><strong>{readiness}</strong><span>/100</span></div></div>
          <div className={styles.readinessCopy}><span className={styles.sectionKicker}>READINESS</span><h3>{readinessLabel}</h3><p>{assessment?.flags.length ? `${assessment.flags.length} flag(s) active` : "Stable across indicators"}</p></div>
          <div className={styles.recoveryTrack} aria-label="Recovery status"><span /><span /><span className={styles.recoveryCurrent} /><span /></div>
          <div className={styles.recoveryLabels}><span>Recovery</span><strong>Strong</strong></div>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="checkin-title">
        <div className={styles.sectionHeading}><div><span className={styles.sectionKicker}>TWO MINUTES</span><h2 id="checkin-title">Daily Check-In</h2></div></div>
        <article className={styles.checkinCard}>
          <span className={styles.checkinIcon}><Sparkles size={22} /></span>
          <div><h3>How did you sleep?</h3><p>A short check-in helps track your recovery.</p></div>
          <Link href="/astronaut/checkin" className={styles.checkinButton}>Start today&apos;s check-in <ArrowRight size={19} /></Link>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="actions-title">
        <div className={styles.sectionHeading}><div><span className={styles.sectionKicker}>SUPPORTING TOOLS</span><h2 id="actions-title">Quick actions</h2></div></div>
        <p className={styles.sectionDescription}>Open a tool for more detail or support.</p>
        <div className={styles.actionsGrid}>
          {actions.map(({ href, label, description, Icon }) => <Link key={href} href={href} className={styles.actionCard}><span><Icon size={21} /></span><div><h3>{label}</h3><p>{description}</p></div><ChevronRight size={20} /></Link>)}
        </div>
      </section>

      <aside className={styles.safetyNote}><Shield size={20} /><p><strong>CrewCare is not a medical device and does not replace qualified medical support.</strong> This simulated demonstration uses illustrative thresholds and fictional health data.</p></aside>
    </div>
  );
}
