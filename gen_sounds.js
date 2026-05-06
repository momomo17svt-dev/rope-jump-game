const fs = require('fs');
const path = require('path');

function writeWAV(filePath, samples, sampleRate) {
  const dataSize = samples.length;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);  // PCM
  buf.writeUInt16LE(1, 22);  // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);  // 8-bit
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeUInt8(Math.max(0, Math.min(255, Math.round(samples[i]))), 44 + i);
  }
  fs.writeFileSync(filePath, buf);
  console.log(`Written: ${filePath} (${dataSize} samples)`);
}

const SR = 22050;
const out = path.join(__dirname, 'frontend/assets/sounds');

// ── jump.wav: 短い上昇チャープ 0.12s ──────────────────────────
{
  const dur = 0.12;
  const n = Math.floor(SR * dur);
  const samples = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / dur;
    const freq = 600 + 600 * p;          // 600→1200 Hz
    const env = Math.sin(p * Math.PI);   // attack/decay
    samples[i] = 128 + 110 * env * Math.sin(2 * Math.PI * freq * t);
  }
  writeWAV(path.join(out, 'jump.wav'), samples, SR);
}

// ── gameover.wav: 3段下降トーン 440→330→220 Hz 各0.18s ──────
{
  const tones = [440, 330, 220];
  const toneDur = 0.18;
  const all = [];
  for (const freq of tones) {
    const n = Math.floor(SR * toneDur);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const p = t / toneDur;
      const env = Math.sin(p * Math.PI);
      all.push(128 + 100 * env * Math.sin(2 * Math.PI * freq * t));
    }
    // 10ms 無音パディング
    const pad = Math.floor(SR * 0.01);
    for (let i = 0; i < pad; i++) all.push(128);
  }
  writeWAV(path.join(out, 'gameover.wav'), all, SR);
}
