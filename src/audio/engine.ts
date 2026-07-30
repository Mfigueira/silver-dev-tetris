import {
  loadSoundSettings,
  saveSoundSettings,
  type SoundSettings,
} from "./storage";

type SettingsListener = (settings: SoundSettings) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private settings: SoundSettings = loadSoundSettings();
  private listeners = new Set<SettingsListener>();
  private unlocked = false;

  getSettings(): SoundSettings {
    return this.settings;
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setMusicEnabled(enabled: boolean): void {
    this.settings = { ...this.settings, musicEnabled: enabled };
    this.applyGains();
    this.persist();
  }

  setSfxEnabled(enabled: boolean): void {
    this.settings = { ...this.settings, sfxEnabled: enabled };
    this.applyGains();
    this.persist();
  }

  toggleMusic(): boolean {
    this.setMusicEnabled(!this.settings.musicEnabled);
    return this.settings.musicEnabled;
  }

  toggleSfx(): boolean {
    this.setSfxEnabled(!this.settings.sfxEnabled);
    return this.settings.sfxEnabled;
  }

  isMusicEnabled(): boolean {
    return this.settings.musicEnabled;
  }

  isSfxEnabled(): boolean {
    return this.settings.sfxEnabled;
  }

  async unlock(): Promise<AudioContext | null> {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return null;
      }
    }
    this.unlocked = ctx.state === "running";
    return this.unlocked ? ctx : null;
  }

  getContext(): AudioContext | null {
    return this.unlocked ? this.ctx : null;
  }

  getMusicOutput(): GainNode | null {
    return this.musicGain;
  }

  getSfxOutput(): GainNode | null {
    return this.sfxGain;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyGains();
    }
    return this.ctx;
  }

  private applyGains(): void {
    if (!this.musicGain || !this.sfxGain) return;
    this.musicGain.gain.value = this.settings.musicEnabled ? 0.22 : 0;
    this.sfxGain.gain.value = this.settings.sfxEnabled ? 0.45 : 0;
    for (const listener of this.listeners) listener(this.settings);
  }

  private persist(): void {
    saveSoundSettings(this.settings);
  }
}

export const audioEngine = new AudioEngine();
