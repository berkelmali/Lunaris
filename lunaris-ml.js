/* ==========================================================
   LUNARIS — ML Tabanlı Astroloji Yorum Motoru  (lunaris-ml.js)
   v2.0 — Geliştirilmiş Mimari
   ============================================================
   Saf JavaScript — dış kütüphane yok, API yok, offline çalışır.

   Mimari:
   1.  SignFeatureVectors   — 12 burç için 8-boyutlu embedding
   2.  ElementModality      — Element & Modalite uyum sistemi
   3.  PlanetaryHours       — Antik 7-gezegen saati sistemi
   4.  TransitEngine        — J2000 gezegensel transit hesabı
   5.  RetrogradEngine      — Gelişmiş retrograd & gölge periyotları
   6.  AspectEngine         — Gezegen açıları (kavuşum, trine, kare…)
   7.  MoonPhase            — Ay evresi ağırlık sistemi
   8.  TemporalVector       — Çok-faktörlü günlük enerji vektörü
   9.  NatalEngine          — Doğum tarihi/saati → natal harita skoru
   10. MLPInterpreter       — 3-katmanlı sinir ağı (MLP) skorlayıcı
   11. TextPool             — 5-seviyeli ağırlıklı metin seçimi (TR/EN/RU)
   12. DeepReadingGenerator — Herkese özel derin yorum üretici
   13. WeeklyMonthlyReading — Haftalık & aylık analiz
   14. EnergyTimeline       — 12 aylık enerji tahmin grafiği
   15. DeepCompatibility    — Çok boyutlu burç uyum analizi
   16. ProfileInsight       — Kişilik profil yorumları
   ========================================================== */

