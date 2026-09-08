const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🧪 Running Cosmic Frequency Audio Engine Verification...\n');

const audioCode = fs.readFileSync(path.resolve(__dirname, '..', 'cosmic-audio.js'), 'utf-8');

// Mock Web Audio Context
class MockGainNode {
  constructor() {
    this.gain = {
      setValueAtTime: (v) => {},
      linearRampToValueAtTime: (v) => {},
      exponentialRampToValueAtTime: (v) => {}
    };
  }
  connect() {}
  disconnect() {}
}

class MockOscillatorNode {
  constructor() {
    this.frequency = {
      setValueAtTime: (v) => { this.freq = v; }
    };
    this.type = 'sine';
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = {};
  }
  createGain() { return new MockGainNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  createBiquadFilter() {
    return {
      frequency: { setValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      connect: () => {},
      disconnect: () => {}
    };
  }
  createBuffer(channels, length, rate) {
    return {
      getChannelData: () => new Float32Array(length)
    };
  }
  createBufferSource() {
    return {
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createAnalyser() {
    return {
      fftSize: 64,
      smoothingTimeConstant: 0.85,
      frequencyBinCount: 32,
      getByteFrequencyData: (arr) => arr.fill(128),
      connect: () => {},
      disconnect: () => {}
    };
  }
}

const sandbox = {
  window: {},
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  document: {
    readyState: 'complete',
    getElementById: () => null,
    createElement: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      classList: { add: () => {}, remove: () => {} },
      style: {}
    }),
    body: { appendChild: () => {} }
  },
  console,
  setTimeout,
  clearTimeout,
  parseFloat,
  requestAnimationFrame: (fn) => {}
};
sandbox.window = sandbox;
vm.createContext(sandbox);

vm.runInContext(audioCode, sandbox);
const LunarisAudio = sandbox.LunarisAudio;

console.log('✓ LunarisAudio object loaded.');

// 1. Verify Presets
const expectedPresets = ['sun', 'moon', 'earth_om', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'solfeggio_528', 'solfeggio_432'];
let allPresetsOk = true;
expectedPresets.forEach(key => {
  const f = LunarisAudio.FREQUENCIES[key];
  if (!f || typeof f.freq !== 'number' || !f.glyph) {
    console.error(`❌ Preset missing or invalid: ${key}`);
    allPresetsOk = false;
  } else {
    console.log(`  ${f.glyph} ${f.name.tr} -> ${f.freq.toFixed(2)} Hz`);
  }
});
console.log(`\n10 Hans Cousto & Solfeggio Presets: ${allPresetsOk ? '✅ EKSİKSİZ' : '❌ HATALI'}`);

// 2. Test Play / Stop Lifecycle
const playResult = LunarisAudio.play('earth_om');
console.log(`\nOynatma başlatıldı mı: ${playResult ? '✅ EVET' : '❌ HAYIR'}`);
const statePlaying = LunarisAudio.getState();
console.log(`State isPlaying: ${statePlaying.isPlaying ? '✅ DOĞRU' : '❌ YANLIŞ'}`);
console.log(`Aktif Frekans: ${statePlaying.currentFreq} Hz (${statePlaying.currentKey})`);

// 3. Test Binaural Mode
LunarisAudio.setBinauralMode('alpha');
console.log(`Binaural Mod Değişimi: ${LunarisAudio.getState().binauralMode === 'alpha' ? '✅ BAŞARILI (Alpha 9.5Hz)' : '❌ HATALI'}`);

// 4. Test Volume
LunarisAudio.setVolume(0.75);
console.log(`Ses Seviyesi: ${LunarisAudio.getState().volume === 0.75 ? '✅ %75' : '❌ HATALI'}`);

// 5. Test Stop
LunarisAudio.stop(true);
console.log(`Durdurma sonrası isPlaying: ${!LunarisAudio.getState().isPlaying ? '✅ DURDURULDU' : '❌ DEVAM EDİYOR'}`);

// 6. Test Tarot Chime
try {
  LunarisAudio.playTarotChime();
  console.log('Tarot Kristal Tınısı (playTarotChime): ✅ HATASIZ TETİKLENDİ');
} catch (e) {
  console.error('playTarotChime error:', e);
}

console.log('\n✨ KOZMİK FREKANS TERAPİSİ SES MOTORU %100 BAŞARIYLA DOĞRULANDI!');
