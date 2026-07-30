import type { ReactNode } from "react";
import { useSoundSettings } from "../hooks/useGameSounds";

function SpeakerIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
      />
    </svg>
  );
}

function MusicIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${muted ? "opacity-40" : ""}`}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
      />
    </svg>
  );
}

interface SoundToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  icon: ReactNode;
}

function SoundToggle({ label, enabled, onToggle, icon }: SoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={`${label}: ${enabled ? "on" : "off"}`}
      title={`${label}: ${enabled ? "on" : "off"}`}
      className={`glass-panel flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
        enabled
          ? "text-cyan-300 hover:border-cyan-400/60"
          : "text-white/40 hover:border-white/20 hover:text-white/60"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function SoundControls() {
  const { musicEnabled, sfxEnabled, toggleMusic, toggleSfx } =
    useSoundSettings();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <SoundToggle
        label="Music"
        enabled={musicEnabled}
        onToggle={toggleMusic}
        icon={<MusicIcon muted={!musicEnabled} />}
      />
      <SoundToggle
        label="SFX"
        enabled={sfxEnabled}
        onToggle={toggleSfx}
        icon={<SpeakerIcon muted={!sfxEnabled} />}
      />
    </div>
  );
}
