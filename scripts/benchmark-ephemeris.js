#!/usr/bin/env node
/* ==========================================================
   LUNARIS — Efemeris Doğruluk Benchmark Scripti
   JPL Horizons referansına karşı gezegen pozisyonlarını test eder
   
   Kullanım: node scripts/benchmark-ephemeris.js
   ========================================================== */

// Astronomy Engine yükle
const Astronomy = require('../vendor/astronomy.browser.min.js');
global.Astronomy = Astronomy;
global.window = global;

// Lunaris modülleri yükle
require('../lunaris-ml.js');
require('../lunaris-stats.js');
require('../lunaris-benchmark.js');

console.log('🔭 Lunaris Efemeris Benchmark');
console.log('   Motor Versiyonu:', LunarisML.VERSION);
console.log('   Efemeris Kaynağı:', LunarisML.ephemerisSource());
console.log('');

// Benchmark çalıştır
const results = LunarisBenchmark.run(LunarisML.calcPlanetPositions);

if (results.error) {
  console.error('❌ Hata:', results.error);
  process.exit(1);
}

// Rapor üret
console.log(LunarisBenchmark.generateReport(results, 'en'));
console.log('');

// Detaylı gezegen tablosu
console.log('╔══════════════╤═════════╤═════════╤══════════╤═════════╤═════════╤═══════╗');
console.log('║ Planet       │  MAE°   │  RMSE°  │ Max Err° │ Median° │  P95°   │ Grade ║');
console.log('╠══════════════╪═════════╪═════════╪══════════╪═════════╪═════════╪═══════╣');

const planetNames = {
  sun: 'Sun       ', moon: 'Moon      ', mercury: 'Mercury   ',
  venus: 'Venus     ', mars: 'Mars      ', jupiter: 'Jupiter   ',
  saturn: 'Saturn    ', uranus: 'Uranus    ', neptune: 'Neptune   ',
  pluto: 'Pluto     '
};

for (const pk of LunarisBenchmark.PLANET_KEYS) {
  const p = results.perPlanet[pk];
  if (!p) continue;
  const name = planetNames[pk] || pk;
  console.log(
    `║ ${name}  │ ${String(p.mae).padStart(7)} │ ${String(p.rmse).padStart(7)} │ ${String(p.maxError).padStart(8)} │ ${String(p.median).padStart(7)} │ ${String(p.p95).padStart(7)} │   ${p.grade.level}   ║`
  );
}

console.log('╠══════════════╪═════════╪═════════╪══════════╪═════════╪═════════╪═══════╣');
const o = results.overall;
console.log(
  `║ OVERALL      │ ${String(o.mae).padStart(7)} │ ${String(o.rmse).padStart(7)} │ ${String(o.maxError).padStart(8)} │ ${String(o.median).padStart(7)} │ ${String(o.p95).padStart(7)} │   ${o.grade.level}   ║`
);
console.log('╚══════════════╧═════════╧═════════╧══════════╧═════════╧═════════╧═══════╝');
console.log('');

// Burç doğruluk oranları
console.log('Sign Accuracy (gezegen doğru burçta mı?):');
for (const pk of LunarisBenchmark.PLANET_KEYS) {
  const p = results.perPlanet[pk];
  if (!p) continue;
  const bar = '█'.repeat(Math.round(p.signAccuracy / 5)) + '░'.repeat(20 - Math.round(p.signAccuracy / 5));
  console.log(`  ${(planetNames[pk] || pk).trim().padEnd(10)} ${bar} ${p.signAccuracy}% (${p.signCorrect}/${p.signTotal})`);
}

console.log('');
console.log('✅ Benchmark tamamlandı.');
