"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Measures the actual microphone stream and exposes a smoothed 0..1 input level. */
export function useMicrophoneLevel() {
  const [level, setLevel] = useState(0);
  const [micOff, setMicOff] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
    setLevel(0);
  }, []);
  const markOff = useCallback(() => { stop(); setMicOff(true); }, [stop]);
  const start = useCallback(async () => {
    stop(); setMicOff(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access is unavailable.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((track) => { track.onended = () => { stop(); setMicOff(true); }; });
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) { stream.getTracks().forEach((track) => track.stop()); throw new Error("Microphone level monitoring is unavailable."); }
      const audioContext = new AudioContextConstructor();
      contextRef.current = audioContext;
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.12; source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let smoothed = 0;
      const measure = () => {
        analyser.getFloatTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) energy += sample * sample;
        const rms = Math.sqrt(energy / samples.length);
        const measured = Math.max(0, Math.min(1, (rms - 0.004) * 8));
        smoothed = measured > smoothed ? smoothed * 0.42 + measured * 0.58 : smoothed * 0.72 + measured * 0.28;
        setLevel(smoothed < 0.012 ? 0 : smoothed);
        frameRef.current = requestAnimationFrame(measure);
      };
      measure();
      return true;
    } catch {
      stop(); setMicOff(true); return false;
    }
  }, [stop]);
  useEffect(() => () => stop(), [stop]);
  return { level, micOff, start, stop, markOff };
}
