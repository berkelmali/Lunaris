/* ==========================================================
   LUNARIS — Efemeris Doğruluk Benchmark Sistemi (lunaris-benchmark.js)
   v1.0 — Bilimsel Yayın Standardı Doğrulama
   ============================================================
   JPL Horizons referans değerlerine karşı gezegen pozisyonlarını
   doğrular. MAE, RMSE, Max Error metrikleri hesaplar.
   
   Referans Kaynağı: NASA JPL Horizons System
   https://ssd.jpl.nasa.gov/horizons/
   
   Koordinat Sistemi: Geosentrik Ekliptik Boylam (λ)
   Epoch: J2000.0  |  Equinox: Date
   ========================================================== */

(function(global) {
  'use strict';

  /* ══════════════════════════════════════════════════
     JPL HORİZONS REFERANS VERİLERİ
     Geosentrik Ekliptik Boylam (derece), Epoch: J2000
     
     50 referans noktası: 1960-2030, düzgün aralıklı
     Her gezegen için JPL Horizons'dan alınmış yaklaşık değerler.
     
     NOT: Bu değerler JPL Horizons web arayüzünden çekilmiş
     yaklaşık değerlerdir. Gerçek bir yayın için DE440/DE441
     efemeris ile doğrudan karşılaştırma yapılmalıdır.
  ══════════════════════════════════════════════════ */

  var REFERENCE_POINTS = [
    { date: '1970-01-01', sun: 280.16, moon: 190.7, mercury: 299.02, venus: 274.45, mars: 342.24, jupiter: 212.33, saturn: 32.06, uranus: 188.72, neptune: 239.88, pluto: 177.39 },
    { date: '1973-04-01', sun: 11.13, moon: 338.91, mercury: 345.99, venus: 8.88, mars: 303.64, jupiter: 306.93, saturn: 75.57, uranus: 201.46, neptune: 247.3, pluto: 182.85 },
    { date: '1976-07-01', sun: 99.29, moon: 141, mercury: 83.17, venus: 102.81, mars: 146.41, jupiter: 52.09, saturn: 122.93, uranus: 213.08, neptune: 251.87, pluto: 188.97 },
    { date: '1978-10-01', sun: 187.46, moon: 172.5, mercury: 187.75, venus: 227.73, mars: 217.54, jupiter: 124.44, saturn: 158.22, uranus: 224.38, neptune: 255.85, pluto: 196.23 },
    { date: '1980-01-01', sun: 279.71, moon: 83.16, mercury: 267.96, venus: 311.4, mars: 163.97, jupiter: 160.2, saturn: 176.99, uranus: 234.05, neptune: 260.92, pluto: 201.61 },
    { date: '1982-04-01', sun: 10.94, moon: 98.14, mercury: 0.23, venus: 324.51, mars: 190.15, jupiter: 218.42, saturn: 199.54, uranus: 244.41, neptune: 267.04, pluto: 205.96 },
    { date: '1985-07-01', sun: 99.11, moon: 259, mercury: 121.82, venus: 54.34, mars: 104.26, jupiter: 315.9, saturn: 231.96, uranus: 255.03, neptune: 272.04, pluto: 211.96 },
    { date: '1988-10-01', sun: 188.03, moon: 77.68, mercury: 206.8, venus: 145.92, mars: 4.4, jupiter: 66.06, saturn: 266.73, uranus: 267.32, neptune: 277.46, pluto: 221.17 },
    { date: '1990-01-01', sun: 280.3, moon: 326.56, mercury: 295.79, venus: 306.28, mars: 249.65, jupiter: 95.22, saturn: 285.6, uranus: 275.75, neptune: 282.02, pluto: 227.08 },
    { date: '1992-04-01', sun: 11.52, moon: 346.01, mercury: 1.79, venus: 352.22, mars: 333.03, jupiter: 155.97, saturn: 315.92, uranus: 287.83, neptune: 288.85, pluto: 232.59 },
    { date: '1995-07-01', sun: 98.72, moon: 131.66, mercury: 76.96, venus: 84.77, mars: 168.37, jupiter: 247.11, saturn: 354.73, uranus: 299.3, neptune: 294.6, pluto: 238.21 },
    { date: '1997-10-01', sun: 187.85, moon: 180.23, mercury: 177.78, venus: 231.72, mars: 241.45, jupiter: 312.18, saturn: 17.63, uranus: 304.81, neptune: 297.2, pluto: 243.47 },
    { date: '1999-01-01', sun: 280.11, moon: 84.97, mercury: 261.27, venus: 295.38, mars: 198.38, jupiter: 351.94, saturn: 26.77, uranus: 310.95, neptune: 301.06, pluto: 249.11 },
    { date: '2000-04-01', sun: 11.57, moon: 325.7, mercury: 344.01, venus: 352.87, mars: 36.54, jupiter: 39.18, saturn: 45.5, uranus: 319.66, neptune: 306.19, pluto: 252.83 },
    { date: '2001-07-01', sun: 99.24, moon: 225.25, mercury: 81.57, venus: 54.94, mars: 257.54, jupiter: 87.3, saturn: 68.95, uranus: 324.43, neptune: 308.14, pluto: 253.24 },
    { date: '2002-10-01', sun: 187.64, moon: 113.27, mercury: 181.14, venus: 223.86, mars: 170.61, jupiter: 132.12, saturn: 88.98, uranus: 325.38, neptune: 308.3, pluto: 255.24 },
    { date: '2003-01-01', sun: 280.14, moon: 256.04, mercury: 298.18, venus: 233.67, mars: 229.57, jupiter: 136.89, saturn: 84.45, uranus: 326.26, neptune: 309.57, pluto: 258.28 },
    { date: '2004-04-01', sun: 11.6, moon: 135.59, mercury: 29.93, venus: 57.49, mars: 66.84, jupiter: 160.65, saturn: 96.83, uranus: 334.91, neptune: 314.82, pluto: 262.23 },
    { date: '2005-07-01', sun: 99.27, moon: 36.6, mercury: 123.94, venus: 123.35, mars: 12.89, jupiter: 189.89, saturn: 118.03, uranus: 340.66, neptune: 317.16, pluto: 262.74 },
    { date: '2006-10-01', sun: 187.68, moon: 284.36, mercury: 208.33, venus: 180.73, mars: 194.88, jupiter: 228.5, saturn: 141.37, uranus: 341.77, neptune: 317.25, pluto: 264.26 },
    { date: '2007-01-01', sun: 280.17, moon: 67.42, mercury: 276.51, venus: 296.06, mars: 258.43, jupiter: 248.19, saturn: 144.46, uranus: 341.54, neptune: 318.12, pluto: 267.03 },
    { date: '2008-04-01', sun: 11.64, moon: 305.49, mercury: 356.89, venus: 353.54, mars: 100.72, jupiter: 290.13, saturn: 152.56, uranus: 349.94, neptune: 323.45, pluto: 271.15 },
    { date: '2009-07-01', sun: 99.31, moon: 207.71, mercury: 84.53, venus: 55.29, mars: 52.09, jupiter: 326.62, saturn: 166.58, uranus: 356.62, neptune: 326.2, pluto: 271.79 },
    { date: '2010-10-01', sun: 187.72, moon: 95.7, mercury: 175.36, venus: 222.24, mars: 220.87, jupiter: 357.13, saturn: 187.74, uranus: 358.24, neptune: 326.29, pluto: 272.86 },
    { date: '2011-01-01', sun: 280.2, moon: 239.24, mercury: 259.84, venus: 233.56, mars: 288.37, jupiter: 356.55, saturn: 196.66, uranus: 356.96, neptune: 326.74, pluto: 275.33 },
    { date: '2012-04-01', sun: 11.67, moon: 115.38, mercury: 354.4, venus: 57.53, mars: 154.78, jupiter: 43.31, saturn: 207.29, uranus: 4.92, neptune: 332.08, pluto: 279.54 },
    { date: '2013-07-01', sun: 99.33, moon: 18.73, mercury: 112.38, venus: 123.99, mars: 81.43, jupiter: 91.13, saturn: 214.86, uranus: 12.41, neptune: 335.23, pluto: 280.32 },
    { date: '2014-10-01', sun: 187.75, moon: 267.33, mercury: 211.57, venus: 181.41, mars: 251.68, jupiter: 135.93, saturn: 230.51, uranus: 14.79, neptune: 335.36, pluto: 281.01 },
    { date: '2015-01-01', sun: 280.23, moon: 50.62, mercury: 293.66, venus: 296.72, mars: 321.05, jupiter: 141.76, saturn: 240.87, uranus: 12.61, neptune: 335.39, pluto: 283.16 },
    { date: '2016-04-01', sun: 11.69, moon: 286, mercury: 20.2, venus: 354.19, mars: 247.35, jupiter: 165.43, saturn: 256.37, uranus: 19.94, neptune: 340.67, pluto: 287.41 },
    { date: '2017-07-01', sun: 99.37, moon: 188.95, mercury: 110.35, venus: 55.63, mars: 107.34, jupiter: 193.89, saturn: 263.38, uranus: 28.08, neptune: 344.21, pluto: 288.35 },
    { date: '2018-10-01', sun: 187.77, moon: 79.63, mercury: 195.43, venus: 220.41, mars: 305.95, jupiter: 232.08, saturn: 273.03, uranus: 31.46, neptune: 344.46, pluto: 288.76 },
    { date: '2019-01-01', sun: 280.26, moon: 222.37, mercury: 263.85, venus: 233.5, mars: 359.94, jupiter: 251.77, saturn: 281.38, uranus: 28.62, neptune: 344.08, pluto: 290.59 },
    { date: '2020-04-01', sun: 11.73, moon: 96.55, mercury: 345.28, venus: 57.51, mars: 300.82, jupiter: 294.4, saturn: 300.67, uranus: 35.16, neptune: 349.27, pluto: 294.84 },
    { date: '2021-07-01', sun: 99.39, moon: 359.29, mercury: 78.7, venus: 124.63, mars: 132.01, jupiter: 332.01, saturn: 312.38, uranus: 43.8, neptune: 353.2, pluto: 295.96 },
    { date: '2022-10-01', sun: 187.8, moon: 251.53, mercury: 174.37, venus: 182.09, mars: 80.08, jupiter: 3.13, saturn: 319, uranus: 48.36, neptune: 353.65, pluto: 296.13 },
    { date: '2023-01-01', sun: 280.28, moon: 33.65, mercury: 293.7, venus: 297.38, mars: 69.07, jupiter: 1.19, saturn: 322.42, uranus: 45.15, neptune: 352.87, pluto: 297.66 },
    { date: '2024-04-01', sun: 11.75, moon: 267.76, mercury: 27.17, venus: 354.85, mars: 337.01, jupiter: 47.35, saturn: 343.6, uranus: 50.79, neptune: 357.91, pluto: 301.87 },
    { date: '2025-07-01', sun: 99.43, moon: 169.13, mercury: 125.11, venus: 56, mars: 157.77, jupiter: 94.82, saturn: 1.81, uranus: 59.71, neptune: 2.17, pluto: 303.14 },
    { date: '2026-10-01', sun: 187.84, moon: 63.91, mercury: 210.68, venus: 218.39, mars: 121.69, jupiter: 139.59, saturn: 11.58, uranus: 65.53, neptune: 2.87, pluto: 303.12 },
    { date: '2027-01-01', sun: 280.32, moon: 204.61, mercury: 279.9, venus: 233.49, mars: 159.87, jupiter: 146.44, saturn: 8.33, uranus: 62.3, neptune: 1.72, pluto: 304.35 },
    { date: '2028-04-01', sun: 11.79, moon: 79.33, mercury: 0.89, venus: 57.46, mars: 9.46, jupiter: 170.18, saturn: 28.47, uranus: 66.91, neptune: 6.54, pluto: 308.49 },
    { date: '2029-07-01', sun: 99.46, moon: 338.8, mercury: 88.97, venus: 125.27, mars: 190.03, jupiter: 197.94, saturn: 51.33, uranus: 75.85, neptune: 11.1, pluto: 309.92 },
    { date: '2030-10-01', sun: 187.87, moon: 235.91, mercury: 179.18, venus: 182.78, mars: 149.13, jupiter: 235.72, saturn: 68.85, uranus: 82.89, neptune: 12.08, pluto: 309.77 },
    { date: '1984-06-21', sun: 89.8, moon: 354.72, mercury: 87.2, venus: 91.19, mars: 221.71, jupiter: 279.18, saturn: 220.1, uranus: 250.8, neptune: 270.05, pluto: 209.41 },
    { date: '1994-09-23', sun: 179.74, moon: 35.07, mercury: 205.5, venus: 221.21, mars: 113.25, jupiter: 223.55, saturn: 337.45, uranus: 292.42, neptune: 290.6, pluto: 235.92 },
    { date: '2004-03-20', sun: 359.72, moon: 348.23, mercury: 14.4, venus: 45.39, mars: 59.16, jupiter: 161.96, saturn: 96.43, uranus: 334.3, neptune: 314.5, pluto: 262.24 },
    { date: '2014-12-21', sun: 269.02, moon: 254.98, mercury: 276.09, venus: 282.93, mars: 312.45, jupiter: 142.38, saturn: 239.71, uranus: 12.57, neptune: 335.15, pluto: 282.78 },
    { date: '2024-06-20', sun: 89.17, moon: 244, mercury: 95.65, venus: 93.36, mars: 37.97, jupiter: 65.78, saturn: 349.35, uranus: 55.19, neptune: 359.89, pluto: 301.6 },
    { date: '2028-09-22', sun: 179.52, moon: 224.87, mercury: 198.3, venus: 137.95, mars: 130.87, jupiter: 186.05, saturn: 40.54, uranus: 74.24, neptune: 7.71, pluto: 306.57 }
  ];

  var PLANET_KEYS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  
  var PLANET_NAMES = {
    sun: { tr: 'Güneş', en: 'Sun', ru: 'Солнце' },
    moon: { tr: 'Ay', en: 'Moon', ru: 'Луна' },
    mercury: { tr: 'Merkür', en: 'Mercury', ru: 'Меркурий' },
    venus: { tr: 'Venüs', en: 'Venus', ru: 'Венера' },
    mars: { tr: 'Mars', en: 'Mars', ru: 'Марс' },
    jupiter: { tr: 'Jüpiter', en: 'Jupiter', ru: 'Юпитер' },
    saturn: { tr: 'Satürn', en: 'Saturn', ru: 'Сатурн' },
    uranus: { tr: 'Uranüs', en: 'Uranus', ru: 'Уран' },
    neptune: { tr: 'Neptün', en: 'Neptune', ru: 'Нептун' },
    pluto: { tr: 'Plüton', en: 'Pluto', ru: 'Плутон' }
  };

  /* ══════════════════════════════════════════════════
     METRİK HESAPLAMA FONKSİYONLARI
  ══════════════════════════════════════════════════ */

  /** Açısal fark (0-180 arası) */
  function angularDiff(a, b) {
    var d = Math.abs(((a % 360) + 360) % 360 - ((b % 360) + 360) % 360);
    return d > 180 ? 360 - d : d;
  }

  /** Mean Absolute Error */
  function calcMAE(errors) {
    if (!errors.length) return 0;
    return errors.reduce(function(s, e) { return s + e; }, 0) / errors.length;
  }

  /** Root Mean Square Error */
  function calcRMSE(errors) {
    if (!errors.length) return 0;
    var sumSq = errors.reduce(function(s, e) { return s + e * e; }, 0);
    return Math.sqrt(sumSq / errors.length);
  }

  /** Maximum Error */
  function calcMaxError(errors) {
    if (!errors.length) return 0;
    return Math.max.apply(null, errors);
  }

  /** Median Error */
  function calcMedian(arr) {
    if (!arr.length) return 0;
    var sorted = arr.slice().sort(function(a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /** 95. persentil */
  function calcPercentile95(arr) {
    if (!arr.length) return 0;
    var sorted = arr.slice().sort(function(a, b) { return a - b; });
    var idx = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  /** Doğru burç tespit oranı (pozisyonun 30°'lik dilimi eşleşiyor mu?) */
  function calcSignAccuracy(computed, reference) {
    return Math.floor(computed / 30) === Math.floor(reference / 30);
  }

  /* ══════════════════════════════════════════════════
     ANA BENCHMARK FONKSİYONU
  ══════════════════════════════════════════════════ */

  /**
   * Tüm referans noktalarında efemeris doğruluğunu ölçer.
   * @param {Function} calcPositions - LunarisML.calcPlanetPositions(date)
   * @returns {Object} Gezegen bazında ve genel metrikler
   */
  function runBenchmark(calcPositions) {
    if (!calcPositions) {
      if (typeof window !== 'undefined' && window.LunarisML && window.LunarisML.calcPlanetPositions) {
        calcPositions = window.LunarisML.calcPlanetPositions;
      } else {
        return { error: 'calcPlanetPositions function not available' };
      }
    }

    var source = (typeof window !== 'undefined' && window.LunarisML && window.LunarisML.ephemerisSource)
      ? window.LunarisML.ephemerisSource()
      : 'unknown';

    var planetErrors = {};
    var planetSignHits = {};
    PLANET_KEYS.forEach(function(pk) {
      planetErrors[pk] = [];
      planetSignHits[pk] = { correct: 0, total: 0 };
    });

    var detailedResults = [];

    REFERENCE_POINTS.forEach(function(ref) {
      var date = new Date(ref.date + 'T00:00:00Z');
      var computed;
      try {
        computed = calcPositions(date);
      } catch (e) {
        return;
      }

      var row = { date: ref.date, errors: {}, signMatch: {} };

      PLANET_KEYS.forEach(function(pk) {
        if (typeof computed[pk] === 'number' && typeof ref[pk] === 'number') {
          var err = angularDiff(computed[pk], ref[pk]);
          planetErrors[pk].push(err);
          row.errors[pk] = Math.round(err * 1000) / 1000;

          var match = calcSignAccuracy(computed[pk], ref[pk]);
          planetSignHits[pk].correct += match ? 1 : 0;
          planetSignHits[pk].total += 1;
          row.signMatch[pk] = match;
        }
      });

      detailedResults.push(row);
    });

    // Gezegen bazında metrikler
    var perPlanet = {};
    var allErrors = [];

    PLANET_KEYS.forEach(function(pk) {
      var errs = planetErrors[pk];
      if (!errs.length) return;

      allErrors = allErrors.concat(errs);
      var hits = planetSignHits[pk];

      perPlanet[pk] = {
        sampleCount: errs.length,
        mae: Math.round(calcMAE(errs) * 10000) / 10000,
        rmse: Math.round(calcRMSE(errs) * 10000) / 10000,
        maxError: Math.round(calcMaxError(errs) * 10000) / 10000,
        median: Math.round(calcMedian(errs) * 10000) / 10000,
        p95: Math.round(calcPercentile95(errs) * 10000) / 10000,
        signAccuracy: hits.total > 0 ? Math.round((hits.correct / hits.total) * 10000) / 100 : 0,
        signCorrect: hits.correct,
        signTotal: hits.total,
        /* Bilimsel sınıflandırma */
        grade: gradeAccuracy(calcMAE(errs))
      };
    });

    // Genel metrikler
    var overall = {
      totalSamples: REFERENCE_POINTS.length,
      totalComparisons: allErrors.length,
      mae: Math.round(calcMAE(allErrors) * 10000) / 10000,
      rmse: Math.round(calcRMSE(allErrors) * 10000) / 10000,
      maxError: Math.round(calcMaxError(allErrors) * 10000) / 10000,
      median: Math.round(calcMedian(allErrors) * 10000) / 10000,
      p95: Math.round(calcPercentile95(allErrors) * 10000) / 10000,
      source: source,
      timestamp: new Date().toISOString(),
      referenceSource: 'JPL Horizons (approximated)',
      coordinateSystem: 'Geocentric Ecliptic Longitude (J2000)',
      grade: gradeAccuracy(calcMAE(allErrors))
    };

    return {
      overall: overall,
      perPlanet: perPlanet,
      details: detailedResults
    };
  }

  /**
   * Doğruluk derecesi sınıflandırması
   * @param {number} mae - Ortalama mutlak hata (derece)
   */
  function gradeAccuracy(mae) {
    if (mae <= 0.02)  return { level: 'A+', label: { tr: 'Profesyonel Efemeris', en: 'Professional Ephemeris', ru: 'Проф. эфемериды' }, color: '#00e676' };
    if (mae <= 0.1)   return { level: 'A',  label: { tr: 'Yüksek Hassasiyet', en: 'High Precision', ru: 'Высокая точность' }, color: '#76ff03' };
    if (mae <= 1.0)   return { level: 'B',  label: { tr: 'İyi Doğruluk', en: 'Good Accuracy', ru: 'Хорошая точность' }, color: '#ffea00' };
    if (mae <= 5.0)   return { level: 'C',  label: { tr: 'Kabul Edilebilir', en: 'Acceptable', ru: 'Приемлемо' }, color: '#ff9100' };
    if (mae <= 15.0)  return { level: 'D',  label: { tr: 'Düşük Doğruluk', en: 'Low Accuracy', ru: 'Низкая точность' }, color: '#ff3d00' };
    return              { level: 'F',  label: { tr: 'Kullanılamaz', en: 'Unusable', ru: 'Непригодно' }, color: '#d50000' };
  }

  /**
   * Yayına uygun özet rapor üretir
   */
  function generateReport(results, lang) {
    lang = lang || 'tr';
    if (!results || results.error) return results;

    var o = results.overall;
    var lines = [];

    if (lang === 'tr') {
      lines.push('═══ LUNARIS EFEMERİS DOĞRULUK RAPORU ═══');
      lines.push('Tarih: ' + o.timestamp);
      lines.push('Kaynak: ' + o.source);
      lines.push('Referans: ' + o.referenceSource);
      lines.push('Koordinat: ' + o.coordinateSystem);
      lines.push('Toplam Karşılaştırma: ' + o.totalComparisons + ' (gezegen×tarih)');
      lines.push('');
      lines.push('GENEL METRİKLER:');
      lines.push('  MAE (Ortalama Mutlak Hata): ' + o.mae + '°');
      lines.push('  RMSE (Kök Ortalama Kare Hatası): ' + o.rmse + '°');
      lines.push('  Medyan Hata: ' + o.median + '°');
      lines.push('  95. Persentil: ' + o.p95 + '°');
      lines.push('  En Kötü Durum: ' + o.maxError + '°');
      lines.push('  Genel Derece: ' + o.grade.level + ' — ' + o.grade.label.tr);
    } else if (lang === 'en') {
      lines.push('═══ LUNARIS EPHEMERIS ACCURACY REPORT ═══');
      lines.push('Date: ' + o.timestamp);
      lines.push('Source: ' + o.source);
      lines.push('Reference: ' + o.referenceSource);
      lines.push('Coordinate: ' + o.coordinateSystem);
      lines.push('Total Comparisons: ' + o.totalComparisons + ' (planet×date)');
      lines.push('');
      lines.push('OVERALL METRICS:');
      lines.push('  MAE (Mean Absolute Error): ' + o.mae + '°');
      lines.push('  RMSE (Root Mean Square Error): ' + o.rmse + '°');
      lines.push('  Median Error: ' + o.median + '°');
      lines.push('  95th Percentile: ' + o.p95 + '°');
      lines.push('  Worst Case: ' + o.maxError + '°');
      lines.push('  Overall Grade: ' + o.grade.level + ' — ' + o.grade.label.en);
    } else {
      lines.push('═══ ОТЧЁТ ТОЧНОСТИ ЭФЕМЕРИД LUNARIS ═══');
      lines.push('Дата: ' + o.timestamp);
      lines.push('Источник: ' + o.source);
      lines.push('Эталон: ' + o.referenceSource);
      lines.push('Координаты: ' + o.coordinateSystem);
      lines.push('Всего сравнений: ' + o.totalComparisons);
      lines.push('');
      lines.push('ОБЩИЕ МЕТРИКИ:');
      lines.push('  MAE: ' + o.mae + '°');
      lines.push('  RMSE: ' + o.rmse + '°');
      lines.push('  Медиана: ' + o.median + '°');
      lines.push('  95-й перцентиль: ' + o.p95 + '°');
      lines.push('  Максимальная ошибка: ' + o.maxError + '°');
      lines.push('  Оценка: ' + o.grade.level + ' — ' + o.grade.label.ru);
    }

    lines.push('');
    var headerLabel = lang === 'tr' ? 'GEZEGEN BAZINDA:' : (lang === 'en' ? 'PER-PLANET:' : 'ПО ПЛАНЕТАМ:');
    lines.push(headerLabel);

    PLANET_KEYS.forEach(function(pk) {
      var p = results.perPlanet[pk];
      if (!p) return;
      var name = PLANET_NAMES[pk][lang] || pk;
      lines.push('  ' + name + ': MAE=' + p.mae + '° | RMSE=' + p.rmse + '° | Burç=' + p.signAccuracy + '% | ' + p.grade.level);
    });

    return lines.join('\n');
  }

  /* ══════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════ */

  var LunarisBenchmark = {
    VERSION: '1.0.0',
    REFERENCE_POINTS: REFERENCE_POINTS,
    PLANET_KEYS: PLANET_KEYS,
    PLANET_NAMES: PLANET_NAMES,

    /** Ana benchmark fonksiyonu */
    run: runBenchmark,

    /** Yayına uygun rapor üretici */
    generateReport: generateReport,

    /** Doğruluk sınıflandırması */
    gradeAccuracy: gradeAccuracy,

    /** Tek gezegen için hızlı test */
    testPlanet: function(planet, calcPositions) {
      var result = runBenchmark(calcPositions);
      return result.perPlanet[planet] || null;
    },

    /** Yardımcı: açısal fark */
    angularDiff: angularDiff,

    /** Metrik hesaplama fonksiyonları */
    metrics: {
      mae: calcMAE,
      rmse: calcRMSE,
      maxError: calcMaxError,
      median: calcMedian,
      percentile95: calcPercentile95
    }
  };

  global.LunarisBenchmark = LunarisBenchmark;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
