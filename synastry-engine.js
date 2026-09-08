/* ==========================================================
   LUNARIS — Synastry & Composite Chart AI Engine
   (synastry-engine.js — v1.0)
   - Dual-chart cross-aspect calculations (Synastry)
   - Composite Midpoint calculation along shortest arc
   - 5-Dimensional Relationship Radar (Love, Passion, Mind, Trust, Karma)
   - Archetype identification & NLP relationship synthesis
   ========================================================== */

(function(global) {
  'use strict';

  var DEG2RAD = Math.PI / 180;
  var RAD2DEG = 180 / Math.PI;

  function normDeg(deg) {
    deg = deg % 360;
    if (deg < 0) deg += 360;
    return deg;
  }

  // Shortest arc separation between two longitudes
  function getAngleDiff(lon1, lon2) {
    var diff = Math.abs(normDeg(lon1) - normDeg(lon2));
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  // Midpoint of two longitudes along the shortest arc
  function getMidpoint(lon1, lon2) {
    lon1 = normDeg(lon1);
    lon2 = normDeg(lon2);
    var diff = lon2 - lon1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return normDeg(lon1 + diff / 2);
  }

  function lonToSign(lon) {
    var signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    var idx = Math.floor(normDeg(lon) / 30) % 12;
    return signs[idx];
  }

  var ASPECT_TYPES = [
    { type: 'conjunction', symbol: '☌', angle: 0, orb: 8.0, harmony: 1.0, weight: 1.2 },
    { type: 'trine', symbol: '△', angle: 120, orb: 7.0, harmony: 1.0, weight: 1.0 },
    { type: 'sextile', symbol: '⚹', angle: 60, orb: 5.5, harmony: 0.85, weight: 0.8 },
    { type: 'opposition', symbol: '☍', angle: 180, orb: 7.0, harmony: -0.2, dynamic: 0.95, weight: 1.1 },
    { type: 'square', symbol: '□', angle: 90, orb: 6.0, harmony: -0.4, dynamic: 1.0, weight: 1.0 }
  ];

  var ARCHETYPES = [
    {
      id: 'soulmates',
      title: { tr: 'Ateşli Ruh Eşleri', en: 'Cosmic Soulmates', ru: 'Космические Родственные Души' },
      badge: '🔥 💖',
      desc: {
        tr: 'Haritalarınız arasında güçlü Güneş-Ay ve Venüs-Mars rezonansı var. Birbirinizi ilk andan beri tanıyormuş gibi hissediyorsunuz.',
        en: 'Potent Sun-Moon and Venus-Mars resonance binds your charts. You feel as if you have known each other across lifetimes.',
        ru: 'Мощный резонанс Солнце-Луна и Венера-Марс связывает ваши карты. Вы чувствуете, будто знали друг друга вечно.'
      }
    },
    {
      id: 'karmic_mirrors',
      title: { tr: 'Karmik Aynalar', en: 'Karmic Mirrors', ru: 'Кармические Зеркала' },
      badge: '🌌 🪐',
      desc: {
        tr: 'Satürn ve Ay Düğümleri ekseninde derin bir kader bağı. Birbirinizin en yüksek potansiyelini ve ruhsal sınavlarını aynalıyorsunuz.',
        en: 'A profound destiny bond anchored by Saturn and the Lunar Nodes. You mirror each other\'s highest growth and soul lessons.',
        ru: 'Глубокая судьбоносная связь через Сатурн и Лунные Узлы. Вы зеркалите точки роста и духовные уроки друг друга.'
      }
    },
    {
      id: 'mental_twin',
      title: { tr: 'Telepatik Zihin İkizleri', en: 'Telepathic Intellectual Twins', ru: 'Телепатическая Ментальная Связь' },
      badge: '⚡ 🧠',
      desc: {
        tr: 'Merkür ve Hava elementi baskınlığı. Saatlerce hiç sıkılmadan konuşabilir, birbirinizin cümlelerini tamamlayabilirsiniz.',
        en: 'Dominant Mercury and Air element harmony. You can talk for hours uninterrupted, finishing each other\'s sentences effortlessly.',
        ru: 'Гармония Меркурия и стихии Воздуха. Вы можете говорить часами напролёт и понимать мысли друг друга с полуслова.'
      }
    },
    {
      id: 'magnetic_passion',
      title: { tr: 'Manyetik Tutku & Çekim', en: 'Magnetic Passion & Chemistry', ru: 'Магнитная Страсть и Химия' },
      badge: '💥 💋',
      desc: {
        tr: 'Mars, Venüs ve Plüton arasındaki yüksek voltajlı enerji. Birlikteyken ortamdaki elektrik ve çekim hemen hissediliyor.',
        en: 'High-voltage planetary magnetism across Mars, Venus, and Pluto. An undeniable physical and emotional pull sparks between you.',
        ru: 'Высоковольтный магнетизм между Марсом, Венерой и Плутоном. Неотразимое взаимное притяжение и яркая химия.'
      }
    },
    {
      id: 'sanctuary',
      title: { tr: 'Güvenli Kozmik Liman', en: 'Cosmic Sanctuary', ru: 'Уютная Космическая Гавань' },
      badge: '🕊️ 🏡',
      desc: {
        tr: 'Su ve Toprak elementlerinin şefkatli uyumu. Dış dünyanın karmaşasından kaçıp birbirinize sığındığınız güvenli bir yuva.',
        en: 'Gentle harmony of Water and Earth elements. A warm, peaceful haven where both of you can retreat from the chaos of the world.',
        ru: 'Мягкая гармония стихий Воды и Земли. Тёплое и надёжное убежище, где оба обретают спокойствие и защиту.'
      }
    }
  ];

  var SynastryEngine = {

    /**
     * Compute full natal planetary positions for a person (minute-accurate)
     */
    getPersonPlanets: function(birthDate, birthHour, options) {
      var d = birthDate ? new Date(birthDate) : new Date();
      var hNum = 12;
      if (typeof birthHour === 'number' && !isNaN(birthHour)) {
        var h = Math.floor(birthHour);
        var m = Math.round((birthHour - h) * 60);
        d.setHours(h, m, 0, 0);
        hNum = birthHour;
      } else if (typeof birthHour === 'string' && birthHour.indexOf(':') !== -1) {
        var parts = birthHour.split(':');
        var h = parseInt(parts[0], 10) || 12;
        var m = parseInt(parts[1], 10) || 0;
        d.setHours(h, m, 0, 0);
        hNum = h + m / 60;
      }

      if (typeof window !== 'undefined' && window.LunarisML) {
        var pos = null;
        if (typeof window.LunarisML.calcPlanetPositions === 'function') {
          pos = window.LunarisML.calcPlanetPositions(d);
        }
        var scores = typeof window.LunarisML.calcNatalScores === 'function' ? window.LunarisML.calcNatalScores(d, hNum, options) : null;
        if (!pos && scores && scores.positions) {
          pos = scores.positions;
        }

        if (pos) {
          return {
            sun: pos.sun,
            moon: pos.moon,
            mercury: pos.mercury,
            venus: pos.venus,
            mars: pos.mars,
            jupiter: pos.jupiter,
            saturn: pos.saturn,
            uranus: pos.uranus,
            neptune: pos.neptune,
            pluto: pos.pluto,
            asc: scores && scores.houses ? scores.houses.asc : 0,
            sunSign: lonToSign(pos.sun),
            moonSign: lonToSign(pos.moon),
            ascSign: scores ? scores.ascSign : lonToSign(pos.sun),
            houses: scores ? scores.houses : null,
            lunarNodes: scores ? scores.lunarNodes : null,
            chiron: scores ? scores.chiron : null
          };
        }
      }

      // Fallback
      var month = d.getMonth() + 1;
      var day = d.getDate();
      var approxSun = ((month - 1) * 30 + day) % 360;
      return {
        sun: approxSun,
        moon: (approxSun + 120) % 360,
        mercury: (approxSun + 15) % 360,
        venus: (approxSun + 30) % 360,
        mars: (approxSun + 60) % 360,
        jupiter: (approxSun + 90) % 360,
        saturn: (approxSun + 180) % 360,
        sunSign: lonToSign(approxSun),
        moonSign: lonToSign((approxSun + 120) % 360),
        ascSign: lonToSign((approxSun + 45) % 360)
      };
    },

    /**
     * Calculate cross-aspects between two sets of planets
     */
    calculateCrossAspects: function(p1, p2) {
      var aspects = [];
      var checkPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

      checkPlanets.forEach(function(pl1) {
        checkPlanets.forEach(function(pl2) {
          var lon1 = p1[pl1];
          var lon2 = p2[pl2];
          if (typeof lon1 !== 'number' || typeof lon2 !== 'number') return;

          var diff = getAngleDiff(lon1, lon2);

          for (var i = 0; i < ASPECT_TYPES.length; i++) {
            var asp = ASPECT_TYPES[i];
            var dev = Math.abs(diff - asp.angle);
            if (dev <= asp.orb) {
              var intensity = 1 - (dev / asp.orb);
              aspects.push({
                planet1: pl1,
                planet2: pl2,
                type: asp.type,
                symbol: asp.symbol,
                angle: asp.angle,
                exactDiff: Math.round(diff * 100) / 100,
                orbDev: Math.round(dev * 10) / 10,
                intensity: Math.round(intensity * 100) / 100,
                harmony: asp.harmony,
                weight: asp.weight
              });
              break;
            }
          }
        });
      });

      return aspects;
    },

    /**
     * Compute 5-dimensional relationship scores
     */
    calculateScores: function(aspects, p1, p2) {
      var baseScores = {
        love: 68,
        passion: 65,
        communication: 70,
        trust: 66,
        karma: 60
      };

      aspects.forEach(function(a) {
        var impact = a.intensity * a.weight * (a.harmony >= 0 ? 12 : -7);

        // Love Dimension (Venus, Sun, Moon)
        if ((a.planet1 === 'venus' && a.planet2 === 'mars') || (a.planet1 === 'mars' && a.planet2 === 'venus')) {
          baseScores.love += impact * 1.3;
          baseScores.passion += impact * 1.5;
        }
        if ((a.planet1 === 'sun' && a.planet2 === 'moon') || (a.planet1 === 'moon' && a.planet2 === 'sun')) {
          baseScores.love += impact * 1.4;
          baseScores.trust += impact * 1.2;
        }
        if (a.planet1 === 'venus' || a.planet2 === 'venus') {
          baseScores.love += impact * 0.8;
        }

        // Communication (Mercury, Jupiter)
        if (a.planet1 === 'mercury' || a.planet2 === 'mercury') {
          baseScores.communication += impact * 1.1;
        }

        // Trust & Stability (Saturn, Earth signs)
        if (a.planet1 === 'saturn' || a.planet2 === 'saturn') {
          if (a.harmony > 0) {
            baseScores.trust += impact * 1.2;
            baseScores.karma += impact * 0.9;
          } else {
            baseScores.trust -= 4; // Slight friction creates maturity
            baseScores.karma += 6;
          }
        }

        // Passion & Power (Mars, Pluto)
        if (a.planet1 === 'mars' || a.planet2 === 'mars') {
          baseScores.passion += impact * 0.9;
        }
      });

      // Clamp between 35 and 98
      var keys = ['love', 'passion', 'communication', 'trust', 'karma'];
      var overall = 0;
      keys.forEach(function(k) {
        baseScores[k] = Math.round(Math.max(35, Math.min(98, baseScores[k])));
        overall += baseScores[k];
      });

      var totalScore = Math.round(overall / keys.length);

      return {
        dimensions: baseScores,
        totalScore: totalScore
      };
    },

    /**
     * Compute Composite Chart (Midpoints)
     */
    calculateComposite: function(p1, p2) {
      var compSun = getMidpoint(p1.sun, p2.sun);
      var compMoon = getMidpoint(p1.moon, p2.moon);
      var compVenus = getMidpoint(p1.venus, p2.venus);
      var compMars = getMidpoint(p1.mars, p2.mars);

      return {
        sunLon: compSun,
        sunSign: lonToSign(compSun),
        moonLon: compMoon,
        moonSign: lonToSign(compMoon),
        venusLon: compVenus,
        venusSign: lonToSign(compVenus),
        marsLon: compMars,
        marsSign: lonToSign(compMars)
      };
    },

    /**
     * Select relationship archetype
     */
    determineArchetype: function(scores, aspects) {
      var d = scores.dimensions;
      if (d.love >= 82 && d.passion >= 80) return ARCHETYPES[0]; // Soulmates
      if (d.karma >= 80 || d.trust >= 82) return ARCHETYPES[1]; // Karmic mirrors
      if (d.communication >= 82) return ARCHETYPES[2]; // Mental twin
      if (d.passion >= 84) return ARCHETYPES[3]; // Magnetic passion
      return ARCHETYPES[4]; // Sanctuary
    },

    /**
     * Generate complete Synastry Reading
    /**
     * Calculate House Overlays between partners
     */
    calculateHouseOverlays: function(p1, p2, p1Name, p2Name, lang) {
      lang = lang || 'tr';
      var overlays = [];
      if (!p1 || !p2) return overlays;

      var targets = [
        { key: 'sun', symbol: '☉', name: { tr: 'Güneş', en: 'Sun', ru: 'Солнце' } },
        { key: 'moon', symbol: '☽', name: { tr: 'Ay', en: 'Moon', ru: 'Луна' } },
        { key: 'venus', symbol: '♀', name: { tr: 'Venüs', en: 'Venus', ru: 'Венера' } },
        { key: 'mars', symbol: '♂', name: { tr: 'Mars', en: 'Mars', ru: 'Марс' } }
      ];

      var ml = (typeof window !== 'undefined' && window.LunarisML) ? window.LunarisML : (typeof global !== 'undefined' && global.LunarisML ? global.LunarisML : null);

      if (ml && typeof ml.getPlanetHouse === 'function') {
        if (p2.houses && p2.houses.cusps) {
          targets.forEach(function(t) {
            var lon = p1[t.key];
            if (typeof lon === 'number') {
              var h = ml.getPlanetHouse(lon, p2.houses.cusps);
              var hName = (ml.HOUSE_MEANINGS && ml.HOUSE_MEANINGS[h] && ml.HOUSE_MEANINGS[h].name) ? (ml.HOUSE_MEANINGS[h].name[lang] || ml.HOUSE_MEANINGS[h].name.tr) : (h + '. Ev');
              var desc = '';
              if (h === 7) desc = (lang === 'tr') ? 'Doğal evlilik, ortaklık ve ideal eş algısı.' : 'Natural marriage, partnership and soulmate attraction.';
              else if (h === 1) desc = (lang === 'tr') ? 'Anında fiziksel çekim ve güçlü kişisel rezonans.' : 'Instant physical attraction and magnetic presence.';
              else if (h === 5) desc = (lang === 'tr') ? 'Tutkulu romantizm, yaratıcılık ve yüksek neşe.' : 'Passionate romance, creativity and joyful play.';
              else if (h === 4) desc = (lang === 'tr') ? 'Derin içsel güven, yuva hissi ve duygusal sığınak.' : 'Deep emotional security, feeling at home and trust.';
              else if (h === 10) desc = (lang === 'tr') ? 'Kariyerde birbirini yüceltme ve ortak hedefler.' : 'Career empowerment and shared public aspirations.';
              else desc = (lang === 'tr') ? 'Önemli yaşam alanı tetikleyicisi.' : 'Key life sphere activation.';

              overlays.push({
                source: p1Name,
                target: p2Name,
                planet: t.key,
                planetName: t.name[lang] || t.name.tr,
                symbol: t.symbol,
                house: h,
                houseName: hName,
                desc: desc
              });
            }
          });
        }
      }

      return overlays;
    },

    /**
     * Generate complete Synastry Reading
     */
    generateReading: function(p1Data, p2Data, lang) {
      lang = lang || 'tr';

      var p1 = this.getPersonPlanets(p1Data.birthDate, p1Data.birthHour, p1Data.options);
      var p2 = this.getPersonPlanets(p2Data.birthDate, p2Data.birthHour, p2Data.options);

      var aspects = this.calculateCrossAspects(p1, p2);
      var scoreResult = this.calculateScores(aspects, p1, p2);
      var composite = this.calculateComposite(p1, p2);
      var archetype = this.determineArchetype(scoreResult, aspects);
      var houseOverlays = this.calculateHouseOverlays(p1, p2, p1Data.name || 'Sen', p2Data.name || 'Partner', lang);

      // Highlight Top 3 aspects
      var sortedAspects = aspects.slice().sort(function(a, b) {
        return (b.intensity * b.weight) - (a.intensity * a.weight);
      });
      var topAspects = sortedAspects.slice(0, 4);

      // Localized Synthesis
      var synthesis = '';
      if (lang === 'tr') {
        synthesis = p1Data.name + ' ile ' + p2Data.name + ' arasındaki kozmik bağ, %' + scoreResult.totalScore + 
                    ' uyum ile "' + archetype.title.tr + '" frekansında titreşiyor. ' + archetype.desc.tr + 
                    ' Kompozit haritanızın Güneş\'i ' + composite.sunSign.toUpperCase() + 
                    ' burcunda; bu ilişki birlikteyken ' + composite.sunSign.toUpperCase() + 
                    ' niteliklerini (yaratıcılık, güç ve amaç) hayata geçirmeniz için evrensel bir davet sunuyor.';
      } else if (lang === 'en') {
        synthesis = 'The cosmic bond between ' + p1Data.name + ' and ' + p2Data.name + ' vibrates at ' + scoreResult.totalScore + 
                    '% compatibility under the "' + archetype.title.en + '" frequency. ' + archetype.desc.en + 
                    ' Your Composite Sun rests in ' + composite.sunSign.toUpperCase() + 
                    ', inviting you both to manifest shared purpose and creative power.';
      } else {
        synthesis = 'Космическая связь между ' + p1Data.name + ' и ' + p2Data.name + ' вибрирует с совместимостью ' + scoreResult.totalScore + 
                    '% на частоте «' + archetype.title.ru + '». ' + archetype.desc.ru;
      }

      return {
        partner1: { name: p1Data.name || 'Sen', planets: p1 },
        partner2: { name: p2Data.name || 'Partner', planets: p2 },
        aspectsCount: aspects.length,
        topAspects: topAspects,
        scores: scoreResult.dimensions,
        totalScore: scoreResult.totalScore,
        composite: composite,
        archetype: archetype,
        houseOverlays: houseOverlays,
        synthesis: synthesis
      };
    }
  };

  global.SynastryEngine = SynastryEngine;

})(typeof window !== 'undefined' ? window : global);
