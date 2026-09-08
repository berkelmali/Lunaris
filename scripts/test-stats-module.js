#!/usr/bin/env node
/* ==========================================================
   LUNARIS — İstatistiksel Validasyon Modülü Unit Test
   ========================================================== */

require('../lunaris-stats.js');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log('  ✅ ' + msg);
    passed++;
  } else {
    console.log('  ❌ FAIL: ' + msg);
    failed++;
  }
}

function approxEq(a, b, tolerance) {
  tolerance = tolerance || 0.01;
  return Math.abs(a - b) < tolerance;
}

console.log('🧪 LunarisStats Unit Test Suite');
console.log('');

/* ────────── Cohen's Kappa ────────── */
console.log('▸ Cohen\'s Kappa (κ):');
{
  // Mükemmel uyum
  const r1 = ['a','b','c','a','b','c','a','b','c','a'];
  const r2 = ['a','b','c','a','b','c','a','b','c','a'];
  const k1 = LunarisStats.cohensKappa(r1, r2);
  assert(k1.kappa === 1, 'Tam uyum κ=1.0 → ' + k1.kappa);

  // Kısmen uyum
  const r3 = ['a','b','c','a','b','c','a','b','c','a'];
  const r4 = ['a','b','c','a','c','b','a','c','b','a'];
  const k2 = LunarisStats.cohensKappa(r3, r4);
  assert(k2.kappa > 0.3 && k2.kappa < 0.9, 'Kısmi uyum κ=0.3-0.9 → ' + k2.kappa);

  // CI var mı?
  assert(k2.ci95 && typeof k2.ci95.lower === 'number', 'CI95 mevcut: [' + k2.ci95.lower + ', ' + k2.ci95.upper + ']');
}
console.log('');

/* ────────── Cronbach's Alpha ────────── */
console.log('▸ Cronbach\'s Alpha (α):');
{
  // Yüksek tutarlılık (benzer satırlar)
  const matrix1 = [];
  for (let i = 0; i < 20; i++) {
    const base = Math.random();
    matrix1.push([base, base + 0.01, base + 0.02, base - 0.01]);
  }
  const a1 = LunarisStats.cronbachAlpha(matrix1);
  assert(a1.alpha > 0.8, 'Yüksek tutarlılık α>0.8 → ' + a1.alpha);

  // Düşük tutarlılık (rastgele)
  const matrix2 = [];
  for (let i = 0; i < 20; i++) {
    matrix2.push([Math.random(), Math.random(), Math.random(), Math.random()]);
  }
  const a2 = LunarisStats.cronbachAlpha(matrix2);
  assert(a2.alpha < 0.5, 'Rastgele veri α<0.5 → ' + a2.alpha);
}
console.log('');

/* ────────── Cohen's d ────────── */
console.log('▸ Cohen\'s d:');
{
  // Büyük fark
  const g1 = [10, 11, 12, 13, 14, 15];
  const g2 = [1, 2, 3, 4, 5, 6];
  const d1 = LunarisStats.cohensD(g1, g2);
  assert(Math.abs(d1.d) > 0.8, 'Büyük etki d>0.8 → ' + d1.d);

  // Küçük fark
  const g3 = [5.0, 5.5, 4.8, 5.2, 5.1, 4.9, 5.3, 5.0];
  const g4 = [5.1, 5.4, 5.0, 5.3, 5.2, 4.9, 5.1, 5.2];
  const d2 = LunarisStats.cohensD(g3, g4);
  assert(Math.abs(d2.d) < 0.8, 'Küçük etki d<0.8 → ' + d2.d);
}
console.log('');

/* ────────── Chi-Squared ────────── */
console.log('▸ Chi-Squared (χ²):');
{
  // Beklenen dağılıma uygun
  const obs1 = [25, 25, 25, 25]; // 100 gözlem, düzgün dağılım
  const exp1 = [25, 25, 25, 25];
  const chi1 = LunarisStats.chiSquaredTest(obs1, exp1);
  assert(chi1.chiSq === 0, 'Tam uyum χ²=0 → ' + chi1.chiSq);
  assert(!chi1.significant, 'Anlamlı fark yok → significant=' + chi1.significant);

  // Uyumsuz
  const obs2 = [50, 5, 5, 40];
  const exp2 = [25, 25, 25, 25];
  const chi2 = LunarisStats.chiSquaredTest(obs2, exp2);
  assert(chi2.chiSq > 0, 'Uyumsuz χ²>0 → ' + chi2.chiSq);
  assert(chi2.significant, 'Anlamlı fark var → p=' + chi2.pValue);
}
console.log('');

