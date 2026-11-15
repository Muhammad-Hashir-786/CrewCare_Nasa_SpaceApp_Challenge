"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import styles from "./CrewCareWelcome.module.css";

let welcomeHasPlayed = false;

const welcomeLine = "Welcome to CrewCare, your astronaut health care system. Hello, I'm Nova — I'll look after your health out here.";
const helloLine = "Hello! Ready when you are.";

export function CrewCareWelcome() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [waving, setWaving] = useState(false);
  const [greeting, setGreeting] = useState(welcomeLine);
  const [speechUnavailable, setSpeechUnavailable] = useState(false);
  const timers = useRef<number[]>([]);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const start = window.setTimeout(() => {
      if (cancelled || welcomeHasPlayed) return;
      welcomeHasPlayed = true;
      setVisible(true);

      if ("speechSynthesis" in window && !muted) {
        const utterance = new SpeechSynthesisUtterance(welcomeLine);
        utterance.rate = 0.96;
        utterance.pitch = 1.03;
        utterance.onerror = () => setSpeechUnavailable(true);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeechUnavailable(true);
      }

      timers.current.push(window.setTimeout(() => setLeaving(true), 3550));
      timers.current.push(window.setTimeout(() => setVisible(false), 4050));
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
    // The entry greeting is intentionally a one-time event for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scene = sceneRef.current;
    const focusable = () => scene ? Array.from(scene.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')) : [];
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLeaving(true);
        window.speechSynthesis?.cancel();
        timers.current.forEach(window.clearTimeout);
        timers.current = [window.setTimeout(() => setVisible(false), 420)];
        return;
      }
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) { event.preventDefault(); scene?.focus(); return; }
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [visible]);

  const dismiss = (stopSpeech = true) => {
    setLeaving(true);
    if (stopSpeech && "speechSynthesis" in window) window.speechSynthesis.cancel();
    timers.current.forEach(window.clearTimeout);
    timers.current = [window.setTimeout(() => setVisible(false), 420)];
  };

  const speak = (text: string) => {
    setGreeting(text);
    setWaving(true);
    window.setTimeout(() => setWaving(false), 900);
    if (!("speechSynthesis" in window) || muted) {
      setSpeechUnavailable(true);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1.04;
    utterance.onerror = () => setSpeechUnavailable(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!visible) return null;

  return <div ref={sceneRef} tabIndex={-1} className={`${styles.scene} ${leaving ? styles.leaving : ""}`} role="dialog" aria-modal="true" aria-label="Welcome to CrewCare" onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
    <div className={styles.stars} aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--x": `${(index * 47 + 9) % 100}%`, "--y": `${(index * 31 + 13) % 100}%`, "--delay": `${(index % 7) * -0.8}s`, "--duration": `${7 + index % 5}s` } as CSSProperties}/>) }
    </div>
    <div className={styles.content}>
      <div className={styles.eyebrow}><span/> CREWCARE · MISSION HEALTH</div>
      <button className={`${styles.agent} ${waving ? styles.waving : ""}`} onClick={() => speak(helloLine)} aria-label="Nova says hello">
        <span className={`${styles.ring} ${styles.ringOne}`}/><span className={`${styles.ring} ${styles.ringTwo}`}/>
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <circle cx="70" cy="76" r="43" className={styles.face}/>
          <path d="M40 55q3-24 30-24t30 24" className={styles.cap}/><path d="M59 32v-9h22v9" className={styles.cap}/>
          <path d="M70 22v18m-8-9h16" className={styles.cross}/>
          <circle cx="55" cy="75" r="3.5" className={styles.eye}/><circle cx="85" cy="75" r="3.5" className={styles.eye}/>
          <path d="M58 90q12 11 24 0" className={styles.smile}/>
          <path d="M33 78v17q0 15 15 15h7m29 0h6q14 0 14-15V96" className={styles.stethoscope}/>
          <circle cx="59" cy="111" r="7" className={styles.stethoscopeHead}/>
          <path d="M103 52q13 4 16 15" className={styles.wave}/>
        </svg>
        {waving && <span className={styles.waveLabel}>Hi!</span>}
      </button>
      <p className={styles.agentName}>NOVA <span>· YOUR CREWCARE GUIDE</span></p>
      <div className={styles.copy} aria-live="polite">
        <h1><span>Welcome to CrewCare</span><span>Your Astronaut Health Care System</span></h1>
        <p>Your health, watched over — wherever you are in space.</p>
      </div>
      <div className={styles.greeting} aria-live="polite">{greeting}</div>
      <p className={styles.tapHint}>Tap Nova to hear her greeting again.</p>
      <div className={styles.actions}>
        <button className={styles.enter} onClick={() => dismiss()}><span>Enter CrewCare</span><ArrowRight size={18}/></button>
        <button className={styles.skip} onClick={() => dismiss()}>Skip intro</button>
        <button className={styles.mute} onClick={() => {
          if (!muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
          setMuted((value) => !value);
        }} aria-label={muted ? "Unmute Nova" : "Mute Nova"} title={muted ? "Unmute Nova" : "Mute Nova"}>
          {muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}<span>{muted ? "Unmute" : "Mute Nova"}</span>
        </button>
      </div>
      {speechUnavailable && <p className={styles.speechNote}>Sound is unavailable right now. Tap Nova to hear her greeting.</p>}
    </div>
  </div>;
}
