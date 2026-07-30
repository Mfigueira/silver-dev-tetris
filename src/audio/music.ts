import { audioEngine } from "./engine";

const F = {
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
} as const;

type NoteStep = { freq: number; dur: number; rest?: boolean };

/** Slower arpeggiated puzzle-game pattern. */
const MELODY: NoteStep[] = [
  { freq: F.E5, dur: 0.28 },
  { freq: F.B4, dur: 0.28 },
  { freq: F.C5, dur: 0.28 },
  { freq: F.G4, dur: 0.28 },
  { freq: F.A4, dur: 0.28 },
  { freq: F.E4, dur: 0.28 },
  { freq: F.A4, dur: 0.36 },
  { freq: 0, dur: 0.12, rest: true },
  { freq: F.D5, dur: 0.28 },
  { freq: F.A4, dur: 0.28 },
  { freq: F.B4, dur: 0.28 },
  { freq: F.G4, dur: 0.28 },
  { freq: F.C5, dur: 0.28 },
  { freq: F.G4, dur: 0.28 },
  { freq: F.A4, dur: 0.36 },
  { freq: 0, dur: 0.12, rest: true },
  { freq: F.E5, dur: 0.28 },
  { freq: F.C5, dur: 0.28 },
  { freq: F.G5, dur: 0.28 },
  { freq: F.E5, dur: 0.28 },
  { freq: F.G4, dur: 0.28 },
  { freq: F.B4, dur: 0.28 },
  { freq: F.D5, dur: 0.4 },
  { freq: 0, dur: 0.12, rest: true },
];

const BASS: NoteStep[] = [
  { freq: F.E4 / 2, dur: 0.56 },
  { freq: F.G4 / 2, dur: 0.56 },
  { freq: F.A4 / 2, dur: 0.56 },
  { freq: F.B4 / 2, dur: 0.56 },
  { freq: F.C5 / 2, dur: 0.56 },
  { freq: F.G4 / 2, dur: 0.56 },
  { freq: F.A4 / 2, dur: 0.72 },
  { freq: 0, dur: 0.24, rest: true },
  { freq: F.D5 / 2, dur: 0.56 },
  { freq: F.G4 / 2, dur: 0.56 },
  { freq: F.B4 / 2, dur: 0.56 },
  { freq: F.E4 / 2, dur: 0.56 },
  { freq: F.C5 / 2, dur: 0.56 },
  { freq: F.G4 / 2, dur: 0.56 },
  { freq: F.A4 / 2, dur: 0.72 },
  { freq: 0, dur: 0.24, rest: true },
  { freq: F.E4 / 2, dur: 0.56 },
  { freq: F.C5 / 2, dur: 0.56 },
  { freq: F.G4 / 2, dur: 0.56 },
  { freq: F.E4 / 2, dur: 0.56 },
  { freq: F.G4 / 2, dur: 0.56 },
  { freq: F.B4 / 2, dur: 0.56 },
  { freq: F.D5 / 2, dur: 0.8 },
  { freq: 0, dur: 0.24, rest: true },
];

const LOOP_DURATION = MELODY.reduce((sum, step) => sum + step.dur, 0);
const SCHEDULE_AHEAD_S = 2.8;
const LEGATO_OVERLAP_S = 0.14;
const PITCH_GLIDE_S = 0.08;
const SESSION_FADE_OUT_S = 0.12;

interface TrackVoice {
  type: OscillatorType;
  volume: number;
  filterCutoff: number;
  attack: number;
  release: number;
  legatoOverlap?: number;
  pitchGlide?: number;
}

const MELODY_VOICE: TrackVoice = {
  type: "sine",
  volume: 0.09,
  filterCutoff: 2800,
  attack: 0.06,
  release: 0.2,
};

const BASS_VOICE: TrackVoice = {
  type: "triangle",
  volume: 0.11,
  filterCutoff: 520,
  attack: 0.07,
  release: 0.24,
};

