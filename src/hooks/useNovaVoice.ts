"use client";

/**
 * useNovaVoice — central voice hook for all Nova speech in CrewCare.
 *
 * Handles:
 *  - Waiting for the browser voice list to be ready (voiceschanged event)
 *  - Voice and speed preference storage (localStorage)
 *  - Autoplay-with-interaction-fallback
 *  - Mute state
 *  - A single cancel-then-speak pattern used everywhere
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const NOVA_VOICE_KEY = "crewcare_nova_voice_uri";
export const NOVA_SPEED_KEY = "crewcare_nova_speed";

export type NovaSpeed = "slower" | "normal" | "faster";
export const SPEED_RATES: Record<NovaSpeed, number> = { slower: 0.78, normal: 0.95, faster: 1.22 };

/** True only in a browser environment with SpeechSynthesis available. */
export const speechSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

/** Load the preferred voice URI from storage. */
function loadVoiceUri(): string | null {
  try { return localStorage.getItem(NOVA_VOICE_KEY); } catch { return null; }
}
/** Load the preferred speed from storage. */
function loadSpeed(): NovaSpeed {
  try {
    const stored = localStorage.getItem(NOVA_SPEED_KEY) as NovaSpeed | null;
    if (stored && stored in SPEED_RATES) return stored;
  } catch { /* ignore */ }
  return "normal";
}

/**
 * Wait until the browser has loaded its voice list, then resolve with it.
 * On most desktop browsers getVoices() is populated synchronously; on Chrome
 * Android and some mobile browsers the list is empty until "voiceschanged".
 */
export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!speechSupported) { resolve([]); return; }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    const handler = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", handler, { once: true });
    // Fallback: resolve after 2 s even if the event never fires.
    window.setTimeout(() => { window.speechSynthesis.removeEventListener("voiceschanged", handler); resolve(window.speechSynthesis.getVoices()); }, 2000);
  });
}

/** Pick the best available voice given a saved URI preference. */
export function pickVoice(voices: SpeechSynthesisVoice[], preferredUri: string | null): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  if (preferredUri) {
    const saved = voices.find((v) => v.voiceURI === preferredUri);
    if (saved) return saved;
  }
  // Prefer English voices, then fall back to whatever is available.
  const english = voices.filter((v) => /^en/i.test(v.lang));
  return english[0] ?? voices[0] ?? null;
}

export interface NovaVoiceHook {
  /** Speak text. If autoplay is blocked, the text is queued and fires on the
   *  next user interaction. */
  speak: (text: string) => void;
  /** Cancel any current speech. */
  cancel: () => void;
  muted: boolean;
  setMuted: (value: boolean) => void;
  speed: NovaSpeed;
  setSpeed: (value: NovaSpeed) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoiceUri: string | null;
  setVoiceUri: (uri: string) => void;
  /** True while Nova is speaking. */
  speaking: boolean;
  /** True if the device has no SpeechSynthesis at all. */
  unsupported: boolean;
  /** True if autoplay was blocked and we are waiting for a tap. */
  pendingTap: boolean;
}

