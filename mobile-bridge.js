/* ==========================================================
   LUNARIS — Mobile Bridge & Native App System
   (Capacitor / Android / iOS / Web Native APIs)
   - Bottom Tab Navigation
   - Native Haptic Touch Feedback
   - Android Back Button Handling
   - Smooth Section Transitions & Safe Area Management
   ========================================================== */

(function(global) {
  'use strict';

  var isNative = typeof window !== 'undefined' && 
                 window.Capacitor && 
                 typeof window.Capacitor.isNativePlatform === 'function' && 
                 window.Capacitor.isNativePlatform();

  var MobileBridge = {
    isNative: isNative,

    /* 1. Haptic Feedback (Titreşim) */
    hapticImpact: function(style) {
      style = style || 'LIGHT'; // LIGHT, MEDIUM, HEAVY
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
          window.Capacitor.Plugins.Haptics.impact({ style: style });
        } else if (navigator && typeof navigator.vibrate === 'function') {
          var ms = style === 'HEAVY' ? 35 : (style === 'MEDIUM' ? 20 : 10);
          navigator.vibrate(ms);
        }
      } catch (e) {}
    },

    hapticSuccess: function() {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
          window.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
        } else if (navigator && typeof navigator.vibrate === 'function') {
          navigator.vibrate([15, 40, 20]);
        }
      } catch (e) {}
    },

    /* 2. Status Bar & Nav Bar Yapılandırması */
    initStatusBar: function() {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
          var StatusBar = window.Capacitor.Plugins.StatusBar;
          StatusBar.setStyle({ style: 'DARK' });
          StatusBar.setBackgroundColor({ color: '#0B0714' });
          StatusBar.setOverlaysWebView({ overlay: false });
        }
      } catch (e) {
        console.warn('StatusBar init error:', e);
      }
    },

    /* 3. Splash Screen Kapatma */
    hideSplash: function() {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
          window.Capacitor.Plugins.SplashScreen.hide();
        }
      } catch (e) {}
    },

    /* 4. Android Geri Tuşu Yönetimi */
    initBackButton: function() {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
          window.Capacitor.Plugins.App.addListener('backButton', function(event) {
            // Açık modal var mı kontrol et
            var openModals = document.querySelectorAll('.modal-overlay:not([style*="display: none"]), .modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"], .modal.visible');
            if (openModals.length > 0) {
              openModals.forEach(function(m) {
                m.style.display = 'none';
                m.classList.remove('visible');
              });
              return;
            }

            // Ana sayfada değilse veya alt bölümde ise geri dön
            var pathname = window.location.pathname;
            if (!pathname.endsWith('index.html') && pathname !== '/' && pathname !== '') {
              window.location.href = 'index.html';
            } else if (window.scrollY > 300) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (event.canGoBack) {
              window.history.back();
            } else {
              window.Capacitor.Plugins.App.exitApp();
            }
          });
        }
      } catch (e) {}
    },

    /* 5. Otomatik Dokunmatik Titreşim Dinleyicisi */
    initTouchHaptics: function() {
      var self = this;
      document.addEventListener('pointerdown', function(e) {
        var target = e.target.closest('button, .card, .tarot-card-slot, .zodiac-card, .btn-primary, .mob-nav-item, .sec-chip, .account-btn, .lang-btn, .wish-star-btn');
        if (target) {
          self.hapticImpact('LIGHT');
        }
      }, { passive: true });
    },

    /* 6. Sabit Alt Menü Barı (Bottom Tab Bar) */
    labels: {
      tr: { home: "Ana Sayfa", tarot: "Tarot", horo: "Burçlar", tools: "Araçlar", comm: "Topluluk" },
      en: { home: "Home", tarot: "Tarot", horo: "Horoscope", tools: "Tools", comm: "Community" },
      ru: { home: "Главная", tarot: "Таро", horo: "Гороскоп", tools: "Инструменты", comm: "Сообщество" }
    },

    getLang: function() {
      try {
        if (window.state && window.state.lang) return window.state.lang;
        var saved = localStorage.getItem('lunaris_preferred_lang');
        if (saved && (saved === 'tr' || saved === 'en' || saved === 'ru')) return saved;
      } catch (e) {}
      return 'tr';
    },

    updateLabels: function() {
      var lang = this.getLang();
      var dict = this.labels[lang] || this.labels.tr;
      var elHome = document.querySelector('[data-target="hero"] .mob-nav-label');
      var elTarot = document.querySelector('[data-target="tarot"] .mob-nav-label');
      var elHoro = document.querySelector('[data-target="horoscope"] .mob-nav-label');
      var elTools = document.querySelector('[data-target="tools"] .mob-nav-label');
      var elComm = document.querySelector('[data-target="community"] .mob-nav-label');
      if (elHome) elHome.textContent = dict.home;
      if (elTarot) elTarot.textContent = dict.tarot;
      if (elHoro) elHoro.textContent = dict.horo;
      if (elTools) elTools.textContent = dict.tools;
      if (elComm) elComm.textContent = dict.comm;
    },

    initBottomNav: function() {
      var self = this;
      if (document.getElementById('mobileBottomNav')) return;

      var nav = document.createElement('nav');
      nav.id = 'mobileBottomNav';
      nav.className = 'mobile-bottom-nav';
      nav.setAttribute('aria-label', 'Mobil Ana Menü');

      var currentPath = window.location.pathname;
      var isTools = currentPath.indexOf('araclar.html') !== -1;
      var isBlog = currentPath.indexOf('blog.html') !== -1;
      var isIndex = !isTools && !isBlog;

      var lang = self.getLang();
      var dict = self.labels[lang] || self.labels.tr;

      nav.innerHTML = `
        <button class="mob-nav-item ${isIndex ? 'active' : ''}" data-target="hero" onclick="LunarisMobile.onNavClick('hero', event)">
          <div class="mob-nav-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <span class="mob-nav-label">${dict.home}</span>
        </button>

        <button class="mob-nav-item" data-target="tarot" onclick="LunarisMobile.onNavClick('tarot', event)">
          <div class="mob-nav-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="6" x2="12" y2="18"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
              <line x1="15" y1="9" x2="9" y2="15"></line>
            </svg>
          </div>
          <span class="mob-nav-label">${dict.tarot}</span>
        </button>

        <button class="mob-nav-item" data-target="horoscope" onclick="LunarisMobile.onNavClick('horoscope', event)">
          <div class="mob-nav-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <span class="mob-nav-label">${dict.horo}</span>
        </button>

        <button class="mob-nav-item ${isTools ? 'active' : ''}" data-target="tools" onclick="LunarisMobile.onNavClick('tools', event)">
          <div class="mob-nav-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="14.31" y1="8" x2="20.05" y2="17.94"></line>
              <line x1="9.69" y1="8" x2="21.17" y2="8"></line>
              <line x1="7.38" y1="12" x2="13.12" y2="2.06"></line>
              <line x1="9.69" y1="16" x2="3.95" y2="6.06"></line>
              <line x1="14.31" y1="16" x2="2.83" y2="16"></line>
              <line x1="16.62" y1="12" x2="10.88" y2="21.94"></line>
            </svg>
          </div>
          <span class="mob-nav-label">${dict.tools}</span>
        </button>

        <button class="mob-nav-item ${isBlog ? 'active' : ''}" data-target="community" onclick="LunarisMobile.onNavClick('community', event)">
          <div class="mob-nav-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </div>
          <span class="mob-nav-label">${dict.comm}</span>
        </button>
      `;

      document.body.appendChild(nav);
      self.initScrollSpy();
    },

    /* 7. Alt Menü Tıklama & Akıcı Geçiş */
    onNavClick: function(target, e) {
      if (e) e.preventDefault();
      this.hapticImpact('MEDIUM');

      var currentPath = window.location.pathname;
      var isTools = currentPath.indexOf('araclar.html') !== -1;
      var isBlog = currentPath.indexOf('blog.html') !== -1;
      var isIndex = !isTools && !isBlog;

      // Aktif sekme görseli
      document.querySelectorAll('.mob-nav-item').forEach(function(el) {
        el.classList.remove('active');
        if (el.getAttribute('data-target') === target) el.classList.add('active');
      });

      if (target === 'hero') {
        if (!isIndex) {
          window.location.href = 'index.html';
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (target === 'tarot') {
        if (!isIndex) {
          window.location.href = 'index.html#tarot';
        } else {
          var el = document.getElementById('tarot');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else if (target === 'horoscope') {
        if (!isIndex) {
          window.location.href = 'index.html#horoscope';
        } else {
          var el = document.getElementById('horoscope');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else if (target === 'tools') {
        if (!isTools) {
          window.location.href = 'araclar.html';
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (target === 'community') {
        if (!isIndex) {
          window.location.href = 'index.html#wall';
        } else {
          var el = document.getElementById('wall') || document.getElementById('wishfield');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },

    /* 8. Scroll Sırasında Aktif Sekmeyi Güncelleme (ScrollSpy) */
    initScrollSpy: function() {
      var currentPath = window.location.pathname;
      if (currentPath.indexOf('araclar.html') !== -1 || currentPath.indexOf('blog.html') !== -1) return;

      var sections = [
        { id: 'wall', target: 'community' },
        { id: 'wishfield', target: 'community' },
        { id: 'compat', target: 'horoscope' },
        { id: 'horoscope', target: 'horoscope' },
        { id: 'deepreading', target: 'tarot' },
        { id: 'tarot', target: 'tarot' },
        { id: 'features', target: 'hero' }
      ];

      var ticking = false;
      window.addEventListener('scroll', function() {
        if (!ticking) {
          window.requestAnimationFrame(function() {
            var scrollPos = window.scrollY + 200;
            if (window.scrollY < 300) {
              updateNavActive('hero');
              ticking = false;
              return;
            }
            for (var i = 0; i < sections.length; i++) {
              var el = document.getElementById(sections[i].id);
              if (el) {
                var top = el.offsetTop;
                var height = el.offsetHeight;
                if (scrollPos >= top && scrollPos < top + height) {
                  updateNavActive(sections[i].target);
                  break;
                }
              }
            }
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      function updateNavActive(targetName) {
        document.querySelectorAll('.mob-nav-item').forEach(function(el) {
          if (el.getAttribute('data-target') === targetName) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        });
      }
    },

    /* 9. Otomatik Başlatma */
    init: function() {
      var self = this;
      function start() {
        self.initStatusBar();
        self.initBackButton();
        self.initTouchHaptics();
        self.initBottomNav();
        setTimeout(function() { self.hideSplash(); }, 1000);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    }
  };

  MobileBridge.init();
  global.LunarisMobile = MobileBridge;

})(typeof window !== 'undefined' ? window : this);
