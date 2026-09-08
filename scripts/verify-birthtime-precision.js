const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('🧪 Running Birth Time & Minute Precision Verification...\n');

const mlCode = fs.readFileSync(path.resolve(__dirname, '..', 'lunaris-ml.js'), 'utf-8');
const dbCode = fs.readFileSync(path.resolve(__dirname, '..', 'astro-db.js'), 'utf-8');
const synCode = fs.readFileSync(path.resolve(__dirname, '..', 'synastry-engine.js'), 'utf-8');

const sandbox = {
  window: {},
  Math,
  Date,
  console,
  parseFloat,
  parseInt,
  isNaN,
  Buffer,
  localStorage: {
    _data: {},
    setItem: function(k, v) { this._data[k] = v; },
    getItem: function(k) { return this._data[k] || null; },
    removeItem: function(k) { delete this._data[k]; }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

vm.runInContext(dbCode, sandbox);
vm.runInContext(mlCode, sandbox);
vm.runInContext(synCode, sandbox);

const LunarisML = sandbox.LunarisML;
const SynastryEngine = sandbox.SynastryEngine;

console.log('✓ Modules loaded. Engine version:', LunarisML.VERSION);

// 1. Minute sensitivity test: 14:00 vs 14:15
const birthDate = new Date(1995, 5, 15);
const opt = { lat: 41.0082, lon: 28.9784, timezoneOffset: 3 };

const chart1400 = LunarisML.calcNatalScores(birthDate, '14:00', opt);
const chart1415 = LunarisML.calcNatalScores(birthDate, '14:15', opt);
const chart1430 = LunarisML.calcNatalScores(birthDate, '14:30', opt);

console.log('\n⏱️ Doğum Saati ve Dakika Değişimi Testi (15 Haziran 1995, İstanbul):');
console.log(`  14:00 -> ASC: ${chart1400.angles.asc.formatted} (${chart1400.angles.asc.signName}) | MC: ${chart1400.angles.mc.formatted} (${chart1400.angles.mc.signName})`);
console.log(`  14:15 -> ASC: ${chart1415.angles.asc.formatted} (${chart1415.angles.asc.signName}) | MC: ${chart1415.angles.mc.formatted} (${chart1415.angles.mc.signName})`);
console.log(`  14:30 -> ASC: ${chart1430.angles.asc.formatted} (${chart1430.angles.asc.signName}) | MC: ${chart1430.angles.mc.formatted} (${chart1430.angles.mc.signName})`);

// MC must move by exactly 3.75° in 15 minutes of time (360° / 24h = 15°/h = 3.75° / 15m)
const mcDiff1 = Math.abs((chart1415.angles.mc.degree - chart1400.angles.mc.degree + 360) % 360);
const mcDiff2 = Math.abs((chart1430.angles.mc.degree - chart1415.angles.mc.degree + 360) % 360);

console.log(`\n  14:00 -> 14:15 MC Ekliptik Kayması: ${mcDiff1.toFixed(3)}° (RAMC 3.75°, ekliptik izdüşümü ~3.4-3.5°)`);
console.log(`  14:15 -> 14:30 MC Ekliptik Kayması: ${mcDiff2.toFixed(3)}° (RAMC 3.75°, ekliptik izdüşümü ~3.4-3.5°)`);
assert(mcDiff1 > 3.0 && mcDiff1 < 4.5, '15 dakikada MC ekliptikte beklenen ~3.5° ilerlemeli');
assert(mcDiff2 > 3.0 && mcDiff2 < 4.5, '15 dakikada MC ekliptikte beklenen ~3.5° ilerlemeli');
console.log('  ✅ MC Dakika Hassasiyeti Doğrulandı');

// ASC must move consistently
const ascDiff = Math.abs((chart1415.angles.asc.degree - chart1400.angles.asc.degree + 360) % 360);
console.log(`  14:00 -> 14:15 ASC Kayması: ${ascDiff.toFixed(3)}°`);
assert(ascDiff > 2.0 && ascDiff < 5.0, '15 dakikada ASC beklenen aralıkta (~3-4°) ilerlemeli');
console.log('  ✅ ASC Dakika Hassasiyeti Doğrulandı');

// 2. Invariant Check: 1st house cusp == ASC, 10th house cusp == MC
assert(Math.abs(chart1430.houses.cusps[1] - chart1430.houses.asc) < 0.001, '1. Ev kaspı = ASC olmalı');
assert(Math.abs(chart1430.houses.cusps[10] - chart1430.houses.mc) < 0.001, '10. Ev kaspı = MC olmalı');
assert(Math.abs(((chart1430.houses.asc + 180) % 360) - chart1430.houses.dsc) < 0.001, 'ASC + 180° = DSC olmalı');
assert(Math.abs(((chart1430.houses.mc + 180) % 360) - chart1430.houses.ic) < 0.001, 'MC + 180° = IC olmalı');
assert(Math.abs(chart1430.angles.asc.degree - chart1430.houses.asc) < 0.01, 'Angles ASC ile Houses ASC uyumlu olmalı');
assert(Math.abs(chart1430.angles.mc.degree - chart1430.houses.mc) < 0.01, 'Angles MC ile Houses MC uyumlu olmalı');
console.log('  ✅ 12 Ev ve 4 Köşe Noktası Geometrik Uyumu Doğrulandı');

// 3. Planetary Placements Check
assert(Array.isArray(chart1430.planetaryHouses), 'planetaryHouses dizisi mevcut olmalı');
assert(chart1430.planetaryHouses.length >= 10, 'En az 10 gezegen yerleşimi olmalı');
const sunPl = chart1430.planetaryHouses.find(p => p.planet === 'sun');
const moonPl = chart1430.planetaryHouses.find(p => p.planet === 'moon');
assert(!!sunPl && typeof sunPl.house === 'number' && sunPl.house >= 1 && sunPl.house <= 12, 'Güneş 1-12 arasında bir eve yerleşmeli');
assert(!!moonPl && typeof moonPl.house === 'number' && moonPl.house >= 1 && moonPl.house <= 12, 'Ay 1-12 arasında bir eve yerleşmeli');
console.log(`  Güneş Yerleşimi: ${sunPl.formattedDegree} ${sunPl.signName} -> ${sunPl.house}. Ev (${sunPl.houseName})`);
console.log(`  Ay Yerleşimi: ${moonPl.formattedDegree} ${moonPl.signName} -> ${moonPl.house}. Ev (${moonPl.houseName})`);
console.log('  ✅ Gezegen Ev Yerleşimleri Doğrulandı');

// 4. Deep Reading with House Synthesis
const deep = LunarisML.generateDeepReading('gemini', 'tr', birthDate, '14:30', opt);
assert(!!deep.houseSynthesis, 'houseSynthesis nesnesi üretilmeli');
assert(typeof deep.houseSynthesis.ascMcSynthesis === 'string' && deep.houseSynthesis.ascMcSynthesis.length > 20, 'ascMcSynthesis metni üretilmeli');
assert(typeof deep.houseSynthesis.sunHouseAnalysis === 'string' && deep.houseSynthesis.sunHouseAnalysis.length > 10, 'sunHouseAnalysis metni üretilmeli');
console.log('\n📖 Üretilen Derin Ev Analizi Metinleri:');
console.log('  [ASC/MC Sentezi]:', deep.houseSynthesis.ascMcSynthesis.substring(0, 80) + '...');
console.log('  [Güneş Ev Analizi]:', deep.houseSynthesis.sunHouseAnalysis);
console.log('  [Ay Ev Analizi]:', deep.houseSynthesis.moonHouseAnalysis);
console.log('  ✅ Derin Ev Sentezi Doğrulandı');

// 5. Synastry with Minute Precision
const synReading = SynastryEngine.generateReading(
  { name: 'Kerem', birthDate: new Date(1994, 4, 10), birthHour: '09:45', options: opt },
  { name: 'Aslı', birthDate: new Date(1996, 8, 22), birthHour: '18:20', options: opt },
  'tr'
);
assert(synReading.totalScore >= 35 && synReading.totalScore <= 98, 'Sinastri skoru geçerli aralıkta olmalı');
assert(Array.isArray(synReading.houseOverlays), 'houseOverlays dizisi bulunmalı');
console.log(`\n🪐 Sinastri Doğum Dakikası & Ev Geçişleri: Toplam Skor: %${synReading.totalScore}`);
console.log(`  Tespit edilen ev geçişi sayısı: ${synReading.houseOverlays.length}`);
if (synReading.houseOverlays.length > 0) {
  console.log(`  Örnek Geçiş: ${synReading.houseOverlays[0].source}'in ${synReading.houseOverlays[0].planetName}'i, ${synReading.houseOverlays[0].target}'in ${synReading.houseOverlays[0].houseName}'inde (${synReading.houseOverlays[0].desc})`);
}
console.log('  ✅ Sinastri Ev Geçişleri Doğrulandı');

console.log('\n✨ TÜM DOĞUM SAATİ VE DAKİKA HASSASİYETİ TESTLERİ BAŞARIYLA GEÇTİ!');
