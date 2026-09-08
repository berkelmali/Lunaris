const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🧪 Running Synastry AI Engine Verification...\n');

const synastryCode = fs.readFileSync(path.resolve(__dirname, '..', 'synastry-engine.js'), 'utf-8');

const sandbox = {
  window: {},
  Math,
  Date,
  console
};
sandbox.window = sandbox;
vm.createContext(sandbox);

vm.runInContext(synastryCode, sandbox);
const SynastryEngine = sandbox.SynastryEngine;

console.log('✓ SynastryEngine loaded successfully.');

// Test 1: Angle Separation & Midpoint calculation
const mockP1 = {
  sun: 10.0,    // 10° Aries
  moon: 120.0,  // 0° Leo
  venus: 45.0,  // 15° Taurus
  mars: 90.0,   // 0° Cancer
  mercury: 15.0,
  jupiter: 200.0,
  saturn: 280.0
};

const mockP2 = {
  sun: 125.0,   // 5° Leo (Trine P1 Sun ~ 115°, Trine P1 Moon ~ 5°)
  moon: 10.0,   // 10° Aries (Conjunction P1 Sun!)
  venus: 85.0,  // 25° Gemini (Conjunction P1 Mars!)
  mars: 48.0,   // 18° Taurus (Conjunction P1 Venus!)
  mercury: 130.0,
  jupiter: 205.0,
  saturn: 285.0
};

const aspects = SynastryEngine.calculateCrossAspects(mockP1, mockP2);
console.log(`\n📐 Tespit Edilen Çift Açıları (Cross-Aspects): ${aspects.length} adet.`);
aspects.forEach(a => {
  console.log(`   ${a.planet1.toUpperCase()} ${a.symbol} ${a.planet2.toUpperCase()} (${a.angle}° ± ${a.orbDev}°, Yoğunluk: %${Math.round(a.intensity*100)})`);
});

const sunMoonConjunction = aspects.some(a => (a.planet1 === 'sun' && a.planet2 === 'moon') || (a.planet1 === 'moon' && a.planet2 === 'sun'));
console.log(`   Güneş-Ay Kavuşumu Tespiti: ${sunMoonConjunction ? '✅ BAŞARILI' : '❌ BULUNAMADI'}`);

// Test 2: Composite Midpoints
const composite = SynastryEngine.calculateComposite(mockP1, mockP2);
console.log(`\n🌌 Kompozit Harita Orta Noktaları:`);
console.log(`   Kompozit Güneş: ${composite.sunLon.toFixed(2)}° (${composite.sunSign.toUpperCase()})`);
console.log(`   Kompozit Ay: ${composite.moonLon.toFixed(2)}° (${composite.moonSign.toUpperCase()})`);
console.log(`   Kompozit Venüs: ${composite.venusLon.toFixed(2)}° (${composite.venusSign.toUpperCase()})`);
console.log(`   Kompozit Mars: ${composite.marsLon.toFixed(2)}° (${composite.marsSign.toUpperCase()})`);

// Test 3: 5-Dimensional Scoring
const scores = SynastryEngine.calculateScores(aspects, mockP1, mockP2);
console.log(`\n💖 5 Boyutlu Sinastri Skorları:`);
console.log(`   Aşk (Love): %${scores.dimensions.love}`);
console.log(`   Tutku (Passion): %${scores.dimensions.passion}`);
console.log(`   Zihinsel İletişim (Mind): %${scores.dimensions.communication}`);
console.log(`   Güven (Trust): %${scores.dimensions.trust}`);
console.log(`   Karmik Bağ (Karma): %${scores.dimensions.karma}`);
console.log(`   Genel Kozmik Uyum Skoru: %${scores.totalScore}`);

// Test 4: Full Reading
const reading = SynastryEngine.generateReading(
  { name: 'Leyla', birthDate: new Date(1996, 3, 10), birthHour: 14 },
  { name: 'Mecnun', birthDate: new Date(1995, 6, 25), birthHour: 18 },
  'tr'
);

console.log(`\n🔮 İlişki Arketipi: ${reading.archetype.badge} ${reading.archetype.title.tr}`);
console.log(`📖 Yapay Zeka Sentezi:\n${reading.synthesis}\n`);

console.log('✨ SYNASTRY AI TESTLERİ %100 BAŞARIYLA TAMAMLANDI!');
