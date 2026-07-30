export const SOUND_SETTINGS_KEY = "react-tetris-sound-settings";

export interface SoundSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

const DEFAULT_SETTINGS: SoundSettings = {
  musicEnabled: true,
  sfxEnabled: true,
};

export function loadSoundSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SOUND_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      musicEnabled: parsed.musicEnabled ?? true,
      sfxEnabled: parsed.sfxEnabled ?? true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore write failures (e.g. private browsing storage quota).
  }
}