export function useNovaVoice(): NovaVoiceHook {
  const [muted, setMutedState] = useState(false);
  // These read localStorage — must use a lazy initialiser that only runs on the client.
  const [speed, setSpeedState] = useState<NovaSpeed>(() =>
    typeof window === "undefined" ? "normal" : loadSpeed()
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUriState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : loadVoiceUri()
  );
  const [speaking, setSpeaking] = useState(false);
  const [pendingTap, setPendingTap] = useState(false);
  const unsupported = !speechSupported;

  const mutedRef = useRef(muted);
  const speedRef = useRef(speed);
  const voicesRef = useRef(voices);
  const selectedVoiceUriRef = useRef(selectedVoiceUri);
  const pendingTextRef = useRef<string | null>(null);
  // Track whether voice list is ready.
  const voicesReadyRef = useRef(false);

  // Keep refs in sync.
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { voicesRef.current = voices; }, [voices]);
  useEffect(() => { selectedVoiceUriRef.current = selectedVoiceUri; }, [selectedVoiceUri]);

  // Load voice list once on mount, waiting for voiceschanged if needed.
  useEffect(() => {
    if (!speechSupported) return;
    waitForVoices().then((loaded) => {
      voicesReadyRef.current = true;
      setVoices(loaded);
      voicesRef.current = loaded;
      // If a speak was attempted before voices loaded, fire it now.
      if (pendingTextRef.current && !mutedRef.current) {
        const queued = pendingTextRef.current;
        pendingTextRef.current = null;
        doSpeak(queued);
      }
    });
    // Also refresh if the browser reloads voices later.
    const onVoicesChanged = () => {
      const updated = window.speechSynthesis.getVoices();
      if (updated.length) { setVoices(updated); voicesRef.current = updated; }
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-shot interaction listener that fires pending speech when autoplay was blocked.
  useEffect(() => {
    if (!pendingTap) return;
    const fire = () => {
      setPendingTap(false);
      const queued = pendingTextRef.current;
      if (queued && !mutedRef.current) {
        pendingTextRef.current = null;
        doSpeak(queued);
      }
    };
    window.addEventListener("pointerdown", fire, { once: true });
    window.addEventListener("keydown", fire, { once: true });
    return () => {
      window.removeEventListener("pointerdown", fire);
      window.removeEventListener("keydown", fire);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTap]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
      clearKeepAlive();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chrome Android silently stops synthesis after ~15s.
  // A periodic resume() call prevents this.
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current != null) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);
  const startKeepAlive = useCallback(() => {
    clearKeepAlive();
    keepAliveRef.current = setInterval(() => {
      if (speechSupported && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearKeepAlive();
      }
    }, 10000);
  }, [clearKeepAlive]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doSpeak = useCallback((text: string) => {
    if (!speechSupported) return;
    if (mutedRef.current) return;

    // If voices not ready yet, queue and wait.
    if (!voicesReadyRef.current || voicesRef.current.length === 0) {
      pendingTextRef.current = text;
      return;
    }

    clearKeepAlive();
    window.speechSynthesis.cancel();
    // A short gap is required on Chrome — calling speak() in the same tick
    // after cancel() silently drops the new utterance.
    // Also resume() first in case synthesis is in a paused/stuck state.
    window.setTimeout(() => {
      try { window.speechSynthesis.resume(); } catch { /* ignore */ }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = SPEED_RATES[speedRef.current];
      utterance.pitch = 1.03;

      const voice = pickVoice(voicesRef.current, selectedVoiceUriRef.current);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => { setSpeaking(true); startKeepAlive(); };
      utterance.onend = () => { setSpeaking(false); clearKeepAlive(); };
      utterance.onerror = (ev) => {
        setSpeaking(false);
        clearKeepAlive();
        if (ev.error === "not-allowed" || ev.error === "interrupted") {
          // Autoplay blocked — queue and wait for tap.
          pendingTextRef.current = text;
          setPendingTap(true);
        }
      };

      window.speechSynthesis.speak(utterance);
    }, 50);
  }, []);

  const speak = useCallback((text: string) => {
    if (unsupported) return;
    if (mutedRef.current) return;
    doSpeak(text);
  }, [doSpeak, unsupported]);

  const cancel = useCallback(() => {
    if (speechSupported) window.speechSynthesis.cancel();
    clearKeepAlive();
    setSpeaking(false);
    setPendingTap(false);
    pendingTextRef.current = null;
  }, [clearKeepAlive]);

  const setMuted = useCallback((value: boolean) => {
    mutedRef.current = value;
    setMutedState(value);
    if (value) {
      if (speechSupported) window.speechSynthesis.cancel();
      clearKeepAlive();
      setSpeaking(false);
      setPendingTap(false);
      pendingTextRef.current = null;
    }
  }, [clearKeepAlive]);

  const setSpeed = useCallback((value: NovaSpeed) => {
    speedRef.current = value;
    setSpeedState(value);
    try { localStorage.setItem(NOVA_SPEED_KEY, value); } catch { /* ignore */ }
  }, []);

  const setVoiceUri = useCallback((uri: string) => {
    selectedVoiceUriRef.current = uri;
    setSelectedVoiceUriState(uri);
    try { localStorage.setItem(NOVA_VOICE_KEY, uri); } catch { /* ignore */ }
  }, []);

  return { speak, cancel, muted, setMuted, speed, setSpeed, voices, selectedVoiceUri, setVoiceUri, speaking, unsupported, pendingTap };
}
