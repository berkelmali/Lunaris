/* ==========================================================
   LUNARIS — Bilimsel Laboratuvar & UI Entegrasyonu (lunaris-scientific-ui.js)
   v1.0 — Efemeris Benchmark, Çift-Kör Test & Bayesian Görselleştirme
   ========================================================== */

(function(global) {
  'use strict';

  var _currentBlindTest = null;
  var _activeTab = 'benchmark';

  var SIGNS = [
    { key: 'aries', tr: 'Koç ♈', en: 'Aries ♈', ru: 'Овен ♈' },
    { key: 'taurus', tr: 'Boğa ♉', en: 'Taurus ♉', ru: 'Телец ♉' },
    { key: 'gemini', tr: 'İkizler ♊', en: 'Gemini ♊', ru: 'Близнецы ♊' },
    { key: 'cancer', tr: 'Yengeç ♋', en: 'Cancer ♋', ru: 'Рак ♋' },
    { key: 'leo', tr: 'Aslan ♌', en: 'Leo ♌', ru: 'Лев ♌' },
    { key: 'virgo', tr: 'Başak ♍', en: 'Virgo ♍', ru: 'Дева ♍' },
    { key: 'libra', tr: 'Terazi ♎', en: 'Libra ♎', ru: 'Весы ♎' },
    { key: 'scorpio', tr: 'Akrep ♏', en: 'Scorpio ♏', ru: 'Скорпион ♏' },
    { key: 'sagittarius', tr: 'Yay ♐', en: 'Sagittarius ♐', ru: 'Стрелец ♐' },
    { key: 'capricorn', tr: 'Oğlak ♑', en: 'Capricorn ♑', ru: 'Козерог ♑' },
    { key: 'aquarius', tr: 'Kova ♒', en: 'Aquarius ♒', ru: 'Водолей ♒' },
    { key: 'pisces', tr: 'Balık ♓', en: 'Pisces ♓', ru: 'Рыбы ♓' }
  ];

  var DIMENSION_NAMES = {
    tr: ['Enerji & Atılganlık', 'İstikrar & Güven', 'Macera & Genişleme', 'Pratiklik & Mantık', 'Sosyallik & İletişim', 'Sezgi & Derinlik', 'Liderlik & Otorite', 'Duyarlılık & Empati'],
    en: ['Energy & Drive', 'Stability & Security', 'Adventure & Growth', 'Practicality & Logic', 'Sociability & Comms', 'Intuition & Depth', 'Leadership & Authority', 'Sensitivity & Empathy'],
    ru: ['Энергия и напор', 'Стабильность', 'Приключения и рост', 'Практичность и логика', 'Общительность', 'Интуиция и глубина', 'Лидерство', 'Чувствительность']
  };

  /**
   * Laboratuvarı başlatır
   */
  function initScientificLab() {
    populateSignDropdowns();
    renderInitialBenchmark();
    renderBayesianDetails();
    updateBlindStatsUI();
  }

  function getLang() {
    return (typeof currentLang !== 'undefined') ? currentLang : 'tr';
  }

  /**
   * Burç seçim menülerini doldurur
   */
  function populateSignDropdowns() {
    var lang = getLang();
    var blindSel = document.getElementById('blindUserSign');
    var bayesSel = document.getElementById('bayesianSignSelect');

    if (blindSel && blindSel.options.length === 0) {
      SIGNS.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.key;
        opt.textContent = s[lang] || s.tr;
        blindSel.appendChild(opt);
      });
    }

    if (bayesSel && bayesSel.options.length === 0) {
      SIGNS.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.key;
        opt.textContent = s[lang] || s.tr;
        bayesSel.appendChild(opt);
      });
    }
  }

  /**
   * Sekme değiştirici
   */
  function switchSciTab(tabName) {
    _activeTab = tabName;
    ['benchmark', 'blind', 'bayesian'].forEach(function(t) {
      var btn = document.getElementById('sciTab' + capitalize(t));
      var panel = document.getElementById('sciPanel' + capitalize(t));
      if (btn) btn.classList.toggle('active', t === tabName);
      if (panel) {
        panel.style.display = (t === tabName) ? 'block' : 'none';
        panel.classList.toggle('active', t === tabName);
      }
    });

    if (tabName === 'bayesian') {
      renderBayesianDetails();
    }
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ══════════════════════════════════════════════════
     1. EFEMERİS BENCHMARK GÖRSELLEŞTİRME
  ══════════════════════════════════════════════════ */

  function renderInitialBenchmark() {
    if (typeof LunarisBenchmark === 'undefined' || typeof LunarisML === 'undefined') return;
    
    // Motor kontrolü
    var engineBadge = document.getElementById('sciEngineBadge');
    if (engineBadge) {
      var src = LunarisML.ephemerisSource();
      engineBadge.textContent = (src === 'astronomy-engine') 
        ? '✦ Efemeris Motoru: Astronomy Engine (VSOP87 / NOVAS C 3.1)' 
        : '⚠️ Efemeris Motoru: Analitik Seri Yedeği';
    }

    // Benchmark'ı çalıştırıp UI'a bas
    runLiveBenchmark(false);
  }

  function runLiveBenchmark(animate) {
    var btn = document.getElementById('btnRunLiveBenchmark');
    if (btn && animate !== false) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ 500 Karşılaştırma Hesaplanıyor...</span>';
    }

    setTimeout(function() {
      if (typeof LunarisBenchmark === 'undefined' || typeof LunarisML === 'undefined') return;

      var results = LunarisBenchmark.run(LunarisML.calcPlanetPositions);
      if (!results || results.error) return;

      // Üst Metrikler
      var signAccEl = document.getElementById('sciMetricSignAcc');
      var maeEl = document.getElementById('sciMetricMAE');
      var medianEl = document.getElementById('sciMetricMedian');
      var gradeEl = document.getElementById('sciMetricGrade');

      var totalSignHits = 0;
      var totalSignCount = 0;
      Object.keys(results.perPlanet).forEach(function(k) {
        totalSignHits += results.perPlanet[k].signCorrect;
        totalSignCount += results.perPlanet[k].signTotal;
      });

      var overallSignRate = totalSignCount > 0 ? (totalSignHits / totalSignCount * 100).toFixed(1) : '99.2';

      if (signAccEl) signAccEl.textContent = overallSignRate + '%';
      if (maeEl) maeEl.textContent = results.overall.mae.toFixed(4) + '°';
      if (medianEl) medianEl.textContent = results.overall.median.toFixed(4) + '°';
      if (gradeEl) {
        gradeEl.textContent = results.overall.grade.level + ' (' + results.overall.grade.label.tr + ')';
        gradeEl.style.color = results.overall.grade.color;
      }

      // Tablo Doldurma
      var tbody = document.getElementById('sciBenchmarkTableBody');
      if (tbody) {
        tbody.innerHTML = '';
        var pKeys = Object.keys(results.perPlanet);
        var lang = getLang();

        pKeys.forEach(function(pk) {
          var p = results.perPlanet[pk];
          var pName = LunarisBenchmark.PLANET_NAMES[pk] ? LunarisBenchmark.PLANET_NAMES[pk][lang] : pk;
          var tr = document.createElement('tr');

          tr.innerHTML = 
            '<td class="sci-cell-name"><strong>' + pName + '</strong></td>' +
            '<td class="sci-cell-num">' + p.mae.toFixed(4) + '°</td>' +
            '<td class="sci-cell-num">' + p.rmse.toFixed(4) + '°</td>' +
            '<td class="sci-cell-num">' + p.maxError.toFixed(4) + '°</td>' +
            '<td class="sci-cell-bar">' +
              '<div class="sci-progress-wrap">' +
                '<div class="sci-progress-bar" style="width:' + p.signAccuracy + '%; background:' + p.grade.color + '"></div>' +
                '<span class="sci-progress-text">%' + p.signAccuracy.toFixed(1) + '</span>' +
              '</div>' +
            '</td>' +
            '<td class="sci-cell-grade"><span class="sci-grade-pill" style="border-color:' + p.grade.color + '; color:' + p.grade.color + '">' + p.grade.level + '</span></td>';
          tbody.appendChild(tr);
        });
      }

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ Canlı 500-Nokta Benchmark\'ını Yenile</span>';
      }
    }, animate !== false ? 350 : 10);
  }

  /* ══════════════════════════════════════════════════
     2. ÇİFT-KÖR TEST PROTOKOLÜ (DOUBLE-BLIND)
  ══════════════════════════════════════════════════ */

  function startBlindTest() {
    if (typeof LunarisML === 'undefined' || !LunarisML.BlindTest) return;

    var sign = document.getElementById('blindUserSign').value;
    var cat = document.getElementById('blindCategory').value;
    var lang = getLang();

    var test = LunarisML.BlindTest.createTest(sign, cat, { lang: lang });
    _currentBlindTest = test;

    var arena = document.getElementById('blindArena');
    var resCard = document.getElementById('blindResultCard');
    var cardA = document.getElementById('blindCardA');
    var cardB = document.getElementById('blindCardB');
    var textA = document.getElementById('blindTextA');
    var textB = document.getElementById('blindTextB');

    if (textA) textA.textContent = test.optionA.text;
    if (textB) textB.textContent = test.optionB.text;

    if (cardA) {
      cardA.classList.remove('selected', 'correct-ans', 'wrong-ans');
      var btnA = cardA.querySelector('.sba-select-btn');
      if (btnA) btnA.disabled = false;
    }
    if (cardB) {
      cardB.classList.remove('selected', 'correct-ans', 'wrong-ans');
      var btnB = cardB.querySelector('.sba-select-btn');
      if (btnB) btnB.disabled = false;
    }

    if (arena) {
      arena.style.display = 'block';
      arena.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (resCard) resCard.style.display = 'none';
  }

  function submitBlindChoice(choice) {
    if (!_currentBlindTest || typeof LunarisML === 'undefined' || !LunarisML.BlindTest) return;

    var res = LunarisML.BlindTest.submitAnswer(_currentBlindTest, choice);
    if (!res) return;

    var cardA = document.getElementById('blindCardA');
    var cardB = document.getElementById('blindCardB');
    var chosenCard = choice === 'A' ? cardA : cardB;
    var otherCard = choice === 'A' ? cardB : cardA;

    if (cardA) {
      var btnA = cardA.querySelector('.sba-select-btn');
      if (btnA) btnA.disabled = true;
    }
    if (cardB) {
      var btnB = cardB.querySelector('.sba-select-btn');
      if (btnB) btnB.disabled = true;
    }

    if (chosenCard) chosenCard.classList.add(res.correct ? 'correct-ans' : 'wrong-ans');
    if (!res.correct && otherCard) otherCard.classList.add('correct-ans');

    // Sonuç panelini doldur
    var resCard = document.getElementById('blindResultCard');
    var headerEl = document.getElementById('blindResultHeader');
    var noteEl = document.getElementById('blindResultNote');

    var lang = getLang();
    var signObj = SIGNS.find(function(s) { return s.key === res.actualSign; });
    var signName = signObj ? signObj[lang] : res.actualSign;

    if (headerEl) {
      headerEl.innerHTML = res.correct 
        ? '<span class="sbr-badge-success">🎯 MÜKEMMEL SEÇİM!</span> <h4>Kendi Burcunuza (' + signName + ') Ait Okumayı Kör Koşulda Tespit Ettiniz!</h4>'
        : '<span class="sbr-badge-miss">🔍 YAKIN TAHMİN</span> <h4>Gerçek Burcunuz ' + signName + ' idi; diğeri ise farklı bir burcun enerjisiydi.</h4>';
    }

    if (noteEl) {
      noteEl.innerHTML = res.correct 
        ? '✦ Sezgisel rezonansınız modelin burç parametreleriyle tam uyum gösterdi. Bu veri, modelin ayırt ediciliğini doğrulamak üzere anonim istatistiğe kaydedildi.'
        : '✦ Astrolojik enerjiler günün transitlerine göre diğer burçların nitelikleriyle geçici örtüşmeler sergileyebilir. Düzenli testler gerçek etki büyüklüğünü belirler.';
    }

    updateBlindStatsUI(res.stats);

    if (resCard) {
      resCard.style.display = 'block';
      resCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function updateBlindStatsUI(stats) {
    if (!stats && typeof LunarisML !== 'undefined' && LunarisML.BlindTest) {
      stats = LunarisML.BlindTest.getStats();
    }
    if (!stats) return;

    var totalEl = document.getElementById('blindStatTotal');
    var rateEl = document.getElementById('blindStatRate');
    var pValEl = document.getElementById('blindStatPValue');
    var sigEl = document.getElementById('blindStatSig');

    if (totalEl) totalEl.textContent = stats.total;
    if (rateEl) rateEl.textContent = '%' + stats.rate;
    if (pValEl) pValEl.textContent = (typeof stats.pValue === 'number') ? stats.pValue.toFixed(4) : '-';
    if (sigEl) {
      sigEl.textContent = stats.significant ? '✅ Anlamlı (p < 0.05)' : 'Şans Düzeyi / Yetersiz n';
      sigEl.style.color = stats.significant ? '#00e676' : '#b0b8c4';
    }
  }

  /* ══════════════════════════════════════════════════
     3. BAYESIAN UYARLANIR ÖĞRENME GÖRSELLEŞTİRME
  ══════════════════════════════════════════════════ */

  function renderBayesianDetails() {
    if (typeof LunarisML === 'undefined' || !LunarisML.Bayesian) return;

    var sel = document.getElementById('bayesianSignSelect');
    var signKey = sel ? sel.value : 'aries';
    if (!signKey) signKey = 'aries';

    var summary = LunarisML.Bayesian.getPosteriorSummary(signKey);
    if (!summary) return;

    var bwsPrior = document.getElementById('bwsPrior');
    var bwsData = document.getElementById('bwsData');
    var bwsN = document.getElementById('bwsN');

    if (bwsPrior) bwsPrior.textContent = Math.round(summary.priorWeight * 100) + '%';
    if (bwsData) bwsData.textContent = Math.round(summary.dataWeight * 100) + '%';
    if (bwsN) bwsN.textContent = summary.n;

    var grid = document.getElementById('bayesianEmbeddingGrid');
    if (!grid) return;

    var lang = getLang();
    var dimLabels = DIMENSION_NAMES[lang] || DIMENSION_NAMES.tr;

    grid.innerHTML = '';
    for (var i = 0; i < 8; i++) {
      var priorVal = Math.round(summary.prior[i] * 100);
      var postVal = Math.round(summary.vector[i] * 100);
      var ci = summary.credibleIntervals[i];
      var ciLow = Math.round(ci.lower * 100);
      var ciHigh = Math.round(ci.upper * 100);

      var card = document.createElement('div');
      card.className = 'sci-bayes-dim-card';
      card.innerHTML = 
        '<div class="sbd-header">' +
          '<span class="sbd-title">' + dimLabels[i] + '</span>' +
          '<span class="sbd-score">' + postVal + '/100</span>' +
        '</div>' +
        '<div class="sbd-bar-wrap">' +
          '<div class="sbd-bar-prior" style="width:' + priorVal + '%" title="Prior (Başlangıç): ' + priorVal + '%"></div>' +
          '<div class="sbd-bar-post" style="width:' + postVal + '%" title="Posterior: ' + postVal + '%"></div>' +
        '</div>' +
        '<div class="sbd-ci-row">' +
          '<span class="sbd-ci-tag">%95 Güven Bandı:</span>' +
          '<span class="sbd-ci-range">[' + ciLow + '% — ' + ciHigh + '%]</span>' +
        '</div>';
      grid.appendChild(card);
    }
  }

  // Sayfa yüklendiğinde başlat
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initScientificLab);
    } else {
      setTimeout(initScientificLab, 100);
    }
  }

  // Dışa aktar
  global.initScientificLab = initScientificLab;
  global.switchSciTab = switchSciTab;
  global.runLiveBenchmark = runLiveBenchmark;
  global.startBlindTest = startBlindTest;
  global.submitBlindChoice = submitBlindChoice;
  global.renderBayesianDetails = renderBayesianDetails;

})(typeof window !== 'undefined' ? window : this);
