"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import styles from "./CrewCareWelcome.module.css";

const welcomeLine =
  "Welcome to CrewCare, your astronaut health care system. Hello, I'm Nova — I'll look after your health out here.";
const helloLine = "Hello! Ready when you are.";

const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export function CrewCareWelcome() {
  const router = useRouter();
  const [muted, setMuted] = useState(false);
  const [waving, setWaving] = useState(false);
  const [greeting, setGreeting] = useState(welcomeLine);
  // Only show the speech-unavailable note if the API is genuinely absent.
  const [speechMissing, setSpeechMissing] = useState(false);
  const pendingAutoplayRef = useRef(false);
  const hasSpokenRef = useRef(false);

  const speakText = useCallback(
    (text: string, isAutoplay = false) => {
      if (!speechSupported) {
        setSpeechMissing(true);
        return;
      }
      if (muted) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1.03;
      // SpeechSynthesis on some browsers returns an error for autoplay before
      // interaction. We catch it and arm a one-shot click listener instead.
      utterance.onerror = (ev) => {
        if (isAutoplay && (ev.error === "not-allowed" || ev.error === "interrupted")) {
          pendingAutoplayRef.current = true;
        }
      };
      window.speechSynthesis.speak(utterance);
    },
    [muted]
  );

  // Attempt autoplay on mount.
  useEffect(() => {
    if (muted) return;
    hasSpokenRef.current = false;
    // Small timeout lets the page paint first so the browser is more likely
    // to allow speech (some browsers block before first paint).
    const id = window.setTimeout(() => {
      speakText(welcomeLine, true);
    }, 120);
    return () => window.clearTimeout(id);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback: if autoplay was blocked, speak on first user interaction.
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (pendingAutoplayRef.current && !hasSpokenRef.current && !muted) {
        pendingAutoplayRef.current = false;
        hasSpokenRef.current = true;
        speakText(welcomeLine);
      }
    };
    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [muted, speakText]);

  const dismiss = useCallback(() => {
    if (speechSupported) window.speechSynthesis.cancel();
    router.push("/home");
  }, [router]);

  const handleNovaTap = () => {
    setGreeting(welcomeLine);
    setWaving(true);
    window.setTimeout(() => setWaving(false), 900);
    speakText(helloLine);
  };

  const toggleMute = () => {
    if (!muted && speechSupported) window.speechSynthesis.cancel();
    setMuted((v) => !v);
  };

  return (
    <div
      className={styles.scene}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to CrewCare"
    >
      <div className={styles.stars} aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i
            key={index}
            style={{
              "--x": `${(index * 47 + 9) % 100}%`,
              "--y": `${(index * 31 + 13) % 100}%`,
              "--delay": `${(index % 7) * -0.8}s`,
              "--duration": `${7 + (index % 5)}s`,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className={styles.content}>
        <div className={styles.eyebrow}>
          <span /> CREWCARE · MISSION HEALTH
        </div>

        <button
          className={`${styles.agent} ${waving ? styles.waving : ""}`}
          onClick={handleNovaTap}
          aria-label="Nova says hello"
        >
          <span className={`${styles.ring} ${styles.ringOne}`} />
          <span className={`${styles.ring} ${styles.ringTwo}`} />
          <svg viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="76" r="43" className={styles.face} />
            <path d="M40 55q3-24 30-24t30 24" className={styles.cap} />
            <path d="M59 32v-9h22v9" className={styles.cap} />
            <path d="M70 22v18m-8-9h16" className={styles.cross} />
            <circle cx="55" cy="75" r="3.5" className={styles.eye} />
            <circle cx="85" cy="75" r="3.5" className={styles.eye} />
            <path d="M58 90q12 11 24 0" className={styles.smile} />
            <path
              d="M33 78v17q0 15 15 15h7m29 0h6q14 0 14-15V96"
              className={styles.stethoscope}
            />
            <circle cx="59" cy="111" r="7" className={styles.stethoscopeHead} />
            <path d="M103 52q13 4 16 15" className={styles.wave} />
          </svg>
          {waving && <span className={styles.waveLabel}>Hi!</span>}
        </button>

        <div className={styles.copy} aria-live="polite">
          <h1>
            <span>Welcome to CrewCare</span>
            <span>Your Astronaut Health Care System</span>
          </h1>
        </div>

        <div className={styles.greeting} aria-live="polite">
          {greeting}
        </div>

        <p className={styles.tapHint}>Tap Nova to hear her greeting again.</p>

        <div className={styles.actions}>
          <button className={styles.enter} onClick={dismiss}>
            <span>Enter CrewCare</span>
            <ArrowRight size={18} />
          </button>
          <button className={styles.skip} onClick={dismiss}>
            Skip intro
          </button>
          <button
            className={styles.mute}
            onClick={toggleMute}
            aria-label={muted ? "Unmute Nova" : "Mute Nova"}
            title={muted ? "Unmute Nova" : "Mute Nova"}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span>{muted ? "Unmute" : "Mute Nova"}</span>
          </button>
        </div>

        {speechMissing && (
          <p className={styles.speechNote}>
            Sound is unavailable right now. Tap Nova to hear her greeting.
          </p>
        )}
      </div>
    </div>
  );
}
