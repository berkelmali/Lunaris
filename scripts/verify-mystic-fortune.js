/**
 * scripts/verify-mystic-fortune.js
 * Doğrulama Betiği: ML Mistik Fal Tercümanı & Kullanıcı Dostu Fal İfadeleri
 * TR, EN ve RU dillerinde fal sentezi, ev bazlı dinamik yorumlar ve veri bütünlüğü denetimi.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('🔮 ML Mistik Fal & Kullanıcı Dostu Tercüman Doğrulaması Başlıyor...\n');

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

const ML = sandbox.LunarisML;
assert(ML, 'LunarisML yüklenemedi!');
assert(typeof ML.generateMysticFortune === 'function', 'generateMysticFortune fonksiyonu mevcut değil!');

// Test 1: 15 Haziran 1995, 14:30 İstanbul (İkizler Güneş, Oğlak Ay, Terazi ASC)
const birthDate = new Date(1995, 5, 15);
const birthHour = 14.5;
const birthPlace = { lat: 41.0082, lon: 28.9784, timezoneOffset: 3 };

['tr', 'en', 'ru'].forEach(lang => {
  console.log(`--- [${lang.toUpperCase()}] Dilinde Derin Okuma ve Mistik Fal Testi ---`);
  const deep = ML.generateDeepReading('gemini', lang, birthDate, birthHour, birthPlace);
  assert(deep, `Deep reading üretilemedi (${lang})`);
  assert(deep.mysticFortune, `mysticFortune alanı bulunamadı (${lang})`);

  const mf = deep.mysticFortune;
  console.log(`  ✓ Karşılama: ${mf.greeting.slice(0, 60)}...`);
  console.log(`  ✓ Güneş Künyesi: ${mf.sunMeta.glyph} ${mf.sunMeta.label} -> ${mf.sunMeta.sign}`);
  console.log(`  ✓ Ay Künyesi: ${mf.moonMeta.glyph} ${mf.moonMeta.label} -> ${mf.moonMeta.sign}`);
  console.log(`  ✓ Yükselen Künyesi: ${mf.ascMeta.glyph} ${mf.ascMeta.label} -> ${mf.ascMeta.sign}`);

  // Aşk Falı
  assert(mf.love && mf.love.title && mf.love.desc && mf.love.tip, `Aşk falı eksik (${lang})`);
  console.log(`  💖 [${mf.love.title}]: ${mf.love.subtitle}`);
  console.log(`     Özet: ${mf.love.desc.slice(0, 80)}...`);
  console.log(`     Tavsiye: ${mf.love.tip.slice(0, 70)}...`);

  // Kariyer & Para Falı
  assert(mf.career && mf.career.title && mf.career.desc && mf.career.tip, `Kariyer falı eksik (${lang})`);
  console.log(`  💼 [${mf.career.title}]: ${mf.career.subtitle}`);
  console.log(`     Akış: ${mf.career.desc.slice(0, 80)}...`);
  console.log(`     Pusula: ${mf.career.tip.slice(0, 70)}...`);

  // Ruhun Gücü
  assert(mf.soul && mf.soul.aura && mf.soul.superpower && mf.soul.lesson, `Ruh falı eksik (${lang})`);
  console.log(`  🧿 [${mf.soul.title}]: Aura: ${mf.soul.aura.slice(0, 60)}...`);
  console.log(`     Süper Güç: ${mf.soul.superpower.slice(0, 60)}...`);

  // Günün Fısıltısı & Nazar Notu
  assert(mf.daily && mf.daily.whisper && mf.daily.tip, `Günün fısıltısı eksik (${lang})`);
  assert(mf.warning && mf.warning.title && mf.warning.desc && mf.warning.tip, `Nazar uyarısı eksik (${lang})`);
  console.log(`  🔮 [Günün Fısıltısı]: ${mf.daily.whisper.slice(0, 75)}...`);
  console.log(`  🪬 [${mf.warning.title}]: ${mf.warning.desc.slice(0, 75)}...\n`);
});

// Test 2: Doğum Saati Değişimi ile Falın Dinamik Olarak Değiştiğini Doğrulama
console.log('⏱️ Doğum Saati Değişiminin Fal İfadelerine Etkisi Testi:');
const readingNoon = ML.generateDeepReading('gemini', 'tr', birthDate, 12.0, birthPlace);
const readingNight = ML.generateDeepReading('gemini', 'tr', birthDate, 22.0, birthPlace);

console.log(`  12:00 -> Aşk Stili: "${readingNoon.mysticFortune.love.subtitle}" | ASC Aurası: "${readingNoon.mysticFortune.soul.aura.slice(0, 30)}..."`);
console.log(`  22:00 -> Aşk Stili: "${readingNight.mysticFortune.love.subtitle}" | ASC Aurası: "${readingNight.mysticFortune.soul.aura.slice(0, 30)}..."`);

assert.notStrictEqual(
  readingNoon.mysticFortune.soul.aura,
  readingNight.mysticFortune.soul.aura,
  'Doğum saati değiştiğinde ASC aurası değişmedi!'
);
console.log('  ✅ Doğum saati farkının fala dinamik yansıması başarıyla doğrulandı.\n');

console.log('✨ TÜM MİSTİK FAL VE KULLANICI DOSTU TERCÜMAN TESTLERİ BAŞARIYLA GEÇTİ!');
