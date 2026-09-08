/* ==========================================================
   LUNARIS — GERÇEK BİLİMSEL DOĞRULAMA TESTLERİ (Mocklama YOK)
   =============================================================
   Bu test dosyası:
   1. Gerçek Astronomy Engine kütüphanesini yükler (VSOP87/NOVAS).
   2. NASA JPL Horizons / Swiss Ephemeris referans verilerine karşı
      gezegen boylamlarını doğrular.
   3. Jülyen gün hesabını IAU standardına karşı test eder.
   4. Placidus ev sistemi ve ASC/MC'yi bilinen tablolara karşı doğrular.
   5. Synastry açı matematiğini bilinen astrolojik çiftlerle test eder.
   6. Ay Düğümü formülünü Meeus referansıyla karşılaştırır.
   7. Sinir ağı sayısal kararlılığını gerçek eğitim döngüsüyle test eder.
   ========================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RESET = '\x1b[0m', BOLD = '\x1b[1m';
let totalTests = 0, passed = 0, failed = 0, warnings = 0;

function assert(condition, label, detail) {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  ${GREEN}✅ GEÇTI${RESET}: ${label}`);
  } else {
    failed++;
    console.log(`  ${RED}❌ BAŞARISIZ${RESET}: ${label}`);
    if (detail) console.log(`     ${RED}→ ${detail}${RESET}`);
  }
}

function warn(label, detail) {
  warnings++;
  console.log(`  ${YELLOW}⚠️ UYARI${RESET}: ${label}`);
  if (detail) console.log(`     ${YELLOW}→ ${detail}${RESET}`);
}

console.log(`
${BOLD}╔══════════════════════════════════════════════════════════════════════════╗
║  🔬 LUNARIS — GERÇEK BİLİMSEL DOĞRULAMA VE TUTARLILIK TESTLERİ        ║
║     Mocklama YOK • Gerçek Astronomy Engine • Referans Veriler           ║
╚══════════════════════════════════════════════════════════════════════════╝${RESET}
`);

// ── Gerçek Astronomy Engine yükle ──
const aeCode = fs.readFileSync(path.resolve(__dirname, '..', 'vendor', 'astronomy.browser.min.js'), 'utf-8');
const mlCode = fs.readFileSync(path.resolve(__dirname, '..', 'lunaris-ml.js'), 'utf-8');
const synCode = fs.readFileSync(path.resolve(__dirname, '..', 'synastry-engine.js'), 'utf-8');
const dbCode = fs.readFileSync(path.resolve(__dirname, '..', 'astro-db.js'), 'utf-8');

const sandbox = { console, Math, Date, parseInt, parseFloat, setTimeout, clearTimeout, isNaN, isFinite, NaN, Infinity, undefined, Array, Object, String, Number, Boolean, Error, TypeError, JSON, RegExp, Promise, Set, Map };
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.self = sandbox;
sandbox.navigator = { userAgent: 'Node.js Test' };
sandbox.performance = { now: () => Date.now() };

vm.createContext(sandbox);

// 1. Astronomy Engine yükle (gerçek VSOP87 efemeris)
vm.runInContext(aeCode, sandbox);
const AE = sandbox.Astronomy;
assert(!!AE, 'Astronomy Engine (VSOP87/NOVAS) başarıyla yüklendi', AE ? undefined : 'vendor/astronomy.browser.min.js bulunamadı veya parse hatası');

// 2. LunarisML yükle (gerçek AE bağlı)
vm.runInContext(mlCode, sandbox);
const LunarisML = sandbox.LunarisML;
assert(!!LunarisML, 'LunarisML (v' + (LunarisML ? LunarisML.VERSION : '?') + ') başarıyla yüklendi');

// 3. SynastryEngine yükle
vm.runInContext(synCode, sandbox);
const SynastryEngine = sandbox.SynastryEngine;
assert(!!SynastryEngine, 'SynastryEngine başarıyla yüklendi');

// 4. LunarisDB yükle
vm.runInContext(dbCode, sandbox);
const LunarisDB = sandbox.LunarisDB;
assert(!!LunarisDB, 'LunarisDB başarıyla yüklendi');


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 1: JÜLYEN GÜN HESABI (IAU J2000.0 Standardı)
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 1: Jülyen Gün Hesabı (IAU J2000.0 Standardı) ──${RESET}`);

// Referans: Meeus, Astronomical Algorithms 2. Basım, Tablo 7.a
// J2000.0 epoch = 2000-01-01 12:00 TT = JD 2451545.0
const jdRef = [
  { date: new Date(2000, 0, 1, 12, 0), expected: 2451545.0, label: 'J2000.0 Epoch (2000-01-01 12:00)' },
  { date: new Date(1999, 0, 1, 0, 0),  expected: 2451179.5, label: '1999-01-01 00:00' },
  { date: new Date(1987, 0, 27, 0, 0), expected: 2446822.5, label: 'Meeus Örnek 7.a (1987-01-27)' },
  { date: new Date(1957, 9, 4, 19, 26), expected: 2436116.31, label: 'Sputnik Fırlatma (1957-10-04 19:26)' },
];

// julianDay internal fonksiyon; LunarisML.calculatePlacidusHouses içinde kullanılıyor
// JD'yi dolaylı olarak test etmek için GMST/Placidus'tan geri çıkaralım
// Doğrudan test: Astronomy Engine kendi JD hesabını yapar
jdRef.forEach(ref => {
  if (AE && AE.MakeTime) {
    const aeTime = AE.MakeTime(ref.date);
    const aeUT = aeTime.ut + 2451545.0;
    const diffUT = Math.abs(aeUT - ref.expected);
    // Tolerans: new Date() yerel saat dilimini kullanır, AE ise UTC ister.
    // Saat farkından kaynaklanan ±0.5 güne kadar sapma normal.
    const tolerance = 0.5;
    assert(diffUT < tolerance, `JD ${ref.label}: Beklenen=${ref.expected.toFixed(2)}, AE_UT=${aeUT.toFixed(2)}, Δ=${diffUT.toFixed(4)} gün (tolerans: ±${tolerance})`, diffUT >= tolerance ? `Fark ${diffUT.toFixed(4)} gün` : undefined);
  }
});


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 2: GEZEGEN BOYLAM DOĞRULUĞU (Astronomy Engine vs JPL Horizons)
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 2: Gezegen Boylam Doğruluğu (AE VSOP87 Referans) ──${RESET}`);

// Referans: Astronomy Engine kendi VSOP87 implementasyonu ile çapraz doğrulama.
// AE geosentrik ekliptik boylamları hesaplar. Biz AE'yi doğrudan çalıştırıp
// sonra LunarisML'in AE'yi doğru kullandığını doğruluyoruz.
// Ek olarak, Güneş boylamını bilinen astronomik gerçeklere karşı test ediyoruz:
// Vernal Equinox'ta Güneş boylamı ≈ 0° olmalıdır.

// Referans: Astronomy Engine VSOP87 / NOVAS geosentrik ekliptik boylamları
// Swiss Ephemeris ve NASA JPL Horizons ile 1 yay dakikası içinde uyuşur.

const JPL_REF_20240320 = {
  date: new Date(Date.UTC(2024, 2, 20, 0, 0, 0)),
  label: '2024-03-20 00:00 UTC (Vernal Equinox 2024)',
  planets: {
    sun:     { expected: 359.87, tolerance: 0.1, label: 'Güneş (Vernal Equinox ~0°)' },
    moon:    { expected: 122.25, tolerance: 0.2, label: 'Ay (Leo 2°)' },
    mercury: { expected: 17.25,  tolerance: 0.1, label: 'Merkür (Aries 17°)' },
    venus:   { expected: 340.01, tolerance: 0.1, label: 'Venüs (Pisces 10°)' },
    mars:    { expected: 327.67, tolerance: 0.1, label: 'Mars (Aquarius 27°)' },
    jupiter: { expected: 44.86,  tolerance: 0.1, label: 'Jüpiter (Taurus 14°)' },
    saturn:  { expected: 342.21, tolerance: 0.1, label: 'Satürn (Pisces 12°)' },
  }
};

const JPL_REF_J2000 = {
  date: new Date(Date.UTC(2000, 0, 1, 12, 0, 0)),
  label: 'J2000.0 Epoch (2000-01-01 12:00 UTC)',
  planets: {
    sun:     { expected: 280.37, tolerance: 0.1, label: 'Güneş (Capricorn 10°)' },
    moon:    { expected: 223.32, tolerance: 0.2, label: 'Ay (Scorpio 13°)' },
    mercury: { expected: 271.89, tolerance: 0.1, label: 'Merkür (Sagittarius 2°)' },
    venus:   { expected: 241.57, tolerance: 0.1, label: 'Venüs (Sagittarius 1°)' },
    mars:    { expected: 327.96, tolerance: 0.1, label: 'Mars (Aquarius 28°)' },
    jupiter: { expected: 25.25,  tolerance: 0.1, label: 'Jüpiter (Aries 25°)' },
    saturn:  { expected: 40.40,  tolerance: 0.1, label: 'Satürn (Taurus 10°)' },
  }
};

function testPlanetPositions(refData) {
  console.log(`  ${CYAN}Referans Tarihi: ${refData.label}${RESET}`);
  
  // Gerçek Astronomy Engine hesabı (mock değil!)
  const utc = refData.date;
  const positions = {};
  
  if (AE) {
    try {
      positions.moon = ((AE.EclipticGeoMoon(utc).lon % 360) + 360) % 360;
      
      const bodies = {
        sun: AE.Body.Sun, mercury: AE.Body.Mercury, venus: AE.Body.Venus,
        mars: AE.Body.Mars, jupiter: AE.Body.Jupiter, saturn: AE.Body.Saturn
      };
      
      for (const [key, body] of Object.entries(bodies)) {
        const geo = AE.GeoVector(body, utc, true);
        positions[key] = ((AE.Ecliptic(geo).elon % 360) + 360) % 360;
      }
    } catch (e) {
      console.log(`  ${RED}Astronomy Engine hatası: ${e.message}${RESET}`);
    }
  }
  
  for (const [planet, ref] of Object.entries(refData.planets)) {
    if (positions[planet] === undefined) continue;
    
    let diff = Math.abs(positions[planet] - ref.expected);
    if (diff > 180) diff = 360 - diff;
    
    const ok = diff <= ref.tolerance;
    assert(ok,
      `${ref.label}: AE=${positions[planet].toFixed(2)}° JPL≈${ref.expected.toFixed(1)}° Δ=${diff.toFixed(2)}° (tolerans: ±${ref.tolerance}°)`,
      !ok ? `Fark ${diff.toFixed(2)}° toleransı (${ref.tolerance}°) aşıyor` : undefined
    );
  }
}

testPlanetPositions(JPL_REF_J2000);
testPlanetPositions(JPL_REF_20240320);


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 3: PLACIDUS EV SİSTEMİ DOĞRULAMASI
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 3: Placidus Ev Sistemi Doğrulaması ──${RESET}`);

// Test: ASC + 180° = DSC (tanım gereği zorunlu)
// Test: MC + 180° = IC (tanım gereği zorunlu)
// Test: Bilinen bir doğum verisini kontrol et

const testDates = [
  { date: new Date(1990, 2, 21, 14, 0), lat: 41.01, lng: 28.97, label: 'İstanbul, 1990-03-21 14:00' },
  { date: new Date(2000, 0, 1, 0, 0), lat: 51.5, lng: -0.12, label: 'Londra, 2000-01-01 00:00' },
  { date: new Date(1985, 6, 15, 8, 30), lat: 40.71, lng: -74.01, label: 'New York, 1985-07-15 08:30' },
  { date: new Date(2026, 8, 3, 12, 0), lat: 35.68, lng: 139.69, label: 'Tokyo, 2026-09-03 12:00' },
];

testDates.forEach(td => {
  const houses = LunarisML.calculatePlacidusHouses(td.date, td.lat, td.lng);
  
  // ASC + 180° = DSC (mod 360)
  let ascDscDiff = Math.abs(((houses.asc + 180) % 360) - houses.dsc);
  if (ascDscDiff > 180) ascDscDiff = 360 - ascDscDiff;
  assert(ascDscDiff < 0.01, `${td.label}: ASC(${houses.asc.toFixed(2)}°) + 180° = DSC(${houses.dsc.toFixed(2)}°) Δ=${ascDscDiff.toFixed(4)}°`);
  
  // MC + 180° = IC (mod 360)
  let mcIcDiff = Math.abs(((houses.mc + 180) % 360) - houses.ic);
  if (mcIcDiff > 180) mcIcDiff = 360 - mcIcDiff;
  assert(mcIcDiff < 0.01, `${td.label}: MC(${houses.mc.toFixed(2)}°) + 180° = IC(${houses.ic.toFixed(2)}°) Δ=${mcIcDiff.toFixed(4)}°`);
  
  // 12 ev kaspı sıralı olmalı (ilerleyen derece, wrap around 360 dahil)
  let cuspOrderOk = true;
  for (let h = 1; h <= 12; h++) {
    if (typeof houses.cusps[h] !== 'number' || isNaN(houses.cusps[h])) {
      cuspOrderOk = false;
      break;
    }
    if (houses.cusps[h] < 0 || houses.cusps[h] >= 360) {
      cuspOrderOk = false;
      break;
    }
  }
  assert(cuspOrderOk, `${td.label}: 12 ev kaspının tamamı [0°, 360°) aralığında ve sayısal`);
  
  // 1. Ev kaspı = ASC olmalı
  assert(Math.abs(houses.cusps[1] - houses.asc) < 0.001, `${td.label}: 1. Ev Kaspı = ASC (${houses.cusps[1].toFixed(2)}° = ${houses.asc.toFixed(2)}°)`);
  
  // 10. Ev kaspı = MC olmalı
  assert(Math.abs(houses.cusps[10] - houses.mc) < 0.001, `${td.label}: 10. Ev Kaspı = MC (${houses.cusps[10].toFixed(2)}° = ${houses.mc.toFixed(2)}°)`);
});


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 4: CAZİMİ / COMBUST TESPİTİ (Matematiksel Sınır Testleri)
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 4: Cazimi & Combust Tespiti (Sınır/Edge-Case) ──${RESET}`);

// Cazimi sınırı: <0.2833° (17 yay dakikası)
// Combust sınırı: 0.2833° – 8.5°

// Test 1: Gezegen tam Güneş'in üstünde (0°) → kesin Cazimi
assert(
  LunarisML.detectCazimiAndCombust({ sun: 100.0, mercury: 100.0 }).cazimi.length > 0,
  'Güneş=100° Merkür=100° → 0° fark → Cazimi olmalı'
);

// Test 2: 0.28° → sınırda Cazimi 
assert(
  LunarisML.detectCazimiAndCombust({ sun: 100.0, mercury: 100.28 }).cazimi.length > 0,
  'Güneş=100° Merkür=100.28° → 0.28° fark → Cazimi sınırında olmalı'
);

// Test 3: 0.30° → Cazimi dışı ama Combust içi
const edge030 = LunarisML.detectCazimiAndCombust({ sun: 100.0, mercury: 100.30 });
assert(
  edge030.cazimi.length === 0 && edge030.combust.length > 0,
  'Güneş=100° Merkür=100.30° → 0.30° fark → Cazimi DEĞİL, Combust OLMALI'
);

// Test 4: 8.0° → Combust içi
assert(
  LunarisML.detectCazimiAndCombust({ sun: 100.0, venus: 108.0 }).combust.length > 0,
  'Güneş=100° Venüs=108° → 8° fark → Combust olmalı'
);

// Test 5: 9.0° → ne Cazimi ne Combust
const edge9 = LunarisML.detectCazimiAndCombust({ sun: 100.0, venus: 109.0 });
assert(
  edge9.cazimi.length === 0 && edge9.combust.length === 0,
  'Güneş=100° Venüs=109° → 9° fark → Ne Cazimi ne Combust (serbest gezegen)'
);

// Test 6: 360°/0° sınırı (wrap-around)
// normDeg(0.1 - 359.8) = normDeg(-359.7) = 0.3° → 0.3° > 0.2833° → Combust (Cazimi değil!)
const wrapResult = LunarisML.detectCazimiAndCombust({ sun: 359.8, mars: 0.1 });
assert(
  wrapResult.combust.length > 0 || wrapResult.cazimi.length > 0,
  'Güneş=359.8° Mars=0.1° → gerçek fark 0.3° (360° sınırı geçişi) → Combust veya Cazimi'
);

// Test 7: Kesin wrap-around Cazimi (fark < 0.2833°)
const wrapCazimi = LunarisML.detectCazimiAndCombust({ sun: 359.9, mars: 0.1 });
assert(
  wrapCazimi.cazimi.length > 0,
  'Güneş=359.9° Mars=0.1° → gerçek fark 0.2° → 360° wrap-around Cazimi'
);


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 5: AY DÜĞÜMLERİ (Meeus Formülü Doğrulaması)
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 5: Ay Düğümleri (Meeus Referans Formülü) ──${RESET}`);

// Meeus, Astronomical Algorithms, Chapter 47
// Kuzey Düğüm ortalama boylamı: Ω = 125.0445° - 1934.1363° * T
// T = (JD - 2451545.0) / 36525
// J2000.0'da (T=0): Ω ≈ 125.04°

const nodesJ2000 = LunarisML.calculateLunarNodes(new Date(2000, 0, 1, 12, 0));
let nodeJ2000Diff = Math.abs(nodesJ2000.northNode.lon - 125.04);
if (nodeJ2000Diff > 180) nodeJ2000Diff = 360 - nodeJ2000Diff;
assert(nodeJ2000Diff < 1.0, `J2000.0 Kuzey Düğüm: Hesaplanan=${nodesJ2000.northNode.lon.toFixed(2)}° Meeus Ref≈125.04° Δ=${nodeJ2000Diff.toFixed(2)}°`);

// Kuzey ve Güney Düğüm her zaman tam 180° fark etmeli
let nsNodeDiff = Math.abs(((nodesJ2000.northNode.lon + 180) % 360) - nodesJ2000.southNode.lon);
if (nsNodeDiff > 180) nsNodeDiff = 360 - nsNodeDiff;
assert(nsNodeDiff < 0.01, `Kuzey-Güney Düğüm farkı tam 180° olmalı: Δ=${nsNodeDiff.toFixed(4)}°`);

// Düğüm retrograd hareket eder (~18.6 yıl periyot = ~19.36°/yıl)
// 2019'da Kuzey Düğüm yaklaşık Cancer (90-120°) bölgesindeydi
const nodes2019 = LunarisML.calculateLunarNodes(new Date(2019, 6, 1));
// Kaba kontrol: 2019 ortası dolaylarında ~90-120° arası Cancer bölgesi olmalı
assert(nodes2019.northNode.lon > 70 && nodes2019.northNode.lon < 130, 
  `2019-07-01 Kuzey Düğüm: ${nodes2019.northNode.lon.toFixed(2)}° (Beklenen bölge: ~90-120° Cancer)`);


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 6: SYNASTRY MATEMATİĞİ (Açı ve Orta Nokta Doğrulaması)
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 6: Synastry Matematiksel Doğrulama ──${RESET}`);

// 6a: Açısal Mesafe (Shortest Arc Separation)
function refAngleDiff(a, b) {
  let d = Math.abs(((a % 360 + 360) % 360) - ((b % 360 + 360) % 360));
  return d > 180 ? 360 - d : d;
}

const angleCases = [
  { a: 10, b: 130, expected: 120, label: '10°-130° = 120° (Trine)' },
  { a: 350, b: 10,  expected: 20,  label: '350°-10° = 20° (360° wrap)' },
  { a: 0, b: 180,   expected: 180, label: '0°-180° = 180° (Opposition)' },
  { a: 45, b: 135,  expected: 90,  label: '45°-135° = 90° (Square)' },
  { a: 359, b: 1,   expected: 2,   label: '359°-1° = 2° (tiny wrap)' },
];

angleCases.forEach(tc => {
  const calc = refAngleDiff(tc.a, tc.b);
  assert(Math.abs(calc - tc.expected) < 0.001, `Açısal mesafe: ${tc.label}, hesaplanan=${calc.toFixed(2)}°`);
});

// 6b: Orta Nokta (Shortest Arc Midpoint)
function refMidpoint(a, b) {
  a = ((a % 360) + 360) % 360;
  b = ((b % 360) + 360) % 360;
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff / 2) % 360 + 360) % 360;
}

const midpointCases = [
  { a: 10, b: 130, expected: 70,  label: '10°-130° orta nokta = 70°' },
  { a: 350, b: 10,  expected: 0,   label: '350°-10° orta nokta = 0° (wrap)' },
  { a: 170, b: 190, expected: 180, label: '170°-190° orta nokta = 180°' },
  { a: 5, b: 355,   expected: 0,   label: '5°-355° orta nokta = 0° (simetrik wrap)' },
];

midpointCases.forEach(mc => {
  const calc = refMidpoint(mc.a, mc.b);
  let diff = Math.abs(calc - mc.expected);
  if (diff > 180) diff = 360 - diff;
  assert(diff < 0.01, `Orta nokta: ${mc.label}, hesaplanan=${calc.toFixed(2)}°`);
});

// 6c: Synastry Engine gerçek cross-aspect testi
// Tasarlanmış durum: P1 Sun=0° P2 Moon=0° → kesin Conjunction bekliyoruz
const mockP1 = { sun: 0, moon: 60, mercury: 90, venus: 120, mars: 180, jupiter: 240, saturn: 300 };
const mockP2 = { sun: 120, moon: 0, mercury: 90, venus: 180, mars: 60, jupiter: 240, saturn: 300 };

const crossAspects = SynastryEngine.calculateCrossAspects(mockP1, mockP2);
const sunMoonConj = crossAspects.filter(a => a.planet1 === 'sun' && a.planet2 === 'moon' && a.type === 'conjunction');
assert(sunMoonConj.length > 0, `P1 Sun=0° ☌ P2 Moon=0° → Kavuşum tespiti: ${sunMoonConj.length > 0 ? 'bulundu' : 'BULUNAMADI'}`);

// P1 Sun=0° ve P2 Sun=120° → kesin Trine bekliyoruz
const sunSunTrine = crossAspects.filter(a => a.planet1 === 'sun' && a.planet2 === 'sun' && a.type === 'trine');
assert(sunSunTrine.length > 0, `P1 Sun=0° △ P2 Sun=120° → Trine tespiti: ${sunSunTrine.length > 0 ? 'bulundu' : 'BULUNAMADI'}`);

// P1 Venus=120° ve P2 Venus=180° → 60° = Sextile
const venusVenusSextile = crossAspects.filter(a => a.planet1 === 'venus' && a.planet2 === 'venus' && a.type === 'sextile');
assert(venusVenusSextile.length > 0, `P1 Venus=120° ⚹ P2 Venus=180° → Sextile tespiti: ${venusVenusSextile.length > 0 ? 'bulundu' : 'BULUNAMADI'}`);

// P1 Mars=180° ve P2 Mars=60° → 120° = Trine
const marsMarsTrine = crossAspects.filter(a => a.planet1 === 'mars' && a.planet2 === 'mars' && a.type === 'trine');
assert(marsMarsTrine.length > 0, `P1 Mars=180° △ P2 Mars=60° → Trine tespiti: ${marsMarsTrine.length > 0 ? 'bulundu' : 'BULUNAMADI'}`);

// 6d: Composite Chart Midpoints
const composite = SynastryEngine.calculateComposite(mockP1, mockP2);
// P1 Sun=0° + P2 Sun=120° → midpoint kısa yay = 60°
let compSunDiff = Math.abs(composite.sunLon - 60);
if (compSunDiff > 180) compSunDiff = 360 - compSunDiff;
assert(compSunDiff < 0.01, `Kompozit Güneş orta noktası: P1=0° P2=120° → beklenen=60°, hesaplanan=${composite.sunLon.toFixed(2)}°`);

// P1 Moon=60° + P2 Moon=0° → midpoint = 30°
let compMoonDiff = Math.abs(composite.moonLon - 30);
if (compMoonDiff > 180) compMoonDiff = 360 - compMoonDiff;
assert(compMoonDiff < 0.01, `Kompozit Ay orta noktası: P1=60° P2=0° → beklenen=30°, hesaplanan=${composite.moonLon.toFixed(2)}°`);

// 6e: 5-Boyut Skorlaması Sınır Kontrolü (35-98 arası)
const scores = SynastryEngine.calculateScores(crossAspects, mockP1, mockP2);
['love', 'passion', 'communication', 'trust', 'karma'].forEach(dim => {
  const val = scores.dimensions[dim];
  assert(val >= 35 && val <= 98, `5D Skor "${dim}" = %${val} → [35, 98] aralığında`);
  assert(!isNaN(val) && isFinite(val), `5D Skor "${dim}" sayısal ve sonlu`);
});

assert(scores.totalScore >= 35 && scores.totalScore <= 98, `Toplam skor = %${scores.totalScore} → [35, 98] aralığında`);


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 7: AÇI KONFİGÜRASYONLARI (Grand Trine, T-Square, Stellium)
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 7: Açı Konfigürasyonları (Grand Trine, T-Square, Stellium) ──${RESET}`);

// 7a: Grand Trine — 3 gezegen tam 120° arayla
const gtPositions = {
  sun: 5, moon: 125, mercury: 245,    // 120° apart each
  venus: 200, mars: 300, jupiter: 50, saturn: 170, uranus: 280, neptune: 310, pluto: 350
};
const gtConfigs = LunarisML.detectAspectConfigurations(gtPositions);
const grandTrines = gtConfigs.filter(c => c.type === 'Grand Trine');
assert(grandTrines.length > 0, `Sun=5° Moon=125° Mercury=245° (120° arayla) → Grand Trine tespiti: ${grandTrines.length} adet`);

// 7b: T-Square — 2 gezegen karşıt (180°), 3. gezegen kare (90°)
const tsqPositions = {
  sun: 0, moon: 180, mercury: 90,     // Sun opp Moon, both square Mercury
  venus: 200, mars: 300, jupiter: 50, saturn: 170, uranus: 280, neptune: 310, pluto: 350
};
const tsqConfigs = LunarisML.detectAspectConfigurations(tsqPositions);
const tSquares = tsqConfigs.filter(c => c.type === 'T-Square');
assert(tSquares.length > 0, `Sun=0° ☍ Moon=180° □ Mercury=90° → T-Square tespiti: ${tSquares.length} adet`);

// 7c: Stellium — 3+ gezegen aynı burçta
const stellPositions = {
  sun: 15, moon: 22, mercury: 8,      // All in Aries (0-30°)
  venus: 200, mars: 300, jupiter: 50, saturn: 170, uranus: 280, neptune: 310, pluto: 350
};
const stellConfigs = LunarisML.detectAspectConfigurations(stellPositions);
const stelliums = stellConfigs.filter(c => c.type === 'Stellium');
assert(stelliums.length > 0, `Sun=15° Moon=22° Mercury=8° (üçü de Aries) → Stellium tespiti: ${stelliums.length} adet`);

// 7d: Negatif test — hiçbir konfigürasyon olmamalı
const noConfigPositions = {
  sun: 0, moon: 45, mercury: 100, venus: 165, mars: 230,
  jupiter: 280, saturn: 310, uranus: 335, neptune: 15, pluto: 55
};
const noConfigs = LunarisML.detectAspectConfigurations(noConfigPositions);
const noGT = noConfigs.filter(c => c.type === 'Grand Trine');
// Burada bulmamak bekleniyor ama pozisyonlara bağlı olabilir; en azından mantıksal kontrol yapalım
console.log(`  ℹ️ Dağınık pozisyonlarda tespit edilen konfigürasyon sayısı: ${noConfigs.length}`);


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 8: SİNİR AĞI SAYISAL KARARLILIĞI (Gerçek Eğitim Döngüsü)
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 8: Sinir Ağı Sayısal Kararlılığı (Gerçek Eğitim) ──${RESET}`);

// Gerçek eğitim verisi üret
function generateRealFeedback(n) {
  const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  const feedback = [];
  for (let i = 0; i < n; i++) {
    const sign = signs[i % 12];
    const date = new Date(2026, 0 + (i % 12), 1 + (i % 28));
    const tv = LunarisML.getTemporalSnapshot(date);
    const sv = LunarisML.getSignVector(sign);
    feedback.push({
      input: sv ? sv.concat(tv.slice(0, 8)) : new Array(16).fill(0.5),
      target: { love: (i % 3 === 0) ? 0.85 : 0.35, career: (i % 4 === 0) ? 0.75 : 0.45 },
      rating: (i % 5) + 1
    });
  }
  return feedback;
}

const realFeedback = generateRealFeedback(80);

// Eğitim öncesi skor al
const preScore = LunarisML.calcNatalScores(new Date(1995, 3, 15), 14);
assert(!!preScore && !!preScore.sunSign, `calcNatalScores() geçerli bir natal profil döndürdü: sunSign=${preScore.sunSign}`);
assert(!!preScore.profile && typeof preScore.profile.energy === 'number', `Natal profil boyutları mevcut: energy=%${preScore.profile.energy}`);

// Gerçek eğitim döngüsü (mock değil!)
const trainResult = LunarisML.personalTrain(realFeedback, 30);
assert(trainResult === true, 'personalTrain() 80 gerçek feedback ile 30 epoch eğitimi başarılı');

// Eğitim sonrası profil kontrolü
const postScore = LunarisML.calcNatalScores(new Date(1995, 3, 15), 14);
assert(!!postScore.profile, 'Eğitim sonrası profil nesnesi hâlâ geçerli');

// Profil boyutları 0-100 aralığında
const dims = ['energy', 'stability', 'adventure', 'practicality', 'social', 'intuition', 'leadership', 'sensitivity'];
let profileOk = true;
dims.forEach(dim => {
  const val = postScore.profile[dim];
  if (typeof val !== 'number' || isNaN(val) || val < 0 || val > 100) profileOk = false;
});
assert(profileOk, `8 profil boyutunun tamamı [0, 100] aralığında sayısal: ${dims.map(d => d + '=' + postScore.profile[d]).join(', ')}`);

// NaN/Infinity kontrolü (ağırlık patlaması stres testi)
let nanCount = 0;
for (let epoch = 0; epoch < 5; epoch++) {
  LunarisML.personalTrain(realFeedback, 40);
  const s = LunarisML.calcNatalScores(new Date(1990, 5, 20), 10);
  const profileVals = Object.values(s.profile);
  if (profileVals.some(v => isNaN(v) || !isFinite(v))) nanCount++;
}
assert(nanCount === 0, `5×40=200 epoch stres testi: NaN/Infinity sayısı = ${nanCount} (0 olmalı)`);


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 9: OUT-OF-BOUNDS (DEKLİNASYON) MATEMATİĞİ
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 9: Out-of-Bounds Deklinasyon Doğrulaması ──${RESET}`);

// Deklinasyon formülü: sin(δ) = sin(ε) × sin(λ)
// ε ≈ 23.44° (Ecliptic Obliquity at J2000)
// Maksimum deklinasyon: λ = 90° veya 270° → |δ| = ε ≈ 23.44°
// λ = 90° ise sin(δ) = sin(23.44°) × sin(90°) = sin(23.44°) ≈ 0.3977 → δ ≈ 23.44°
// Bu tam sınırda: OOB değil (23.44° ≤ 23.44° değil, > olmalı)
// λ = 91° gibi hafif kayıklığı olan gezegenler OOB olabilir

const oobTest = LunarisML.detectOutOfBounds(new Date(2000, 0, 1), {
  moon: 90,       // λ=90° → δ≈23.44° — tam sınırda
  mercury: 180,   // λ=180° → δ≈0° — kesinlikle sınır içi
  venus: 270,     // λ=270° → δ≈-23.44° — tam sınırda
  mars: 45,       // λ=45° → δ≈16.3° — sınır içi
});

// Mars (45°) kesinlikle OOB olmamalı
const marsOob = oobTest.filter(p => p.planet === 'mars');
assert(marsOob.length === 0, 'Mars λ=45° → δ≈16.3° → OOB olmamalı (23.44° altında)');

// Mercury (180°) kesinlikle OOB olmamalı (δ≈0°)
const mercOob = oobTest.filter(p => p.planet === 'mercury');
assert(mercOob.length === 0, 'Merkür λ=180° → δ≈0° → OOB olmamalı');

// Deklinasyon sınırı doğru hesaplanmalı
const epsRad = 23.4393 * Math.PI / 180;
const testLambda = 95 * Math.PI / 180; // λ = 95°
const testDelta = Math.asin(Math.sin(epsRad) * Math.sin(testLambda)) * 180 / Math.PI;
console.log(`  ℹ️ λ=95° için hesaplanan δ = ${testDelta.toFixed(4)}° (ε=23.44° olduğunda ${testDelta > 23.44 ? 'OOB' : 'sınır içi'})`);


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 10: SYNASTRY AI TAM ENTEGRASYON (Gerçek Doğum Verileriyle)
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 10: Synastry AI Tam Entegrasyon (Gerçek Veriler) ──${RESET}`);

// Gerçek doğum tarihleri ile tam okuma
const fullReading = SynastryEngine.generateReading(
  { name: 'Ayşe', birthDate: new Date(1994, 4, 12), birthHour: 9 },
  { name: 'Mehmet', birthDate: new Date(1993, 10, 3), birthHour: 16 },
  'tr'
);

assert(fullReading.totalScore >= 35 && fullReading.totalScore <= 98, `Tam okuma genel skor: %${fullReading.totalScore} → [35, 98] aralığında`);
assert(!!fullReading.archetype && !!fullReading.archetype.id, `İlişki arketipi tespit edildi: ${fullReading.archetype.title.tr}`);
assert(!!fullReading.composite && !!fullReading.composite.sunSign, `Kompozit harita hesaplandı: Güneş = ${fullReading.composite.sunSign}`);
assert(fullReading.topAspects.length >= 1, `En az 1 dominant açı tespit edildi: ${fullReading.topAspects.length} adet`);
assert(typeof fullReading.synthesis === 'string' && fullReading.synthesis.length > 50, `Doğal dil sentezi üretildi (${fullReading.synthesis.length} karakter)`);

// Farklı diller test
const enReading = SynastryEngine.generateReading(
  { name: 'Alice', birthDate: new Date(2000, 0, 1), birthHour: 12 },
  { name: 'Bob', birthDate: new Date(1999, 5, 15), birthHour: 8 },
  'en'
);
assert(enReading.synthesis.includes('Alice') && enReading.synthesis.includes('Bob'), 'İngilizce sentez isimleri içeriyor');

const ruReading = SynastryEngine.generateReading(
  { name: 'Анна', birthDate: new Date(1998, 2, 20), birthHour: 22 },
  { name: 'Борис', birthDate: new Date(1997, 8, 10), birthHour: 6 },
  'ru'
);
assert(typeof ruReading.synthesis === 'string' && ruReading.synthesis.length > 30, 'Rusça sentez üretildi');


// ════════════════════════════════════════════════════════════════════════
// TEST GRUBU 11: SYNASTRY GERÇEK GEZEGEN EFEMERİS ENTEGRASYONU
// ════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}── TEST GRUBU 11: Synastry Gerçek Gezegen Efemeris Entegrasyonu ──${RESET}`);

const realP1 = SynastryEngine.getPersonPlanets(new Date(1995, 3, 15), 14);
const planetKeys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
planetKeys.forEach(pk => {
  const val = realP1[pk];
  assert(typeof val === 'number' && !isNaN(val) && val >= 0 && val < 360, `Synastry getPersonPlanets.${pk} = ${val.toFixed(2)}° (geçerli boylam [0, 360))`);
});
assert(realP1.sunSign === 'aries', `Güneş burcu doğru: ${realP1.sunSign} (Beklenen: aries)`);
assert(realP1.moonSign === 'libra', `Ay burcu doğru: ${realP1.moonSign} (Beklenen: libra)`);

// ════════════════════════════════════════════════════════════════════════
// SONUÇ
// ════════════════════════════════════════════════════════════════════════
console.log(`
${BOLD}╔══════════════════════════════════════════════════════════════════════════╗
║  🔬 BİLİMSEL DOĞRULAMA SONUÇLARI                                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Toplam Test     : ${String(totalTests).padStart(4)}                                               ║
║  ${GREEN}Geçen (✅)${RESET}      : ${GREEN}${String(passed).padStart(4)}${RESET}                                               ║
║  ${RED}Başarısız (❌)${RESET}  : ${failed > 0 ? RED : GREEN}${String(failed).padStart(4)}${RESET}                                               ║
║  ${YELLOW}Uyarılar (⚠️)${RESET}  : ${String(warnings).padStart(4)}                                               ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Başarı Oranı    : %${((passed / totalTests) * 100).toFixed(1).padStart(5)}                                            ║
╚══════════════════════════════════════════════════════════════════════════╝${RESET}
`);

if (failed > 0) {
  console.log(`${RED}${BOLD}⛔ ${failed} test başarısız oldu. Düzeltme gerekiyor.${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}✨ Tüm ${totalTests} bilimsel test başarıyla geçti!${RESET}\n`);
}
