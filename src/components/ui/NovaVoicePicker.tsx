"use client";

/**
 * NovaVoicePicker — lets the user choose a voice and speed for Nova.
 * Uses the shared useNovaVoice hook so the choice is reflected everywhere.
 */

import { useState } from "react";
import { Volume2 } from "lucide-react";
import type { NovaSpeed } from "@/hooks/useNovaVoice";
import { SPEED_RATES } from "@/hooks/useNovaVoice";

const PREVIEW_LINE = "Hello, I'm Nova. I'll look after your health out here.";

interface NovaVoicePickerProps {
  voices: SpeechSynthesisVoice[];
  selectedVoiceUri: string | null;
  speed: NovaSpeed;
  onVoiceChange: (uri: string) => void;
  onSpeedChange: (speed: NovaSpeed) => void;
}

export function NovaVoicePicker({ voices, selectedVoiceUri, speed, onVoiceChange, onSpeedChange }: NovaVoicePickerProps) {
  const [previewingUri, setPreviewingUri] = useState<string | null>(null);

  const preview = (voice: SpeechSynthesisVoice) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(PREVIEW_LINE);
    u.voice = voice;
    u.rate = SPEED_RATES[speed];
    u.pitch = 1.03;
    setPreviewingUri(voice.voiceURI);
    u.onend = () => setPreviewingUri(null);
    u.onerror = () => setPreviewingUri(null);
    window.speechSynthesis.speak(u);
  };

  if (!voices.length) {
    return <p className="nova-picker-empty">No voices available on this device.</p>;
  }

  return (
    <div className="nova-voice-picker">
      <div className="nova-picker-section">
        <label className="nova-picker-label" htmlFor="nova-speed-select">Speed</label>
        <div className="nova-speed-buttons" role="group" aria-label="Nova speech speed">
          {(["slower", "normal", "faster"] as NovaSpeed[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`nova-speed-btn${speed === s ? " selected" : ""}`}
              aria-pressed={speed === s}
              onClick={() => onSpeedChange(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="nova-picker-section">
        <label className="nova-picker-label" htmlFor="nova-voice-list">Voice</label>
        <div className="nova-voice-list" id="nova-voice-list" role="listbox" aria-label="Choose Nova's voice">
          {voices.map((voice) => (
            <div
              key={voice.voiceURI}
              className={`nova-voice-row${selectedVoiceUri === voice.voiceURI ? " selected" : ""}`}
              role="option"
              aria-selected={selectedVoiceUri === voice.voiceURI}
            >
              <button
                type="button"
                className="nova-voice-select-btn"
                onClick={() => onVoiceChange(voice.voiceURI)}
              >
                <span className="nova-voice-name">{voice.name}</span>
                <span className="nova-voice-lang">{voice.lang}</span>
              </button>
              <button
                type="button"
                className={`nova-voice-preview-btn${previewingUri === voice.voiceURI ? " playing" : ""}`}
                onClick={() => preview(voice)}
                aria-label={`Preview voice ${voice.name}`}
                title="Hear a preview"
              >
                <Volume2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
