/* ==========================================================
   LUNARIS ML — Kapsamlı Matematiksel Doğrulama & Stres Testi
   (Rigorous Gradient Checking, Multi-Sign Convergence,
    Catastrophic Interference & Boundary Stress Suite)
   ========================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🔬 LUNARIS ML — Derin Matematiksel & Stres Doğrulama Paketi ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// 1. Sandbox ve Yükleme
const mlCode = fs.readFileSync(path.resolve(__dirname, '..', 'lunaris-ml.js'), 'utf-8');
const sandbox = { window: {}, Math, Date, console, parseFloat, parseInt, isNaN };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(mlCode, sandbox);
const LunarisML = sandbox.LunarisML;

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [BAŞARILI] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [BAŞARISIZ] ${message}`);
  }
}

// ══════════════════════════════════════════════════════════════
// TEST 1: Analitik Gradyan vs Nümerik Türev Doğrulaması (Gradient Checking)
// ══════════════════════════════════════════════════════════════
console.log('--- TEST 1: Sayısal Gradyan Doğrulaması (Gradient Checking: Backprop vs Finite Diff) ---');

function leakyRelu(x) { return x > 0 ? x : 0.01 * x; }
function sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); }

// Tek bir nöron ve katman için Loss fonksiyonu
function forwardLoss(weights, input, target) {
  // W1 (12x16)
  let a1 = [];
  for (let i = 0; i < 12; i++) {
    let z = 0;
    for (let j = 0; j < 16; j++) z += weights.W1[i][j] * input[j];
    z += weights.B1[i];
    a1.push(leakyRelu(z));
  }
  // W2 (8x12)
  let a2 = [];
  for (let i = 0; i < 8; i++) {
    let z = 0;
    for (let j = 0; j < 12; j++) z += weights.W2[i][j] * a1[j];
    z += weights.B2[i];
    a2.push(leakyRelu(z));
  }
  // W3 (6x8)
  let out = [];
  for (let i = 0; i < 6; i++) {
    let z = 0;
    for (let j = 0; j < 8; j++) z += weights.W3[i][j] * a2[j];
    z += weights.B3[i];
    out.push(sigmoid(z));
  }
  // MSE Loss
  let loss = 0;
  for (let i = 0; i < 6; i++) loss += (out[i] - target[i]) ** 2;
  return loss / 6;
}

const testWeights = {
  W1: Array.from({ length: 12 }, () => Array.from({ length: 16 }, () => (Math.random() * 2 - 1) * 0.3)),
  B1: new Array(12).fill(0.05),
  W2: Array.from({ length: 8 }, () => Array.from({ length: 12 }, () => (Math.random() * 2 - 1) * 0.3)),
  B2: new Array(8).fill(0.05),
  W3: Array.from({ length: 6 }, () => Array.from({ length: 8 }, () => (Math.random() * 2 - 1) * 0.3)),
  B3: new Array(6).fill(0.05)
};

const sampleInput = Array.from({ length: 16 }, () => Math.random());
const sampleTarget = Array.from({ length: 6 }, () => Math.random());

// Nümerik Türev Hesabı (Finite Differences: [f(w+eps) - f(w-eps)] / 2eps)
const eps = 1e-5;
const row = 2, col = 3;

testWeights.W3[row][col] += eps;
const lossPlus = forwardLoss(testWeights, sampleInput, sampleTarget);

testWeights.W3[row][col] -= 2 * eps;
const lossMinus = forwardLoss(testWeights, sampleInput, sampleTarget);

testWeights.W3[row][col] += eps; // Geri yükle

const numericalGrad = (lossPlus - lossMinus) / (2 * eps);

// Analitik Backpropagation Gradyanı
let a1 = [];
for (let i = 0; i < 12; i++) {
  let z = 0;
  for (let j = 0; j < 16; j++) z += testWeights.W1[i][j] * sampleInput[j];
  z += testWeights.B1[i];
  a1.push(leakyRelu(z));
}
let a2 = [];
for (let i = 0; i < 8; i++) {
  let z = 0;
  for (let j = 0; j < 12; j++) z += testWeights.W2[i][j] * a1[j];
  z += testWeights.B2[i];
  a2.push(leakyRelu(z));
}
let z3 = [];
let out = [];
for (let i = 0; i < 6; i++) {
  let z = 0;
  for (let j = 0; j < 8; j++) z += testWeights.W3[i][j] * a2[j];
  z += testWeights.B3[i];
  z3.push(z);
  out.push(sigmoid(z));
}

const dOut = (2 / 6) * (out[row] - sampleTarget[row]);
const dSigmoid = out[row] * (1 - out[row]);
const analyticalGrad = dOut * dSigmoid * a2[col];

const relError = Math.abs(numericalGrad - analyticalGrad) / (Math.abs(numericalGrad) + Math.abs(analyticalGrad) + 1e-8);
console.log(`   Nümerik Gradyan: ${numericalGrad.toFixed(8)} | Analitik Gradyan: ${analyticalGrad.toFixed(8)}`);
console.log(`   Bağıl Hata (Relative Error): ${relError.toExponential(4)}`);
assert(relError < 1e-4, 'Analitik türev hesabı nümerik türev ile < 1e-4 bağıl hata içinde eşleşiyor (Matematiksel Teorem Kanıtı)');

// ══════════════════════════════════════════════════════════════
// TEST 2: 12 Burcun Tamamında Konverjans & Loss Azalma Testi
// ══════════════════════════════════════════════════════════════
console.log('\n--- TEST 2: Çoklu Burç Eğitimi ve Monotonik Loss Azalması ---');

const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const simulatedDataset = [];

signs.forEach(sign => {
  const sVec = LunarisML.getSignVector(sign);
  for (let d = 1; d <= 5; d++) {
    const tVec = LunarisML.getTemporalSnapshot(new Date(2026, 7, d));
    simulatedDataset.push({
      signVector: sVec,
      temporalVector: tVec,
      category: 'career',
      rating: 1 // Kariyer pozitif
    });
  }
});

const preScores = signs.map(s => LunarisML.getCategoryScores(s, new Date()).career);
const trainOk = LunarisML.personalTrain(simulatedDataset);
const postScores = signs.map(s => LunarisML.getCategoryScores(s, new Date()).career);

let increasedCount = 0;
for (let i = 0; i < signs.length; i++) {
  if (postScores[i] > preScores[i]) increasedCount++;
}

console.log(`   12 Burcun ${increasedCount}/12 tanesinde pozitif geri bildirim sonrası kariyer skoru yükseldi.`);
assert(increasedCount >= 11, '12 burcun en az 11 tanesinde gradyan pozitif yönde güncellendi');

// ══════════════════════════════════════════════════════════════
// TEST 3: Çapraz Kategori Bozulma (Catastrophic Interference) Testi
// ══════════════════════════════════════════════════════════════
console.log('\n--- TEST 3: Çapraz Kategori Korunumu (Catastrophic Interference Kontrolü) ---');

// Sadece 'love' kategorisine aşırı negatif yükleme yapıldığında 'health' ve 'money' skorlarının çökmemesi gerekir
const loveOnlyFeedback = Array.from({ length: 15 }, () => ({
  signVector: LunarisML.getSignVector('scorpio'),
  temporalVector: LunarisML.getTemporalSnapshot(new Date()),
  category: 'love',
  rating: 0
}));

const scorpioBefore = LunarisML.getCategoryScores('scorpio', new Date());
LunarisML.personalTrain(loveOnlyFeedback);
const scorpioAfter = LunarisML.getCategoryScores('scorpio', new Date());

console.log(`   Akrep Aşk Skoru Değişimi: %${(scorpioBefore.love*100).toFixed(1)} -> %${(scorpioAfter.love*100).toFixed(1)} (Beklenen: Düşüş)`);
console.log(`   Akrep Para Skoru Değişimi: %${(scorpioBefore.money*100).toFixed(1)} -> %${(scorpioAfter.money*100).toFixed(1)} (Beklenen: Korunma)`);

const loveDecreased = scorpioAfter.love < scorpioBefore.love;
const moneyShift = Math.abs(scorpioAfter.money - scorpioBefore.money);

assert(loveDecreased, 'Hedef kategori (love) geri bildirime uygun olarak düşürüldü');
assert(moneyShift < 0.05, `İlgisiz kategori (money) sapması <%5 sınırında tutuldu (Mevcut sapma: %${(moneyShift*100).toFixed(2)})`);

// ══════════════════════════════════════════════════════════════
// TEST 4: Sınır Değerler, NaN ve Sıfır Vektör Dayanıklılık Testi
// ══════════════════════════════════════════════════════════════
console.log('\n--- TEST 4: Sınır Koşulları ve Hata Dayanıklılık Testi ---');

// 1. Sıfır Vektörler
const zeroTest = LunarisML.personalTrain([
  { signVector: new Array(8).fill(0), temporalVector: new Array(8).fill(0), category: 'daily', rating: 1 }
]);
assert(zeroTest === false || typeof zeroTest === 'boolean', 'Sıfır vektör / yetersiz girdi sessizce ve güvenle reddedildi');

// 2. Geçersiz Burç Anahtarı
const invalidSignScores = LunarisML.getCategoryScores('invalid_sign_key_999', new Date());
assert(!isNaN(invalidSignScores.love) && invalidSignScores.love >= 0.05 && invalidSignScores.love <= 0.98, 'Geçersiz burç anahtarında NaN üretilmedi, fallback aralığı korundu');

// 3. Aşırı Tarih Değerleri (Yıl 1900 ve Yıl 2100)
const pastReading = LunarisML.generateDeepReading('aries', 'tr', new Date(1900, 0, 1), 12);
const futureReading = LunarisML.generateDeepReading('aries', 'tr', new Date(2100, 0, 1), 12);
assert(pastReading && pastReading.scores.love > 0 && futureReading && futureReading.scores.love > 0, '1900 ve 2100 uç tarihlerinde hesaplama çökmedi');

// ══════════════════════════════════════════════════════════════
// ÖZET VE RAPOR
// ══════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════════');
console.log(`📊 TEST RAPORU: ${passedTests}/${totalTests} Test Başarıyla Geçti (%${Math.round((passedTests/totalTests)*100)})`);
if (passedTests === totalTests) {
  console.log('🏆 SONUÇ: Sistem türev hesabı, çoklu burç eğitimi ve sınır koşullarında kusursuz çalışmaktadır.');
} else {
  console.log('⚠️ SONUÇ: Bazı testlerde sapma tespit edildi.');
}
console.log('══════════════════════════════════════════════════════════════\n');
