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
 *  - Chrome/Windows speech bugs: utterances kept alive, cancel separated from speak,
 *    and a one-time retry when the engine aborts the first chunk
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const NOVA_VOICE_KEY = "crewcare_nova_voice_uri";
export const NOVA_SPEED_KEY = "crewcare_nova_speed";

export type NovaSpeed = "slower" | "normal" | "faster";
export const SPEED_RATES: Record<NovaSpeed, number> = { slower: 0.78, normal: 0.95, faster: 1.22 };

/** True only in a browser environment with SpeechSynthesis available. */
export const speechSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

function loadVoiceUri(): string | null {
  try { return localStorage.getItem(NOVA_VOICE_KEY); } catch { return null; }
}
function loadSpeed(): NovaSpeed {
  try {
    const stored = localStorage.getItem(NOVA_SPEED_KEY) as NovaSpeed | null;
    if (stored && stored in SPEED_RATES) return stored;
  } catch { /* ignore */ }
  return "normal";
}

export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!speechSupported) { resolve([]); return; }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    const handler = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", handler, { once: true });
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    }, 2000);
  });
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  preferredUri: string | null,
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  if (preferredUri) {
    const saved = voices.find((v) => v.voiceURI === preferredUri);
    if (saved) return saved;
  }
  const english = voices.filter((v) => /^en/i.test(v.lang));
  return english[0] ?? voices[0] ?? null;
}

/**
 * Chrome on Windows drops an utterance that JavaScript no longer references,
 * and it aborts speech when cancel(), resume(), and speak() run in one turn.
 * One generation token makes a newer request ignore events from the old one.
 */
let speechGeneration = 0;
let retainedUtterance: SpeechSynthesisUtterance | null = null;
let lastSpeechCancelAt = 0;
let speechKeepAlive: ReturnType<typeof setInterval> | null = null;

function stopSpeechKeepAlive() {
  if (speechKeepAlive != null) {
    clearInterval(speechKeepAlive);
    speechKeepAlive = null;
  }
}

function startSpeechKeepAlive(generation: number) {
  stopSpeechKeepAlive();
  // Chrome drops speech after about 15 seconds unless resume() is called.
  // pause() is intentionally not used: on Windows it aborts the utterance.
  speechKeepAlive = setInterval(() => {
    if (generation !== speechGeneration || !speechSupported) {
      stopSpeechKeepAlive();
      return;
    }
    if (!window.speechSynthesis.speaking) return;
    try { window.speechSynthesis.resume(); } catch { /* ignore */ }
  }, 10000);
}

const MAX_CHUNK_CHARS = 140;

