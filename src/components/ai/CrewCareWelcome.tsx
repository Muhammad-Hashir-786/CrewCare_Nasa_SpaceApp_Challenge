"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Settings, VolumeX, Volume2 } from "lucide-react";
import styles from "./CrewCareWelcome.module.css";
import { useNovaVoice } from "@/hooks/useNovaVoice";
import { NovaVoicePicker } from "@/components/ui/NovaVoicePicker";

const welcomeLine =
  "Welcome to CrewCare, your astronaut health care system. Hello, I'm Nova — I'll look after your health out here.";
const helloLine = "Hello! Ready when you are.";

export function CrewCareWelcome() {
  const router = useRouter();
  const nova = useNovaVoice();
  const [waving, setWaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [mounted, setMounted] = useState(false);
  const spokRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    // Try autoplay immediately. On desktop with voices already loaded this fires at once.
    // On mobile / first load the browser blocks it — pendingTap becomes true
    // and the hook fires speech the instant the user touches anything.
    nova.speak(welcomeLine);
    return () => { nova.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speak the welcome the moment the user interacts with any part of this page
  // (covers mobile where autoplay is always blocked).
  const ensureSpoken = () => {
    if (spokRef.current) return;
    if (nova.speaking) { spokRef.current = true; return; }
    spokRef.current = true;
    nova.speak(welcomeLine);
  };

  const dismiss = () => {
    nova.cancel();
    router.push("/home");
  };

  const handleNovaTap = () => {
    setWaving(true);
    spokRef.current = true;
    window.setTimeout(() => setWaving(false), 900);
    nova.speak(welcomeLine);
  };

  const toggleMute = () => nova.setMuted(!nova.muted);

  return (
    <div
      className={styles.scene}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to CrewCare"
      onClick={ensureSpoken}
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

        <p className={styles.tapHint}>Tap Nova to hear her greeting.</p>

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
            aria-label={nova.muted ? "Unmute Nova" : "Mute Nova"}
            title={nova.muted ? "Unmute Nova" : "Mute Nova"}
          >
            {nova.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span>{nova.muted ? "Unmute" : "Mute Nova"}</span>
          </button>
          <button
            className={styles.mute}
            onClick={() => setShowPicker((v) => !v)}
            aria-label="Voice settings"
            title="Voice settings"
          >
            <Settings size={17} />
            <span>Voice</span>
          </button>
        </div>

        {mounted && nova.pendingTap && !nova.muted && !nova.speaking && (
          <p className={styles.speechNote}>
            👆 Tap Nova to hear the greeting.
          </p>
        )}
        {mounted && nova.unsupported && (
          <p className={styles.speechNote}>
            No voice available on this device.
          </p>
        )}

        {showPicker && (
          <div className={styles.pickerPanel}>
            <NovaVoicePicker
              voices={nova.voices}
              selectedVoiceUri={nova.selectedVoiceUri}
              speed={nova.speed}
              onVoiceChange={(uri) => { nova.setVoiceUri(uri); nova.speak(helloLine); }}
              onSpeedChange={nova.setSpeed}
            />
          </div>
        )}
      </div>
    </div>
  );
}
