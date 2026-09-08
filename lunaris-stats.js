/* ==========================================================
   LUNARIS — İstatistiksel Validasyon Modülü (lunaris-stats.js)
   v1.0 — Bilimsel Yayın Standardı Metrikler
   ============================================================
   Cohen's κ, Cronbach's α, Cohen's d, χ², Güven Aralıkları,
   Spearman ρ, Binom Testi ve Bayesian Posterior Güncelleme.
   
   Saf JavaScript — dış kütüphane yok, offline çalışır.
   ========================================================== */

(function(global) {
  'use strict';

  /* ══════════════════════════════════════════════════
     YARDIMCI MATEMATİK
  ══════════════════════════════════════════════════ */

  function mean(arr) {
    if (!arr || !arr.length) return 0;
    return arr.reduce(function(s, v) { return s + v; }, 0) / arr.length;
  }

  function variance(arr) {
    if (!arr || arr.length < 2) return 0;
    var m = mean(arr);
    return arr.reduce(function(s, v) { return s + (v - m) * (v - m); }, 0) / (arr.length - 1);
  }

  function stdDev(arr) { return Math.sqrt(variance(arr)); }

  function sum(arr) { return arr.reduce(function(s, v) { return s + v; }, 0); }

  /** Standard normal CDF (Abramowitz & Stegun yaklaşımı) */
  function normalCDF(x) {
    var a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
    var a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    var t = 1.0 / (1.0 + p * x);
    var y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
    return 0.5 * (1.0 + sign * y);
  }

  /** Normal dağılım z-değerinden p-değerine (iki kuyruklu) */
  function zToP(z) {
    return 2 * (1 - normalCDF(Math.abs(z)));
  }

  /** Faktöriyel (n!) — küçük n için */
  function factorial(n) {
    if (n <= 1) return 1;
    var f = 1;
    for (var i = 2; i <= n; i++) f *= i;
    return f;
  }

  /** Binom katsayısı C(n, k) */
  function binomCoeff(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n - k) k = n - k;
    var c = 1;
    for (var i = 0; i < k; i++) {
      c = c * (n - i) / (i + 1);
    }
    return Math.round(c);
  }

  /** Chi-squared CDF yaklaşımı (Wilson-Hilferty) */
  function chiSquaredPValue(chiSq, df) {
    if (df <= 0) return 1;
    /* Wilson-Hilferty normal yaklaşımı */
    var z = Math.pow(chiSq / df, 1/3) - (1 - 2 / (9 * df));
    z /= Math.sqrt(2 / (9 * df));
    return 1 - normalCDF(z);
  }


  /* ══════════════════════════════════════════════════
     1. COHEN'S KAPPA (κ) — Değerlendirmeciler Arası Uyum
     
     İki değerlendirmecinin (model vs kullanıcı) kategorik
     etiketlerdeki uyumunu ölçer. Şans uyumunu çıkarır.
     
     κ = (p_o - p_e) / (1 - p_e)
     p_o = gözlenen uyum oranı
     p_e = beklenen şans uyumu
     
     Yorumlama:
       κ < 0.00  Uyumsuz
       0.00-0.20 Çok zayıf
       0.21-0.40 Zayıf
       0.41-0.60 Orta
       0.61-0.80 İyi
       0.81-1.00 Mükemmel
  ══════════════════════════════════════════════════ */

  function cohensKappa(rater1, rater2) {
    if (!rater1 || !rater2 || rater1.length !== rater2.length || rater1.length === 0) {
      return { kappa: NaN, interpretation: 'N/A', n: 0 };
    }

    var n = rater1.length;
    var categories = {};

    // Tüm kategorileri topla
    for (var i = 0; i < n; i++) {
      categories[rater1[i]] = true;
      categories[rater2[i]] = true;
    }
    var cats = Object.keys(categories);

    // Confusion matrix
    var matrix = {};
    cats.forEach(function(c1) {
      matrix[c1] = {};
      cats.forEach(function(c2) { matrix[c1][c2] = 0; });
    });

    for (var j = 0; j < n; j++) {
      matrix[rater1[j]][rater2[j]]++;
    }

    // p_o: gözlenen uyum
    var po = 0;
    cats.forEach(function(c) { po += matrix[c][c]; });
    po /= n;

    // p_e: beklenen şans uyumu
    var pe = 0;
    cats.forEach(function(c) {
      var r1Count = 0, r2Count = 0;
      cats.forEach(function(c2) {
        r1Count += matrix[c][c2];  // rater1'in c dediği
        r2Count += matrix[c2][c]; // rater2'nin c dediği
      });
      pe += (r1Count / n) * (r2Count / n);
    });

    var kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);

    // Standart hata (Fleiss, 1981)
    var se = Math.sqrt(po * (1 - po) / (n * (1 - pe) * (1 - pe)));

    var interpretation;
    if (kappa < 0)       interpretation = { tr: 'Uyumsuz', en: 'Poor', ru: 'Несовместимо' };
    else if (kappa < 0.20) interpretation = { tr: 'Çok Zayıf', en: 'Slight', ru: 'Очень слабо' };
    else if (kappa < 0.40) interpretation = { tr: 'Zayıf', en: 'Fair', ru: 'Слабо' };
    else if (kappa < 0.60) interpretation = { tr: 'Orta', en: 'Moderate', ru: 'Умеренно' };
    else if (kappa < 0.80) interpretation = { tr: 'İyi', en: 'Substantial', ru: 'Хорошо' };
    else                    interpretation = { tr: 'Mükemmel', en: 'Almost Perfect', ru: 'Отлично' };

    return {
      kappa: Math.round(kappa * 10000) / 10000,
      se: Math.round(se * 10000) / 10000,
      pValue: zToP(kappa / se),
      n: n,
      po: Math.round(po * 10000) / 10000,
      pe: Math.round(pe * 10000) / 10000,
      interpretation: interpretation,
      ci95: {
        lower: Math.round((kappa - 1.96 * se) * 10000) / 10000,
        upper: Math.round((kappa + 1.96 * se) * 10000) / 10000
      }
    };
  }


  /* ══════════════════════════════════════════════════
     2. CRONBACH'S ALPHA (α) — İç Tutarlılık
     
     Bir ölçeğin (ör. 8 boyutlu burç vektörü) boyutları
     arasındaki iç tutarlılığı ölçer.
     
     α = (k / (k-1)) * (1 - Σσ²_i / σ²_total)
     
     Yorumlama:
       α < 0.50  Kabul edilemez
       0.50-0.60 Zayıf
       0.60-0.70 Sorgulanabilir
       0.70-0.80 Kabul edilebilir
       0.80-0.90 İyi
       0.90-1.00 Mükemmel
  ══════════════════════════════════════════════════ */

  function cronbachAlpha(itemMatrix) {
    // itemMatrix: her satır bir gözlem, her sütun bir boyut
    if (!itemMatrix || itemMatrix.length < 3 || !itemMatrix[0] || itemMatrix[0].length < 2) {
      return { alpha: NaN, interpretation: 'N/A', k: 0, n: 0 };
    }

    var n = itemMatrix.length;
    var k = itemMatrix[0].length;

    // Her boyutun varyansı
    var itemVariances = [];
    for (var col = 0; col < k; col++) {
      var colVals = [];
      for (var row = 0; row < n; row++) {
        colVals.push(itemMatrix[row][col]);
      }
      itemVariances.push(variance(colVals));
    }

    // Toplam skorun varyansı
    var totalScores = [];
    for (var r = 0; r < n; r++) {
      totalScores.push(sum(itemMatrix[r]));
    }
    var totalVar = variance(totalScores);
    var sumItemVar = sum(itemVariances);

    var alpha = totalVar === 0 ? 0 : (k / (k - 1)) * (1 - sumItemVar / totalVar);

    var interpretation;
    if (alpha < 0.50)      interpretation = { tr: 'Kabul Edilemez', en: 'Unacceptable', ru: 'Неприемлемо' };
    else if (alpha < 0.60) interpretation = { tr: 'Zayıf', en: 'Poor', ru: 'Слабо' };
    else if (alpha < 0.70) interpretation = { tr: 'Sorgulanabilir', en: 'Questionable', ru: 'Спорно' };
    else if (alpha < 0.80) interpretation = { tr: 'Kabul Edilebilir', en: 'Acceptable', ru: 'Приемлемо' };
    else if (alpha < 0.90) interpretation = { tr: 'İyi', en: 'Good', ru: 'Хорошо' };
    else                    interpretation = { tr: 'Mükemmel', en: 'Excellent', ru: 'Отлично' };

    return {
      alpha: Math.round(alpha * 10000) / 10000,
      k: k,
      n: n,
      sumItemVariance: Math.round(sumItemVar * 10000) / 10000,
      totalVariance: Math.round(totalVar * 10000) / 10000,
      interpretation: interpretation
    };
  }


  /* ══════════════════════════════════════════════════
     3. COHEN'S d — Etki Büyüklüğü
     
     İki grubun ortalamalarının standart sapma cinsinden farkı.
     
     d = (M₁ - M₂) / s_pooled
     
     Yorumlama (Cohen, 1988):
       |d| < 0.20  İhmal edilebilir
       0.20-0.50   Küçük
       0.50-0.80   Orta
       0.80+       Büyük
  ══════════════════════════════════════════════════ */

  function cohensD(group1, group2) {
    if (!group1 || !group2 || group1.length < 2 || group2.length < 2) {
      return { d: NaN, interpretation: 'N/A' };
    }

    var m1 = mean(group1), m2 = mean(group2);
    var v1 = variance(group1), v2 = variance(group2);
    var n1 = group1.length, n2 = group2.length;

    // Pooled standard deviation
    var sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
    var d = sp === 0 ? 0 : (m1 - m2) / sp;

    var absD = Math.abs(d);
    var interpretation;
    if (absD < 0.20)      interpretation = { tr: 'İhmal Edilebilir', en: 'Negligible', ru: 'Незначительно' };
    else if (absD < 0.50) interpretation = { tr: 'Küçük', en: 'Small', ru: 'Малый' };
    else if (absD < 0.80) interpretation = { tr: 'Orta', en: 'Medium', ru: 'Средний' };
    else                   interpretation = { tr: 'Büyük', en: 'Large', ru: 'Большой' };

    return {
      d: Math.round(d * 10000) / 10000,
      mean1: Math.round(m1 * 10000) / 10000,
      mean2: Math.round(m2 * 10000) / 10000,
      pooledSD: Math.round(sp * 10000) / 10000,
      n1: n1,
      n2: n2,
      interpretation: interpretation
    };
  }


  /* ══════════════════════════════════════════════════
     4. CHI-SQUARED (χ²) UYUM İYİLİĞİ TESTİ
     
     Gözlenen frekans dağılımının beklenen dağılıma uyumunu test eder.
     
     χ² = Σ (O_i - E_i)² / E_i
     
     H₀: Gözlenen dağılım beklenen dağılıma uyar
     p < 0.05 → H₀ reddedilir
  ══════════════════════════════════════════════════ */

  function chiSquaredTest(observed, expected) {
    if (!observed || !expected || observed.length !== expected.length || observed.length < 2) {
      return { chiSq: NaN, df: 0, pValue: NaN };
    }

    var k = observed.length;
    var chiSq = 0;

    for (var i = 0; i < k; i++) {
      if (expected[i] === 0) continue;
      chiSq += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }

    var df = k - 1;
    var pValue = chiSquaredPValue(chiSq, df);

    return {
      chiSq: Math.round(chiSq * 10000) / 10000,
      df: df,
      pValue: Math.round(pValue * 10000) / 10000,
      significant: pValue < 0.05,
      interpretation: pValue < 0.05
        ? { tr: 'İstatistiksel olarak anlamlı fark', en: 'Statistically significant difference', ru: 'Статистически значимое различие' }
        : { tr: 'Fark anlamlı değil', en: 'No significant difference', ru: 'Различие незначимо' }
    };
  }


  /* ══════════════════════════════════════════════════
     5. GÜVEN ARALIKLARI (Confidence Intervals)
  ══════════════════════════════════════════════════ */

  function confidenceInterval(data, confidence) {
    confidence = confidence || 0.95;
    if (!data || data.length < 2) return { lower: NaN, upper: NaN, mean: NaN };

    var m = mean(data);
    var se = stdDev(data) / Math.sqrt(data.length);

    // z-değerleri: %90=1.645, %95=1.96, %99=2.576
    var z;
    if (confidence >= 0.99) z = 2.576;
    else if (confidence >= 0.95) z = 1.96;
    else z = 1.645;

    return {
      mean: Math.round(m * 10000) / 10000,
      se: Math.round(se * 10000) / 10000,
      lower: Math.round((m - z * se) * 10000) / 10000,
      upper: Math.round((m + z * se) * 10000) / 10000,
      confidence: confidence,
      n: data.length
    };
  }


  /* ══════════════════════════════════════════════════
     6. SPEARMAN'S ρ (RHO) — Sıralama Korelasyonu
     
     İki sıralama arasındaki monoton ilişkiyi ölçer.
     
     ρ = 1 - (6 Σd²_i) / (n(n²-1))
     
     Yorum:
       |ρ| < 0.3   Zayıf
       0.3-0.5     Orta
       0.5-0.7     Güçlü
       0.7+        Çok Güçlü
  ══════════════════════════════════════════════════ */

  function spearmanRho(x, y) {
    if (!x || !y || x.length !== y.length || x.length < 3) {
      return { rho: NaN, interpretation: 'N/A' };
    }

    var n = x.length;

    function rank(arr) {
      var sorted = arr.map(function(v, i) { return { val: v, idx: i }; });
      sorted.sort(function(a, b) { return a.val - b.val; });
      var ranks = new Array(n);
      var i = 0;
      while (i < n) {
        var j = i;
        while (j < n - 1 && sorted[j + 1].val === sorted[j].val) j++;
        var avgRank = (i + j) / 2 + 1;
        for (var k = i; k <= j; k++) {
          ranks[sorted[k].idx] = avgRank;
        }
        i = j + 1;
      }
      return ranks;
    }

    var rankX = rank(x);
    var rankY = rank(y);

    var dSqSum = 0;
    for (var i = 0; i < n; i++) {
      var d = rankX[i] - rankY[i];
      dSqSum += d * d;
    }

    var rho = 1 - (6 * dSqSum) / (n * (n * n - 1));

    // t-test for significance
    var t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
    var pValue = zToP(t); // Approximation for large n

    var absRho = Math.abs(rho);
    var interpretation;
    if (absRho < 0.3)       interpretation = { tr: 'Zayıf', en: 'Weak', ru: 'Слабая' };
    else if (absRho < 0.5)  interpretation = { tr: 'Orta', en: 'Moderate', ru: 'Умеренная' };
    else if (absRho < 0.7)  interpretation = { tr: 'Güçlü', en: 'Strong', ru: 'Сильная' };
    else                     interpretation = { tr: 'Çok Güçlü', en: 'Very Strong', ru: 'Очень сильная' };

    return {
      rho: Math.round(rho * 10000) / 10000,
      pValue: Math.round(pValue * 10000) / 10000,
      significant: pValue < 0.05,
      n: n,
      interpretation: interpretation
    };
  }


  /* ══════════════════════════════════════════════════
     7. BİNOM TESTİ — Çift-Kör Protokolü İçin
     
     Gözlenen başarı oranının şans seviyesinden (p₀=0.5)
     istatistiksel olarak anlamlı farklılık gösterip göstermediğini test eder.
     
     Exact Binomial Test: P(X ≥ k) = Σ C(n,i) * p^i * (1-p)^(n-i)
  ══════════════════════════════════════════════════ */

  function binomialTest(successes, trials, nullProbability) {
    nullProbability = nullProbability || 0.5;

    if (trials < 1) return { pValue: 1, significant: false };

    var k = successes;
    var n = trials;
    var p0 = nullProbability;

    // Tek kuyruklu p-değeri: P(X ≥ k | H₀)
    var pValue = 0;
    for (var i = k; i <= n; i++) {
      pValue += binomCoeff(n, i) * Math.pow(p0, i) * Math.pow(1 - p0, n - i);
    }

    // Normal yaklaşım (büyük n için)
    var expectedMean = n * p0;
    var expectedSD = Math.sqrt(n * p0 * (1 - p0));
    var zScore = expectedSD > 0 ? (k - expectedMean - 0.5) / expectedSD : 0; // Yates düzeltmesi

    var observedRate = k / n;

    return {
      successes: k,
      trials: n,
      observedRate: Math.round(observedRate * 10000) / 10000,
      nullProbability: p0,
      pValue: Math.round(Math.min(pValue, 1) * 10000) / 10000,
      zScore: Math.round(zScore * 10000) / 10000,
      significant: pValue < 0.05,
      highlySignificant: pValue < 0.01,
      interpretation: pValue < 0.01
        ? { tr: 'Yüksek istatistiksel anlamlılık (p<0.01)', en: 'Highly significant (p<0.01)', ru: 'Высокая значимость (p<0.01)' }
        : (pValue < 0.05
          ? { tr: 'İstatistiksel olarak anlamlı (p<0.05)', en: 'Statistically significant (p<0.05)', ru: 'Статистически значимо (p<0.05)' }
          : { tr: 'İstatistiksel olarak anlamlı değil', en: 'Not statistically significant', ru: 'Статистически незначимо' })
    };
  }


  /* ══════════════════════════════════════════════════
     8. BAYESIAN NORMAL-NORMAL CONJUGATE GÜNCELLEME
     
     Prior:     N(μ₀, σ₀²)
     Likelihood: N(x̄, σ_obs² / n)
     Posterior: N(μ₁, σ₁²)
     
     μ₁ = (μ₀/σ₀² + n·x̄/σ_obs²) / (1/σ₀² + n/σ_obs²)
     σ₁² = 1 / (1/σ₀² + n/σ_obs²)
  ══════════════════════════════════════════════════ */

  function bayesianUpdate(priorMean, priorVar, observations, obsVar) {
    if (!observations || observations.length === 0) {
      return { mean: priorMean, variance: priorVar, n: 0, credibleInterval: { lower: priorMean - 1.96 * Math.sqrt(priorVar), upper: priorMean + 1.96 * Math.sqrt(priorVar) } };
    }

    var n = observations.length;
    var xBar = mean(observations);
    var sigmaObs2 = (obsVar !== undefined && obsVar !== null) ? obsVar : variance(observations);
    if (sigmaObs2 === 0) sigmaObs2 = 0.01; // Sıfır varyans koruması

    var priorPrecision = 1 / priorVar;
    var likelihoodPrecision = n / sigmaObs2;
    var posteriorPrecision = priorPrecision + likelihoodPrecision;
    var posteriorVar = 1 / posteriorPrecision;
    var posteriorMean = (priorMean * priorPrecision + xBar * likelihoodPrecision) / posteriorPrecision;

    var posteriorSD = Math.sqrt(posteriorVar);

    return {
      mean: Math.round(posteriorMean * 100000) / 100000,
      variance: Math.round(posteriorVar * 100000) / 100000,
      sd: Math.round(posteriorSD * 100000) / 100000,
      n: n,
      priorWeight: Math.round((priorPrecision / posteriorPrecision) * 10000) / 10000,
      dataWeight: Math.round((likelihoodPrecision / posteriorPrecision) * 10000) / 10000,
      credibleInterval: {
        lower: Math.round((posteriorMean - 1.96 * posteriorSD) * 100000) / 100000,
        upper: Math.round((posteriorMean + 1.96 * posteriorSD) * 100000) / 100000
      }
    };
  }

  /**
   * Bir burç vektörünün tüm boyutlarını Bayesian günceller
   * @param {Array} priorVector - [8] boyutlu mevcut vektör
   * @param {Array} observationMatrix - Her satır bir gözlem [8] boyutlu
   * @param {number} priorVariance - Prior varyans (varsayılan 0.1)
   * @returns {Object} Posterior vektör + güven aralıkları
   */
  function bayesianVectorUpdate(priorVector, observationMatrix, priorVariance) {
    priorVariance = priorVariance || 0.1;

    if (!priorVector || !observationMatrix || observationMatrix.length === 0) {
      return {
        posterior: priorVector ? priorVector.slice() : [],
        credibleIntervals: [],
        n: 0,
        posteriorDetails: []
      };
    }

    var k = priorVector.length;
    var posterior = [];
    var credibleIntervals = [];
    var details = [];

    for (var dim = 0; dim < k; dim++) {
      var obs = observationMatrix.map(function(row) { return row[dim]; });
      var result = bayesianUpdate(priorVector[dim], priorVariance, obs);

      // Değerleri [0, 1] aralığında sınırla
      var clampedMean = Math.max(0, Math.min(1, result.mean));
      posterior.push(Math.round(clampedMean * 100000) / 100000);
      credibleIntervals.push({
        lower: Math.round(Math.max(0, result.credibleInterval.lower) * 100000) / 100000,
        upper: Math.round(Math.min(1, result.credibleInterval.upper) * 100000) / 100000
      });
      details.push(result);
    }

    return {
      posterior: posterior,
      credibleIntervals: credibleIntervals,
      n: observationMatrix.length,
      posteriorDetails: details
    };
  }


  /* ══════════════════════════════════════════════════
     9. ÖZE DEĞERLENDİRME RAPORLAMA
  ══════════════════════════════════════════════════ */

  /**
   * Tüm istatistiksel metriklerin yayına uygun özetini üretir
   */
  function generateStatisticalSummary(data, lang) {
    lang = lang || 'tr';
    var report = {};

    if (data.blindTestResults) {
      report.blindTest = binomialTest(
        data.blindTestResults.correct,
        data.blindTestResults.total
      );
    }

    if (data.modelRatings && data.userRatings) {
      report.interRaterAgreement = cohensKappa(data.modelRatings, data.userRatings);
    }

    if (data.vectorMatrix) {
      report.internalConsistency = cronbachAlpha(data.vectorMatrix);
    }

    if (data.matchedScores && data.randomScores) {
      report.effectSize = cohensD(data.matchedScores, data.randomScores);
    }

    if (data.scores) {
      report.confidenceInterval = confidenceInterval(data.scores);
    }

    if (data.predictedRanks && data.actualRanks) {
      report.rankCorrelation = spearmanRho(data.predictedRanks, data.actualRanks);
    }

    return report;
  }


  /* ══════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════ */

  var LunarisStats = {
    VERSION: '1.0.0',

    /* Temel metrikler */
    mean: mean,
    variance: variance,
    stdDev: stdDev,
    normalCDF: normalCDF,

    /* Yayın standardı testler */
    cohensKappa: cohensKappa,
    cronbachAlpha: cronbachAlpha,
    cohensD: cohensD,
    chiSquaredTest: chiSquaredTest,
    confidenceInterval: confidenceInterval,
    spearmanRho: spearmanRho,
    binomialTest: binomialTest,

    /* Bayesian güncelleme */
    bayesianUpdate: bayesianUpdate,
    bayesianVectorUpdate: bayesianVectorUpdate,

    /* Rapor üretici */
    generateStatisticalSummary: generateStatisticalSummary
  };

  global.LunarisStats = LunarisStats;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