function splitLongChunk(chunk: string): string[] {
  if (chunk.length <= MAX_CHUNK_CHARS) return [chunk];
  const parts: string[] = [];
  let rest = chunk;
  while (rest.length > MAX_CHUNK_CHARS) {
    let cut = rest.lastIndexOf(" ", MAX_CHUNK_CHARS);
    if (cut < 40) cut = MAX_CHUNK_CHARS;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export function chunkSpeech(text: string): string[] {
  const rawChunks = text.split(/([.!?])\s+/).reduce<string[]>((acc, part, i, arr) => {
    if (i % 2 === 0) {
      const delimiter = arr[i + 1] ?? "";
      const sentence = (part + delimiter).trim();
      if (!sentence) return acc;
      const last = acc[acc.length - 1] ?? "";
      if (last.length + sentence.length < MAX_CHUNK_CHARS) {
        acc[acc.length > 0 ? acc.length - 1 : 0] = last ? `${last} ${sentence}` : sentence;
      } else {
        acc.push(sentence);
      }
    }
    return acc;
  }, []);
  return rawChunks.flatMap((chunk) => splitLongChunk(chunk.trim())).filter(Boolean);
}

export function cancelNovaSpeech(): void {
  speechGeneration += 1;
  retainedUtterance = null;
  stopSpeechKeepAlive();
  lastSpeechCancelAt = Date.now();
  if (!speechSupported) return;
  // Do not resume() here. On Windows, resume() in the same turn as cancel()
  // makes the next utterance play one syllable and then stop.
  window.speechSynthesis.cancel();
}

export function speakNova(
  text: string,
  options: {
    voice?: SpeechSynthesisVoice | null;
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onBlocked?: () => void;
  } = {},
): void {
  if (!speechSupported) return;
  const chunks = chunkSpeech(text);
  if (!chunks.length) return;

  const synth = window.speechSynthesis;
  // Bump the generation before cancel so the old utterance's events are ignored.
  const generation = ++speechGeneration;
  retainedUtterance = null;
  stopSpeechKeepAlive();
  if (synth.speaking || synth.pending) {
    lastSpeechCancelAt = Date.now();
    synth.cancel();
  }

  let idx = 0;
  let retried = false;
  let announced = false;
  const finish = () => {
    if (generation !== speechGeneration) return;
    stopSpeechKeepAlive();
    retainedUtterance = null;
    options.onEnd?.();
  };
  const speakNext = () => {
    if (generation !== speechGeneration) return;
    if (idx >= chunks.length) { finish(); return; }
    const chunk = chunks[idx++];
    if (!chunk) { speakNext(); return; }

    const utterance = new SpeechSynthesisUtterance(chunk);
    // Keep the object referenced for the whole playback. Chrome otherwise
    // garbage-collects it and the voice stops after the first syllable.
    retainedUtterance = utterance;
    utterance.rate = options.rate ?? SPEED_RATES.normal;
    utterance.pitch = 1.03;
    if (options.voice) utterance.voice = options.voice;

    let settled = false;
    let heardStart = false;
    utterance.onstart = () => {
      if (generation !== speechGeneration) return;
      heardStart = true;
      if (!announced) {
        announced = true;
        options.onStart?.();
        startSpeechKeepAlive(generation);
      }
    };
    utterance.onend = () => {
      if (settled || generation !== speechGeneration) return;
      settled = true;
      // speak() inside onend is dropped by Chrome. Start the next chunk on a later turn.
      window.setTimeout(speakNext, 50);
    };
    utterance.onerror = (ev) => {
      if (settled || generation !== speechGeneration) return;
      settled = true;
      if (ev.error === "not-allowed") {
        stopSpeechKeepAlive();
        retainedUtterance = null;
        options.onBlocked?.();
        return;
      }
      // A cancel from the previous request can land on this new utterance.
      // Replay the chunk once, after the engine has actually settled.
      if ((ev.error === "interrupted" || ev.error === "canceled") && !retried) {
        retried = true;
        idx -= 1;
        lastSpeechCancelAt = Date.now();
        window.setTimeout(speakNext, 250);
        return;
      }
      finish();
    };
    window.speechSynthesis.speak(utterance);
    window.setTimeout(() => {
      if (settled || heardStart || generation !== speechGeneration) return;
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
      if (!retried) {
        retried = true;
        idx -= 1;
        lastSpeechCancelAt = Date.now();
        window.setTimeout(speakNext, 250);
        return;
      }
      finish();
    }, 700);
  };

  // Selecting an emergency cancels the welcome line first. Speaking in that
  // same window makes Windows Chrome play the first syllable and stop.
  const sinceCancel = Date.now() - lastSpeechCancelAt;
  const delay = sinceCancel < 250 ? 250 - sinceCancel : 0;
  window.setTimeout(speakNext, delay);
}

export interface NovaVoiceHook {
  /** Speak text. Queued if voices not ready or autoplay blocked; fires on first tap. */
  speak: (text: string) => void;
  /** Cancel any current speech immediately. */
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
  // Lazy initialisers — only run on the client, never on the server.
  const [speed, setSpeedState] = useState<NovaSpeed>(() =>
    typeof window === "undefined" ? "normal" : loadSpeed(),
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUriState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : loadVoiceUri(),
  );
  const [speaking, setSpeaking] = useState(false);
  const [pendingTap, setPendingTap] = useState(false);
  const unsupported = !speechSupported;

  // All mutable state that rawSpeak needs lives in refs — the function never goes stale.
  const mutedRef = useRef(muted);
  const speedRef = useRef(speed);
  const voicesRef = useRef(voices);
  const selectedVoiceUriRef = useRef(selectedVoiceUri);
  const pendingTextRef = useRef<string | null>(null);
  const voicesReadyRef = useRef(false);
  // Once the user has tapped or pressed anything, autoplay is always allowed.
  const userInteractedRef = useRef(false);

  // Keep refs in sync with state.
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { voicesRef.current = voices; }, [voices]);
  useEffect(() => { selectedVoiceUriRef.current = selectedVoiceUri; }, [selectedVoiceUri]);

  // Track first user interaction globally.
  // After this fires, speak() calls rawSpeak() directly without queuing.
  useEffect(() => {
    if (!speechSupported) return;
    const mark = () => { userInteractedRef.current = true; };
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);

  // Load the voice list on mount; wait for voiceschanged on browsers that load it async.
  useEffect(() => {
    if (!speechSupported) return;
    waitForVoices().then((loaded) => {
      voicesReadyRef.current = true;
      setVoices(loaded);
      voicesRef.current = loaded;
      // If a speak() was called before voices loaded AND the user has interacted, fire it now.
      if (pendingTextRef.current && !mutedRef.current && userInteractedRef.current) {
        const queued = pendingTextRef.current;
        pendingTextRef.current = null;
        rawSpeak(queued);
      }
    });
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
      userInteractedRef.current = true;
      setPendingTap(false);
      // Re-check voices synchronously at tap time.
      if (speechSupported && !voicesReadyRef.current) {
        const v = window.speechSynthesis.getVoices();
        if (v.length) { voicesReadyRef.current = true; voicesRef.current = v; }
      }
      const queued = pendingTextRef.current;
      if (queued && !mutedRef.current && voicesReadyRef.current) {
        pendingTextRef.current = null;
        rawSpeak(queued);
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
    return () => { cancelNovaSpeech(); };
  }, []);

  /**
   * rawSpeak — the actual SpeechSynthesis call.
   * Uses only refs, so it is never stale. Not a useCallback.
   * Call only after voices are ready and user has interacted.
   */
  function rawSpeak(text: string) {
    if (!speechSupported || mutedRef.current) return;
    const voice = pickVoice(voicesRef.current, selectedVoiceUriRef.current);
    speakNova(text, {
      voice,
      rate: SPEED_RATES[speedRef.current],
      onStart: () => { if (!mutedRef.current) setSpeaking(true); },
      onEnd: () => { if (!mutedRef.current) setSpeaking(false); },
      onBlocked: () => {
        pendingTextRef.current = text;
        setPendingTap(true);
        setSpeaking(false);
      },
    });
  }

  const speak = useCallback((text: string) => {
    if (unsupported || mutedRef.current) return;

    // Check synchronously — Chrome has voices available immediately even before
    // the voiceschanged event fires inside the useEffect.
    const syncVoices = speechSupported ? window.speechSynthesis.getVoices() : [];
    if (syncVoices.length > 0 && !voicesReadyRef.current) {
      voicesReadyRef.current = true;
      voicesRef.current = syncVoices;
    }

    // Voices genuinely not loaded yet — queue and wait for waitForVoices() to resolve.
    if (!voicesReadyRef.current || voicesRef.current.length === 0) {
      pendingTextRef.current = text;
      return;
    }

    // Always attempt rawSpeak immediately. If the browser blocks autoplay,
    // the utterance.onerror "not-allowed" handler queues it for the next tap.
    // Don't pre-emptively block — navigation itself counts as a user gesture
    // on many browsers, so autoplay often succeeds on first page load.
    rawSpeak(text);
    // rawSpeak uses only refs, is never stale, does not need to be in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsupported]);

  const cancel = useCallback(() => {
    cancelNovaSpeech();
    setSpeaking(false);
    setPendingTap(false);
    pendingTextRef.current = null;
  }, []);

  const setMuted = useCallback((value: boolean) => {
    mutedRef.current = value;
    setMutedState(value);
    if (value) {
      cancelNovaSpeech();
      setSpeaking(false);
      setPendingTap(false);
      pendingTextRef.current = null;
    }
  }, []);

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

  return {
    speak, cancel,
    muted, setMuted,
    speed, setSpeed,
    voices, selectedVoiceUri, setVoiceUri,
    speaking, unsupported, pendingTap,
  };
}

/**
 * speakText — fire-and-forget speak using saved preferences.
 * Safe to call from components that don't own a useNovaVoice instance.
 * Uses the same chunking logic as rawSpeak inside the hook.
 */
export function speakText(text: string): void {
  if (!speechSupported) return;
  const voices = window.speechSynthesis.getVoices();
  const preferredUri = (() => { try { return localStorage.getItem(NOVA_VOICE_KEY); } catch { return null; } })();
  const speed: NovaSpeed = (() => { try { const s = localStorage.getItem(NOVA_SPEED_KEY) as NovaSpeed | null; return s && s in SPEED_RATES ? s : "normal"; } catch { return "normal"; } })();
  speakNova(text, { voice: pickVoice(voices, preferredUri), rate: SPEED_RATES[speed] });
}
