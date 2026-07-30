import { audioEngine } from "./engine";

interface Routing {
  ctx: AudioContext;
  output: GainNode;
}

function routing(): Routing | null {
  const ctx = audioEngine.getContext();
  const output = audioEngine.getSfxOutput();
  if (!ctx || !output) return null;
  return { ctx, output };
}

function connectPanned(
  ctx: AudioContext,
  source: AudioNode,
  output: GainNode,
  pan: number,
): void {
  if (pan === 0 || typeof ctx.createStereoPanner !== "function") {
    source.connect(output);
    return;
  }
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  source.connect(panner);
  panner.connect(output);
}

interface ToneOptions {
  freq: number;
  /** Bends to this pitch across the note; the fall is what reads as an impact. */
  freqEnd?: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  /** Seconds from now, so one effect can lay out a short sequence. */
  delay?: number;
  /** Random pitch spread in cents, so effects that repeat never sound canned. */
  humanize?: number;
  detune?: number;
  /** Square and sawtooth need a corner or they sound brittle on small speakers. */
  cutoff?: number;
  cutoffEnd?: number;
  pan?: number;
}

function tone({
  freq,
  freqEnd,
  duration,
  type = "square",
  volume = 0.2,
  attack = 0.006,
  delay = 0,
  humanize = 0,
  detune = 0,
  cutoff,
  cutoffEnd,
  pan = 0,
}: ToneOptions): void {
  const io = routing();
  if (!io) return;
  const { ctx, output } = io;

  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(freq, 1), start);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(freqEnd, 1),
      start + duration,
    );
  }
  osc.detune.value =
    detune + (humanize === 0 ? 0 : (Math.random() * 2 - 1) * humanize);

  const peakAt = start + Math.min(attack, duration * 0.5);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, peakAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  let tail: AudioNode = osc;
  if (cutoff !== undefined) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(cutoff, start);
    if (cutoffEnd !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(cutoffEnd, 40),
        start + duration,
      );
    }
    osc.connect(filter);
    tail = filter;
  }

  tail.connect(gain);
  connectPanned(ctx, gain, output, pan);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;
let noiseBufferCtx: AudioContext | null = null;

/** One second of white noise, reused by every burst instead of reallocated per hit. */
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBufferCtx === ctx) return noiseBuffer;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  noiseBufferCtx = ctx;
  return buffer;
}

interface NoiseOptions {
  duration: number;
  volume?: number;
  filter?: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
  delay?: number;
  pan?: number;
}

function noise({
  duration,
  volume = 0.1,
  filter: filterType = "bandpass",
  freq,
  freqEnd,
  q = 0.8,
  delay = 0,
  pan = 0,
}: NoiseOptions): void {
  const io = routing();
  if (!io) return;
  const { ctx, output } = io;

  const start = ctx.currentTime + delay;
  const buffer = getNoiseBuffer(ctx);
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(freqEnd, 40),
      start + duration,
    );
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  connectPanned(ctx, gain, output, pan);
  // Reading from a random spot keeps back-to-back bursts from being identical.
  const offset = Math.random() * Math.max(0, buffer.duration - duration);
  source.start(start, offset, duration);
}

export function playSpawn(): void {
  tone({
    freq: 560,
    freqEnd: 840,
    duration: 0.085,
    type: "triangle",
    volume: 0.075,
    attack: 0.004,
    humanize: 20,
    cutoff: 3500,
  });
}

export function playRotate(): void {
  tone({
    freq: 380,
    freqEnd: 620,
    duration: 0.055,
    type: "square",
    volume: 0.075,
    attack: 0.002,
    humanize: 30,
    cutoff: 2400,
  });
  noise({ duration: 0.02, volume: 0.03, filter: "highpass", freq: 2600 });
}

let lastMoveAt = 0;

export function playMove(pan = 0): void {
  // Key repeat fires faster than the ear can resolve; without a floor the
  // ticks pile into a buzz.
  const ctx = audioEngine.getContext();
  if (!ctx || ctx.currentTime - lastMoveAt < 0.03) return;
  lastMoveAt = ctx.currentTime;

  tone({
    freq: 700,
    freqEnd: 630,
    duration: 0.035,
    type: "triangle",
    volume: 0.05,
    attack: 0.002,
    humanize: 25,
    cutoff: 3000,
    pan,
  });
}

/**
 * Impact weight scales with how far the piece fell. A hard drop also gets a
 * short whoosh, and the thud is pushed back behind it so the two read as one
 * gesture rather than a stack.
 */
export function playLock(dropDistance: number, pan = 0): void {
  const intensity = Math.min(1, 0.35 + dropDistance / 14);
  const lead = dropDistance >= 3 ? 0.055 : 0;

  if (lead > 0) {
    noise({
      duration: lead + 0.03,
      volume: 0.04 + intensity * 0.05,
      filter: "bandpass",
      freq: 2200,
      freqEnd: 320,
      q: 1.1,
      pan,
    });
  }

  tone({
    freq: 150 + intensity * 60,
    freqEnd: 62,
    duration: 0.1 + intensity * 0.07,
    type: "triangle",
    volume: 0.14 + intensity * 0.1,
    attack: 0.002,
    delay: lead,
    humanize: 15,
    cutoff: 900,
    pan,
  });

  if (dropDistance >= 3) {
    noise({
      duration: 0.05 + intensity * 0.03,
      volume: 0.05 + intensity * 0.05,
      filter: "lowpass",
      freq: 1800,
      freqEnd: 500,
      delay: lead,
      pan,
    });
  }
}

