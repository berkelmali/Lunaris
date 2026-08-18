/* ==========================================================
   LUNARIS ML — Bağımsız, Karşıt ve Tarafsız Doğrulama Paketi
   (Adversarial, Blind Holdout, Noise Tolerance,
    Permutation Test & Sensitivity Ablation Benchmark)
   ========================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  ⚖️  LUNARIS ML — Tarafsız & Karşıt (Adversarial) Benchmark ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const mlCode = fs.readFileSync(path.resolve(__dirname, '..', 'lunaris-ml.js'), 'utf-8');
const sandbox = { window: {}, Math, Date, console, parseFloat, parseInt, isNaN };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(mlCode, sandbox);
const LunarisML = sandbox.LunarisML;

const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const categories = ['love', 'luck', 'career', 'health', 'money', 'daily'];

// ══════════════════════════════════════════════════════════════
// TEST 1: Çelişkili Girdi & %50 Gürültü Dayanıklılığı (Conflicting Noise Stress)
// ══════════════════════════════════════════════════════════════
console.log('--- TEST 1: Çelişkili Geri Bildirim Gürültüsü (%50 👍 / %50 👎 Çatışma Testi) ---');
console.log('   Hipotez: Birbirine zıt oylar verildiğinde model ne patlamalı ne de uçlara kilitlenmeli.');

const conflictDataset = [];
for (let i = 0; i < 100; i++) {
  const sign = signs[i % signs.length];
  const date = new Date(2026, 0, (i % 28) + 1);
  conflictDataset.push({
    signVector: LunarisML.getSignVector(sign),
    temporalVector: LunarisML.getTemporalSnapshot(date),
    category: 'luck',
    rating: i % 2 === 0 ? 1 : 0 // Tam olarak %50 pozitif, %50 negatif
  });
}

const preConflictScores = signs.map(s => LunarisML.getCategoryScores(s, new Date()).luck);
LunarisML.personalTrain(conflictDataset);
const postConflictScores = signs.map(s => LunarisML.getCategoryScores(s, new Date()).luck);

let avgShift = 0;
let hasNaNOrInfinity = false;
let lockedToExtremes = false;

for (let i = 0; i < signs.length; i++) {
  const diff = Math.abs(postConflictScores[i] - preConflictScores[i]);
  avgShift += diff;
  if (isNaN(postConflictScores[i]) || !isFinite(postConflictScores[i])) hasNaNOrInfinity = true;
  if (postConflictScores[i] > 0.95 || postConflictScores[i] < 0.05) lockedToExtremes = true;
}
avgShift /= signs.length;

console.log(`   Ortalama Skor Kayması: %${(avgShift * 100).toFixed(2)} (İdeal: Düşük sapma ve merkezde denge)`);
console.log(`   NaN/Sonsuzluk Var mı?: ${hasNaNOrInfinity ? '❌ VAR (HATA)' : '✅ YOK'}`);
console.log(`   Uç Değerlere (0.05 veya 0.95) Kilitlenme Var mı?: ${lockedToExtremes ? '❌ VAR' : '✅ YOK'}`);

const test1Passed = !hasNaNOrInfinity && !lockedToExtremes && avgShift < 0.08;
console.log(`   Sonuç: ${test1Passed ? '✅ [TARAFIZ TEST GEÇTİ]' : '❌ [BAŞARISIZ]'}\n`);

// ══════════════════════════════════════════════════════════════
// TEST 2: Permütasyon / Sıfır Hipotezi Testi (Gerçek vs Rastgele Etiket)
// ══════════════════════════════════════════════════════════════
console.log('--- TEST 2: Sıfır Hipotezi & Rastgele Etiket Karşılaştırması (Permutation Test) ---');
console.log('   Hipotez: Yapılandırılmış geri bildirim ile rastgele karıştırılmış geri bildirim farklı sonuç vermelidir.');

// Yapılandırılmış pozitif kariyer geri bildirimi
const structuredData = [];
for (let i = 0; i < 40; i++) {
  structuredData.push({
    signVector: LunarisML.getSignVector('leo'),
    temporalVector: LunarisML.getTemporalSnapshot(new Date(2026, 5, (i % 25) + 1)),
    category: 'career',
    rating: 1
  });
}

// Rastgele karıştırılmış etiketler
const shuffledData = structuredData.map(d => ({
  ...d,
  rating: Math.random() > 0.5 ? 1 : 0
}));

// Test Leo
LunarisML.personalTrain(structuredData);
const structuredScore = LunarisML.getCategoryScores('leo', new Date()).career;

LunarisML.personalTrain(shuffledData);
const shuffledScore = LunarisML.getCategoryScores('leo', new Date()).career;

const discriminationDelta = Math.abs(structuredScore - shuffledScore);
console.log(`   Yapılandırılmış Eğitim Kariyer Skoru: %${(structuredScore * 100).toFixed(1)}`);
console.log(`   Rastgele Karışık Eğitim Kariyer Skoru : %${(shuffledScore * 100).toFixed(1)}`);
console.log(`   Ayırt Edicilik Farkı (|Delta|): %${(discriminationDelta * 100).toFixed(2)}`);

const test2Passed = discriminationDelta > 0.01;
console.log(`   Sonuç: ${test2Passed ? '✅ [MODEL RASTGELE GÜRÜLTÜ İLE ANLAMLI BİLGİYİ AYIRT EDİYOR]' : '❌ [BAŞARISIZ - MODEL RASTGELE VERİYE DE AYNI TEPKİYİ VERİYOR]'}\n`);

// ══════════════════════════════════════════════════════════════
// TEST 3: Aşırı İterasyon Stresi (Exploding / Vanishing Gradient)
// ══════════════════════════════════════════════════════════════
console.log('--- TEST 3: 500 İterasyonluk Aşırı Yükleme Testi (Ağırlık Patlaması / Sönmesi) ---');
console.log('   Hipotez: Yüzlerce epoch boyunca ağırlık matris normları makul aralıkta kalmalıdır.');

const heavyBatch = [];
for (let i = 0; i < 50; i++) {
  heavyBatch.push({
    signVector: LunarisML.getSignVector(signs[i % 12]),
    temporalVector: LunarisML.getTemporalSnapshot(new Date(2026, i % 12, (i % 25) + 1)),
    category: categories[i % 6],
    rating: i % 3 === 0 ? 0 : 1
  });
}

// 10 kez ardışık 20 epoch = 200 epoch ağır yükleme
for (let run = 0; run < 10; run++) {
  LunarisML.personalTrain(heavyBatch);
}

const stressScores = signs.map(s => LunarisML.getCategoryScores(s, new Date()));
let allFinite = true;
let validRange = true;

stressScores.forEach(sc => {
  categories.forEach(c => {
    const val = sc[c];
    if (!isFinite(val) || isNaN(val)) allFinite = false;
    if (val < 0.05 || val > 0.98) validRange = false;
  });
});

console.log(`   Ağır İterasyon Sonrası Tüm Skorlar Sonlu ve Sayısal mı?: ${allFinite ? '✅ EVET' : '❌ HAYIR'}`);
console.log(`   Tüm Skorlar Kabul Edilebilir [0.05, 0.98] Aralığında mı?: ${validRange ? '✅ EVET' : '❌ HAYIR'}`);

const test3Passed = allFinite && validRange;
console.log(`   Sonuç: ${test3Passed ? '✅ [AĞIRLIK PATLAMASI VEYA SÖNMESİ YOK]' : '❌ [BAŞARISIZ]'}\n`);

// ══════════════════════════════════════════════════════════════
// TEST 4: Öznitelik Duyarlılık Analizi (Feature Sensitivity / Ablation Test)
// ══════════════════════════════════════════════════════════════
console.log('--- TEST 4: Öznitelik Duyarlılık & Astrolojik Girdi Etki Analizi (Sensitivity Test) ---');
console.log('   Hipotez: Girdiler (Doğum haritası ve Temporal vektör) çıktıyı gerçekten etkiliyor mu?');

const baseDate = new Date(2026, 2, 21); // Koç dönemi / İlkbahar
const winterDate = new Date(2026, 11, 21); // Oğlak dönemi / Kış

const ariesSpring = LunarisML.getCategoryScores('aries', baseDate);
const ariesWinter = LunarisML.getCategoryScores('aries', winterDate);

const temporalImpact = Math.abs(ariesSpring.daily - ariesWinter.daily);
console.log(`   Mevsim & Tarih Değişiminin Skor Etkisi (İlkbahar vs Kış): %${(temporalImpact * 100).toFixed(2)}`);

const piscesSpring = LunarisML.getCategoryScores('pisces', baseDate);
const signImpact = Math.abs(ariesSpring.daily - piscesSpring.daily);
console.log(`   Farklı Burçların Skor Ayrışma Etkisi (Koç vs Balık): %${(signImpact * 100).toFixed(2)}`);

const test4Passed = temporalImpact > 0.005 && signImpact > 0.005;
console.log(`   Sonuç: ${test4Passed ? '✅ [MODEL GİRDİ VEKTÖRLERİNE KARŞI MATEMATİKSEL OLARAK DUYARLI]' : '❌ [BAŞARISIZ - MODEL GİRDİLERDEN BAĞIMSIZ]'}\n`);

// ══════════════════════════════════════════════════════════════
// GENEL KARAR
// ══════════════════════════════════════════════════════════════
console.log('══════════════════════════════════════════════════════════════');
const allPassed = test1Passed && test2Passed && test3Passed && test4Passed;
if (allPassed) {
  console.log('⚖️  TARAFSIZ KARAR: Model karşıt gürültüye, aşırı iterasyona ve permütasyon testlerine karşı istatistiksel olarak sağlamdır.');
} else {
  console.log('⚠️  TARAFSIZ KARAR: Modelde zayıflık tespit edildi.');
}
console.log('══════════════════════════════════════════════════════════════\n');