(function(global) {
  'use strict';

  /* ══════════════════════════════════════════════════
     YARDIMCI FONKSİYONLAR
  ══════════════════════════════════════════════════ */

  function sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); }

  function relu(x) { return Math.max(0, x); }

  function leakyRelu(x) { return x > 0 ? x : 0.01 * x; }

  function tanh_(x) { return Math.tanh ? Math.tanh(x) : (Math.exp(2*x)-1)/(Math.exp(2*x)+1); }

  function softmax(arr) {
    var maxVal = Math.max.apply(null, arr);
    var exps = arr.map(function(v) { return Math.exp(v - maxVal); });
    var sum = exps.reduce(function(s, v) { return s + v; }, 0);
    return exps.map(function(v) { return v / sum; });
  }

  function dot(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  function normalize(vec) {
    var mag = Math.sqrt(vec.reduce(function(s, v) { return s + v * v; }, 0));
    if (mag === 0) return vec;
    return vec.map(function(v) { return v / mag; });
  }

  function cosineSimilarity(a, b) {
    return dot(normalize(a), normalize(b));
  }

  /* Matris × Vektör çarpımı */
  function matVecMul(matrix, vec) {
    var result = [];
    for (var i = 0; i < matrix.length; i++) {
      var sum = 0;
      for (var j = 0; j < vec.length; j++) {
        sum += matrix[i][j] * vec[j];
      }
      result.push(sum);
    }
    return result;
  }

  /* Vektör toplama */
  function vecAdd(a, b) {
    return a.map(function(v, i) { return v + (b[i] || 0); });
  }

  /* Vektöre aktivasyon uygula */
  function applyActivation(vec, fn) {
    return vec.map(fn);
  }

  /* Deterministik hash — aynı seed her zaman aynı sayıyı verir */
  function hashStr(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(h);
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /* Deterministik pseudo-random (Xavier-benzeri ağırlık üretimi için) */
  function seedRandom(seed) {
    var x = Math.sin(seed * 9301 + 49297) * 233280;
    return (x - Math.floor(x));
  }

  /* Ağırlıklı rastgele seçim — öğelerin her biri {text, weight} */
  function weightedPick(items, seed) {
    var total = items.reduce(function(s, it) { return s + (it.weight || 1); }, 0);
    var rnd = (hashStr(seed + total) % 10000) / 10000 * total;
    var acc = 0;
    for (var i = 0; i < items.length; i++) {
      acc += (items[i].weight || 1);
      if (rnd <= acc) return items[i];
    }
    return items[items.length - 1];
  }

  /* Son kullanılan yorum cache (session başına) */
  var _usedCache = {};
  function pickUnused(items, seed, cacheKey) {
    if (!_usedCache[cacheKey]) _usedCache[cacheKey] = [];
    var available = items.filter(function(it, idx) {
      return _usedCache[cacheKey].indexOf(idx) === -1;
    });
    if (!available.length) { _usedCache[cacheKey] = []; available = items.slice(); }
    var chosen = weightedPick(available, seed + cacheKey);
    var origIdx = items.indexOf(chosen);
    if (origIdx !== -1) _usedCache[cacheKey].push(origIdx);
    return chosen;
  }

  /* Tarih aralığı kontrolü */
  function isDateInRange(date, startMonth, startDay, endMonth, endDay) {
    var m = date.getMonth() + 1, d = date.getDate();
    var s = startMonth * 100 + startDay;
    var e = endMonth * 100 + endDay;
    var c = m * 100 + d;
    if (s <= e) return c >= s && c <= e;
    return c >= s || c <= e; // yıl geçişi
  }


  /* ══════════════════════════════════════════════════
     KATMAN 1 — SIGN FEATURE VECTORS
     Boyutlar: [enerji, istikrar, macera, pratiklik,
                sosyallik, sezgi, liderlik, duyarlılık]
  ══════════════════════════════════════════════════ */
  var SIGN_VECTORS = {
    aries:       [0.95, 0.20, 0.90, 0.30, 0.65, 0.25, 0.95, 0.20],
    taurus:      [0.30, 0.95, 0.20, 0.95, 0.55, 0.40, 0.40, 0.65],
    gemini:      [0.75, 0.30, 0.80, 0.45, 0.95, 0.55, 0.55, 0.45],
    cancer:      [0.45, 0.70, 0.35, 0.60, 0.65, 0.80, 0.35, 0.95],
    leo:         [0.90, 0.55, 0.75, 0.40, 0.85, 0.35, 0.90, 0.50],
    virgo:       [0.50, 0.85, 0.30, 0.95, 0.60, 0.65, 0.55, 0.70],
    libra:       [0.55, 0.65, 0.60, 0.70, 0.90, 0.55, 0.60, 0.75],
    scorpio:     [0.85, 0.75, 0.65, 0.55, 0.40, 0.95, 0.75, 0.85],
    sagittarius: [0.80, 0.30, 0.95, 0.35, 0.80, 0.50, 0.70, 0.35],
    capricorn:   [0.60, 0.95, 0.30, 0.90, 0.45, 0.45, 0.85, 0.45],
    aquarius:    [0.70, 0.50, 0.85, 0.50, 0.85, 0.80, 0.65, 0.55],
    pisces:      [0.40, 0.45, 0.55, 0.30, 0.70, 0.95, 0.30, 0.95]
  };

  var SIGN_KEYS = ['aries','taurus','gemini','cancer','leo','virgo',
                   'libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

  /* Kategori ağırlık matrisleri — her boyutun ilgili kategoriye katkısı */
  var CATEGORY_WEIGHTS = {
    love:   [0.30, 0.25, 0.40, 0.15, 0.80, 0.75, 0.20, 0.95],
    luck:   [0.85, 0.40, 0.90, 0.60, 0.55, 0.65, 0.70, 0.25],
    career: [0.70, 0.80, 0.50, 0.90, 0.60, 0.45, 0.95, 0.30],
    health: [0.80, 0.70, 0.55, 0.75, 0.50, 0.60, 0.45, 0.65],
    daily:  [0.60, 0.55, 0.65, 0.70, 0.75, 0.60, 0.65, 0.60],
    money:  [0.55, 0.85, 0.45, 0.95, 0.50, 0.40, 0.80, 0.30]
  };


  /* ══════════════════════════════════════════════════
     KATMAN 2 — ELEMENT & MODALİTE UYUM SİSTEMİ
  ══════════════════════════════════════════════════ */

  var SIGN_ELEMENTS = {
    aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
    leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
    sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water'
  };

  var SIGN_MODALITIES = {
    aries: 'cardinal', taurus: 'fixed', gemini: 'mutable',
    cancer: 'cardinal', leo: 'fixed', virgo: 'mutable',
    libra: 'cardinal', scorpio: 'fixed', sagittarius: 'mutable',
    capricorn: 'cardinal', aquarius: 'fixed', pisces: 'mutable'
  };

  /* Her burcun yönetici gezegeni */
  var SIGN_RULERS = {
    aries: 'mars', taurus: 'venus', gemini: 'mercury', cancer: 'moon',
    leo: 'sun', virgo: 'mercury', libra: 'venus', scorpio: 'mars',
    sagittarius: 'jupiter', capricorn: 'saturn', aquarius: 'saturn', pisces: 'jupiter'
  };

  /* Element uyum matrisi — 1.0 = tam uyum, 0.0 = çatışma */
  var ELEMENT_HARMONY = {
    fire:  { fire: 0.85, earth: 0.35, air: 0.95, water: 0.30 },
    earth: { fire: 0.35, earth: 0.85, air: 0.40, water: 0.90 },
    air:   { fire: 0.95, earth: 0.40, air: 0.80, water: 0.45 },
    water: { fire: 0.30, earth: 0.90, air: 0.45, water: 0.85 }
  };

  /* Modalite uyum matrisi */
  var MODALITY_HARMONY = {
    cardinal: { cardinal: 0.60, fixed: 0.75, mutable: 0.85 },
    fixed:    { cardinal: 0.75, fixed: 0.55, mutable: 0.80 },
    mutable:  { cardinal: 0.85, fixed: 0.80, mutable: 0.65 }
  };

  /* Element enerji vektörleri — temporal hesaba katkı */
  var ELEMENT_ENERGY = {
    fire:  [0.95, 0.30, 0.90, 0.35, 0.75, 0.30, 0.90, 0.25],
    earth: [0.40, 0.95, 0.25, 0.95, 0.50, 0.45, 0.55, 0.60],
    air:   [0.70, 0.40, 0.85, 0.50, 0.95, 0.60, 0.60, 0.45],
    water: [0.35, 0.65, 0.45, 0.40, 0.60, 0.95, 0.35, 0.95]
  };

  /**
   * İki element arasındaki uyumu döndürür (0-1)
   */
  function elementalHarmony(elem1, elem2) {
    if (!ELEMENT_HARMONY[elem1] || !ELEMENT_HARMONY[elem1][elem2]) return 0.5;
    return ELEMENT_HARMONY[elem1][elem2];
  }

  /**
   * İki modalite arasındaki uyumu döndürür (0-1)
   */
  function modalityHarmony(mod1, mod2) {
    if (!MODALITY_HARMONY[mod1] || !MODALITY_HARMONY[mod1][mod2]) return 0.5;
    return MODALITY_HARMONY[mod1][mod2];
  }

  /**
   * Modalite bazında günlük çarpan
   * Kardinal günler: Pazartesi, Perşembe (başlatma enerjisi)
   * Sabit günler: Salı, Cuma (sürdürme enerjisi)
   * Değişken günler: Çarşamba, Cumartesi, Pazar (esneklik enerjisi)
   */
  function modalityBoost(signKey, date) {
    var d = date || new Date();
    var dayOfWeek = d.getDay();
    var signModality = SIGN_MODALITIES[signKey];

    var dayModalities = ['mutable','cardinal','fixed','mutable','cardinal','fixed','mutable'];
    var dayMod = dayModalities[dayOfWeek];

    if (signModality === dayMod) return 1.15;  // Uyumlu gün
    if (modalityHarmony(signModality, dayMod) > 0.75) return 1.08;
    return 1.0;
  }

  /**
   * Element bazında mevsimsel çarpan
   */
  function elementalSeasonBoost(signKey, date) {
    var d = date || new Date();
    var month = d.getMonth();
    var signElement = SIGN_ELEMENTS[signKey];

    // Mevsim → baskın element
    var seasonElement;
    if (month >= 2 && month <= 4) seasonElement = 'fire';      // İlkbahar → Ateş
    else if (month >= 5 && month <= 7) seasonElement = 'fire';  // Yaz → Ateş
    else if (month >= 8 && month <= 10) seasonElement = 'earth'; // Sonbahar → Toprak
    else seasonElement = 'water';                                // Kış → Su

    return elementalHarmony(signElement, seasonElement);
  }


  /* ══════════════════════════════════════════════════
     KATMAN 3 — PLANETARY HOURS (Antik Sistem)
     Haftanın her günü 7 gezegen saati sırasıyla döner.
  ══════════════════════════════════════════════════ */
  var PLANETS = ['sun','moon','mars','mercury','jupiter','venus','saturn'];
  var DAY_RULERS = [0,1,5,3,2,4,6]; // Pazar=0(Güneş), ..., Cumartesi=6(Satürn)

  var PLANET_ENERGY = {
    sun:     [0.90, 0.60, 0.70, 0.50, 0.85, 0.40, 0.80, 0.35],
    moon:    [0.40, 0.70, 0.50, 0.55, 0.65, 0.90, 0.30, 0.95],
    mars:    [0.95, 0.25, 0.85, 0.35, 0.60, 0.30, 0.90, 0.25],
    mercury: [0.65, 0.45, 0.75, 0.70, 0.90, 0.55, 0.50, 0.50],
    jupiter: [0.75, 0.65, 0.80, 0.60, 0.80, 0.60, 0.75, 0.55],
    venus:   [0.50, 0.70, 0.65, 0.60, 0.85, 0.70, 0.45, 0.85],
    saturn:  [0.55, 0.90, 0.30, 0.85, 0.40, 0.40, 0.80, 0.45]
  };

  function getCurrentPlanetaryHour(date) {
    var d = date || new Date();
    var dayOfWeek = d.getDay(); // 0=Pazar
    var hour = d.getHours();
    var rulerIdx = DAY_RULERS[dayOfWeek];
    var planetIdx = (rulerIdx + hour) % 7;
    return PLANETS[planetIdx];
  }


  /* ══════════════════════════════════════════════════
     KATMAN 4 — TRANSIT ENGINE
     Yaklaşık gezegensel hesaplar (J2000 baz alınarak)
  ══════════════════════════════════════════════════ */

  function julianDay(date) {
    var d = date || new Date();
    var Y = d.getFullYear(), M = d.getMonth() + 1, D = d.getDate();
    return 367 * Y - Math.floor(7 * (Y + Math.floor((M + 9) / 12)) / 4) +
           Math.floor(275 * M / 9) + D + 1721013.5;
  }

  function normDeg(x) { return ((x % 360) + 360) % 360; }

  function calcPlanetPositions(date) {
    var jd = julianDay(date);
    var d = jd - 2451545.0; // J2000'den gün farkı

    return {
      sun:     normDeg(280.460 + 0.9856474 * d),
      moon:    normDeg(218.316 + 13.176396 * d),
      mercury: normDeg(252.251 + 1.5918 * d),
      venus:   normDeg(181.979 + 0.6221 * d),
      mars:    normDeg(355.433 + 0.5240207 * d),
      jupiter: normDeg(34.396  + 0.0830853 * d),
      saturn:  normDeg(50.077  + 0.0334697 * d)
    };
  }

  function calcTransits(date) {
    var positions = calcPlanetPositions(date);
    var retrogrades = getRetrogrades(date);

    return {
      positions: positions,
      mercRetro: retrogrades.mercury.active,
      venusRetro: retrogrades.venus.active,
      retrogrades: retrogrades,
      aspects: calcAspects(positions)
    };
  }

  /* Gezegenin hangi burçta olduğunu döndür */
  function lonToSign(lon) {
    return SIGN_KEYS[Math.floor(normDeg(lon) / 30)];
  }

  /* Transit uyum skoru: transit gezegen + natal burç arasındaki vektör benzerliği */
  function transitScore(signKey, date) {
    var positions = calcPlanetPositions(date || new Date());
    var signVec = SIGN_VECTORS[signKey];
    var score = 0;
    var planetKeys = Object.keys(positions);
    planetKeys.forEach(function(planet) {
      var transitSign = lonToSign(positions[planet]);
      var pVec = PLANET_ENERGY[planet] || PLANET_ENERGY.sun;
      var tVec = SIGN_VECTORS[transitSign] || signVec;
      score += cosineSimilarity(signVec, pVec) * cosineSimilarity(signVec, tVec);
    });
    score /= planetKeys.length;

    // Retrograd cezaları (gelişmiş)
    var retrogrades = getRetrogrades(date);
    var retroPenalty = 0;
    Object.keys(retrogrades).forEach(function(planet) {
      var r = retrogrades[planet];
      if (r.active) retroPenalty += r.penalty;
      else if (r.shadow) retroPenalty += r.penalty * 0.4;
    });
    score -= retroPenalty;

    // Aspect bonusu
    var aspects = calcAspects(calcPlanetPositions(date));
    var aspectBonus = aspectInfluence(signKey, aspects);
    score += aspectBonus * 0.15;

    return Math.max(0, Math.min(1, score));
  }


  /* ══════════════════════════════════════════════════
     KATMAN 5 — GELİŞMİŞ RETROGRAD & GÖLGE PERİYODU
     5 gezegen için tarih tabanlı retrograd dönemleri
  ══════════════════════════════════════════════════ */

  /**
   * Retrograd dönemleri (2024-2028)
   * Her dönem: [başlangıçAy, başlangıçGün, bitişAy, bitişGün]
   * Gölge periyodu: retrograd öncesi/sonrası ~2 hafta
   */
  var RETROGRADE_PERIODS = {
    mercury: [
      // 2024
      [12,13, 1,2],   // Aralık 2024 - Ocak 2025
      // 2025
      [3,15, 4,7],
      [7,18, 8,11],
      [11,9, 11,29],
      // 2026
      [3,2, 3,25],
      [6,30, 7,24],
      [10,25, 11,15],
      // 2027
      [2,10, 3,5],
      [6,10, 7,4],
      [10,7, 10,28],
      // 2028
      [1,24, 2,14],
      [5,21, 6,13],
      [9,19, 10,11]
    ],
    venus: [
      [3,2, 4,13],      // 2025
      [10,3, 11,14],     // 2026
      [5,9, 6,20],       // 2027
      [12,16, 1,27]      // 2028-2029
    ],
    mars: [
      [12,6, 2,24],      // 2024-2025
      [1,10, 4,1],        // 2027
    ],
    jupiter: [
      [10,9, 2,4],       // 2024-2025
      [11,11, 3,10],     // 2025-2026
      [12,12, 4,11],     // 2026-2027
    ],
    saturn: [
      [6,29, 11,15],     // 2025
      [7,13, 11,28],     // 2026
      [7,27, 12,12],     // 2027
    ]
  };

  /* Retrograd ceza ağırlıkları — gezegen başına */
  var RETROGRADE_PENALTIES = {
    mercury: 0.06,   // İletişim, teknoloji, seyahat
    venus:   0.05,   // Aşk, ilişkiler, güzellik
    mars:    0.07,   // Enerji, motivasyon, eylem
    jupiter: 0.04,   // Genişleme, şans, büyüme
    saturn:  0.03    // Disiplin, yapı, sorumluluk
  };

  /* Retrograd etki alanları */
  var RETROGRADE_DOMAINS = {
    mercury: ['career', 'daily', 'luck'],
    venus:   ['love', 'money'],
    mars:    ['career', 'health', 'daily'],
    jupiter: ['luck', 'money', 'career'],
    saturn:  ['career', 'health']
  };

  var RETROGRADE_WARNINGS = {
    mercury: {
      tr: '⚠️ Merkür Retrosu: İletişim, teknoloji ve seyahatte dikkatli ol. Sözleşmeleri tekrar oku.',
      en: '⚠️ Mercury Retrograde: Be cautious with communication, technology and travel. Re-read contracts.',
      ru: '⚠️ Ретроградный Меркурий: Будь осторожен с общением, технологиями и путешествиями.'
    },
    venus: {
      tr: '⚠️ Venüs Retrosu: İlişkilerde köklü kararlardan kaçın. Eski bağlantılar geri dönebilir.',
      en: '⚠️ Venus Retrograde: Avoid major relationship decisions. Past connections may resurface.',
      ru: '⚠️ Ретроградная Венера: Избегай серьёзных решений в отношениях. Старые связи могут вернуться.'
    },
    mars: {
      tr: '⚠️ Mars Retrosu: Enerji düşebilir, agresif kararlardan kaçın. İçsel güçlenmeye odaklan.',
      en: '⚠️ Mars Retrograde: Energy may dip — avoid aggressive decisions. Focus on inner strength.',
      ru: '⚠️ Ретроградный Марс: Энергия может снизиться — избегай агрессивных решений.'
    },
    jupiter: {
      tr: '💫 Jüpiter Retrosu: Dışa genişleme yerine içsel büyümeye odaklan. Felsefeni sorgula.',
      en: '💫 Jupiter Retrograde: Focus on inner growth instead of external expansion.',
      ru: '💫 Ретроградный Юпитер: Сосредоточься на внутреннем росте вместо внешнего расширения.'
    },
    saturn: {
      tr: '🪐 Satürn Retrosu: Yapılarını ve sorumluluklarını gözden geçir. Temellerini sağlamlaştır.',
      en: '🪐 Saturn Retrograde: Review your structures and responsibilities. Strengthen foundations.',
      ru: '🪐 Ретроградный Сатурн: Пересмотри структуры и обязанности. Укрепляй фундамент.'
    }
  };

  var SHADOW_WARNINGS = {
    mercury: {
      tr: '🌫️ Merkür Retro Gölgesi: Retronun etkisi hafifliyor ama dikkat hâlâ gerekli.',
      en: '🌫️ Mercury Retro Shadow: The retrograde effects are fading but caution remains.',
      ru: '🌫️ Тень ретро Меркурия: Эффекты ретрограда ослабевают, но осторожность ещё нужна.'
    },
    venus: {
      tr: '🌫️ Venüs Retro Gölgesi: Duygusal berraklık yavaşça geri geliyor.',
      en: '🌫️ Venus Retro Shadow: Emotional clarity is slowly returning.',
      ru: '🌫️ Тень ретро Венеры: Эмоциональная ясность медленно возвращается.'
    },
    mars: {
      tr: '🌫️ Mars Retro Gölgesi: Enerji yavaşça toparlanıyor.',
      en: '🌫️ Mars Retro Shadow: Energy is slowly recovering.',
      ru: '🌫️ Тень ретро Марса: Энергия постепенно восстанавливается.'
    },
    jupiter: {
      tr: '🌫️ Jüpiter Retro Gölgesi: Büyüme yavaşça dışa yansımaya başlıyor.',
      en: '🌫️ Jupiter Retro Shadow: Growth is slowly beginning to manifest outward.',
      ru: '🌫️ Тень ретро Юпитера: Рост начинает медленно проявляться внешне.'
    },
    saturn: {
      tr: '🌫️ Satürn Retro Gölgesi: Yeniden yapılanma tamamlanıyor.',
      en: '🌫️ Saturn Retro Shadow: Restructuring is completing.',
      ru: '🌫️ Тень ретро Сатурна: Реструктуризация завершается.'
    }
  };

  /**
   * Verilen tarih için tüm gezegenlerin retrograd durumlarını döndürür.
   * Gölge periyotları: retrograd öncesi/sonrası ~14 gün
   */
  function getRetrogrades(date) {
    var d = date || new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var current = m * 100 + day;

    var result = {};
    var planetNames = ['mercury','venus','mars','jupiter','saturn'];

    planetNames.forEach(function(planet) {
      var periods = RETROGRADE_PERIODS[planet] || [];
      var isActive = false;
      var isShadow = false;

      for (var i = 0; i < periods.length; i++) {
        var p = periods[i];
        var start = p[0] * 100 + p[1];
        var end = p[2] * 100 + p[3];

        // Retrograd aktif mi?
        if (start <= end) {
          if (current >= start && current <= end) { isActive = true; break; }
        } else {
          if (current >= start || current <= end) { isActive = true; break; }
        }

        // Gölge periyodu (öncesi: -14 gün, sonrası: +14 gün)
        // Basitleştirilmiş: ay başı/sonu kontrolleri
        var shadowPreStart = (p[0] === 1 ? 12 : p[0] - 1) * 100 + Math.max(1, p[1] - 14 + 30) % 31;
        var shadowPostEnd = p[2] * 100 + Math.min(28, p[3] + 14);

        if (!isActive) {
          // Ön gölge
          var preS = p[0] * 100 + Math.max(1, p[1] - 14);
          if (current >= preS && current < start) { isShadow = true; }
          // Son gölge
          var postE = p[2] * 100 + Math.min(28, p[3] + 14);
          if (current > end && current <= postE) { isShadow = true; }
        }
      }

      result[planet] = {
        active: isActive,
        shadow: isShadow,
        penalty: RETROGRADE_PENALTIES[planet] || 0.03,
        domains: RETROGRADE_DOMAINS[planet] || [],
        warning: isActive ? RETROGRADE_WARNINGS[planet] : (isShadow ? SHADOW_WARNINGS[planet] : null)
      };
    });

    return result;
  }

  /**
   * Belirli bir kategori için retrograd ceza çarpanını hesapla
   */
  function retrogradeMultiplier(category, date) {
    var retrogrades = getRetrogrades(date);
    var multiplier = 1.0;

    Object.keys(retrogrades).forEach(function(planet) {
      var r = retrogrades[planet];
      if (r.domains.indexOf(category) !== -1) {
        if (r.active) multiplier *= (1 - r.penalty * 2);
        else if (r.shadow) multiplier *= (1 - r.penalty * 0.8);
      }
    });

    return multiplier;
  }


  /* ══════════════════════════════════════════════════
     KATMAN 6 — ASPECT ENGINE (Gezegen Açıları)
     Gezegenler arası açısal ilişkiler
  ══════════════════════════════════════════════════ */

  var ASPECT_TYPES = {
    conjunction: { angle: 0,   orb: 8,  influence: 0.90, nature: 'intense' },
    sextile:     { angle: 60,  orb: 6,  influence: 0.60, nature: 'harmonious' },
    square:      { angle: 90,  orb: 8,  influence: -0.70, nature: 'tense' },
    trine:       { angle: 120, orb: 8,  influence: 0.85, nature: 'harmonious' },
    opposition:  { angle: 180, orb: 8,  influence: -0.50, nature: 'tense' }
  };

  var ASPECT_NAMES = {
    conjunction: { tr: 'Kavuşum', en: 'Conjunction', ru: 'Соединение' },
    sextile:     { tr: 'Sekstil', en: 'Sextile', ru: 'Секстиль' },
    square:      { tr: 'Kare', en: 'Square', ru: 'Квадрат' },
    trine:       { tr: 'Üçgen', en: 'Trine', ru: 'Тригон' },
    opposition:  { tr: 'Karşıt', en: 'Opposition', ru: 'Оппозиция' }
  };

  /**
   * Tüm gezegen çiftleri arasındaki aspect'leri hesapla
   * @returns {Array} Her biri {planet1, planet2, type, exactAngle, orb, influence} içeren dizi
   */
  function calcAspects(positions) {
    var planets = Object.keys(positions);
    var aspects = [];

    for (var i = 0; i < planets.length; i++) {
      for (var j = i + 1; j < planets.length; j++) {
        var p1 = planets[i], p2 = planets[j];
        var angle = Math.abs(normDeg(positions[p1]) - normDeg(positions[p2]));
        if (angle > 180) angle = 360 - angle;

        var aspectTypes = Object.keys(ASPECT_TYPES);
        for (var k = 0; k < aspectTypes.length; k++) {
          var at = ASPECT_TYPES[aspectTypes[k]];
          var diff = Math.abs(angle - at.angle);
          if (diff <= at.orb) {
            // Orb'a yakınlık — tam açıya ne kadar yakınsa o kadar güçlü
            var strength = 1 - (diff / at.orb);
            aspects.push({
              planet1: p1,
              planet2: p2,
              type: aspectTypes[k],
              exactAngle: angle,
              orbDiff: diff,
              strength: strength,
              influence: at.influence * strength,
              nature: at.nature
            });
            break; // İlk eşleşen aspect yeterli
          }
        }
      }
    }
    return aspects;
  }

  /**
   * Aspect'lerin belirli bir burç üzerindeki toplam etkisini hesapla
   */
  function aspectInfluence(signKey, aspects) {
    var ruler = SIGN_RULERS[signKey];
    var element = SIGN_ELEMENTS[signKey];
    var totalInfluence = 0;
    var count = 0;

    aspects.forEach(function(asp) {
      var weight = 1.0;

      // Yönetici gezegen dahilse ağırlık artır
      if (asp.planet1 === ruler || asp.planet2 === ruler) weight = 1.8;

      // Güneş ve Ay her zaman önemli
      if (asp.planet1 === 'sun' || asp.planet2 === 'sun') weight = Math.max(weight, 1.4);
      if (asp.planet1 === 'moon' || asp.planet2 === 'moon') weight = Math.max(weight, 1.3);

      totalInfluence += asp.influence * weight;
      count++;
    });

    return count > 0 ? totalInfluence / count : 0;
  }

  /**
   * Aspect'lerin kategoriye özgü etkisini hesapla
   */
  function aspectCategoryInfluence(aspects, category) {
    var relevantPlanets = {
      love:   ['venus', 'moon', 'mars'],
      luck:   ['jupiter', 'sun'],
      career: ['saturn', 'sun', 'mars'],
      health: ['mars', 'moon', 'sun'],
      money:  ['jupiter', 'venus', 'saturn'],
      daily:  ['mercury', 'moon', 'sun']
    };

    var planets = relevantPlanets[category] || relevantPlanets.daily;
    var influence = 0;
    var count = 0;

    aspects.forEach(function(asp) {
      if (planets.indexOf(asp.planet1) !== -1 || planets.indexOf(asp.planet2) !== -1) {
        influence += asp.influence;
        count++;
      }
    });

    return count > 0 ? influence / count : 0;
  }


  /* ══════════════════════════════════════════════════
     KATMAN 7 — MOON PHASE WEIGHT
  ══════════════════════════════════════════════════ */

  function getMoonCycle(date) {
    var jd = julianDay(date || new Date());
    var cycle = ((jd - 2451550.1) % 29.530588) / 29.530588;
    if (cycle < 0) cycle += 1;
    return cycle;
  }

  function getMoonPhaseWeight(date) {
    var cycle = getMoonCycle(date);

    // [enerji, istikrar, macera, pratiklik, sosyallik, sezgi, liderlik, duyarlılık]
    if (cycle < 0.125) return [0.60, 0.50, 0.55, 0.45, 0.55, 0.70, 0.50, 0.65]; // Yeni Ay
    if (cycle < 0.25)  return [0.70, 0.45, 0.75, 0.50, 0.65, 0.60, 0.65, 0.55]; // Büyüyen Hilal
    if (cycle < 0.375) return [0.80, 0.55, 0.80, 0.65, 0.70, 0.55, 0.75, 0.50]; // İlk Dördün
    if (cycle < 0.5)   return [0.90, 0.60, 0.85, 0.70, 0.80, 0.60, 0.80, 0.55]; // Büyüyen Ay
    if (cycle < 0.625) return [0.95, 0.65, 0.90, 0.75, 0.90, 0.70, 0.85, 0.65]; // Dolunay
    if (cycle < 0.75)  return [0.75, 0.70, 0.65, 0.75, 0.70, 0.75, 0.65, 0.75]; // Küçülen Ay
    if (cycle < 0.875) return [0.60, 0.75, 0.50, 0.80, 0.55, 0.80, 0.55, 0.80]; // Son Dördün
    return                    [0.50, 0.80, 0.40, 0.85, 0.45, 0.85, 0.45, 0.85]; // Küçülen Hilal
  }

  function getMoonPhaseName(date) {
    var cycle = getMoonCycle(date);
    var names = {
      tr: ['Yeni Ay','Büyüyen Hilal','İlk Dördün','Büyüyen Ay',
           'Dolunay','Küçülen Ay','Son Dördün','Küçülen Hilal'],
      en: ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
           'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'],
      ru: ['Новолуние','Растущий серп','Первая четверть','Растущая Луна',
           'Полнолуние','Убывающая Луна','Последняя четверть','Убывающий серп']
    };
    var idx = Math.min(7, Math.floor(cycle * 8));
    return { tr: names.tr[idx], en: names.en[idx], ru: names.ru[idx], fraction: cycle, index: idx };
  }


  /* ══════════════════════════════════════════════════
     KATMAN 8 — TEMPORAL WEIGHT VECTOR
     Bugünün çok-faktörlü enerji ağırlığı
  ══════════════════════════════════════════════════ */

  function getTemporalVector(date) {
    var d = date || new Date();
    var planet = getCurrentPlanetaryHour(d);
    var planetVec = PLANET_ENERGY[planet];
    var moonVec = getMoonPhaseWeight(d);

    // Mevsim vektörü (kuzey yarıküre)
    var month = d.getMonth();
    var seasonVec;
    if (month >= 2 && month <= 4)       seasonVec = [0.75,0.55,0.70,0.60,0.75,0.55,0.65,0.60]; // İlkbahar
    else if (month >= 5 && month <= 7)  seasonVec = [0.90,0.45,0.85,0.55,0.85,0.50,0.80,0.50]; // Yaz
    else if (month >= 8 && month <= 10) seasonVec = [0.65,0.70,0.60,0.75,0.65,0.70,0.60,0.70]; // Sonbahar
    else                                seasonVec = [0.45,0.85,0.35,0.85,0.45,0.75,0.50,0.75]; // Kış

    // Hafta günü vektörü
    var dayVecs = [
      [0.85,0.50,0.80,0.45,0.80,0.55,0.80,0.50], // Pazar
      [0.70,0.75,0.55,0.80,0.60,0.50,0.75,0.55], // Pazartesi
      [0.90,0.35,0.85,0.40,0.65,0.35,0.90,0.30], // Salı (Mars)
      [0.65,0.50,0.75,0.65,0.85,0.60,0.55,0.55], // Çarşamba (Merkür)
      [0.75,0.60,0.80,0.60,0.80,0.60,0.75,0.60], // Perşembe (Jüpiter)
      [0.55,0.65,0.65,0.60,0.90,0.70,0.50,0.85], // Cuma (Venüs)
      [0.55,0.90,0.35,0.90,0.45,0.60,0.65,0.65]  // Cumartesi (Satürn)
    ];
    var dayVec = dayVecs[d.getDay()];

    // Sayısal enerji (Numeroloji gün sayısı)
    var dayNum = (d.getDate() + d.getMonth() + 1 + d.getFullYear()) % 9 || 9;
    var numScale = 0.7 + (dayNum / 9) * 0.3;

    // Element enerji katkısı (yeni)
    var dominantElement = 'fire';
    if (month >= 2 && month <= 4) dominantElement = 'fire';
    else if (month >= 5 && month <= 7) dominantElement = 'fire';
    else if (month >= 8 && month <= 10) dominantElement = 'earth';
    else dominantElement = 'water';
    var elemVec = ELEMENT_ENERGY[dominantElement];

    // Ağırlıklı ortalama — element katkısı eklendi
    var temporal = [];
    for (var i = 0; i < 8; i++) {
      temporal.push(
        (planetVec[i] * 0.25 +
         moonVec[i] * 0.25 +
         seasonVec[i] * 0.18 +
         dayVec[i] * 0.17 +
         elemVec[i] * 0.15) * numScale
      );
    }
    return normalize(temporal);
  }


  /* ══════════════════════════════════════════════════
     KATMAN 9 — NATAL ENGINE
     Doğum tarihi + saati → natal harita skorları
  ══════════════════════════════════════════════════ */

  var SIGN_DATES = [
    {key:'capricorn', m:1, d:1},  {key:'aquarius', m:1, d:20},
    {key:'pisces', m:2, d:19},    {key:'aries', m:3, d:21},
    {key:'taurus', m:4, d:20},    {key:'gemini', m:5, d:21},
    {key:'cancer', m:6, d:21},    {key:'leo', m:7, d:23},
    {key:'virgo', m:8, d:23},     {key:'libra', m:9, d:23},
    {key:'scorpio', m:10, d:23},  {key:'sagittarius', m:11, d:22},
    {key:'capricorn', m:12, d:22}
  ];

  function getSunSign(date) {
    var d = date || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    for (var i = SIGN_DATES.length - 1; i >= 0; i--) {
      var s = SIGN_DATES[i];
      if (m > s.m || (m === s.m && day >= s.d)) return s.key;
    }
    return 'capricorn';
  }

  function getMoonSign(birthDate) {
    var jd = julianDay(birthDate);
    var moonCycle = ((jd - 2451550.1) % 29.530588);
    if (moonCycle < 0) moonCycle += 29.530588;
    var signIdx = Math.floor(moonCycle / (29.530588 / 12));
    return SIGN_KEYS[signIdx % 12];
  }

  function getAscendantSign(birthDate, birthHour) {
    var sunSign = getSunSign(birthDate);
    var sunIdx = SIGN_KEYS.indexOf(sunSign);
    var hourOffset = Math.floor((birthHour !== undefined ? birthHour : 6) / 2);
    return SIGN_KEYS[(sunIdx + hourOffset) % 12];
  }

  function calcNatalScores(birthDate, birthHour) {
    var sunSign = getSunSign(birthDate);
    var moonSign = getMoonSign(birthDate);
    var ascSign = getAscendantSign(birthDate, birthHour);

    var sunVec = SIGN_VECTORS[sunSign];
    var moonVec = SIGN_VECTORS[moonSign];
    var ascVec = SIGN_VECTORS[ascSign];

    /* Natal vektör: Güneş %50, Ay %30, Yükselen %20 */
    var natal = [];
    for (var i = 0; i < 8; i++) {
      natal.push(sunVec[i] * 0.50 + moonVec[i] * 0.30 + ascVec[i] * 0.20);
    }

    /* Kişilik profil skorları (0-100) */
    var dims = ['energy','stability','adventure','practicality',
                'social','intuition','leadership','sensitivity'];
    var profile = {};
    dims.forEach(function(dim, i) {
      profile[dim] = Math.round(natal[i] * 100);
    });

    return {
      sunSign: sunSign,
      moonSign: moonSign,
      ascSign: ascSign,
      natalVector: natal,
      profile: profile,
      element: SIGN_ELEMENTS[sunSign],
      modality: SIGN_MODALITIES[sunSign],
      ruler: SIGN_RULERS[sunSign]
    };
  }


  /* ══════════════════════════════════════════════════
     KATMAN 10 — MLP (Multi-Layer Perceptron) INTERPRETER
     3 katmanlı sinir ağı: Input(16) → H1(12) → H2(8) → Output(6)
  ══════════════════════════════════════════════════ */

  /**
   * Deterministik ağırlık matrisi üretimi
   * Xavier initialization benzeri: ağırlıklar [-sqrt(6/(fan_in+fan_out)), sqrt(6/(fan_in+fan_out))]
   */
  function generateWeightMatrix(rows, cols, seed) {
    var limit = Math.sqrt(6.0 / (rows + cols));
    var matrix = [];
    for (var i = 0; i < rows; i++) {
      matrix[i] = [];
      for (var j = 0; j < cols; j++) {
        var r = seedRandom(seed + i * cols + j + 1);
        matrix[i][j] = (r * 2 - 1) * limit;
      }
    }
    return matrix;
  }

  function generateBiasVector(size, seed) {
    var bias = [];
    for (var i = 0; i < size; i++) {
      bias.push((seedRandom(seed + i + 100) - 0.5) * 0.1);
    }
    return bias;
  }

  /* MLP Ağırlıkları — deterministik olarak seed'den üretilir */
  /* Seed değerleri astrolojik sabitlerden türetilmiştir */
  var MLP_W1 = generateWeightMatrix(12, 16, 7.83);     // 16→12 (Input→Hidden1)
  var MLP_B1 = generateBiasVector(12, 29.53);            // Hidden1 bias (Ay döngüsü)
  var MLP_W2 = generateWeightMatrix(8, 12, 365.25);     // 12→8  (Hidden1→Hidden2)
  var MLP_B2 = generateBiasVector(8, 11.86);              // Hidden2 bias (Jüpiter yılı)
  var MLP_W3 = generateWeightMatrix(6, 8, 224.7);       // 8→6   (Hidden2→Output)
  var MLP_B3 = generateBiasVector(6, 687.0);              // Output bias (Mars yılı)

  /* Kategori sırası: love=0, luck=1, career=2, health=3, money=4, daily=5 */
  var CATEGORY_ORDER = ['love', 'luck', 'career', 'health', 'money', 'daily'];

  /**
   * MLP ileri yayılım (forward pass)
   * @param {Array} signVec — 8D burç vektörü
   * @param {Array} temporalVec — 8D temporal vektör
   * @param {Array|null} natalVec — 8D natal vektör (opsiyonel)
   * @returns {Object} Kategori skorları {love, luck, career, health, money, daily}
   */
  function mlpForward(signVec, temporalVec, natalVec) {
    // Input vektörü: signVec (8) + temporalVec (8) = 16D
    var input = signVec.concat(temporalVec);

    // Layer 1: Input(16) → Hidden1(12) + ReLU
    var h1 = applyActivation(vecAdd(matVecMul(MLP_W1, input), MLP_B1), leakyRelu);

    // Natal attention: natal vektör varsa hidden1'e modülasyon uygula
    if (natalVec) {
      var natalAttention = normalize(natalVec);
      for (var i = 0; i < h1.length; i++) {
        // Natal vektörün ilgili boyutlarını attention olarak kullan
        var attWeight = natalAttention[i % natalAttention.length];
        h1[i] = h1[i] * (0.7 + attWeight * 0.6); // 0.7-1.3 arası modülasyon
      }
    }

    // Layer 2: Hidden1(12) → Hidden2(8) + ReLU
    var h2 = applyActivation(vecAdd(matVecMul(MLP_W2, h1), MLP_B2), leakyRelu);

    // Layer 3: Hidden2(8) → Output(6) + Sigmoid
    var output = applyActivation(vecAdd(matVecMul(MLP_W3, h2), MLP_B3), sigmoid);

    return output;
  }

  /**
   * Belirli bir kategori için skor hesapla — MLP + Eski sistem hibrit
   * MLP %60 + Eski dot-product %25 + Transit %15
   */
  function scoreForCategory(signKey, category, date, natalVector) {
    var signVec = SIGN_VECTORS[signKey];
    var temporal = getTemporalVector(date);
    var catWeights = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS.daily;

    /* === Eski Sistem (uyumluluk için korunuyor, %25 ağırlık) === */
    var rawScore = 0;
    for (var i = 0; i < 8; i++) {
      rawScore += signVec[i] * temporal[i] * catWeights[i];
    }
    var natalBias = 0;
    if (natalVector) {
      for (var j = 0; j < 8; j++) {
        natalBias += natalVector[j] * catWeights[j] * 0.3;
      }
    }
    var legacyScore = sigmoid(rawScore + natalBias - 2.0);

    /* === MLP Sistem (%60 ağırlık) === */
    var mlpOutput = mlpForward(signVec, temporal, natalVector);
    var catIdx = CATEGORY_ORDER.indexOf(category);
    var mlpScore = catIdx >= 0 ? mlpOutput[catIdx] : mlpOutput[5];

    /* === Transit & Aspect (%15 ağırlık) === */
    var transit = transitScore(signKey, date);

    /* === Element & Modalite çarpanı === */
    var elemBoost = elementalSeasonBoost(signKey, date);
    var modBoost = modalityBoost(signKey, date);

    /* === Retrograd çarpanı === */
    var retroMul = retrogradeMultiplier(category, date);

    /* === Aspect kategorik etkisi === */
    var positions = calcPlanetPositions(date);
    var aspects = calcAspects(positions);
    var aspectCatBonus = aspectCategoryInfluence(aspects, category) * 0.08;

    /* Hibrit skorlama */
    var finalScore = (mlpScore * 0.60 + legacyScore * 0.25 + transit * 0.15);

    /* Çarpanlar uygula */
    finalScore = finalScore * elemBoost * modBoost * retroMul + aspectCatBonus;

    return Math.max(0.05, Math.min(0.98, finalScore));
  }


  /* ══════════════════════════════════════════════════
     KATMAN 11 — ZENGİN METİN HAVUZU (5 SEVİYE)
     Her metin: {tr, en, ru, weight}
     Seviyeler: peak (≥0.82), high (≥0.65), mid (≥0.42), low (≥0.25), critical (<0.25)
  ══════════════════════════════════════════════════ */

  var DEEP_TEXTS = {

    /* ── AŞK ── */
    love: {
      peak: [
        {
          tr: "Bugün aşk enerjin galaktik ölçekte parlıyor. Evren sana kozmik bir buluşma ayarlıyor — gözlerini aç, o kişi beklemediğin yerde karşına çıkabilir. Kalbindeki titreşim bugün karşılık buluyor.",
          en: "Your love energy shines on a galactic scale today. The universe is arranging a cosmic encounter — open your eyes, that person may appear where you least expect. The vibration in your heart finds its echo today.",
          ru: "Сегодня твоя любовная энергия сияет в галактических масштабах. Вселенная организует космическую встречу — открой глаза, этот человек может появиться там, где ты меньше всего ожидаешь.",
          weight: 9
        },
        {
          tr: "Venüs ve Ay bugün senin için mükemmel bir dans ediyor. İlişkindeki her dokunuş, her bakış elektrikle yüklü. Yeni bir aşkın kapısındaysan, bugün o kapı sonuna kadar açılıyor.",
          en: "Venus and the Moon dance perfectly for you today. Every touch, every glance in your relationship is charged with electricity. If you're at the door of a new love, today it swings wide open.",
          ru: "Венера и Луна сегодня танцуют идеально для тебя. Каждое прикосновение, каждый взгляд заряжены электричеством. Если ты у двери новой любви — сегодня она распахивается настежь.",
          weight: 8
        }
      ],
      high: [
        {
          tr: "Bugün kalbin adeta bir fener gibi ışıyor; çevrendeki insanlar bu ışığa doğal olarak yöneliyor. İlişkini ya da yeni bir bağlantıyı derinleştirme fırsatını yakalamak için mükemmel bir an.",
          en: "Your heart shines like a lighthouse today; those around you are naturally drawn to its warmth. This is a perfect moment to deepen an existing bond or welcome a new connection.",
          ru: "Сегодня твоё сердце светит как маяк — окружающие естественно тянутся к этому свету. Идеальный момент, чтобы углубить существующую связь или открыться новым.",
          weight: 8
        },
        {
          tr: "Venüs'ün enerjisi senin burcunla uyum içinde dans ediyor. Söylenmesi zor olan o sözü bugün söyleyebilirsin; gezegenler tam zamanı gösteriyor.",
          en: "Venus's energy dances in harmony with your sign today. You can finally say the words you've been holding back — the planets are pointing at exactly this moment.",
          ru: "Энергия Венеры сегодня в гармонии с твоим знаком. Те слова, что ты всё никак не решался сказать — сейчас самое время. Планеты указывают именно на этот момент.",
          weight: 7
        },
        {
          tr: "Duygusal bir kapı aralanıyor; içeri girmek için cesaret yeterli. Bugün karşındaki kişiyle kurduğun her bağlantı, ilerleyen günlerde çok daha anlamlı bir yere evrilecek.",
          en: "An emotional door is ajar; all it takes is courage to walk through. Any connection you make today will grow into something far more meaningful in the days ahead.",
          ru: "Эмоциональная дверь приоткрыта — нужна лишь смелость, чтобы войти. Каждая связь, которую ты установишь сегодня, в ближайшие дни обретёт куда более глубокий смысл.",
          weight: 6
        }
      ],
      mid: [
        {
          tr: "Aşk cephesinde bugün sakin ama anlamlı bir gün. Büyük jestler yerine küçük ama samimi adımlar — bir mesaj, bir kucaklama, bir 'seni düşünüyorum' — çok daha derin bir iz bırakıyor.",
          en: "A quiet but meaningful day on the love front. Skip grand gestures — a message, a hug, a simple 'thinking of you' lands far deeper today.",
          ru: "На любовном фронте сегодня тихо, но значимо. Вместо громких жестов — маленькие, искренние шаги: сообщение, объятие, простое 'думаю о тебе' — оставят куда более глубокий след.",
          weight: 7
        },
        {
          tr: "İlişkinde bir şeyin biriktiğini hissediyorsan, bugün konuşmak için doğru zaman. Yıldızlar söylenenlere değil, nasıl söylendiğine dikkat et diyor.",
          en: "If you sense something building in your relationship, today is a good time to talk. The stars say pay attention not to what you say, but how you say it.",
          ru: "Если чувствуешь, что в отношениях что-то накапливается — сегодня хороший день для разговора. Звёзды говорят: важно не что ты скажешь, а как.",
          weight: 6
        },
        {
          tr: "Bugün seni düşünene sen de düşün; bu karşılıklı enerji akışı aşkta denklemi kuruyor. Tek taraflı değil, dans gibi olmak lazım.",
          en: "Think of those who are thinking of you; this two-way energy flow is what balances the equation in love. It's supposed to be a dance, not a monologue.",
          ru: "Думай о тех, кто думает о тебе — этот взаимный поток энергии и есть уравновешивающая сила в любви. Это должен быть танец, а не монолог.",
          weight: 5
        }
      ],
      low: [
        {
          tr: "Bugün aşk cephesinde beklentileri düşük tut. Kendi enerjine odaklanmak, uzun vadede çok daha güçlü bir sevgiye zemin hazırlar. Kendinle güzel olmak, başkalarıyla güzel olmanın temelidir.",
          en: "Keep expectations low on the love front today. Focusing on your own energy lays the groundwork for a much stronger love in the long run. Being good to yourself is the foundation of being good to others.",
          ru: "Сегодня снизь ожидания на любовном фронте. Сосредоточенность на собственной энергии в долгосрочной перспективе создаёт почву для гораздо более сильной любви. Быть добрым к себе — основа доброты к другим.",
          weight: 6
        },
        {
          tr: "Yıldızlar bugün aşk konusunda 'bekle ve izle' diyor. Aceleci bir adım, güzel bir şeyin tomurcuğunu koparabilir. Sabır bugün en romantik eylem.",
          en: "The stars say 'wait and watch' on the love front today. A rushed step might snap off the bud of something beautiful. Patience is the most romantic act right now.",
          ru: "Звёзды сегодня говорят 'жди и наблюдай' в делах любви. Поспешный шаг может сломить почку чего-то прекрасного. Терпение сейчас — самый романтичный поступок.",
          weight: 5
        }
      ],
      critical: [
        {
          tr: "Duygusal fırtına enerjisi var bugün — yıkıcı olmak yerine yapıcı ol. Kırıcı sözler söylemeden önce bir nefes al. Bu kasvetli bulutların ardında güneş hâlâ parlıyor; sadece bugün göremiyorsun.",
          en: "There's emotional storm energy today — be constructive, not destructive. Take a breath before saying hurtful words. The sun still shines behind these gloomy clouds; you just can't see it today.",
          ru: "Сегодня есть энергия эмоциональной бури — будь конструктивен, а не деструктивен. Сделай вдох, прежде чем произнести обидные слова. За этими мрачными тучами всё ещё светит солнце.",
          weight: 5
        },
        {
          tr: "Bugün aşk enerjisi en düşük noktasında. Ama unutma: en karanlık gece bile yıldızları daha parlak gösterir. Kendine şefkat göster, bu geçecek.",
          en: "Love energy is at its lowest today. But remember: even the darkest night makes the stars shine brighter. Show yourself compassion — this will pass.",
          ru: "Любовная энергия сегодня на минимуме. Но помни: даже самая тёмная ночь делает звёзды ярче. Прояви к себе сострадание — это пройдёт.",
          weight: 4
        }
      ]
    },

    /* ── ŞANS ── */
    luck: {
      peak: [
        {
          tr: "Jüpiter bugün sana altın yağmuru yağdırıyor! Kozmik şans penceren sonuna kadar açık. Piyango, iş görüşmesi, yeni tanışma — ne denersen dene, evren bugün seninle.",
          en: "Jupiter is showering you with golden rain today! Your cosmic luck window is wide open. Lottery, job interview, new acquaintance — whatever you try, the universe is with you today.",
          ru: "Юпитер сегодня осыпает тебя золотым дождём! Космическое окно удачи открыто настежь. Лотерея, собеседование, новое знакомство — что бы ты ни попробовал, Вселенная сегодня с тобой.",
          weight: 9
        }
      ],
      high: [
        {
          tr: "Kozmik rüzgar bugün tam arkanda esiyor. Uzun süredir ertelediğin o hamleyi yapmak için astrolojik pencere açık — özellikle öğleden sonra. Fırsatlar kapıyı iki kez çalmaz.",
          en: "The cosmic wind blows squarely at your back today. The astrological window for that move you've been putting off is open — especially after midday. Opportunity rarely knocks twice.",
          ru: "Сегодня космический ветер дует точно тебе в спину. Астрологическое окно для того шага, который ты всё откладываешь, открыто — особенно после полудня. Шанс редко стучит дважды.",
          weight: 8
        },
        {
          tr: "Jüpiter'in bereket enerjisi bugün burcuna özel bir şans penceresi açıyor. Sayı olarak 7'yi ve renk olarak altın sarısını yanında tut. Beklenmedik iyilikler ve rastlantısal bağlantılar gün boyu seni şaşırtabilir.",
          en: "Jupiter's abundance energy opens a special luck window for your sign today. Keep the number 7 and the colour gold close. Unexpected kindnesses and chance connections may delight you throughout the day.",
          ru: "Энергия изобилия Юпитера сегодня открывает особое окно удачи для твоего знака. Держи при себе число 7 и золотой цвет. Неожиданные щедрости и случайные связи могут удивить тебя в течение дня.",
          weight: 7
        },
        {
          tr: "Bugün hangi kapıyı çalarsan çal, biri açılacak. Korku değil, merak seni yönlendirsin. Gökyüzünün sana sunduğu bu enerji penceresi kısa — harekete geç.",
          en: "Whatever door you knock on today, one will open. Let curiosity, not fear, guide you. The energy window the sky is offering you is brief — move.",
          ru: "Какую бы дверь ты ни постучал сегодня, одна откроется. Пусть тобой руководит любопытство, а не страх. Энергетическое окно, которое предлагает тебе небо, коротко — действуй.",
          weight: 7
        }
      ],
      mid: [
        {
          tr: "Şans bugün sessiz sedasız akıyor; büyük patlama beklemek yerine küçük sinyallere dikkat et. Bir sohbet, beklenmedik bir öneri ya da denk gelen bir fırsat — bunlar bugünkü şansının dili.",
          en: "Luck flows quietly today; instead of waiting for a big bang, watch for small signals. A conversation, an unexpected suggestion, a coincidental opportunity — these are the language of today's luck.",
          ru: "Сегодня удача течёт тихо — вместо того чтобы ждать большого взрыва, следи за маленькими сигналами. Разговор, неожиданное предложение, случайная возможность — это язык сегодняшней удачи.",
          weight: 7
        },
        {
          tr: "Orta güçte bir şans günü. Rutin dışına çıkan her adım seni biraz daha şanslı bir noktaya taşıyor. Farklı bir yoldan git, farklı bir kafeye gir, farklı bir kişiyle konuş.",
          en: "A moderate luck day. Every step outside your routine moves you a little closer to a luckier place. Take a different route, try a different café, speak to a different person.",
          ru: "Умеренный день удачи. Каждый шаг за пределы рутины приближает тебя к более удачному месту. Выбери другой маршрут, зайди в другое кафе, поговори с другим человеком.",
          weight: 6
        }
      ],
      low: [
        {
          tr: "Bugün şans seni değil, sen şansı aramalısın. Temkinli ol ama umutsuz değil. Bu tür günler, kazanmak için değil inşa etmek için biçilmişdir.",
          en: "Today you need to chase luck, not wait for it. Be cautious but not hopeless. Days like these are made for building, not for winning.",
          ru: "Сегодня тебе нужно искать удачу, а не ждать её. Будь осторожен, но не отчаивайся. Такие дни созданы для строительства, а не для побед.",
          weight: 6
        },
        {
          tr: "Şans enerjisi bugün düşük; ama bu, hiçbir şeyin iyi gitmeyeceği anlamına gelmiyor. Beklentileri gerçekçi tut ve her küçük gelişmeye minnetle bak.",
          en: "Luck energy runs low today, but that doesn't mean nothing will go well. Keep expectations realistic and greet every small improvement with gratitude.",
          ru: "Энергия удачи сегодня на низком уровне, но это не значит, что ничего не пойдёт хорошо. Держи ожидания реалистичными и с благодарностью принимай каждое маленькое улучшение.",
          weight: 5
        }
      ],
      critical: [
        {
          tr: "Bugün risk almak için kesinlikle uygun değil. Büyük bahislerden, önemli kararlardan ve yeni girişimlerden uzak dur. Yarın çok daha iyi bir gün olacak.",
          en: "Today is definitely not the day for taking risks. Stay away from big bets, major decisions and new ventures. Tomorrow will be a much better day.",
          ru: "Сегодня определённо не день для рисков. Избегай крупных ставок, важных решений и новых начинаний. Завтра будет намного лучше.",
          weight: 5
        }
      ]
    },

    /* ── KARİYER ── */
    career: {
      peak: [
        {
          tr: "Kariyer enerjin bugün mutlak zirve yapıyor! Satürn'ün yapısal gücü ve Güneş'in parlaklığı senin için birleşti. Terfi, önemli sunum, büyük anlaşma — bugün imkansız diye düşündüklerini başarabilirsin.",
          en: "Your career energy peaks absolutely today! Saturn's structural power and the Sun's brilliance unite for you. Promotion, major presentation, big deal — you can achieve what you thought impossible today.",
          ru: "Карьерная энергия сегодня на абсолютном пике! Структурная сила Сатурна и блеск Солнца объединяются для тебя. Повышение, важная презентация, крупная сделка — сегодня возможно невозможное.",
          weight: 9
        }
      ],
      high: [
        {
          tr: "Bugün mesleki alanda parlak bir gün. Seni duyuran, gören ve değer veren kişiler etrafında toplanıyor. Fikirlerini paylaş, projelere öncülük et — liderlik enerjin zirveye ulaşmış durumda.",
          en: "A brilliant day on the career front. People who hear, see and value you are gathering around. Share your ideas, lead projects — your leadership energy has peaked.",
          ru: "Блестящий день на карьерном фронте. Люди, которые слышат, видят и ценят тебя, собираются вокруг. Делись идеями, возглавляй проекты — твоя лидерская энергия достигла пика.",
          weight: 8
        },
        {
          tr: "Satürn'ün disiplin enerjisi ve Güneş'in vurgulama gücü birleşince, bugün attığın her profesyonel adım uzun vadeli iz bırakıyor. Önemli görüşme, sunum ya da teklifleri bu güne denk getir.",
          en: "Saturn's discipline and the Sun's amplifying power combine today: every professional step you take leaves a long-term mark. Schedule important meetings, presentations or pitches for today.",
          ru: "Дисциплина Сатурна и усиливающая сила Солнца сегодня объединяются: каждый профессиональный шаг оставит долгосрочный след. Запланируй важные встречи, презентации или предложения на сегодня.",
          weight: 7
        },
        {
          tr: "Kariyer fırsatları bugün seni bekliyor; sadece dikkatini ver. Fark edilmek için konuş, teklifler için hazır ol, ve en önemlisi — değerini düşürme.",
          en: "Career opportunities are waiting for you today; just pay attention. Speak to be noticed, be ready for offers, and above all — don't undersell yourself.",
          ru: "Карьерные возможности ждут тебя сегодня — просто будь внимателен. Говори, чтобы тебя заметили, будь готов к предложениям, и главное — не продавай себя дёшево.",
          weight: 7
        }
      ],
      mid: [
        {
          tr: "Kariyer cephesinde verimli ama dramatik olmayan bir gün. Uzun süredir ertelenmiş görevleri bitirmek için harika bir enerji var — büyük planlar değil, birikim yapan adımlar bugünü kazanıyor.",
          en: "A productive but undramatic day on the career front. Great energy for finishing long-postponed tasks — not big plans, but accumulating steps win the day.",
          ru: "Продуктивный, но не драматичный день на карьерном фронте. Отличная энергия для завершения давно отложенных задач — сегодня побеждают не грандиозные планы, а накапливающиеся шаги.",
          weight: 7
        },
        {
          tr: "Meslektaşlarınla girdiğin her iletişim bugün iş birliğine dönüşme potansiyeli taşıyor. Bağlantıları besle, email'leri cevapla, telefon açmaktan çekinme.",
          en: "Every interaction with colleagues today has the potential to turn into collaboration. Nurture connections, answer emails, don't hesitate to call.",
          ru: "Каждое взаимодействие с коллегами сегодня несёт в себе потенциал для сотрудничества. Поддерживай связи, отвечай на письма, не стесняйся звонить.",
          weight: 6
        }
      ],
      low: [
        {
          tr: "Kariyer enerjisi bugün içe dönük. Yeni projeler başlatmak yerine mevcut olanları gözden geçirmek, planlamak ve stratejik düşünmek için ideal bir gün.",
          en: "Career energy turns inward today. Instead of launching new projects, it's an ideal day to review existing ones, plan, and think strategically.",
          ru: "Сегодня карьерная энергия направлена внутрь. Вместо запуска новых проектов — идеальный день для пересмотра существующих, планирования и стратегического мышления.",
          weight: 6
        },
        {
          tr: "İş yerinde büyük hamleler için uygun bir gün değil; ama dinlemek ve öğrenmek için mükemmel bir gün. Bugünkü sakin enerjiyi bilgi biriktirmek için kullan.",
          en: "Not the right day for big moves at work; but a perfect day for listening and learning. Use today's quiet energy to gather knowledge.",
          ru: "Не лучший день для больших шагов на работе; зато отличный для того, чтобы слушать и учиться. Используй сегодняшнюю тихую энергию для накопления знаний.",
          weight: 5
        }
      ],
      critical: [
        {
          tr: "Kariyer enerjisi çok düşük — bugün ofiste düşük profil tut. Tartışmalardan uzak dur, imzalar atma, büyük söz verme. Fırtına geçince çok daha güçlü döneceksin.",
          en: "Career energy is very low — keep a low profile at the office today. Stay away from disputes, don't sign anything, don't make big promises. You'll return much stronger after the storm passes.",
          ru: "Карьерная энергия очень низкая — сегодня держи низкий профиль в офисе. Избегай споров, ничего не подписывай, не давай больших обещаний. После шторма вернёшься гораздо сильнее.",
          weight: 5
        }
      ]
    },

    /* ── SAĞLIK ── */
    health: {
      peak: [
        {
          tr: "Bedenin bugün olimpik sporcu gibi çalışıyor! Enerjin tavan yaptı — maraton koşabilir, dağ tırmanabilir, her şeyi yapabilirsin. Bu pik enerjiyi fiziksel aktiviteyle kanalize et.",
          en: "Your body is running like an Olympic athlete today! Energy has maxed out — you could run a marathon, climb a mountain, do anything. Channel this peak energy into physical activity.",
          ru: "Сегодня твоё тело работает как у олимпийского атлета! Энергия на максимуме — ты можешь пробежать марафон, покорить гору, сделать всё. Направь эту пиковую энергию в физическую активность.",
          weight: 9
        }
      ],
      high: [
        {
          tr: "Bedenin bugün yüksek enerjiyi işleyecek kapasitede. Egzersiz, nefes çalışması ya da uzun bir yürüyüş için ideal vakit. Bu enerjiyi dışarı at, içinde sıkışmış tutma.",
          en: "Your body has the capacity to process high energy today. Ideal time for exercise, breathwork or a long walk. Channel this energy outward — don't let it get trapped inside.",
          ru: "Сегодня твоё тело способно справиться с высокой энергией. Идеальное время для упражнений, дыхательных практик или долгой прогулки. Направь эту энергию наружу — не позволяй ей застрять внутри.",
          weight: 8
        },
        {
          tr: "Vitalite yüksek, zihin berrak. Bugün sağlık rutininde küçük ama kalıcı bir değişiklik yapabilirsin — bu değişiklik zamanla çok büyük fark yaratacak.",
          en: "Vitality is high, the mind is clear. Today you can make a small but permanent change in your health routine — one that will make a huge difference over time.",
          ru: "Жизненная сила высока, разум ясен. Сегодня можно сделать небольшое, но постоянное изменение в режиме здоровья — оно со временем создаст огромную разницу.",
          weight: 7
        }
      ],
      mid: [
        {
          tr: "Sağlık enerjisi dengeli. Bugün bedenine su içmeyi, doğru nefes almayı ve ufak bir hareket molasını hediye et. Büyük programlar değil, küçük ritüeller bugün sana iyi geliyor.",
          en: "Health energy is balanced. Today, give your body the gifts of water, proper breathing and a small movement break. Not big programmes, but small rituals are what suit you today.",
          ru: "Энергия здоровья сбалансирована. Сегодня подари своему телу воду, правильное дыхание и небольшую двигательную паузу. Не большие программы, а маленькие ритуалы — вот что тебе подходит сегодня.",
          weight: 7
        },
        {
          tr: "Beden bugün sana sinyaller gönderiyor; onları dinle. Yorgunsan dinlen, gerginsen esne, kafan dağıldıysa derin bir nefes al. Kendinle bu kadar basit bir iletişim bile büyük bir şifa.",
          en: "Your body is sending you signals today — listen to them. If you're tired, rest. Tense, stretch. Scattered, breathe deep. Even this simple communication with yourself is great medicine.",
          ru: "Тело сегодня посылает тебе сигналы — прислушайся. Устал — отдохни. Напряжён — потянись. Рассеян — дыши глубоко. Даже такое простое общение с собой — уже большое исцеление.",
          weight: 6
        }
      ],
      low: [
        {
          tr: "Bugün enerji rezervlerin daha kısıtlı. Kendini zorlamak yerine besleyici bir gün seç: erken yat, hafif ye, ekran süresini azalt. Yarın için güç biriktiriyorsun.",
          en: "Energy reserves are more limited today. Instead of pushing yourself, choose a nourishing day: sleep early, eat light, reduce screen time. You're storing power for tomorrow.",
          ru: "Сегодня энергетические резервы более ограничены. Вместо того чтобы давить на себя, выбери питательный день: ложись пораньше, ешь легко, сократи время у экрана. Ты накапливаешь силу для завтра.",
          weight: 6
        },
        {
          tr: "Düşük enerji günlerinde en güçlü iyileşme aracın dinginliktir. Meditasyon, sessiz bir köşe, bir bardak bitki çayı — bugün bunlar yeterli, dahası gereksiz.",
          en: "On low-energy days, your most powerful healing tool is stillness. Meditation, a quiet corner, a cup of herbal tea — these are enough today; anything more is unnecessary.",
          ru: "В дни низкой энергии твой самый мощный инструмент исцеления — покой. Медитация, тихий уголок, чашка травяного чая — сегодня этого достаточно; большего не нужно.",
          weight: 5
        }
      ],
      critical: [
        {
          tr: "Bedenin bugün 'dur' diyor — lütfen dinle. Ağır egzersiz, stresli ortamlar ve aşırı yüklenme bugün seni yıpratır. Bugün tek görevin: kendine bakmak.",
          en: "Your body is saying 'stop' today — please listen. Heavy exercise, stressful environments and overloading will wear you down today. Your only job today: take care of yourself.",
          ru: "Твоё тело сегодня говорит 'стоп' — пожалуйста, послушай. Тяжёлые упражнения, стрессовая среда и перегрузка сегодня тебя измотают. Твоя единственная задача: позаботиться о себе.",
          weight: 5
        }
      ]
    },

    /* ── PARA ── */
    money: {
      peak: [
        {
          tr: "Finansal enerjin bugün altın çağında! Yatırım, maaş görüşmesi, iş teklifi — parayla ilgili her konuda yıldızlar tam destek veriyor. Cesur ol ama akıllı ol.",
          en: "Your financial energy is in its golden age today! Investment, salary negotiation, business offer — the stars fully support every money-related matter. Be bold but be smart.",
          ru: "Финансовая энергия сегодня в золотом веке! Инвестиции, переговоры о зарплате, деловое предложение — звёзды полностью поддерживают любой денежный вопрос. Будь смелым, но будь умным.",
          weight: 9
        }
      ],
      high: [
        {
          tr: "Maddi konularda bugün olumlu bir enerji var. Uzun zamandır beklediğin ödeme, beklenmedik bir gelir ya da kârlı bir anlaşma kapıda olabilir. Finansal kararlar almak için uygun.",
          en: "Positive energy in financial matters today. A long-awaited payment, unexpected income or a profitable deal may be around the corner. A good day for financial decisions.",
          ru: "Позитивная энергия в финансовых делах сегодня. Долгожданный платёж, неожиданный доход или выгодная сделка могут быть не за горами. Хороший день для финансовых решений.",
          weight: 8
        },
        {
          tr: "Jüpiter'in bereket enerjisi cüzdanına da yansıyor. Yeni gelir kapıları aralamak, yan iş fikirleri değerlendirmek ya da tasarruf planı yapmak için ideal bir gün.",
          en: "Jupiter's abundance energy reflects in your wallet too. An ideal day to explore new income streams, evaluate side hustle ideas, or create a savings plan.",
          ru: "Энергия изобилия Юпитера отражается и в твоём кошельке. Идеальный день для изучения новых источников дохода, оценки побочных идей или создания плана накоплений.",
          weight: 7
        }
      ],
      mid: [
        {
          tr: "Finansal enerji dengeli akıyor. Büyük yatırımlar yerine mevcut bütçeni gözden geçirmek, gereksiz harcamaları kesmek ve bilinçli harcamak bugünün kazandıran stratejisi.",
          en: "Financial energy flows in balance. Instead of big investments, reviewing your budget, cutting unnecessary expenses and spending mindfully is today's winning strategy.",
          ru: "Финансовая энергия течёт в равновесии. Вместо крупных инвестиций — пересмотр бюджета, сокращение ненужных трат и осознанные расходы — вот выигрышная стратегия на сегодня.",
          weight: 7
        },
        {
          tr: "Para konusunda bugün ne riskli ne de kısıtlı bir gün. Rutin işlerini hallettikçe küçük maddi sürprizler gelebilir. Harcamayı kontrol altında tutarsan gün kârlı kapanır.",
          en: "Neither a risky nor a restrictive day for money. As you handle routine tasks, small financial surprises may come. Keep spending under control and the day closes in profit.",
          ru: "Сегодня ни рискованный, ни ограничительный день для денег. По мере выполнения рутинных задач могут прийти маленькие финансовые сюрпризы. Контролируй расходы — и день закроется с прибылью.",
          weight: 6
        }
      ],
      low: [
        {
          tr: "Bugün cüzdanını sıkı tut. İmpulsif alışveriş, büyük harcamalar ve riskli yatırımlardan uzak dur. Paraya saygı gösteren geri kazanır.",
          en: "Keep your wallet tight today. Stay away from impulse purchases, big expenses and risky investments. Those who respect money get it back.",
          ru: "Сегодня держи кошелёк крепко. Избегай импульсивных покупок, крупных трат и рискованных инвестиций. Тот, кто уважает деньги, получает их обратно.",
          weight: 6
        },
        {
          tr: "Finansal akış bugün yavaş. Ani harcamalar yerine uzun vadeli planlarına odaklan. Bugün harcadığın her kuruşu iki kez düşün.",
          en: "Financial flow is slow today. Focus on long-term plans instead of sudden expenses. Think twice about every penny you spend today.",
          ru: "Финансовый поток сегодня медленный. Вместо внезапных трат сосредоточься на долгосрочных планах. Дважды подумай о каждой копейке, которую тратишь сегодня.",
          weight: 5
        }
      ],
      critical: [
        {
          tr: "Mali konularda bugün tamamen defansif ol. Hiçbir büyük finansal kararı bugüne koyma. Sözleşme imzalama, borç verme, riskli hamle yapma. Yarın çok daha berrak bir gün olacak.",
          en: "Be completely defensive in financial matters today. Don't schedule any major financial decisions for today. Don't sign contracts, lend money, or make risky moves. Tomorrow will be a much clearer day.",
          ru: "Будь полностью оборонительным в финансовых делах сегодня. Не назначай важных финансовых решений на этот день. Не подписывай контракты, не давай в долг, не делай рискованных шагов.",
          weight: 5
        }
      ]
    }
  };


  /* ══════════════════════════════════════════════════
     KATMAN 12 — DEEP READING GENERATOR
  ══════════════════════════════════════════════════ */

  function pickTextByScore(pool, score, seed) {
    var tier;
    if (score >= 0.82) tier = 'peak';
    else if (score >= 0.65) tier = 'high';
    else if (score >= 0.42) tier = 'mid';
    else if (score >= 0.25) tier = 'low';
    else tier = 'critical';

    var items = pool[tier];
    if (!items || !items.length) {
      /* Fallback: en yakın üst seviyeye bak */
      var tiers = ['peak','high','mid','low','critical'];
      var tierIdx = tiers.indexOf(tier);
      for (var i = tierIdx - 1; i >= 0; i--) {
        if (pool[tiers[i]] && pool[tiers[i]].length) { items = pool[tiers[i]]; break; }
      }
      if (!items || !items.length) {
        for (var j = tierIdx + 1; j < tiers.length; j++) {
          if (pool[tiers[j]] && pool[tiers[j]].length) { items = pool[tiers[j]]; break; }
        }
      }
      if (!items || !items.length) return {tr:'',en:'',ru:''};
    }

    var chosen = pickUnused(items, seed, seed + tier);
    return { tr: chosen.tr, en: chosen.en, ru: chosen.ru };
  }

  function generateDeepReading(signKey, lang, birthDate, birthHour) {
    var date = new Date();
    var tk = todayKey();
    lang = lang || 'tr';

    /* Natal hesap */
    var natal = null;
    if (birthDate) {
      natal = calcNatalScores(birthDate, birthHour);
    }
    var natalVec = natal ? natal.natalVector : null;

    /* Her kategori için skor */
    var scores = {
      love:   scoreForCategory(signKey, 'love',   date, natalVec),
      luck:   scoreForCategory(signKey, 'luck',   date, natalVec),
      career: scoreForCategory(signKey, 'career', date, natalVec),
      health: scoreForCategory(signKey, 'health', date, natalVec),
      money:  scoreForCategory(signKey, 'money',  date, natalVec),
      daily:  scoreForCategory(signKey, 'daily',  date, natalVec)
    };

    /* Metin seçimi — artık money kategorisi de var */
    var texts = {
      love:   pickTextByScore(DEEP_TEXTS.love,   scores.love,   tk + signKey + 'love')[lang],
      luck:   pickTextByScore(DEEP_TEXTS.luck,   scores.luck,   tk + signKey + 'luck')[lang],
      career: pickTextByScore(DEEP_TEXTS.career, scores.career, tk + signKey + 'career')[lang],
      health: pickTextByScore(DEEP_TEXTS.health, scores.health, tk + signKey + 'health')[lang],
      money:  pickTextByScore(DEEP_TEXTS.money,  scores.money,  tk + signKey + 'money')[lang]
    };

    /* Şanslı sayı ve renk (ML tabanlı) */
    var luckyNum = Math.floor(scores.luck * 9) + 1;
    if (luckyNum > 9) luckyNum = 9;
    var luckyColors = {
      tr: ['Altın Sarısı','Ametist Moru','Zümrüt Yeşili','Gece Mavisi','Ateş Kırmızısı','Gümüş','Turkuaz','Pudra Pembe'],
      en: ['Gold','Amethyst Purple','Emerald Green','Midnight Blue','Fire Red','Silver','Turquoise','Blush Pink'],
      ru: ['Золотой','Аметистовый','Изумрудный','Тёмно-синий','Огненно-красный','Серебристый','Бирюзовый','Пудрово-розовый']
    };
    var colorIdx = Math.floor(scores.love * 7.9);
    var luckyColor = luckyColors[lang][colorIdx];

    /* Genel enerji skoru */
    var totalEnergy = Math.round(
      (scores.love + scores.luck + scores.career + scores.health + scores.money) / 5 * 100
    );

    /* Retrograd uyarıları (gelişmiş — çoklu retrograd desteği) */
    var transits = calcTransits(date);
    var retrogradWarning = null;
    var allRetroWarnings = [];

    Object.keys(transits.retrogrades).forEach(function(planet) {
      var r = transits.retrogrades[planet];
      if (r.warning) {
        allRetroWarnings.push(r.warning[lang]);
      }
    });

    if (allRetroWarnings.length > 0) {
      retrogradWarning = allRetroWarnings[0]; // Backward compat: tek string
    }

    /* Aspect özeti */
    var aspectSummary = summarizeAspects(transits.aspects, lang);

    /* Ay ve gezegen bilgisi */
    var moonPhase = getMoonPhaseName(date);
    var planet = getCurrentPlanetaryHour(date);

    return {
      scores: scores,
      texts: texts,
      luckyNum: luckyNum,
      luckyColor: luckyColor,
      totalEnergy: totalEnergy,
      retrogradWarning: retrogradWarning,
      retrogradWarnings: allRetroWarnings,  // Yeni: tüm retrograd uyarıları
      moonPhase: moonPhase,
      planetaryHour: planet,
      natal: natal,
      transits: transits,
      aspectSummary: aspectSummary,          // Yeni: aspect özeti
      element: SIGN_ELEMENTS[signKey],       // Yeni: element bilgisi
      modality: SIGN_MODALITIES[signKey]     // Yeni: modalite bilgisi
    };
  }

  /**
   * Aspect'leri kullanıcı dostu metin olarak özetle
   */
  function summarizeAspects(aspects, lang) {
    if (!aspects || !aspects.length) return null;

    // En güçlü 3 aspect
    var sorted = aspects.slice().sort(function(a, b) {
      return Math.abs(b.influence) - Math.abs(a.influence);
    });
    var top = sorted.slice(0, 3);

    var summaries = top.map(function(asp) {
      var name = ASPECT_NAMES[asp.type] || {tr:asp.type, en:asp.type, ru:asp.type};
      var p1Name = (PLANET_NAMES_INTERNAL[asp.planet1] || {})[lang] || asp.planet1;
      var p2Name = (PLANET_NAMES_INTERNAL[asp.planet2] || {})[lang] || asp.planet2;
      return p1Name + ' ↔ ' + p2Name + ' (' + name[lang] + ')';
    });

    return summaries;
  }

  var PLANET_NAMES_INTERNAL = {
    sun:     { tr: 'Güneş', en: 'Sun', ru: 'Солнце' },
    moon:    { tr: 'Ay', en: 'Moon', ru: 'Луна' },
    mars:    { tr: 'Mars', en: 'Mars', ru: 'Марс' },
    mercury: { tr: 'Merkür', en: 'Mercury', ru: 'Меркурий' },
    jupiter: { tr: 'Jüpiter', en: 'Jupiter', ru: 'Юпитер' },
    venus:   { tr: 'Venüs', en: 'Venus', ru: 'Венера' },
    saturn:  { tr: 'Satürn', en: 'Saturn', ru: 'Сатурн' }
  };


  /* ══════════════════════════════════════════════════
     KATMAN 13 — HAFTALIK & AYLIK OKUMA
  ══════════════════════════════════════════════════ */

  var WEEKLY_THEMES = {
    tr: [
      'Yeni başlangıçlar haftası',
      'İlişkilere odaklan',
      'Kariyer atılımı zamanı',
      'İçsel dönüşüm haftası',
      'Sosyal bağlantılar haftası',
      'Sağlık ve denge haftası',
      'Finansal farkındalık haftası',
      'Yaratıcılık haftası',
      'Keşif ve macera haftası'
    ],
    en: [
      'Week of new beginnings',
      'Focus on relationships',
      'Career breakthrough time',
      'Week of inner transformation',
      'Social connections week',
      'Health and balance week',
      'Financial awareness week',
      'Creativity week',
      'Discovery and adventure week'
    ],
    ru: [
      'Неделя новых начинаний',
      'Фокус на отношениях',
      'Время карьерного прорыва',
      'Неделя внутренней трансформации',
      'Неделя социальных связей',
      'Неделя здоровья и баланса',
      'Неделя финансовой осознанности',
      'Неделя творчества',
      'Неделя открытий и приключений'
    ]
  };

  var MONTHLY_THEMES = {
    tr: [
      'Temel atma ayı', 'Büyüme ayı', 'Çiçeklenme ayı',
      'Genişleme ayı', 'Zirve ayı', 'Hasat ayı',
      'Denge ayı', 'Dönüşüm ayı', 'Keşif ayı',
      'Yapılanma ayı', 'Vizyon ayı', 'Tamamlanma ayı'
    ],
    en: [
      'Foundation month', 'Growth month', 'Blooming month',
      'Expansion month', 'Peak month', 'Harvest month',
      'Balance month', 'Transformation month', 'Discovery month',
      'Structuring month', 'Vision month', 'Completion month'
    ],
    ru: [
      'Месяц фундамента', 'Месяц роста', 'Месяц цветения',
      'Месяц расширения', 'Месяц пика', 'Месяц урожая',
      'Месяц баланса', 'Месяц трансформации', 'Месяц открытий',
      'Месяц структурирования', 'Месяц видения', 'Месяц завершения'
    ]
  };

  /**
   * Haftalık okuma — 7 günlük skor ortalaması + hafta teması
   */
  function generateWeeklyReading(signKey, lang, birthDate, birthHour) {
    lang = lang || 'tr';
    var natal = birthDate ? calcNatalScores(birthDate, birthHour) : null;
    var natalVec = natal ? natal.natalVector : null;
    var now = new Date();

    var weekDays = [];
    var avgScores = { love: 0, luck: 0, career: 0, health: 0, money: 0, daily: 0 };
    var categories = ['love', 'luck', 'career', 'health', 'money', 'daily'];

    for (var d = 0; d < 7; d++) {
      var dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      var dayScores = {};
      categories.forEach(function(cat) {
        var score = scoreForCategory(signKey, cat, dayDate, natalVec);
        dayScores[cat] = score;
        avgScores[cat] += score;
      });

      var dayNames = {
        tr: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
        en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        ru: ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
      };

      weekDays.push({
        date: dayDate,
        dayName: dayNames[lang][dayDate.getDay()],
        scores: dayScores,
        totalEnergy: Math.round(
          (dayScores.love + dayScores.luck + dayScores.career + dayScores.health + dayScores.money) / 5 * 100
        ),
        moonPhase: getMoonPhaseName(dayDate),
        planetaryHour: getCurrentPlanetaryHour(dayDate),
        isToday: d === 0
      });
    }

    // Ortalamaları hesapla
    categories.forEach(function(cat) { avgScores[cat] /= 7; });

    // Hafta teması — en yüksek ortalama kategoriye göre
    var bestCat = categories.reduce(function(a, b) { return avgScores[a] > avgScores[b] ? a : b; });
    var themeMap = { love: 1, luck: 4, career: 2, health: 5, money: 6, daily: 0 };
    var themeIdx = themeMap[bestCat] || 0;

    // En iyi ve en kötü günler
    var bestDay = weekDays.reduce(function(a, b) { return a.totalEnergy > b.totalEnergy ? a : b; });
    var worstDay = weekDays.reduce(function(a, b) { return a.totalEnergy < b.totalEnergy ? a : b; });

    return {
      signKey: signKey,
      days: weekDays,
      averageScores: avgScores,
      totalAvgEnergy: Math.round(
        (avgScores.love + avgScores.luck + avgScores.career + avgScores.health + avgScores.money) / 5 * 100
      ),
      theme: WEEKLY_THEMES[lang][themeIdx],
      bestDay: { name: bestDay.dayName, energy: bestDay.totalEnergy },
      worstDay: { name: worstDay.dayName, energy: worstDay.totalEnergy },
      element: SIGN_ELEMENTS[signKey],
      modality: SIGN_MODALITIES[signKey]
    };
  }

  /**
   * Aylık okuma — 30 günlük trend analizi + ay teması
   */
  function generateMonthlyReading(signKey, lang, birthDate, birthHour) {
    lang = lang || 'tr';
    var natal = birthDate ? calcNatalScores(birthDate, birthHour) : null;
    var natalVec = natal ? natal.natalVector : null;
    var now = new Date();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    var categories = ['love', 'luck', 'career', 'health', 'money', 'daily'];
    var weeklyBreakdown = [];
    var monthScores = { love: 0, luck: 0, career: 0, health: 0, money: 0, daily: 0 };

    // 4 haftalık kırılım
    for (var w = 0; w < 4; w++) {
      var weekAvg = { love: 0, luck: 0, career: 0, health: 0, money: 0, daily: 0 };
      var weekDays = Math.min(7, daysInMonth - w * 7);

      for (var d = 0; d < weekDays; d++) {
        var dayDate = new Date(now.getFullYear(), now.getMonth(), w * 7 + d + 1);
        categories.forEach(function(cat) {
          var score = scoreForCategory(signKey, cat, dayDate, natalVec);
          weekAvg[cat] += score;
          monthScores[cat] += score;
        });
      }

      categories.forEach(function(cat) { weekAvg[cat] /= weekDays; });
      weeklyBreakdown.push({
        week: w + 1,
        scores: weekAvg,
        energy: Math.round((weekAvg.love + weekAvg.luck + weekAvg.career + weekAvg.health + weekAvg.money) / 5 * 100)
      });
    }

    categories.forEach(function(cat) { monthScores[cat] /= daysInMonth; });

    // Ay teması
    var themeIdx = now.getMonth();

    // Trend analizi: hafta 1 vs hafta 4
    var trend = weeklyBreakdown[3].energy - weeklyBreakdown[0].energy;
    var trendLabels = {
      tr: trend > 5 ? 'Yükselen trend 📈' : (trend < -5 ? 'Düşen trend 📉' : 'Stabil seyir ➡️'),
      en: trend > 5 ? 'Rising trend 📈' : (trend < -5 ? 'Declining trend 📉' : 'Stable course ➡️'),
      ru: trend > 5 ? 'Восходящий тренд 📈' : (trend < -5 ? 'Нисходящий тренд 📉' : 'Стабильный курс ➡️')
    };

    // Retrograd dönemleri bu ay aktif mi?
    var retrogrades = getRetrogrades(now);
    var activeRetros = [];
    Object.keys(retrogrades).forEach(function(planet) {
      if (retrogrades[planet].active || retrogrades[planet].shadow) {
        activeRetros.push(planet);
      }
    });

    return {
      signKey: signKey,
      month: now.getMonth(),
      year: now.getFullYear(),
      theme: MONTHLY_THEMES[lang][themeIdx],
      averageScores: monthScores,
      totalAvgEnergy: Math.round(
        (monthScores.love + monthScores.luck + monthScores.career + monthScores.health + monthScores.money) / 5 * 100
      ),
      weeklyBreakdown: weeklyBreakdown,
      trend: trendLabels[lang],
      trendValue: trend,
      activeRetrogrades: activeRetros,
      moonPhases: {
        newMoon: getMoonPhaseName(new Date(now.getFullYear(), now.getMonth(), 1)),
        fullMoon: getMoonPhaseName(new Date(now.getFullYear(), now.getMonth(), 15))
      },
      element: SIGN_ELEMENTS[signKey],
      modality: SIGN_MODALITIES[signKey]
    };
  }


  /* ══════════════════════════════════════════════════
     KATMAN 14 — ENERGY TIMELINE
     12 aylık enerji tahmin grafiği verisi
  ══════════════════════════════════════════════════ */

  function generateEnergyTimeline(signKey, natalVector) {
    var now = new Date();
    var months = [];
    var monthNames = {
      tr: ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],
      en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      ru: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
    };

    for (var m = 0; m < 12; m++) {
      var d = new Date(now.getFullYear(), now.getMonth() + m, 14); // Ayın ortası
      var temporal = getTemporalVector(d);
      var signVec = SIGN_VECTORS[signKey];

      var rawScore = dot(signVec, temporal);
      if (natalVector) rawScore += dot(natalVector, temporal) * 0.3;
      var energy = Math.round(sigmoid(rawScore - 1.5) * 100);

      var loveScore  = Math.round(scoreForCategory(signKey, 'love',   d, natalVector) * 100);
      var careerScore= Math.round(scoreForCategory(signKey, 'career', d, natalVector) * 100);
      var luckScore  = Math.round(scoreForCategory(signKey, 'luck',   d, natalVector) * 100);
      var moneyScore = Math.round(scoreForCategory(signKey, 'money',  d, natalVector) * 100);

      months.push({
        month: m,
        label: { tr: monthNames.tr[d.getMonth()], en: monthNames.en[d.getMonth()], ru: monthNames.ru[d.getMonth()] },
        energy: energy,
        love: loveScore,
        career: careerScore,
        luck: luckScore,
        money: moneyScore,
        isCurrent: m === 0
      });
    }
    return months;
  }


  /* ══════════════════════════════════════════════════
     KATMAN 15 — DERİN BURÇ UYUMU ANALİZİ
  ══════════════════════════════════════════════════ */

  var COMPAT_LABELS = {
    tr: {
      vectorSim: 'Vektörel Benzerlik',
      elementHarmony: 'Element Uyumu',
      modalityHarmony: 'Modalite Uyumu',
      rulerSynergy: 'Gezegen Sinerjisi',
      overall: 'Genel Uyum',
      categories: {
        love: 'Aşk & Romantizm',
        communication: 'İletişim',
        trust: 'Güven & Sadakat',
        passion: 'Tutku & Çekim',
        longTerm: 'Uzun Vadeli Uyum'
      },
      strengthLabel: 'Doğal Güçler',
      challengeLabel: 'Potansiyel Sürtüşmeler'
    },
    en: {
      vectorSim: 'Vector Similarity',
      elementHarmony: 'Element Harmony',
      modalityHarmony: 'Modality Harmony',
      rulerSynergy: 'Planetary Synergy',
      overall: 'Overall Compatibility',
      categories: {
        love: 'Love & Romance',
        communication: 'Communication',
        trust: 'Trust & Loyalty',
        passion: 'Passion & Attraction',
        longTerm: 'Long-term Compatibility'
      },
      strengthLabel: 'Natural Strengths',
      challengeLabel: 'Potential Friction'
    },
    ru: {
      vectorSim: 'Векторное сходство',
      elementHarmony: 'Гармония элементов',
      modalityHarmony: 'Гармония модальностей',
      rulerSynergy: 'Планетарная синергия',
      overall: 'Общая совместимость',
      categories: {
        love: 'Любовь и романтика',
        communication: 'Коммуникация',
        trust: 'Доверие и верность',
        passion: 'Страсть и притяжение',
        longTerm: 'Долгосрочная совместимость'
      },
      strengthLabel: 'Естественные силы',
      challengeLabel: 'Потенциальные трения'
    }
  };

  var COMPAT_STRENGTHS = {
    fire_fire: {
      tr: ['Birlikte ateş gibi parlıyorsunuz', 'Macera enerjiniz sınırsız', 'Birbirinizi harekete geçiriyorsunuz'],
      en: ['You shine like fire together', 'Your adventure energy is limitless', 'You activate each other'],
      ru: ['Вместе вы сияете как огонь', 'Ваша энергия приключений безгранична', 'Вы активируете друг друга']
    },
    fire_air: {
      tr: ['Birbirinize ilham veriyorsunuz', 'İletişiminiz canlı ve dinamik', 'Fikirler ateş gibi yayılıyor'],
      en: ['You inspire each other', 'Your communication is lively and dynamic', 'Ideas spread like wildfire'],
      ru: ['Вы вдохновляете друг друга', 'Ваше общение живое и динамичное', 'Идеи распространяются как огонь']
    },
    earth_water: {
      tr: ['Duygusal güven çok güçlü', 'Pratik ve sezgisel mükemmel denge', 'Ev ve aile bağları kuvvetli'],
      en: ['Emotional trust is very strong', 'Perfect balance of practical and intuitive', 'Home and family bonds are strong'],
      ru: ['Эмоциональное доверие очень сильное', 'Идеальный баланс практичного и интуитивного', 'Домашние и семейные узы крепки']
    },
    earth_earth: {
      tr: ['Güvenilirlik ve sadakat dorukta', 'Maddi hedeflerde uyum', 'Kararlı ve sağlam bir temel'],
      en: ['Reliability and loyalty at peak', 'Alignment in material goals', 'A determined and solid foundation'],
      ru: ['Надёжность и верность на пике', 'Согласие в материальных целях', 'Решительный и прочный фундамент']
    },
    air_air: {
      tr: ['Entelektüel uyum harika', 'Sosyal yaşamda mükemmel partner', 'Özgürlük ve bağımsızlık dengesiz'],
      en: ['Intellectual harmony is wonderful', 'Perfect partner in social life', 'Freedom and independence balanced'],
      ru: ['Интеллектуальная гармония прекрасна', 'Идеальный партнёр в социальной жизни', 'Свобода и независимость в балансе']
    },
    water_water: {
      tr: ['Duygusal derinlik eşsiz', 'Sezgisel bağlantınız çok güçlü', 'Empati ve anlayış üst düzey'],
      en: ['Emotional depth is unmatched', 'Your intuitive connection is very strong', 'Empathy and understanding at top level'],
      ru: ['Эмоциональная глубина непревзойдённая', 'Интуитивная связь очень сильная', 'Эмпатия и понимание на высшем уровне']
    },
    fire_earth: {
      tr: ['Birbirinizi tamamlıyorsunuz', 'Vizyon ve uygulama dengesi', 'Farklılıklar güç kaynağı olabilir'],
      en: ['You complete each other', 'Balance of vision and execution', 'Differences can be a source of strength'],
      ru: ['Вы дополняете друг друга', 'Баланс видения и исполнения', 'Различия могут стать источником силы']
    },
    fire_water: {
      tr: ['Tutkulu ve yoğun bir çekim', 'Karşıtların cazibesi güçlü', 'Dönüştürücü bir ilişki potansiyeli'],
      en: ['Passionate and intense attraction', 'Strong attraction of opposites', 'Potential for a transformative relationship'],
      ru: ['Страстное и интенсивное притяжение', 'Сильное притяжение противоположностей', 'Потенциал для трансформирующих отношений']
    },
    earth_air: {
      tr: ['Pratik ve entelektüel denge', 'Birbirinizden çok şey öğrenebilirsiniz', 'Farklı bakış açıları zenginlik'],
      en: ['Practical and intellectual balance', 'You can learn a lot from each other', 'Different perspectives are enriching'],
      ru: ['Практический и интеллектуальный баланс', 'Вы можете многому научиться друг у друга', 'Разные точки зрения обогащают']
    },
    air_water: {
      tr: ['Zihinsel ve duygusal köprü kurulabilir', 'İletişimde sabır gerekiyor', 'Birbirinizi anlama çabası ödüllendirilir'],
      en: ['Mental and emotional bridge can be built', 'Patience needed in communication', 'Effort to understand each other is rewarded'],
      ru: ['Можно построить ментальный и эмоциональный мост', 'Нужно терпение в общении', 'Усилия понять друг друга будут вознаграждены']
    }
  };

  /**
   * Çok boyutlu burç uyum analizi
   * @param {string} sign1 — İlk burcun key'i
   * @param {string} sign2 — İkinci burcun key'i
   * @param {string} lang — 'tr' | 'en' | 'ru'
   * @returns {Object} Detaylı uyum analizi
   */
  function calculateDeepCompatibility(sign1, sign2, lang) {
    lang = lang || 'tr';
    var vec1 = SIGN_VECTORS[sign1];
    var vec2 = SIGN_VECTORS[sign2];
    var elem1 = SIGN_ELEMENTS[sign1];
    var elem2 = SIGN_ELEMENTS[sign2];
    var mod1 = SIGN_MODALITIES[sign1];
    var mod2 = SIGN_MODALITIES[sign2];
    var ruler1 = SIGN_RULERS[sign1];
    var ruler2 = SIGN_RULERS[sign2];

    /* 1. Vektörel benzerlik (cosine similarity → 0-100) */
    var vecSim = (cosineSimilarity(vec1, vec2) + 1) / 2; // -1,1 → 0,1
    var vectorScore = Math.round(vecSim * 100);

    /* 2. Element uyumu */
    var elemScore = Math.round(elementalHarmony(elem1, elem2) * 100);

    /* 3. Modalite uyumu */
    var modScore = Math.round(modalityHarmony(mod1, mod2) * 100);

    /* 4. Gezegen yönetici sinerjisi */
    var rulerVec1 = PLANET_ENERGY[ruler1];
    var rulerVec2 = PLANET_ENERGY[ruler2];
    var rulerSim = (cosineSimilarity(rulerVec1, rulerVec2) + 1) / 2;
    var rulerScore = Math.round(rulerSim * 100);

    /* 5. Genel uyum (ağırlıklı ortalama) */
    var overall = Math.round(
      vectorScore * 0.30 +
      elemScore * 0.30 +
      modScore * 0.20 +
      rulerScore * 0.20
    );

    /* 6. Kategori bazında uyum */
    var catScores = {};
    // Aşk: Duyarlılık + Sosyallik boyutları
    catScores.love = Math.round(
      ((vec1[7]*vec2[7] + vec1[4]*vec2[4]) / 2 * 50) + (elemScore * 0.5)
    );
    // İletişim: Sosyallik + Element
    catScores.communication = Math.round(
      (vec1[4]*vec2[4] * 100 * 0.4) + (modScore * 0.3) + (vectorScore * 0.3)
    );
    // Güven: İstikrar + Pratiklik
    catScores.trust = Math.round(
      ((vec1[1]*vec2[1] + vec1[3]*vec2[3]) / 2 * 100 * 0.5) + (elemScore * 0.5)
    );
    // Tutku: Enerji + Macera
    catScores.passion = Math.round(
      ((vec1[0]*vec2[0] + vec1[2]*vec2[2]) / 2 * 100 * 0.5) + (rulerScore * 0.3) + (vectorScore * 0.2)
    );
    // Uzun vade: Tüm boyutların ağırlıklı ortalaması
    catScores.longTerm = Math.round(overall * 0.6 + catScores.trust * 0.4);

    // Skorları 0-100 arasına sınırla
    Object.keys(catScores).forEach(function(k) {
      catScores[k] = Math.max(10, Math.min(98, catScores[k]));
    });

    /* 7. Doğal güçler ve sürtüşmeler */
    var elemPairKey = [elem1, elem2].sort().join('_');
    var strengths = COMPAT_STRENGTHS[elemPairKey] || COMPAT_STRENGTHS[elem1 + '_' + elem2] || COMPAT_STRENGTHS.fire_fire;

    /* 8. Potansiyel sürtüşme noktaları */
    var frictionPoints = [];
    var dims = ['energy','stability','adventure','practicality','social','intuition','leadership','sensitivity'];
    var dimLabels = PROFILE_LABELS;

    for (var i = 0; i < 8; i++) {
      var diff = Math.abs(vec1[i] - vec2[i]);
      if (diff > 0.5) {
        var label = dimLabels[dims[i]] || {};
        frictionPoints.push(label[lang] || dims[i]);
      }
    }

    var labels = COMPAT_LABELS[lang] || COMPAT_LABELS.tr;

    return {
      sign1: sign1,
      sign2: sign2,
      scores: {
        vector: vectorScore,
        element: elemScore,
        modality: modScore,
        ruler: rulerScore,
        overall: Math.max(15, Math.min(98, overall))
      },
      categories: catScores,
      elements: { sign1: elem1, sign2: elem2 },
      modalities: { sign1: mod1, sign2: mod2 },
      rulers: { sign1: ruler1, sign2: ruler2 },
      strengths: strengths[lang] || strengths.tr,
      frictionPoints: frictionPoints,
      labels: labels
    };
  }


  /* ══════════════════════════════════════════════════
     KATMAN 16 — KİŞİLİK PROFİLİ METİNLERİ
  ══════════════════════════════════════════════════ */

  var PROFILE_LABELS = {
    energy:       { tr: 'Enerji', en: 'Energy', ru: 'Энергия' },
    stability:    { tr: 'İstikrar', en: 'Stability', ru: 'Стабильность' },
    adventure:    { tr: 'Macera', en: 'Adventure', ru: 'Авантюризм' },
    practicality: { tr: 'Pratiklik', en: 'Practicality', ru: 'Практичность' },
    social:       { tr: 'Sosyallik', en: 'Social', ru: 'Общительность' },
    intuition:    { tr: 'Sezgi', en: 'Intuition', ru: 'Интуиция' },
    leadership:   { tr: 'Liderlik', en: 'Leadership', ru: 'Лидерство' },
    sensitivity:  { tr: 'Duyarlılık', en: 'Sensitivity', ru: 'Чуткость' }
  };

  function getProfileInsight(profile, lang) {
    var topDim = Object.keys(profile).reduce(function(a, b) {
      return profile[a] > profile[b] ? a : b;
    });
    var lowDim = Object.keys(profile).reduce(function(a, b) {
      return profile[a] < profile[b] ? a : b;
    });

    var strengths = {
      energy:       { tr: 'Yüksek enerji seviyeniz başkalarını harekete geçirir.', en: 'Your high energy level activates others.', ru: 'Ваш высокий уровень энергии активирует других.' },
      stability:    { tr: 'Güvenilirliğiniz en büyük güç kaynaklarınızdan biri.', en: 'Your reliability is one of your greatest sources of strength.', ru: 'Ваша надёжность — один из ваших главных источников силы.' },
      adventure:    { tr: 'Değişimi kucaklamanız sizi daima bir adım önde tutar.', en: 'Your embrace of change always keeps you one step ahead.', ru: 'Принятие перемен всегда держит вас на шаг впереди.' },
      practicality: { tr: 'Pratik bakışınız karmaşık sorunları çözmeyi kolaylaştırır.', en: 'Your practical outlook makes solving complex problems easier.', ru: 'Ваш практичный взгляд упрощает решение сложных проблем.' },
      social:       { tr: 'İnsanları bir araya getirme yeteneğiniz benzersiz.', en: 'Your ability to bring people together is unique.', ru: 'Ваша способность объединять людей уникальна.' },
      intuition:    { tr: 'Sezgileriniz çoğu zaman analitik düşünceden önce davranır.', en: 'Your intuition often acts before analytical thought catches up.', ru: 'Ваша интуиция часто опережает аналитическое мышление.' },
      leadership:   { tr: 'Doğal liderlik kaliteniz insanları etkinize çeker.', en: 'Your natural leadership quality draws people into your orbit.', ru: 'Ваше природное лидерское качество притягивает людей в вашу орбиту.' },
      sensitivity:  { tr: 'Derin duyarlılığınız size eşsiz bir empati gücü verir.', en: 'Your deep sensitivity gives you an unparalleled power of empathy.', ru: 'Ваша глубокая чуткость наделяет вас непревзойдённой силой эмпатии.' }
    };
    var challenges = {
      energy:       { tr: 'Enerjiyi yönetmek: dinlenmeye de alan açın.', en: 'Managing energy: make room for rest too.', ru: 'Управление энергией: оставляйте место и для отдыха.' },
      stability:    { tr: 'Değişime direnç: esneklik size güç katar.', en: 'Resistance to change: flexibility adds strength.', ru: 'Сопротивление переменам: гибкость добавляет силы.' },
      adventure:    { tr: 'Odak dağılması: derinlik zaman zaman genişlikten daha değerli.', en: 'Scattered focus: depth is sometimes more valuable than breadth.', ru: 'Рассеянность: глубина порой ценнее широты.' },
      practicality: { tr: 'Hayal gücünü besleyin: sezgiye de yer açın.', en: 'Nourish imagination: make room for intuition too.', ru: 'Питайте воображение: оставляйте место и для интуиции.' },
      social:       { tr: 'Kendi ihtiyaçlarınıza da alan açın.', en: 'Leave space for your own needs too.', ru: 'Оставляйте место и для собственных потребностей.' },
      intuition:    { tr: 'Mantık ve sezgiyi dengeleyin.', en: 'Balance logic with intuition.', ru: 'Балансируйте логику и интуицию.' },
      leadership:   { tr: 'Devretmek de liderlik becerisidir.', en: 'Delegating is also a leadership skill.', ru: 'Делегирование — тоже навык лидера.' },
      sensitivity:  { tr: 'Sınırlar koymayı öğrenmek sizi korur.', en: 'Learning to set boundaries protects you.', ru: 'Умение устанавливать границы защищает вас.' }
    };

    return {
      strength: (strengths[topDim] || strengths.energy)[lang],
      challenge: (challenges[lowDim] || challenges.stability)[lang],
      topDim: topDim,
      lowDim: lowDim
    };
  }


  /* ══════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════ */

  var LunarisML = {
    /* ── v1 API (backward compatible) ── */

    /** Günlük derin yorum (burç + opsiyonel natal bilgi) */
    generateDeepReading: generateDeepReading,

    /** 12 aylık enerji zaman çizelgesi */
    generateEnergyTimeline: generateEnergyTimeline,

    /** Natal harita hesabı */
    calcNatalScores: calcNatalScores,

    /** Burç için tüm kategori skorları (0-1 arası) */
    getCategoryScores: function(signKey, date, natalVector) {
      return {
        love:   scoreForCategory(signKey, 'love',   date, natalVector),
        luck:   scoreForCategory(signKey, 'luck',   date, natalVector),
        career: scoreForCategory(signKey, 'career', date, natalVector),
        health: scoreForCategory(signKey, 'health', date, natalVector),
        money:  scoreForCategory(signKey, 'money',  date, natalVector),
        daily:  scoreForCategory(signKey, 'daily',  date, natalVector)
      };
    },

    /** Kişilik profili içgörüleri */
    getProfileInsight: getProfileInsight,

    /** Profil boyut etiketleri */
    PROFILE_LABELS: PROFILE_LABELS,

    /** Gezegen adları (UI için) */
    PLANET_NAMES: PLANET_NAMES_INTERNAL,

    /** Mevcut gezegen saatini döndür */
    getCurrentPlanetaryHour: getCurrentPlanetaryHour,

    /** Ay faz adı */
    getMoonPhaseName: getMoonPhaseName,

    /** Transit hesabı */
    calcTransits: calcTransits,

    /** Burç adı → boylam */
    lonToSign: lonToSign,

    /** Utility */
    getSunSign: getSunSign,
    getMoonSign: getMoonSign,
    getAscendantSign: getAscendantSign,

    /* ── v2 API (yeni özellikler) ── */

    /** Haftalık okuma — 7 günlük detaylı analiz */
    generateWeeklyReading: generateWeeklyReading,

    /** Aylık okuma — 30 günlük trend analizi */
    generateMonthlyReading: generateMonthlyReading,

    /** Çok boyutlu burç uyumu analizi */
    calculateDeepCompatibility: calculateDeepCompatibility,

    /** Gelişmiş retrograd durumu */
    getRetrogrades: getRetrogrades,

    /** Gezegen açıları (aspect'ler) */
    calcAspects: function(date) {
      var positions = calcPlanetPositions(date || new Date());
      return calcAspects(positions);
    },

    /** Element & Modalite bilgisi */
    SIGN_ELEMENTS: SIGN_ELEMENTS,
    SIGN_MODALITIES: SIGN_MODALITIES,
    SIGN_RULERS: SIGN_RULERS,

    /** Aspect isimleri */
    ASPECT_NAMES: ASPECT_NAMES,

    /** Versiyon */
    VERSION: '2.0.0'
  };

  global.LunarisML = LunarisML;

})(typeof window !== 'undefined' ? window : this);