class MusicPlayer {
  private running = false;
  private generation = 0;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private nextLoopAt = 0;
  private melodyEndFreq = MELODY[0].freq;
  private bassEndFreq = BASS[0].freq;
  private sessionGain: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];

  start(): void {
    if (this.running && this.sessionGain) return;

    const ctx = audioEngine.getContext();
    const output = audioEngine.getMusicOutput();
    if (!ctx || !output || !audioEngine.isMusicEnabled()) return;

    this.endSession();
    this.running = true;
    const gen = ++this.generation;

    this.sessionGain = ctx.createGain();
    this.sessionGain.gain.value = 1;
    this.sessionGain.connect(output);

    this.melodyEndFreq = MELODY[0].freq;
    this.bassEndFreq = BASS[0].freq;
    this.nextLoopAt = ctx.currentTime + 0.08;

    this.scheduleAhead(ctx);
    this.schedulerTimer = setInterval(() => {
      const freshCtx = audioEngine.getContext();
      if (
        !this.running ||
        gen !== this.generation ||
        !freshCtx ||
        !audioEngine.isMusicEnabled()
      )
        return;
      this.scheduleAhead(freshCtx);
    }, 250);
  }

  stop(): void {
    this.running = false;
    this.generation++;
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.endSession();
  }

  private endSession(): void {
    const ctx = audioEngine.getContext();
    const fadeAt = ctx?.currentTime ?? 0;

    if (this.sessionGain && ctx) {
      this.sessionGain.gain.cancelScheduledValues(fadeAt);
      this.sessionGain.gain.setValueAtTime(this.sessionGain.gain.value, fadeAt);
      this.sessionGain.gain.linearRampToValueAtTime(
        0,
        fadeAt + SESSION_FADE_OUT_S,
      );
    }

    for (const osc of this.activeOscillators) {
      try {
        osc.stop(fadeAt + SESSION_FADE_OUT_S + 0.02);
      } catch {
        // Already stopped.
      }
    }
    this.activeOscillators = [];

    const gain = this.sessionGain;
    this.sessionGain = null;
    if (gain) {
      setTimeout(() => gain.disconnect(), (SESSION_FADE_OUT_S + 0.05) * 1000);
    }
  }

  private scheduleAhead(ctx: AudioContext): void {
    if (!this.sessionGain) return;

    while (this.nextLoopAt < ctx.currentTime + SCHEDULE_AHEAD_S) {
      this.scheduleLoop(this.nextLoopAt);
      this.nextLoopAt += LOOP_DURATION;
    }
  }

  private scheduleLoop(startAt: number): void {
    const ctx = audioEngine.getContext();
    if (!ctx || !this.sessionGain) return;

    this.melodyEndFreq = this.scheduleTrack(
      ctx,
      MELODY,
      startAt,
      MELODY_VOICE,
      this.melodyEndFreq,
    );
    this.bassEndFreq = this.scheduleTrack(
      ctx,
      BASS,
      startAt,
      BASS_VOICE,
      this.bassEndFreq,
    );
  }

  private scheduleTrack(
    ctx: AudioContext,
    track: NoteStep[],
    startAt: number,
    voice: TrackVoice,
    fromFreq: number,
  ): number {
    let t = startAt;
    let prevFreq = fromFreq;

    for (const step of track) {
      if (!step.rest && step.freq > 0) {
        const overlap = voice.legatoOverlap ?? LEGATO_OVERLAP_S;
        this.scheduleSmoothNote(
          ctx,
          prevFreq,
          step.freq,
          t,
          step.dur + overlap,
          voice,
        );
        prevFreq = step.freq;
      }
      t += step.dur;
    }

    return prevFreq;
  }

  private scheduleSmoothNote(
    ctx: AudioContext,
    fromFreq: number,
    toFreq: number,
    start: number,
    duration: number,
    voice: TrackVoice,
  ): void {
    if (!this.sessionGain) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = voice.type;
    const glideFrom = Math.max(fromFreq, 1);
    const glideTo = Math.max(toFreq, 1);
    const glide = voice.pitchGlide ?? PITCH_GLIDE_S;
    osc.frequency.setValueAtTime(glideFrom, start);
    osc.frequency.exponentialRampToValueAtTime(glideTo, start + glide);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(voice.filterCutoff, start);
    filter.Q.value = 0.35;

    const releaseStart = start + duration - voice.release;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(voice.volume, start + voice.attack);
    gain.gain.setValueAtTime(
      voice.volume * 0.8,
      Math.max(start + voice.attack, releaseStart),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sessionGain);
    osc.start(start);
    osc.stop(start + duration + 0.03);
    osc.onended = () => {
      const index = this.activeOscillators.indexOf(osc);
      if (index >= 0) this.activeOscillators.splice(index, 1);
    };

    this.activeOscillators.push(osc);
  }
}

export const musicPlayer = new MusicPlayer();
