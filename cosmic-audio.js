/* ==========================================================
   LUNARIS — Cosmic Frequency Sound Engine (Web Audio API)
   (cosmic-audio.js — v1.0)
   - Pure Web Audio synthesis: 0 KB file downloads, zero latency.
   - Based on Hans Cousto's Cosmic Octave (1978) & Solfeggio frequencies.
   - Dual-oscillator binaural beats (Theta & Alpha waves).
   - Harmonic ambient drone & Tarot chime synthesizer.
   ========================================================== */

(function(global) {
  'use strict';

  // Hans Cousto Planetary Frequencies & Solfeggio Scale
  var FREQUENCIES = {
    sun: {
      key: 'sun',
      glyph: '☉',
      name: { tr: 'Güneş (Yaşam & Canlılık)', en: 'Sun (Vitality & Life)', ru: 'Солнце (Жизнь и Сила)' },
      freq: 126.22,
      octave: 32,
      color: '#F2D07A',
      desc: { tr: 'Özgüven, aydınlanma ve içsel canlılığı yükseltir.', en: 'Elevates confidence, clarity and vitality.', ru: 'Повышает уверенность и жизненную силу.' }
    },
    moon: {
      key: 'moon',
      glyph: '☽',
      name: { tr: 'Ay (Duygu & Sezgi)', en: 'Moon (Emotion & Intuition)', ru: 'Луна (Интуиция и Эмоции)' },
      freq: 210.42,
      octave: 29,
      color: '#A79CB8',
      desc: { tr: 'Bilinçaltı arınması, sezgisel akış ve rüya farkındalığı.', en: 'Subconscious cleansing, intuition and dream awareness.', ru: 'Очищение подсознания и интуитивный поток.' }
    },
    earth_om: {
      key: 'earth_om',
      glyph: '🌍',
      name: { tr: 'Dünya / OM (İçsel Dinginlik)', en: 'Earth Year / OM (Inner Peace)', ru: 'Земля / ОМ (Внутренний покой)' },
      freq: 136.10,
      octave: 32,
      color: '#43B97F',
      desc: { tr: 'Kalp çakrası rezonansı, derin meditatif huzur ve denge.', en: 'Heart chakra resonance, deep meditative calm and balance.', ru: 'Резонанс сердечной чакры и глубокий покой.' }
    },
    mercury: {
      key: 'mercury',
      glyph: '☿',
      name: { tr: 'Merkür (Zihin & İletişim)', en: 'Mercury (Mind & Perception)', ru: 'Меркурий (Разум и Связь)' },
      freq: 141.27,
      octave: 30,
      color: '#65C2D9',
      desc: { tr: 'Zihinsel netlik, analitik güç ve açık ifade.', en: 'Mental clarity, analytical focus and perception.', ru: 'Ясность ума и аналитическая концентрация.' }
    },
    venus: {
      key: 'venus',
      glyph: '♀',
      name: { tr: 'Venüs (Aşk & Uyum)', en: 'Venus (Love & Harmony)', ru: 'Венера (Любовь и Гармония)' },
      freq: 221.23,
      octave: 32,
      color: '#E57399',
      desc: { tr: 'Koşulsuz sevgi, estetik zevk ve ilişkilerde ahenk.', en: 'Unconditional love, harmony and aesthetic flow.', ru: 'Безусловная любовь, гармония и эстетика.' }
    },
    mars: {
      key: 'mars',
      glyph: '♂',
      name: { tr: 'Mars (İrade & Eylem)', en: 'Mars (Will & Action)', ru: 'Марс (Воля и Действие)' },
      freq: 144.72,
      octave: 33,
      color: '#FF6B6B',
      desc: { tr: 'Cesaret, motivasyon ve kararlı aksiyon enerjisi.', en: 'Courage, motivation and decisive action.', ru: 'Мужество, мотивация и решительные действия.' }
    },
    jupiter: {
      key: 'jupiter',
      glyph: '♃',
      name: { tr: 'Jüpiter (Bolluk & Şans)', en: 'Jupiter (Abundance & Wisdom)', ru: 'Юпитер (Изобилие и Удача)' },
      freq: 183.58,
      octave: 36,
      color: '#D4AF6A',
      desc: { tr: 'Bolluk bilinci, yüksek felsefe ve şans çekimi.', en: 'Abundance consciousness, higher vision and expansion.', ru: 'Сознание изобилия, высшее видение и удача.' }
    },
    saturn: {
      key: 'saturn',
      glyph: '♄',
      name: { tr: 'Satürn (Odak & Köklenme)', en: 'Saturn (Focus & Grounding)', ru: 'Сатурн (Фокус и Заземление)' },
      freq: 147.85,
      octave: 37,
      color: '#8A6B9E',
      desc: { tr: 'Derin konsantrasyon, kriz aşma ve sabır.', en: 'Deep concentration, discipline and grounding.', ru: 'Глубокая концентрация, дисциплина и заземление.' }
    },
    solfeggio_528: {
      key: 'solfeggio_528',
      glyph: '🧬',
      name: { tr: '528 Hz (Dönüşüm & Mucize)', en: '528 Hz (Transformation & DNA)', ru: '528 Гц (Трансформация)' },
      freq: 528.00,
      octave: null,
      color: '#8A4FFF',
      desc: { tr: 'Hücresel arınma, yenilenme ve Solfeggio mucize tonu.', en: 'Cellular repair, renewal and miracle tone.', ru: 'Клеточное восстановление и чудодейственный тон.' }
    },
    solfeggio_432: {
      key: 'solfeggio_432',
      glyph: '🌿',
      name: { tr: '432 Hz (Evrensel Akort)', en: '432 Hz (Universal Harmony)', ru: '432 Гц (Природный строй)' },
      freq: 432.00,
      octave: null,
      color: '#50C878',
      desc: { tr: 'Doğanın matematiksel altın oranıyla rezonans ve dinginlik.', en: 'Resonance with the golden ratio of nature and peace.', ru: 'Резонанс с золотым сечением природы и покой.' }
    }
  };

  var audioCtx = null;
  var isPlaying = false;
  var currentKey = 'earth_om';
  var binauralMode = 'theta'; // 'none', 'theta' (5.5 Hz), 'alpha' (9.5 Hz)
  var masterVolume = 0.45;

  // Active voice instance
  var activeVoice = null;
  var analyserNode = null;

  function getAudioContext() {
    if (!audioCtx) {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function(){});
    }
    return audioCtx;
  }

  function getAnalyser(ctx) {
    if (!analyserNode) {
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 64;
      analyserNode.smoothingTimeConstant = 0.85;
      analyserNode.connect(ctx.destination);
    }
    return analyserNode;
  }

  function stopVoice(voice, instant) {
    if (!voice) return;
    var ctx = voice.ctx;
    if (!ctx) return;
    var now = ctx.currentTime;
    var fadeDuration = instant ? 0.04 : 0.4;

    try {
      if (voice.gain && voice.gain.gain) {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
      }
    } catch(e) {}

    setTimeout(function() {
      try { if (voice.oscLeft) { voice.oscLeft.stop(); voice.oscLeft.disconnect(); } } catch(e) {}
      try { if (voice.oscRight) { voice.oscRight.stop(); voice.oscRight.disconnect(); } } catch(e) {}
      try { if (voice.oscSub) { voice.oscSub.stop(); voice.oscSub.disconnect(); } } catch(e) {}
      try { if (voice.oscHarmonic) { voice.oscHarmonic.stop(); voice.oscHarmonic.disconnect(); } } catch(e) {}
      try { if (voice.noiseNode) { voice.noiseNode.stop(); voice.noiseNode.disconnect(); } } catch(e) {}
      try { if (voice.gain) { voice.gain.disconnect(); } } catch(e) {}
    }, (fadeDuration + 0.05) * 1000);
  }

  // Generates warm ambient noise buffer
  function createPinkNoiseBuffer(ctx) {
    var bufferSize = ctx.sampleRate * 4;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var output = buffer.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  var LunarisAudio = {
    FREQUENCIES: FREQUENCIES,

    getState: function() {
      return {
        isPlaying: isPlaying,
        currentKey: currentKey,
        currentFreq: FREQUENCIES[currentKey] ? FREQUENCIES[currentKey].freq : 136.10,
        binauralMode: binauralMode,
        volume: masterVolume
      };
    },

    /**
     * Start playing the selected frequency
     */
    play: function(key) {
      var ctx = getAudioContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(function(){});
      }

      if (key && FREQUENCIES[key]) {
        currentKey = key;
      }

      var preset = FREQUENCIES[currentKey] || FREQUENCIES.earth_om;
      var baseFreq = preset.freq;
      var binauralDelta = 0;
      if (binauralMode === 'theta') binauralDelta = 5.5;
      else if (binauralMode === 'alpha') binauralDelta = 9.5;

      // Stop previous voice instance cleanly without touching the new one
      if (activeVoice) {
        stopVoice(activeVoice, true);
        activeVoice = null;
      }

      var now = ctx.currentTime;
      var analyser = getAnalyser(ctx);

      // Voice Master Gain
      var voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVolume, now + 0.20);

      // Filter (warm low-pass)
      var filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(baseFreq > 300 ? 1500 : 900, now);

      // Left Oscillator (Fundamental)
      var oscLeft = ctx.createOscillator();
      oscLeft.type = 'sine';
      oscLeft.frequency.setValueAtTime(baseFreq, now);

      // Right Oscillator (with binaural delta)
      var oscRight = ctx.createOscillator();
      oscRight.type = 'sine';
      oscRight.frequency.setValueAtTime(baseFreq + binauralDelta, now);

      // Sub harmonic oscillator (one octave lower for richness)
      var oscSub = ctx.createOscillator();
      oscSub.type = 'triangle';
      oscSub.frequency.setValueAtTime(baseFreq * 0.5, now);
      var subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.20, now);
      oscSub.connect(subGain);
      subGain.connect(filterNode);

      // Gentle 2nd Harmonic (ensures presence on small mobile/laptop speakers)
      var oscHarmonic = ctx.createOscillator();
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(baseFreq * 2, now);
      var harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.12, now);
      oscHarmonic.connect(harmGain);
      harmGain.connect(filterNode);

      // Panning for binaural separation
      if (ctx.createStereoPanner) {
        var pannerLeft = ctx.createStereoPanner();
        pannerLeft.pan.setValueAtTime(-0.85, now);
        var pannerRight = ctx.createStereoPanner();
        pannerRight.pan.setValueAtTime(0.85, now);

        oscLeft.connect(pannerLeft);
        pannerLeft.connect(filterNode);

        oscRight.connect(pannerRight);
        pannerRight.connect(filterNode);
      } else {
        oscLeft.connect(filterNode);
        oscRight.connect(filterNode);
      }

      // Ambient Pink Noise Texture
      var noiseNode = null;
      try {
        noiseNode = ctx.createBufferSource();
        noiseNode.buffer = createPinkNoiseBuffer(ctx);
        noiseNode.loop = true;

        var noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.025, now);

        var noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(Math.min(2400, Math.max(150, baseFreq * 2)), now);
        noiseFilter.Q.setValueAtTime(1.5, now);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(voiceGain);
        noiseNode.start(now);
      } catch (e) {}

      // Routing to Voice Gain -> Analyser -> Destination
      filterNode.connect(voiceGain);
      voiceGain.connect(analyser);

      // Start Oscillators
      oscLeft.start(now);
      oscRight.start(now);
      oscSub.start(now);
      oscHarmonic.start(now);

      activeVoice = {
        ctx: ctx,
        gain: voiceGain,
        oscLeft: oscLeft,
        oscRight: oscRight,
        oscSub: oscSub,
        oscHarmonic: oscHarmonic,
        noiseNode: noiseNode
      };

      isPlaying = true;
      this._emitChange();
      return true;
    },

    /**
     * Stop playing with soft fade-out
     */
    stop: function(instant) {
      if (!isPlaying || !activeVoice) return;
      stopVoice(activeVoice, instant);
      activeVoice = null;
      isPlaying = false;
      this._emitChange();
    },

    /**
     * Toggle Play/Pause
     */
    toggle: function(key) {
      if (isPlaying) {
        if (key && key !== currentKey) {
          this.play(key);
        } else {
          this.stop(false);
        }
      } else {
        this.play(key || currentKey);
      }
    },

    setVolume: function(vol) {
      masterVolume = Math.max(0, Math.min(1, vol));
      if (activeVoice && activeVoice.gain && activeVoice.ctx) {
        try {
          var t = activeVoice.ctx.currentTime;
          activeVoice.gain.gain.cancelScheduledValues(t);
          activeVoice.gain.gain.setValueAtTime(activeVoice.gain.gain.value, t);
          activeVoice.gain.gain.linearRampToValueAtTime(masterVolume, t + 0.08);
        } catch(e) {}
      }
      this._emitChange();
    },

    setBinauralMode: function(mode) {
      binauralMode = mode;
      if (isPlaying) {
        this.play(currentKey); // Restart smoothly with new delta
      } else {
        this._emitChange();
      }
    },

    /**
     * Auto-tune to current planetary hour
     */
    autoTuneToPlanetaryHour: function() {
      if (typeof window !== 'undefined' && window.LunarisML && window.LunarisML.getCurrentPlanetaryHour) {
        var planet = window.LunarisML.getCurrentPlanetaryHour(new Date());
        if (FREQUENCIES[planet]) {
          this.play(planet);
          return planet;
        }
      }
      this.play('earth_om');
      return 'earth_om';
    },

    /**
     * Harmonic crystal chime for Tarot card reveals
     */
    playTarotChime: function() {
      var ctx = getAudioContext();
      if (!ctx) return;
      var now = ctx.currentTime;

      var chimeGain = ctx.createGain();
      chimeGain.gain.setValueAtTime(0.0001, now);
      chimeGain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      var chord = [528.0, 792.0, 1056.0, 1320.0]; // 528 Hz harmonic series
      chord.forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        osc.connect(chimeGain);
        osc.start(now + i * 0.04);
        osc.stop(now + 2.6);
      });

      chimeGain.connect(ctx.destination);
    },

    getAnalyserData: function() {
      if (!analyserNode || !isPlaying) return null;
      var dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(dataArray);
      return dataArray;
    },

    // UI Change Listener
    _listeners: [],
    subscribe: function(fn) {
      if (typeof fn === 'function') this._listeners.push(fn);
    },
    _emitChange: function() {
      var state = this.getState();
      this._listeners.forEach(function(fn) { fn(state); });
    }
  };

  /* ==========================================================
     AUTOMATIC UI CONTROLLER & VISUALIZER
     ========================================================== */

  var visualizerRunning = false;

  function getCurrentLang() {
    if (typeof window !== 'undefined' && window.state && window.state.lang) {
      return window.state.lang;
    }
    return 'tr';
  }

  function initCosmicAudioUI() {
    if (typeof document === 'undefined') return;

    // 1. Mount Floating Widget if not present
    if (!document.getElementById('cosmicAudioWidget')) {
      var widget = document.createElement('div');
      widget.id = 'cosmicAudioWidget';
      widget.className = 'cosmic-audio-widget';
      widget.setAttribute('title', 'Kozmik Frekans Terapisi (Web Audio API)');
      widget.onclick = function() { openCosmicAudioModal(); };
      widget.innerHTML = 
        '<div class="caw-btn"><span id="cawIcon">🎵</span></div>' +
        '<div class="caw-info">' +
          '<span class="caw-title" id="cawTitle">Kozmik Ses</span>' +
          '<span class="caw-freq" id="cawFreq">136.10 Hz (OM)</span>' +
        '</div>';
      document.body.appendChild(widget);
    }

    // 2. Mount Modal if not present
    if (!document.getElementById('cosmicAudioModal')) {
      var modal = document.createElement('div');
      modal.id = 'cosmicAudioModal';
      modal.className = 'modal-overlay';
      modal.style.display = 'none';
      modal.onclick = function(e) {
        if (e.target === modal) closeCosmicAudioModal();
      };

      modal.innerHTML = 
        '<div class="modal-box audio-modal-box">' +
          '<button class="modal-close" onclick="closeCosmicAudioModal()" aria-label="Kapat">×</button>' +
          '<div class="auth-modal-header">' +
            '<div class="auth-modal-icon"><span style="font-size:2rem;">🪐</span></div>' +
            '<h3 class="auth-modal-title">Kozmik Frekans Terapisi</h3>' +
            '<p class="auth-modal-sub">Hans Cousto Gezegensel Yörünge Frekansları &amp; Solfeggio Tonları</p>' +
          '</div>' +
          '<button class="audio-autotune-btn" onclick="autoTuneAudio()">' +
            '<span>✨</span> Günün Gezegensel Saati ile Otomatik Uyumla' +
          '</button>' +
          '<div class="audio-freq-grid" id="audioFreqGrid"></div>' +
          '<div class="audio-controls-row">' +
            '<div class="audio-binaural-selector" id="audioBinauralSelector">' +
              '<button class="ab-btn" data-mode="none" onclick="setAudioBinaural(\'none\')">Saf Ton</button>' +
              '<button class="ab-btn active" data-mode="theta" onclick="setAudioBinaural(\'theta\')">🌊 Theta (5.5Hz)</button>' +
              '<button class="ab-btn" data-mode="alpha" onclick="setAudioBinaural(\'alpha\')">⚡ Alpha (9.5Hz)</button>' +
            '</div>' +
            '<div class="audio-volume-wrap">' +
              '<span>🔊</span>' +
              '<input type="range" class="audio-vol-slider" min="0" max="1" step="0.05" value="0.45" oninput="setAudioVolume(this.value)">' +
            '</div>' +
          '</div>' +
          '<div class="audio-visualizer-wrap">' +
            '<canvas id="audioVisualizerCanvas" class="audio-visualizer-canvas"></canvas>' +
          '</div>' +
        '</div>';

      document.body.appendChild(modal);
    }

    renderFrequencyCards();

    // Subscribe to changes
    LunarisAudio.subscribe(function(state) {
      updateWidgetUI(state);
      updateModalUI(state);
      if (state.isPlaying && !visualizerRunning) {
        startVisualizer();
      }
    });

    updateWidgetUI(LunarisAudio.getState());
  }

  function renderFrequencyCards() {
    var grid = document.getElementById('audioFreqGrid');
    if (!grid) return;
    var lang = getCurrentLang();
    var state = LunarisAudio.getState();

    var html = '';
    var keys = Object.keys(FREQUENCIES);
    keys.forEach(function(k) {
      var f = FREQUENCIES[k];
      var isActive = state.isPlaying && state.currentKey === k;
      var name = f.name[lang] || f.name.tr;
      var desc = f.desc[lang] || f.desc.tr;

      html += 
        '<div class="audio-freq-card ' + (isActive ? 'active' : '') + '" onclick="toggleCosmicAudio(\'' + k + '\')" title="' + desc + '">' +
          '<div class="afc-glyph" style="color:' + f.color + '">' + f.glyph + '</div>' +
          '<div class="afc-body">' +
            '<span class="afc-name">' + name + '</span>' +
            '<span class="afc-hz">' + f.freq.toFixed(2) + ' Hz</span>' +
          '</div>' +
        '</div>';
    });

    grid.innerHTML = html;
  }

  function updateWidgetUI(state) {
    var widget = document.getElementById('cosmicAudioWidget');
    var icon = document.getElementById('cawIcon');
    var title = document.getElementById('cawTitle');
    var freq = document.getElementById('cawFreq');
    if (!widget || !icon || !title || !freq) return;

    var lang = getCurrentLang();
    var f = FREQUENCIES[state.currentKey] || FREQUENCIES.earth_om;
    var name = f.name[lang] || f.name.tr;

    if (state.isPlaying) {
      widget.classList.add('playing');
      icon.textContent = f.glyph || '🎵';
      title.textContent = name.split(' ')[0];
      freq.textContent = f.freq.toFixed(1) + ' Hz';
    } else {
      widget.classList.remove('playing');
      icon.textContent = '🎵';
      title.textContent = 'Kozmik Ses';
      freq.textContent = f.freq.toFixed(1) + ' Hz';
    }
  }

  function updateModalUI(state) {
    renderFrequencyCards();

    // Update Binaural buttons
    var bSelector = document.getElementById('audioBinauralSelector');
    if (bSelector) {
      var btns = bSelector.querySelectorAll('.ab-btn');
      btns.forEach(function(btn) {
        if (btn.getAttribute('data-mode') === state.binauralMode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  function startVisualizer() {
    var canvas = document.getElementById('audioVisualizerCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    visualizerRunning = true;

    function draw() {
      if (!LunarisAudio.getState().isPlaying) {
        visualizerRunning = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      requestAnimationFrame(draw);

      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      var data = LunarisAudio.getAnalyserData();
      var w = canvas.width;
      var h = canvas.height;

      ctx.fillStyle = 'rgba(12, 6, 22, 0.4)';
      ctx.fillRect(0, 0, w, h);

      if (!data) return;

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#D4AF6A';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#F2D07A';
      ctx.beginPath();

      var sliceWidth = w / data.length;
      var x = 0;

      for (var i = 0; i < data.length; i++) {
        var v = data[i] / 128.0;
        var y = (v * h) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    requestAnimationFrame(draw);
  }

  // Global UI functions
  global.openCosmicAudioModal = function() {
    var m = document.getElementById('cosmicAudioModal');
    if (m) {
      m.style.display = 'flex';
      renderFrequencyCards();
    }
  };

  global.closeCosmicAudioModal = function() {
    var m = document.getElementById('cosmicAudioModal');
    if (m) m.style.display = 'none';
  };

  global.toggleCosmicAudio = function(key) {
    LunarisAudio.toggle(key);
  };

  global.setAudioBinaural = function(mode) {
    LunarisAudio.setBinauralMode(mode);
  };

  global.setAudioVolume = function(vol) {
    LunarisAudio.setVolume(parseFloat(vol));
  };

  global.autoTuneAudio = function() {
    var chosen = LunarisAudio.autoTuneToPlanetaryHour();
    var lang = getCurrentLang();
    var f = FREQUENCIES[chosen];
    if (f && typeof showToast === 'function') {
      var name = f.name[lang] || f.name.tr;
      var toastTexts = {
        tr: 'Gezegen Saatiyle Uyumlandı: ',
        en: 'Aligned with Planetary Hour: ',
        ru: 'Синхронизировано с планетарным часом: '
      };
      showToast((toastTexts[lang] || toastTexts.tr) + name + ' (' + f.freq.toFixed(2) + ' Hz)');
    }
  };

  LunarisAudio.updateLanguage = function(lang) {
    lang = (lang === 'en' || lang === 'ru') ? lang : 'tr';
    var widget = document.getElementById('cosmicAudioWidget');
    if (widget) {
      var wTitles = {
        tr: 'Kozmik Frekans Terapisi (Web Audio API)',
        en: 'Cosmic Frequency Therapy (Web Audio API)',
        ru: 'Космическая частотная терапия (Web Audio API)'
      };
      widget.setAttribute('title', wTitles[lang] || wTitles.tr);
      var cawTitle = document.getElementById('cawTitle');
      if (cawTitle) {
        var cawTexts = { tr: 'Kozmik Ses', en: 'Cosmic Sound', ru: 'Космический звук' };
        cawTitle.textContent = cawTexts[lang] || cawTexts.tr;
      }
    }

    var modal = document.getElementById('cosmicAudioModal');
    if (modal) {
      var mTitle = modal.querySelector('.auth-modal-title');
      if (mTitle) {
        var mTitles = {
          tr: 'Kozmik Frekans Terapisi',
          en: 'Cosmic Frequency Therapy',
          ru: 'Космическая Частотная Терапия'
        };
        mTitle.textContent = mTitles[lang] || mTitles.tr;
      }
      var mSub = modal.querySelector('.auth-modal-sub');
      if (mSub) {
        var mSubs = {
          tr: 'Hans Cousto Gezegensel Yörünge Frekansları & Solfeggio Tonları',
          en: 'Hans Cousto Planetary Orbit Frequencies & Solfeggio Tones',
          ru: 'Частоты планетных орбит Ханса Кусто и тона Сольфеджио'
        };
        mSub.textContent = mSubs[lang] || mSubs.tr;
      }
      var autoBtn = modal.querySelector('.audio-autotune-btn');
      if (autoBtn) {
        var btnTexts = {
          tr: '<span>✨</span> Günün Gezegensel Saati ile Otomatik Uyumla',
          en: '<span>✨</span> Auto-Tune with Planetary Hour',
          ru: '<span>✨</span> Автонастройка по планетарному часу'
        };
        autoBtn.innerHTML = btnTexts[lang] || btnTexts.tr;
      }
      var btnNone = modal.querySelector('.ab-btn[data-mode="none"]');
      if (btnNone) {
        var noneTexts = { tr: 'Saf Ton', en: 'Pure Tone', ru: 'Чистый тон' };
        btnNone.textContent = noneTexts[lang] || noneTexts.tr;
      }
      var btnTheta = modal.querySelector('.ab-btn[data-mode="theta"]');
      if (btnTheta) {
        var thetaTexts = { tr: '🌊 Theta (5.5Hz)', en: '🌊 Theta (5.5Hz)', ru: '🌊 Тета (5.5Гц)' };
        btnTheta.textContent = thetaTexts[lang] || thetaTexts.tr;
      }
      var btnAlpha = modal.querySelector('.ab-btn[data-mode="alpha"]');
      if (btnAlpha) {
        var alphaTexts = { tr: '⚡ Alpha (9.5Hz)', en: '⚡ Alpha (9.5Hz)', ru: '⚡ Альфа (9.5Гц)' };
        btnAlpha.textContent = alphaTexts[lang] || alphaTexts.tr;
      }
    }

    renderFrequencyCards();
    updateWidgetUI(LunarisAudio.getState());
  };

  // Mount UI when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCosmicAudioUI);
    } else {
      initCosmicAudioUI();
    }
  }

  global.LunarisAudio = LunarisAudio;

})(typeof window !== 'undefined' ? window : global);
