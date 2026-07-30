import { audioEngine } from "./engine";

interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  pitchEnd?: number;
  detune?: number;
}

function playTone({
  frequency,
  duration,
  type = "square",
  volume = 0.25,
  attack = 0.008,
  pitchEnd,
  detune = 0,
}: ToneOptions): void {
  const ctx = audioEngine.getContext();
  const output = audioEngine.getSfxOutput();
  if (!ctx || !output) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (pitchEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(pitchEnd, 1),
      now + duration,
    );
  }
  osc.detune.value = detune;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(output);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playNoise(duration: number, volume = 0.12): void {
  const ctx = audioEngine.getContext();
  const output = audioEngine.getSfxOutput();
  if (!ctx || !output) return;

  const now = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.6;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(now);
  source.stop(now + duration + 0.02);
}

export function playSpawn(): void {
  playTone({
    frequency: 520,
    pitchEnd: 880,
    duration: 0.12,
    type: "triangle",
    volume: 0.18,
  });
}

export function playRotate(): void {
  playTone({
    frequency: 280,
    pitchEnd: 360,
    duration: 0.06,
    volume: 0.14,
    type: "square",
  });
}

export function playLock(dropDistance: number): void {
  const intensity = Math.min(1, 0.35 + dropDistance / 14);
  playTone({
    frequency: 90 + intensity * 40,
    duration: 0.08 + intensity * 0.06,
    volume: 0.16 + intensity * 0.12,
    type: "triangle",
    attack: 0.003,
  });
  if (dropDistance >= 4) {
    playNoise(0.05, 0.06 + intensity * 0.05);
  }
}

export function playLineClear(lines: number): void {
  const base = [440, 554, 659, 880];
  const freqs = base.slice(0, Math.min(lines, 4));
  freqs.forEach((frequency, index) => {
    const ctx = audioEngine.getContext();
    const output = audioEngine.getSfxOutput();
    if (!ctx || !output) return;
    const now = ctx.currentTime + index * 0.07;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = lines >= 4 ? "square" : "triangle";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(lines >= 4 ? 0.22 : 0.16, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.24);
  });
}

export function playLevelUp(): void {
  const ctx = audioEngine.getContext();
  const output = audioEngine.getSfxOutput();
  if (!ctx || !output) return;
  [523, 659, 784, 1047].forEach((frequency, index) => {
    const now = ctx.currentTime + index * 0.09;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.16);
  });
}

export function playGameStart(): void {
  [392, 523, 659, 784].forEach((frequency, index) => {
    const ctx = audioEngine.getContext();
    const output = audioEngine.getSfxOutput();
    if (!ctx || !output) return;
    const now = ctx.currentTime + index * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.18);
  });
}

export function playGameOver(): void {
  [392, 330, 262, 196].forEach((frequency, index) => {
    const ctx = audioEngine.getContext();
    const output = audioEngine.getSfxOutput();
    if (!ctx || !output) return;
    const now = ctx.currentTime + index * 0.14;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.3);
  });
}
