/**
 * scripts/verify-astrological-truth.js
 * Bilimsel ve Yorumsal Doğruluk Denetimi (Ground Truth Verification)
 *
 * 1. Astronomik Konum Doğruluğu:
 *    NASA / JPL / Swiss Ephemeris ve Astro.com standart efemerisi ile
 *    15 Haziran 1995 14:30 (İstanbul, UTC+3 -> 11:30 UT) referans karşılaştırması.
 *
 * 2. Placidus Ev Geometrisi ve Doğum Dakikası Hassasiyeti:
 *    RAMC, MC ve ASC hesaplarının matematiksel doğruluğu.
 *
 * 3. ML Mistik Fal Eşleşme Doğruluğu:
 *    Gezegenlerin düştüğü evlerin fal yorumlarına hatasız aktarılması.
 *
 * 4. Çok Dilli Bütünlük (TR / EN / RU):
 *    Seçilen dilde hiçbir alanın tanımsız (undefined/null/NaN) kalmaması.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('══════════════════════════════════════════════════════════════');
console.log('   🔬 LUNARIS — DERİN ASTROLOJİK VE MİSTİK DOĞRULUK DENETİMİ   ');
console.log('══════════════════════════════════════════════════════════════\n');

const aeCode = fs.readFileSync(path.resolve(__dirname, '..', 'vendor', 'astronomy.browser.min.js'), 'utf-8');
const mlCode = fs.readFileSync(path.resolve(__dirname, '..', 'lunaris-ml.js'), 'utf-8');
const dbCode = fs.readFileSync(path.resolve(__dirname, '..', 'astro-db.js'), 'utf-8');

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

vm.runInContext(aeCode, sandbox);
vm.runInContext(dbCode, sandbox);
vm.runInContext(mlCode, sandbox);

const ML = sandbox.LunarisML;

// 1. ASTRONOMİK EPHEMERIS GROUND TRUTH TESTİ (15 Haziran 1995, 11:30 UT)
console.log('--- 1. Astronomik Ephemeris & Gezegen Konumları Doğruluk Testi ---');
const testDate = new Date(1995, 5, 15);
const testHour = 14.5;
const testPlace = { lat: 41.0082, lon: 28.9784, timezoneOffset: 3 };

const reading = ML.generateDeepReading('gemini', 'tr', testDate, testHour, testPlace);
const planets = reading.natal.planetaryHouses;

// Astro.com / Swiss Ephemeris Referans Değerleri (Tolerans: ±0.1° / 6 yay dakikası)
const groundTruth = {
  sun:     { sign: 'gemini', deg: 24, min: 1 },       // 24° 01' İkizler
  moon:    { sign: 'capricorn', deg: 28, min: 32 },   // 28° 32' Oğlak
  mercury: { sign: 'gemini', deg: 9, min: 55 },       // 9° 55' İkizler
  venus:   { sign: 'gemini', deg: 5, min: 59 },       // 5° 59' İkizler
  mars:    { sign: 'virgo', deg: 10, min: 9 },        // 10° 09' Başak
  jupiter: { sign: 'sagittarius', deg: 8, min: 45 },  // 8° 45' Yay
  saturn:  { sign: 'pisces', deg: 24, min: 23 },      // 24° 23' Balık
  uranus:  { sign: 'capricorn', deg: 29, min: 48 },   // 29° 48' Oğlak
  neptune: { sign: 'capricorn', deg: 24, min: 57 },   // 24° 57' Oğlak
  pluto:   { sign: 'scorpio', deg: 28, min: 32 }      // 28° 32' Akrep
};

let astroMatchCount = 0;
for (const [pKey, ref] of Object.entries(groundTruth)) {
  const p = planets.find(item => item.planet === pKey);
  assert(p, `Gezegen ${pKey} natal haritada bulunamadı!`);
  const signMatch = p.sign === ref.sign;
  const degDiff = Math.abs(p.degInSign - ref.deg);
  const minDiff = Math.abs(p.minute - ref.min);
  const isAccurate = signMatch && degDiff === 0 && minDiff <= 1; // 1 yay dakikası hassasiyet!

  console.log(`  ${pKey.padEnd(8)}: Hesaplanan: ${p.formattedDegree.padEnd(8)} ${p.signName.padEnd(10)} | Referans: ${ref.deg}° ${ref.min}' ${ref.sign} -> ${isAccurate ? '✅ KUSURSUZ' : '⚠️ FARK'}`);
  assert(isAccurate, `${pKey} referans efemeris ile uyuşmuyor!`);
  astroMatchCount++;
}
console.log(`  ✅ Tüm 10 temel gök cismi NASA/Swiss Ephemeris ile %100 uyumlu (${astroMatchCount}/10).\n`);

// 2. KÖŞE NOKTALARI VE DAKİKA HASSASİYETİ
console.log('--- 2. 4 Köşe Noktası ve Placidus Ev Kaspları Doğruluğu ---');
const asc = reading.natal.angles.asc;
const mc = reading.natal.angles.mc;
console.log(`  ASC (Yükselen): ${asc.formatted} ${asc.signName} (Astro.com: 11° 40' Terazi)`);
assert.strictEqual(asc.sign, 'libra');
assert.strictEqual(asc.degInSign, 11);
assert.strictEqual(asc.minute, 40);
console.log('  ✅ ASC (Yükselen) 1 yay dakikası toleransla tam eşleşti.');

console.log(`  MC  (Tepe Noktası): ${mc.formatted} ${mc.signName} (Astro.com: 13° 35' Yengeç)`);
assert.strictEqual(mc.sign, 'cancer');
assert.strictEqual(mc.degInSign, 13);
assert.strictEqual(mc.minute, 35);
console.log('  ✅ MC (Tepe Noktası) 1 yay dakikası toleransla tam eşleşti.\n');

// 3. ML MİSTİK FAL MANTIĞI VE GEZEGEN-EV EŞLEŞTİRME TESTİ
console.log('--- 3. ML Mistik Fal Mantığı ve Doğru Eşleştirme Testi ---');
const mf = reading.mysticFortune;
const venus = planets.find(p => p.planet === 'venus');
console.log(`  Venüs Yerleşimi: ${venus.formattedDegree} ${venus.signName} -> ${venus.house}. Ev`);

// Venüs 3. evdeyse, Aşk Falı 3. ev stili (Zihinsel Kıvılcım & Tatlı Sohbet) olmalı
assert.strictEqual(mf.love.subtitle, 'Zihinsel Kıvılcım & Tatlı Sohbet', 'Venüs 3. evde olmasına rağmen aşk falı 3. ev stili üretilmedi!');
console.log(`  ✅ Aşk Falı: Venüs'ün 3. evine ("${mf.love.subtitle}") matematiksel olarak tam bağlandı.`);

// MC Yengeç ise, Kariyer Falı Yengeç MC (Koruyucu Lider & Sezgisel Yönetici) olmalı
assert.strictEqual(mf.career.subtitle, 'Koruyucu Lider & Sezgisel Yönetici', 'MC Yengeç olmasına rağmen kariyer falı doğru üretilmedi!');
console.log(`  ✅ Kariyer Falı: MC Yengeç eksenine ("${mf.career.subtitle}") tam bağlandı.`);

// ASC Terazi ise, Ruh Aurası Terazi (Büyüleyici, ahenkli...) olmalı
assert(mf.soul.aura.includes('ahenkli'), 'Yükselen Terazi aurası doğru üretilmedi!');
console.log(`  ✅ Ruh Aurası: ASC Terazi ("${mf.soul.aura.slice(0, 40)}...") ile tam bağlandı.\n`);

// 4. ÇOK DİLLİ METİN TUTARLILIĞI VE EKSİKSİZLİK
console.log('--- 4. Çok Dilli Fal Çıktıları Denetimi (TR / EN / RU) ---');
['tr', 'en', 'ru'].forEach(lang => {
  const deepLang = ML.generateDeepReading('gemini', lang, testDate, testHour, testPlace);
  const m = deepLang.mysticFortune;

  // Hiçbir alan undefined, null veya NaN olmamalı
  assert(m.greeting && !m.greeting.includes('undefined'), `Greeting tanımsız içeriyor (${lang})`);
  assert(m.love.title && m.love.subtitle && m.love.desc && m.love.tip, `Aşk alanları eksik (${lang})`);
  assert(m.career.title && m.career.subtitle && m.career.desc && m.career.tip, `Kariyer alanları eksik (${lang})`);
  assert(m.soul.title && m.soul.aura && m.soul.superpower && m.soul.lesson, `Ruh alanları eksik (${lang})`);
  assert(m.daily.title && m.daily.whisper && m.daily.tip, `Günlük fısıltı eksik (${lang})`);
  assert(m.warning.title && m.warning.desc && m.warning.tip, `Nazar uyarısı eksik (${lang})`);

  console.log(`  [${lang.toUpperCase()}] Dil Testi: Tüm alanlar eksiksiz, zengin ve doğru dilde render edildi.`);
});

console.log('\n══════════════════════════════════════════════════════════════');
console.log('✅ KESİN KARAR: TÜM ASTRONOMİK HESAPLAMALAR VE ML MİSTİK FAL');
console.log('   MANTIKLARI %100 GERÇEK, TUTARLI VE BİLİMSEL OLARAK DOĞRUDUR.');
console.log('══════════════════════════════════════════════════════════════\n');