/** A minor pentatonic, so clears sit inside the music's key instead of across it. */
const CLEAR_NOTES = [440, 523.25, 659.25, 880, 1046.5];

export function playLineClear(lines: number): void {
  const tetris = lines >= 4;
  const count = Math.min(lines + 1, CLEAR_NOTES.length);
  const step = tetris ? 0.055 : 0.065;

  for (let index = 0; index < count; index++) {
    const freq = CLEAR_NOTES[index];
    const delay = index * step;
    tone({
      freq,
      duration: tetris ? 0.3 : 0.22,
      type: "triangle",
      volume: tetris ? 0.12 : 0.1,
      attack: 0.006,
      delay,
      cutoff: 5200,
    });
    if (tetris) {
      tone({
        freq,
        duration: 0.3,
        type: "triangle",
        volume: 0.06,
        attack: 0.006,
        delay,
        detune: -9,
        cutoff: 5200,
      });
    }
  }

  noise({
    duration: tetris ? 0.4 : 0.26,
    volume: tetris ? 0.07 : 0.045,
    filter: "bandpass",
    freq: 1200,
    freqEnd: tetris ? 6000 : 4200,
    q: 1.2,
  });

  if (tetris) {
    tone({
      freq: 110,
      freqEnd: 55,
      duration: 0.45,
      type: "sine",
      volume: 0.16,
      attack: 0.005,
    });
    audioEngine.duckMusic(0.45, 0.18, 0.5);
  } else {
    audioEngine.duckMusic(0.8, 0.06, 0.28);
  }
}

export function playLevelUp(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((freq, index) => {
    const last = index === notes.length - 1;
    tone({
      freq,
      duration: last ? 0.4 : 0.16,
      type: "triangle",
      volume: last ? 0.14 : 0.12,
      attack: 0.005,
      delay: index * 0.075,
      cutoff: 5000,
    });
  });
  noise({
    duration: 0.5,
    volume: 0.05,
    filter: "bandpass",
    freq: 1600,
    freqEnd: 6500,
    q: 1.4,
    delay: 0.06,
  });
  audioEngine.duckMusic(0.55, 0.22, 0.6);
}

export function playGameStart(): void {
  const notes = [392, 523.25, 659.25, 783.99];
  notes.forEach((freq, index) => {
    const last = index === notes.length - 1;
    tone({
      freq,
      duration: last ? 0.32 : 0.16,
      type: "triangle",
      volume: 0.15,
      attack: 0.005,
      delay: index * 0.075,
      cutoff: 4500,
    });
  });
  tone({
    freq: 130.81,
    duration: 0.5,
    type: "triangle",
    volume: 0.12,
    attack: 0.008,
    cutoff: 900,
  });
}

/**
 * A minor arpeggio falling into a detuned bend, with the filter closing over
 * the whole thing so it reads as the machine winding down.
 */
export function playGameOver(): void {
  const notes = [329.63, 261.63, 220, 164.81];
  notes.forEach((freq, index) => {
    const delay = index * 0.13;
    for (const detune of [-9, 9]) {
      tone({
        freq,
        duration: 0.32,
        type: "sawtooth",
        volume: 0.075,
        attack: 0.008,
        delay,
        detune,
        cutoff: 1800,
        cutoffEnd: 700,
      });
    }
  });

  const tailAt = notes.length * 0.13;
  for (const detune of [-14, 14]) {
    tone({
      freq: 82.41,
      freqEnd: 41,
      duration: 1.1,
      type: "sawtooth",
      volume: 0.09,
      attack: 0.02,
      delay: tailAt,
      detune,
      cutoff: 1200,
      cutoffEnd: 180,
    });
  }
  noise({
    duration: 0.9,
    volume: 0.05,
    filter: "lowpass",
    freq: 1400,
    freqEnd: 150,
    delay: tailAt,
  });
}

export function playPause(): void {
  tone({
    freq: 659.25,
    duration: 0.09,
    type: "triangle",
    volume: 0.1,
    attack: 0.004,
    cutoff: 3000,
  });
  tone({
    freq: 440,
    duration: 0.16,
    type: "triangle",
    volume: 0.1,
    attack: 0.004,
    delay: 0.08,
    cutoff: 3000,
  });
}

export function playResume(): void {
  tone({
    freq: 440,
    duration: 0.09,
    type: "triangle",
    volume: 0.1,
    attack: 0.004,
    cutoff: 3000,
  });
  tone({
    freq: 659.25,
    duration: 0.16,
    type: "triangle",
    volume: 0.1,
    attack: 0.004,
    delay: 0.08,
    cutoff: 3000,
  });
}
