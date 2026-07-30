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
  private musicDuck: GainNode | null = null;
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

  /**
   * Dips the music under a loud effect so it stays audible without turning the
   * mix to mush. Lives on its own node so the volume toggle can keep writing
   * musicGain directly without fighting this automation.
   */
  duckMusic(depth: number, hold: number, release: number): void {
    const ctx = this.getContext();
    if (!ctx || !this.musicDuck) return;

    const now = ctx.currentTime;
    const gain = this.musicDuck.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(depth, now + 0.02);
    gain.setValueAtTime(depth, now + hold);
    gain.linearRampToValueAtTime(1, now + hold + release);
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
      this.musicDuck = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      // Stacked effects (impact + line clear + level up) can sum past full
      // scale, so everything lands on a limiter before the speakers.
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.18;

      this.musicGain.connect(this.musicDuck);
      this.musicDuck.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(limiter);
      limiter.connect(this.ctx.destination);
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
