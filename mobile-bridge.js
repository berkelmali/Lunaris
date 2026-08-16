/* ==========================================================
   LUNARIS — Mobile Bridge & Native Integration
   (Capacitor / Android / iOS / Web Native APIs)
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
          var ms = style === 'HEAVY' ? 40 : (style === 'MEDIUM' ? 25 : 15);
          navigator.vibrate(ms);
        }
      } catch (e) {
        // Sessizce yut
      }
    },

    hapticSuccess: function() {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
          window.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
        } else if (navigator && typeof navigator.vibrate === 'function') {
          navigator.vibrate([20, 50, 20]);
        }
      } catch (e) {}
    },

    /* 2. Status Bar Yapılandırması */
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
            var openModals = document.querySelectorAll('.modal.visible, .modal[style*="display: flex"], .modal[style*="display: block"]');
            if (openModals.length > 0) {
              openModals.forEach(function(m) {
                m.classList.remove('visible');
                m.style.display = 'none';
              });
            } else if (event.canGoBack) {
              window.history.back();
            } else {
              window.Capacitor.Plugins.App.exitApp();
            }
          });
        }
      } catch (e) {}
    },

    /* 5. Otomatik Başlatma */
    init: function() {
      var self = this;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          self.initStatusBar();
          self.initBackButton();
          setTimeout(function() { self.hideSplash(); }, 1200);
        });
      } else {
        self.initStatusBar();
        self.initBackButton();
        setTimeout(function() { self.hideSplash(); }, 1200);
      }
    }
  };

  MobileBridge.init();
  global.LunarisMobile = MobileBridge;

})(typeof window !== 'undefined' ? window : this);
