import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 48000;

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function writeWav(filePath, samples) {
  ensureDir(filePath);
  const channels = 2;
  const bytesPerSample = 2;
  const dataSize = samples.length * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (const sample of samples) {
    const left = Math.round(clamp(sample[0]) * 32767);
    const right = Math.round(clamp(sample[1]) * 32767);
    buffer.writeInt16LE(left, offset);
    buffer.writeInt16LE(right, offset + 2);
    offset += 4;
  }

  fs.writeFileSync(filePath, buffer);
}

function blank(seconds) {
  return Array.from({ length: Math.ceil(seconds * sampleRate) }, () => [0, 0]);
}

function addTone(samples, start, duration, frequency, gain, pan = 0, type = 'sine') {
  const startIndex = Math.floor(start * sampleRate);
  const length = Math.floor(duration * sampleRate);
  for (let i = 0; i < length && startIndex + i < samples.length; i += 1) {
    const t = i / sampleRate;
    const progress = i / length;
    const attack = Math.min(1, progress / 0.08);
    const release = Math.min(1, (1 - progress) / 0.18);
    const env = attack * release;
    const phase = 2 * Math.PI * frequency * t;
    const raw = type === 'saw' ? 2 * (t * frequency - Math.floor(0.5 + t * frequency)) : Math.sin(phase);
    const value = raw * gain * env;
    samples[startIndex + i][0] += value * (1 - pan * 0.35);
    samples[startIndex + i][1] += value * (1 + pan * 0.35);
  }
}

function addKick(samples, start, gain = 0.8) {
  const startIndex = Math.floor(start * sampleRate);
  const length = Math.floor(0.42 * sampleRate);
  for (let i = 0; i < length && startIndex + i < samples.length; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 12);
    const freq = 92 - 54 * Math.min(1, t / 0.22);
    const value = Math.sin(2 * Math.PI * freq * t) * gain * env;
    samples[startIndex + i][0] += value;
    samples[startIndex + i][1] += value;
  }
}

function addSnare(samples, start, gain = 0.7) {
  const startIndex = Math.floor(start * sampleRate);
  const length = Math.floor(0.24 * sampleRate);
  let seed = 1337 + Math.floor(start * 1000);
  for (let i = 0; i < length && startIndex + i < samples.length; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 0xffffffff) * 2 - 1;
    const t = i / sampleRate;
    const env = Math.exp(-t * 18);
    const snap = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 22);
    const value = (noise * 0.82 + snap * 0.45) * gain * env;
    samples[startIndex + i][0] += value * 0.98;
    samples[startIndex + i][1] += value * 1.02;
  }
}

function addHat(samples, start, gain = 0.18) {
  const startIndex = Math.floor(start * sampleRate);
  const length = Math.floor(0.06 * sampleRate);
  let seed = 9001 + Math.floor(start * 1000);
  for (let i = 0; i < length && startIndex + i < samples.length; i += 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const noise = (seed / 0xffffffff) * 2 - 1;
    const t = i / sampleRate;
    const env = Math.exp(-t * 52);
    const value = noise * gain * env;
    samples[startIndex + i][0] += value;
    samples[startIndex + i][1] += value;
  }
}

function addNoiseRiser(samples, start, duration, gain = 0.22) {
  const startIndex = Math.floor(start * sampleRate);
  const length = Math.floor(duration * sampleRate);
  let seed = 4242 + Math.floor(start * 1000);
  for (let i = 0; i < length && startIndex + i < samples.length; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 0xffffffff) * 2 - 1;
    const progress = i / length;
    const env = Math.pow(progress, 1.8) * Math.min(1, (1 - progress) / 0.08);
    const value = noise * gain * env;
    samples[startIndex + i][0] += value * 0.8;
    samples[startIndex + i][1] += value;
  }
}

function normalize(samples, peak = 0.92) {
  let max = 0;
  for (const [left, right] of samples) {
    max = Math.max(max, Math.abs(left), Math.abs(right));
  }
  if (max === 0) return samples;
  const scale = peak / max;
  return samples.map(([left, right]) => [left * scale, right * scale]);
}

function comingSoonBed() {
  const samples = blank(15);
  addTone(samples, 0, 15, 43.65, 0.2);
  addTone(samples, 0.4, 12.5, 65.41, 0.08, -0.25);
  addTone(samples, 3.1, 8.7, 98, 0.045, 0.2, 'saw');
  [1.2, 3.1, 5.3, 7.4, 9.2, 11.4].forEach((time) => addKick(samples, time, 0.28));
  [5.55, 8.9].forEach((time) => addNoiseRiser(samples, time, 1.1, 0.08));
  addTone(samples, 9.15, 0.9, 392, 0.15);
  addTone(samples, 9.15, 1.1, 587.33, 0.09, 0.18);
  addTone(samples, 12.0, 1.2, 196, 0.09, -0.12);
  return normalize(samples, 0.86);
}

function hypeBed() {
  const samples = blank(12);
  addTone(samples, 0, 12, 55, 0.14);
  addTone(samples, 0.6, 10.4, 110, 0.05, 0.2, 'saw');
  const bpm = 104;
  const beat = 60 / bpm;
  for (let b = 0; b < 21; b += 1) {
    const time = b * beat;
    addHat(samples, time, 0.12);
    if (b % 2 === 0) addKick(samples, time, 0.68);
    if (b % 2 === 1) addSnare(samples, time, 0.76);
    if ([3, 7, 11, 15, 19].includes(b)) addSnare(samples, time + beat * 0.45, 0.44);
  }
  [2.25, 4.55, 6.85, 9.15].forEach((time) => addNoiseRiser(samples, time, 0.55, 0.18));
  [3.45, 6.35, 9.25, 10.95].forEach((time) => {
    addKick(samples, time, 0.9);
    addSnare(samples, time + 0.04, 0.9);
  });
  addTone(samples, 10.15, 0.65, 440, 0.1);
  addTone(samples, 10.15, 0.75, 660, 0.07, 0.15);
  return normalize(samples, 0.9);
}

writeWav('public/audio/coming-soon-bed.wav', comingSoonBed());
writeWav('public/audio/hype-snare-bed.wav', hypeBed());

console.log('Generated public/audio/coming-soon-bed.wav');
console.log('Generated public/audio/hype-snare-bed.wav');
