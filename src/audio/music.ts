import { audioEngine } from "./engine";

const NOTE = {
  E2: 82.41,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
} as const;

const BPM = 108;
const BEAT_S = 60 / BPM;

const N8 = 0.5;
const N4 = 1;

/** `beats` is the slot on the shared grid; `gate` is how much of it sounds. */
type Step = { freq: number; beats: number; gate?: number };

/**
 * Three bars of 4/4 in A minor, twelve beats per loop.
 * Harmony: | Em C Am Am | Dm G C Am | C Am G E |
 */
const MELODY: Step[] = [
  { freq: NOTE.E5, beats: N8 },
  { freq: NOTE.B4, beats: N8 },
  { freq: NOTE.C5, beats: N8 },
  { freq: NOTE.G4, beats: N8 },
  { freq: NOTE.A4, beats: N8 },
  { freq: NOTE.E4, beats: N8 },
  { freq: NOTE.A4, beats: N4, gate: 0.72 },

  { freq: NOTE.D5, beats: N8 },
  { freq: NOTE.A4, beats: N8 },
  { freq: NOTE.B4, beats: N8 },
  { freq: NOTE.G4, beats: N8 },
  { freq: NOTE.C5, beats: N8 },
  { freq: NOTE.G4, beats: N8 },
  { freq: NOTE.A4, beats: N4, gate: 0.72 },

  { freq: NOTE.E5, beats: N8 },
  { freq: NOTE.C5, beats: N8 },
  { freq: NOTE.G5, beats: N8 },
  { freq: NOTE.E5, beats: N8 },
  { freq: NOTE.G4, beats: N8 },
  { freq: NOTE.B4, beats: N8 },
  { freq: NOTE.D5, beats: N4, gate: 0.78 },
];

/**
 * Chord roots on the beat, with a pickup on the last eighth of each bar that
 * fills the gap left by the melody's held note.
 */
const BASS: Step[] = [
  { freq: NOTE.E3, beats: N4 },
  { freq: NOTE.C3, beats: N4 },
  { freq: NOTE.A2, beats: N4 },
  { freq: NOTE.A2, beats: N8 },
  { freq: NOTE.C3, beats: N8, gate: 0.9 },

  { freq: NOTE.D3, beats: N4 },
  { freq: NOTE.G2, beats: N4 },
  { freq: NOTE.C3, beats: N4 },
  { freq: NOTE.A2, beats: N8 },
  { freq: NOTE.E3, beats: N8, gate: 0.9 },

  { freq: NOTE.C3, beats: N4 },
  { freq: NOTE.A2, beats: N4 },
  { freq: NOTE.G2, beats: N4 },
  { freq: NOTE.E2, beats: N8 },
  { freq: NOTE.B2, beats: N8, gate: 0.9 },
];

const trackBeats = (track: Step[]) =>
  track.reduce((sum, step) => sum + step.beats, 0);

const LOOP_DURATION =
  Math.max(trackBeats(MELODY), trackBeats(BASS)) * BEAT_S;
const SCHEDULE_AHEAD_S = 2.8;
const SESSION_FADE_S = 0.12;

interface TrackVoice {
  type: OscillatorType;
  volume: number;
  gate: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterCutoff: number;
  filterPeak: number;
  pitchGlide: number;
}

const MELODY_VOICE: TrackVoice = {
  type: "sine",
  volume: 0.095,
  gate: 0.95,
  attack: 0.012,
  decay: 0.09,
  sustain: 0.72,
  release: 0.07,
  filterCutoff: 2600,
  filterPeak: 3600,
  pitchGlide: 0.015,
};

const BASS_VOICE: TrackVoice = {
  type: "triangle",
  volume: 0.15,
  gate: 0.68,
  attack: 0.006,
  decay: 0.1,
  sustain: 0.55,
  release: 0.06,
  filterCutoff: 700,
  filterPeak: 1600,
  pitchGlide: 0.006,
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

    const startAt = ctx.currentTime + 0.08;
    this.sessionGain = ctx.createGain();
    this.sessionGain.gain.setValueAtTime(0, ctx.currentTime);
    this.sessionGain.gain.linearRampToValueAtTime(1, startAt + SESSION_FADE_S);
    this.sessionGain.connect(output);

    this.melodyEndFreq = MELODY[0].freq;
    this.bassEndFreq = BASS[0].freq;
    this.nextLoopAt = startAt;

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
      this.sessionGain.gain.linearRampToValueAtTime(0, fadeAt + SESSION_FADE_S);
    }

    for (const osc of this.activeOscillators) {
      try {
        osc.stop(fadeAt + SESSION_FADE_S + 0.02);
      } catch {
        // Already stopped.
      }
    }
    this.activeOscillators = [];

    const gain = this.sessionGain;
    this.sessionGain = null;
    if (gain) {
      setTimeout(() => gain.disconnect(), (SESSION_FADE_S + 0.05) * 1000);
    }
  }

  private scheduleAhead(ctx: AudioContext): void {
    if (!this.sessionGain) return;

    while (this.nextLoopAt < ctx.currentTime + SCHEDULE_AHEAD_S) {
      this.scheduleLoop(ctx, this.nextLoopAt);
      this.nextLoopAt += LOOP_DURATION;
    }
  }

  private scheduleLoop(ctx: AudioContext, startAt: number): void {
    if (!this.sessionGain) return;

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
    track: Step[],
    startAt: number,
    voice: TrackVoice,
    fromFreq: number,
  ): number {
    let beatsElapsed = 0;
    let prevFreq = fromFreq;

    for (const step of track) {
      const slot = step.beats * BEAT_S;
      if (step.freq > 0) {
        this.scheduleNote(
          ctx,
          prevFreq,
          step.freq,
          startAt + beatsElapsed * BEAT_S,
          slot * (step.gate ?? voice.gate),
          voice,
        );
        prevFreq = step.freq;
      }
      beatsElapsed += step.beats;
    }

    return prevFreq;
  }

  private scheduleNote(
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
    osc.frequency.setValueAtTime(Math.max(fromFreq, 1), start);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(toFreq, 1),
      start + voice.pitchGlide,
    );

    filter.type = "lowpass";
    filter.Q.value = 0.4;
    filter.frequency.setValueAtTime(voice.filterPeak, start);
    filter.frequency.exponentialRampToValueAtTime(
      voice.filterCutoff,
      start + Math.min(voice.decay, duration),
    );

    const attack = Math.min(voice.attack, duration * 0.3);
    const release = Math.min(voice.release, duration * 0.5);
    const releaseStart = Math.max(
      start + attack + 0.001,
      Math.min(start + attack + voice.decay, start + duration - release),
    );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(voice.volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(
      voice.volume * voice.sustain,
      releaseStart,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sessionGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    osc.onended = () => {
      const index = this.activeOscillators.indexOf(osc);
      if (index >= 0) this.activeOscillators.splice(index, 1);
    };

    this.activeOscillators.push(osc);
  }
}

export const musicPlayer = new MusicPlayer();
