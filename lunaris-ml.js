/* ==========================================================
   LUNARIS — ML Tabanlı Astroloji Yorum Motoru  (lunaris-ml.js)
   ============================================================
   Saf JavaScript — dış kütüphane yok, API yok, offline çalışır.

   Mimari:
   1. SignFeatureVectors  — 12 burç için 8-boyutlu embedding
   2. PlanetaryHours      — Antik 7-gezegen saati sistemi
   3. TransitEngine       — Yaklaşık gezegensel transit hesabı
   4. NatalEngine         — Doğum tarihi/saati → natal harita skoru
   5. MLInterpreter       — Dot-product scoring + sigmoid aktivasyon
   6. TextPool            — Ağırlıklı metin seçimi (TR/EN/RU)
   7. DeepReadingGenerator— Herkese özel derin yorum üretici
   8. EnergyTimeline      — 12 aylık enerji tahmin grafiği
   ========================================================== */

(function(global) {
  'use strict';

  /* ──────────────────────────────────────────────
     YARDIMCI FONKSİYONLAR
  ─────────────────────────────────────────────── */

  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  function relu(x) { return Math.max(0, x); }

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

  /* ──────────────────────────────────────────────
     KATMAN 1 — SIGN FEATURE VECTORS
     Boyutlar: [enerji, istikrar, macera, pratiklik,
                sosyallik, sezgi, liderlik, duyarlılık]
  ─────────────────────────────────────────────── */
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

  /* Kategori ağırlık matrisleri — her boyutun ilgili kategoriye katkısı */
  var CATEGORY_WEIGHTS = {
    love:   [0.30, 0.25, 0.40, 0.15, 0.80, 0.75, 0.20, 0.95],
    luck:   [0.85, 0.40, 0.90, 0.60, 0.55, 0.65, 0.70, 0.25],
    career: [0.70, 0.80, 0.50, 0.90, 0.60, 0.45, 0.95, 0.30],
    health: [0.80, 0.70, 0.55, 0.75, 0.50, 0.60, 0.45, 0.65],
    daily:  [0.60, 0.55, 0.65, 0.70, 0.75, 0.60, 0.65, 0.60],
    money:  [0.55, 0.85, 0.45, 0.95, 0.50, 0.40, 0.80, 0.30]
  };

  /* ──────────────────────────────────────────────
     KATMAN 2 — PLANETARY HOURS (Antik Sistem)
     Haftanın her günü 7 gezegen saati sırasıyla döner.
     Başlangıç gezegeni: Pazar=Güneş, Pazartesi=Ay...
  ─────────────────────────────────────────────── */
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

  /* ──────────────────────────────────────────────
     KATMAN 3 — TRANSIT ENGINE
     Yaklaşık gezegensel hesaplar (J2000 baz alınarak)
  ─────────────────────────────────────────────── */

  /* Jülyen günü */
  function julianDay(date) {
    var d = date || new Date();
    var Y = d.getFullYear(), M = d.getMonth() + 1, D = d.getDate();
    return 367 * Y - Math.floor(7 * (Y + Math.floor((M + 9) / 12)) / 4) +
           Math.floor(275 * M / 9) + D + 1721013.5;
  }

  function calcTransits(date) {
    var jd = julianDay(date);
    var d = jd - 2451545.0; // J2000'den gün farkı

    // Yaklaşık gezegen boylamları (derece)
    var sunLon   = (280.460 + 0.9856474 * d) % 360;
    var moonLon  = (218.316 + 13.176396 * d) % 360;
    var mercLon  = (252.251 + 1.5918 * d) % 360;
    var venusLon = (181.979 + 0.6221 * d) % 360;
    var marsLon  = (355.433 + 0.5240207 * d) % 360;
    var jupLon   = (34.396  + 0.0830853 * d) % 360;
    var satLon   = (50.077  + 0.0334697 * d) % 360;

    function normDeg(x) { return ((x % 360) + 360) % 360; }

    var transits = {
      sun: normDeg(sunLon),
      moon: normDeg(moonLon),
      mercury: normDeg(mercLon),
      venus: normDeg(venusLon),
      mars: normDeg(marsLon),
      jupiter: normDeg(jupLon),
      saturn: normDeg(satLon)
    };

    // Retrograd tahmini (basit: gezegen yavaşladığı dönem)
    var mercRetro = Math.sin((d / 87.97) * Math.PI * 2) < -0.7;
    var venusRetro = Math.sin((d / 224.7) * Math.PI * 2) < -0.8;

    return { positions: transits, mercRetro: mercRetro, venusRetro: venusRetro };
  }

  /* Gezegenin hangi burçta olduğunu döndür */
  function lonToSign(lon) {
    var signs = ['aries','taurus','gemini','cancer','leo','virgo',
                 'libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
    return signs[Math.floor(((lon % 360) + 360) % 360 / 30)];
  }

  /* Transit uyum skoru: transit gezegen + natal burç arasındaki vektör benzerliği */
  function transitScore(signKey, date) {
    var transits = calcTransits(date || new Date());
    var signVec = SIGN_VECTORS[signKey];
    var score = 0;
    var planetKeys = Object.keys(transits.positions);
    planetKeys.forEach(function(planet) {
      var transitSign = lonToSign(transits.positions[planet]);
      var pVec = PLANET_ENERGY[planet] || PLANET_ENERGY.sun;
      var tVec = SIGN_VECTORS[transitSign] || signVec;
      score += cosineSimilarity(signVec, pVec) * cosineSimilarity(signVec, tVec);
    });
    score /= planetKeys.length;
    // Retrograd cezası
    if (transits.mercRetro) score -= 0.05;
    if (transits.venusRetro) score -= 0.04;
    return Math.max(0, Math.min(1, score));
  }

  /* ──────────────────────────────────────────────
     KATMAN 4 — MOON PHASE WEIGHT
  ─────────────────────────────────────────────── */
  function getMoonPhaseWeight(date) {
    var d = date || new Date();
    var jd = julianDay(d);
    var cycle = ((jd - 2451550.1) % 29.530588) / 29.530588;
    if (cycle < 0) cycle += 1;

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
    var d = date || new Date();
    var jd = julianDay(d);
    var cycle = ((jd - 2451550.1) % 29.530588) / 29.530588;
    if (cycle < 0) cycle += 1;
    var names = {
      tr: ['Yeni Ay','Büyüyen Hilal','İlk Dördün','Büyüyen Ay',
           'Dolunay','Küçülen Ay','Son Dördün','Küçülen Hilal'],
      en: ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
           'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'],
      ru: ['Новолуние','Растущий серп','Первая четверть','Растущая Луна',
           'Полнолуние','Убывающая Луна','Последняя четверть','Убывающий серп']
    };
    var idx = Math.min(7, Math.floor(cycle * 8));
    return { tr: names.tr[idx], en: names.en[idx], ru: names.ru[idx], fraction: cycle };
  }

  /* ──────────────────────────────────────────────
     KATMAN 5 — TEMPORAL WEIGHT VECTOR
     Bugünün çok-faktörlü enerji ağırlığı
  ─────────────────────────────────────────────── */
  function getTemporalVector(date) {
    var d = date || new Date();
    var planet = getCurrentPlanetaryHour(d);
    var planetVec = PLANET_ENERGY[planet];
    var moonVec = getMoonPhaseWeight(d);

    // Mevsim vektörü (kuzey yarıküre)
    var month = d.getMonth(); // 0-11
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

    // Ağırlıklı ortalama
    var temporal = [];
    for (var i = 0; i < 8; i++) {
      temporal.push(
        (planetVec[i] * 0.30 + moonVec[i] * 0.30 + seasonVec[i] * 0.20 + dayVec[i] * 0.20) * numScale
      );
    }
    return normalize(temporal);
  }

  /* ──────────────────────────────────────────────
     KATMAN 6 — NATAL ENGINE
     Doğum tarihi + saati → natal harita skorları
  ─────────────────────────────────────────────── */

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
    /* Ay ~29.5 günde bir tam tur yapar, ~2.46 günde bir burç değiştirir */
    var jd = julianDay(birthDate);
    var moonCycle = ((jd - 2451550.1) % 29.530588);
    if (moonCycle < 0) moonCycle += 29.530588;
    var signIdx = Math.floor(moonCycle / (29.530588 / 12));
    var signs = ['aries','taurus','gemini','cancer','leo','virgo',
                 'libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
    return signs[signIdx % 12];
  }

  function getAscendantSign(birthDate, birthHour) {
    /* Yükselen burç: ~2 saatte bir değişir. Güneş burcundan ve saatten tahmin. */
    var sunSign = getSunSign(birthDate);
    var signs = ['aries','taurus','gemini','cancer','leo','virgo',
                 'libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
    var sunIdx = signs.indexOf(sunSign);
    var hourOffset = Math.floor((birthHour !== undefined ? birthHour : 6) / 2);
    return signs[(sunIdx + hourOffset) % 12];
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
      profile: profile
    };
  }

  /* ──────────────────────────────────────────────
     KATMAN 7 — ML INTERPRETER
     Dot-product scoring + sigmoid → yorum seçimi
  ─────────────────────────────────────────────── */

  function scoreForCategory(signKey, category, date, natalVector) {
    var signVec = SIGN_VECTORS[signKey];
    var temporal = getTemporalVector(date);
    var catWeights = CATEGORY_WEIGHTS[category] || CATEGORY_WEIGHTS.daily;

    /* Ağırlıklı dot product */
    var rawScore = 0;
    for (var i = 0; i < 8; i++) {
      rawScore += signVec[i] * temporal[i] * catWeights[i];
    }

    /* Natal bias */
    var natalBias = 0;
    if (natalVector) {
      for (var j = 0; j < 8; j++) {
        natalBias += natalVector[j] * catWeights[j] * 0.3;
      }
    }

    /* Transit skoru */
    var transit = transitScore(signKey, date);

    /* Sigmoid aktivasyon → 0-1 */
    var finalScore = sigmoid(rawScore + natalBias + transit - 2.0);

    return finalScore;
  }

  /* ──────────────────────────────────────────────
     KATMAN 8 — ZENGİN METİN HAVUZU
     Her metin için: {text:{tr,en,ru}, weight, minScore, maxScore, cats, mood}
     weight: Bu metnin ne sıklıkla seçileceği (1-10)
     minScore/maxScore: Hangi enerji seviyesinde uygun (0-1)
  ─────────────────────────────────────────────── */

  var DEEP_TEXTS = {
    /* ── AŞK ── */
    love: {
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
      ]
    },

    /* ── ŞANS ── */
    luck: {
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
      ]
    },

    /* ── KARİYER ── */
    career: {
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
      ]
    },

    /* ── SAĞLIK ── */
    health: {
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
      ]
    }
  };

  /* ──────────────────────────────────────────────
     KATMAN 9 — DEEP READING GENERATOR
  ─────────────────────────────────────────────── */

  function pickTextByScore(pool, score, seed) {
    var tier = score >= 0.65 ? 'high' : (score >= 0.42 ? 'mid' : 'low');
    var items = pool[tier];
    if (!items || !items.length) {
      /* Fallback */
      var all = (pool.high || []).concat(pool.mid || []).concat(pool.low || []);
      if (!all.length) return {tr:'',en:'',ru:''};
      items = all;
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

    /* Metin seçimi */
    var texts = {
      love:   pickTextByScore(DEEP_TEXTS.love,   scores.love,   tk + signKey + 'love')[lang],
      luck:   pickTextByScore(DEEP_TEXTS.luck,   scores.luck,   tk + signKey + 'luck')[lang],
      career: pickTextByScore(DEEP_TEXTS.career, scores.career, tk + signKey + 'career')[lang],
      health: pickTextByScore(DEEP_TEXTS.health, scores.health, tk + signKey + 'health')[lang]
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
      (scores.love + scores.luck + scores.career + scores.health) / 4 * 100
    );

    /* Retrograd uyarısı */
    var transits = calcTransits(date);
    var retrogradWarning = null;
    if (transits.mercRetro) {
      retrogradWarning = {
        tr: '⚠️ Merkür Retrosu: İletişim ve teknoloji konularında dikkatli ol.',
        en: '⚠️ Mercury Retrograde: Be careful with communication and technology.',
        ru: '⚠️ Меркурий ретроградный: Будь осторожен в общении и с техникой.'
      }[lang];
    } else if (transits.venusRetro) {
      retrogradWarning = {
        tr: '⚠️ Venüs Retrosu: İlişkilerde köklü kararlar için bekle.',
        en: '⚠️ Venus Retrograde: Pause on major relationship decisions.',
        ru: '⚠️ Венера ретроградная: Не торопись с серьёзными решениями в отношениях.'
      }[lang];
    }

    /* Ay ve gezegen bilgisi */
    var moonPhase = getMoonPhaseName(date);
    var planet = getCurrentPlanetaryHour(date);
    var planetSign = lonToSign(transits.positions[planet] || 0);

    return {
      scores: scores,
      texts: texts,
      luckyNum: luckyNum,
      luckyColor: luckyColor,
      totalEnergy: totalEnergy,
      retrogradWarning: retrogradWarning,
      moonPhase: moonPhase,
      planetaryHour: planet,
      natal: natal,
      transits: transits
    };
  }

  /* ──────────────────────────────────────────────
     KATMAN 10 — ENERGY TIMELINE
     12 aylık enerji tahmin grafiği verisi
  ─────────────────────────────────────────────── */

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

      months.push({
        month: m,
        label: { tr: monthNames.tr[d.getMonth()], en: monthNames.en[d.getMonth()], ru: monthNames.ru[d.getMonth()] },
        energy: energy,
        love: loveScore,
        career: careerScore,
        luck: luckScore,
        isCurrent: m === 0
      });
    }
    return months;
  }

  /* ──────────────────────────────────────────────
     KATMAN 11 — KİŞİLİK PROFİLİ METİNLERİ
  ─────────────────────────────────────────────── */

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

  /* ──────────────────────────────────────────────
     PUBLIC API
  ─────────────────────────────────────────────── */

  var LunarisML = {
    /* Günlük derin yorum (burç + opsiyonel natal bilgi) */
    generateDeepReading: generateDeepReading,

    /* 12 aylık enerji zaman çizelgesi */
    generateEnergyTimeline: generateEnergyTimeline,

    /* Natal harita hesabı */
    calcNatalScores: calcNatalScores,

    /* Burç için tüm kategori skorları (0-1 arası) */
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

    /* Kişilik profili içgörüleri */
    getProfileInsight: getProfileInsight,

    /* Profil boyut etiketleri */
    PROFILE_LABELS: PROFILE_LABELS,

    /* Gezegen adları (UI için) */
    PLANET_NAMES: {
      sun:     { tr: 'Güneş', en: 'Sun', ru: 'Солнце' },
      moon:    { tr: 'Ay', en: 'Moon', ru: 'Луна' },
      mars:    { tr: 'Mars', en: 'Mars', ru: 'Марс' },
      mercury: { tr: 'Merkür', en: 'Mercury', ru: 'Меркурий' },
      jupiter: { tr: 'Jüpiter', en: 'Jupiter', ru: 'Юпитер' },
      venus:   { tr: 'Venüs', en: 'Venus', ru: 'Венера' },
      saturn:  { tr: 'Satürn', en: 'Saturn', ru: 'Сатурн' }
    },

    /* Mevcut gezegen saatini döndür */
    getCurrentPlanetaryHour: getCurrentPlanetaryHour,

    /* Ay faz adı */
    getMoonPhaseName: getMoonPhaseName,

    /* Transit hesabı */
    calcTransits: calcTransits,

    /* Burç adı → boylam */
    lonToSign: lonToSign,

    /* Utility */
    getSunSign: getSunSign,
    getMoonSign: getMoonSign,
    getAscendantSign: getAscendantSign
  };

  global.LunarisML = LunarisML;

})(typeof window !== 'undefined' ? window : this);