/* ────────── Confidence Interval ────────── */
console.log('▸ Confidence Intervals:');
{
  const data = [10, 12, 11, 13, 12, 11, 10, 14, 12, 11];
  const ci = LunarisStats.confidenceInterval(data, 0.95);
  assert(ci.lower < ci.mean && ci.mean < ci.upper, 'CI mantıklı: [' + ci.lower + ', ' + ci.mean + ', ' + ci.upper + ']');
  assert(ci.confidence === 0.95, 'Güven seviyesi 0.95 → ' + ci.confidence);
  assert(ci.n === 10, 'n=10 → ' + ci.n);
}
console.log('');

/* ────────── Spearman's ρ ────────── */
console.log('▸ Spearman\'s Rho (ρ):');
{
  // Mükemmel pozitif korelasyon
  const x1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const y1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const rho1 = LunarisStats.spearmanRho(x1, y1);
  assert(approxEq(rho1.rho, 1.0), 'Tam korelasyon ρ=1.0 → ' + rho1.rho);

  // Ters korelasyon
  const y2 = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const rho2 = LunarisStats.spearmanRho(x1, y2);
  assert(approxEq(rho2.rho, -1.0), 'Ters korelasyon ρ=-1.0 → ' + rho2.rho);
}
console.log('');

/* ────────── Binomial Test ────────── */
console.log('▸ Binomial Test:');
{
  // Şans düzeyinde (50/100)
  const b1 = LunarisStats.binomialTest(50, 100, 0.5);
  assert(!b1.significant, '50/100 anlamlı değil → p=' + b1.pValue);

  // Çok başarılı (80/100)
  const b2 = LunarisStats.binomialTest(80, 100, 0.5);
  assert(b2.significant, '80/100 anlamlı → p=' + b2.pValue);
  assert(b2.highlySignificant, '80/100 yüksek anlamlılık → p<0.01');

  // Küçük örneklem (7/10)
  const b3 = LunarisStats.binomialTest(7, 10, 0.5);
  assert(typeof b3.pValue === 'number', '7/10 p-value hesaplandı → p=' + b3.pValue);
}
console.log('');

/* ────────── Bayesian Update ────────── */
console.log('▸ Bayesian Update:');
{
  // Prior: μ=0.5, σ²=0.1
  const result = LunarisStats.bayesianUpdate(0.5, 0.1, [0.8, 0.85, 0.9, 0.75, 0.82], 0.05);
  assert(result.mean > 0.5, 'Posterior ortalama prior\'dan yüksek → ' + result.mean);
  assert(result.variance < 0.1, 'Posterior varyans prior\'dan düşük → ' + result.variance);
  assert(result.credibleInterval.lower < result.mean, 'CI alt sınır mantıklı');
  assert(result.credibleInterval.upper > result.mean, 'CI üst sınır mantıklı');
  assert(result.dataWeight > 0, 'Veri ağırlığı > 0 → ' + result.dataWeight);
}
console.log('');

/* ────────── Bayesian Vector Update ────────── */
console.log('▸ Bayesian Vector Update:');
{
  const prior = [0.5, 0.5, 0.5, 0.5];
  const obs = [
    [0.8, 0.3, 0.7, 0.6],
    [0.9, 0.2, 0.8, 0.5],
    [0.85, 0.25, 0.75, 0.55]
  ];
  const result = LunarisStats.bayesianVectorUpdate(prior, obs, 0.1);
  assert(result.posterior.length === 4, 'Posterior boyutu doğru → ' + result.posterior.length);
  assert(result.posterior[0] > 0.5, 'Dim 0 yukarı güncellendi → ' + result.posterior[0]);
  assert(result.posterior[1] < 0.5, 'Dim 1 aşağı güncellendi → ' + result.posterior[1]);
  assert(result.credibleIntervals.length === 4, 'CI boyutu doğru');
  assert(result.n === 3, 'n=3 → ' + result.n);
}
console.log('');

/* ────────── Summary ────────── */
console.log('═══════════════════════════════════════');
console.log(`  Sonuç: ${passed} geçti, ${failed} başarısız`);
console.log('═══════════════════════════════════════');

if (failed > 0) process.exit(1);
