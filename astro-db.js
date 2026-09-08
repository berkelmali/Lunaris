/* ==========================================================
   LUNARIS — Cosmic Astro Database & Local Intelligence Layer
   (astro-db.js — v1.0)
   - Dual-layer storage: IndexedDB (fast, persistent, offline) + 
     localStorage fallback + Cloud Firestore synchronization.
   - Stores user natal profile, 12-house configurations,
     ephemeris cache, cosmic journal feedback, and personalized ML weights.
   ========================================================== */

(function(global) {
  'use strict';

  var DB_NAME = 'lunaris_astro_db';
  var DB_VERSION = 1;
  var STORES = {
    PROFILE: 'natal_profile',
    EPHEMERIS: 'ephemeris_cache',
    JOURNAL: 'cosmic_journal',
    WEIGHTS: 'learned_weights'
  };

  var _idb = null;
  var _memCache = {};

  var LunarisDB = {
    isReady: false,

    /**
     * Initializes IndexedDB with localStorage fallback
     */
    init: function() {
      var self = this;
      return new Promise(function(resolve) {
        if (typeof window === 'undefined' || !window.indexedDB) {
          self.isReady = true;
          return resolve(false);
        }

        try {
          var request = window.indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains(STORES.PROFILE)) {
              db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.EPHEMERIS)) {
              db.createObjectStore(STORES.EPHEMERIS, { keyPath: 'dateKey' });
            }
            if (!db.objectStoreNames.contains(STORES.JOURNAL)) {
              var jStore = db.createObjectStore(STORES.JOURNAL, { keyPath: 'id', autoIncrement: true });
              jStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORES.WEIGHTS)) {
              db.createObjectStore(STORES.WEIGHTS, { keyPath: 'key' });
            }
          };

          request.onsuccess = function(e) {
            _idb = e.target.result;
            self.isReady = true;
            console.log('🌌 LunarisDB: IndexedDB initialized successfully.');
            self.autoSyncCloud();
            resolve(true);
          };

          request.onerror = function() {
            self.isReady = true;
            console.warn('⚠️ LunarisDB: IndexedDB failed, falling back to LocalStorage.');
            resolve(false);
          };
        } catch (err) {
          self.isReady = true;
          resolve(false);
        }
      });
    },

    /* ─── 1. NATAL PROFILE ─── */
    saveNatalProfile: async function(profile) {
      if (!profile) return false;
      var record = Object.assign({ id: 'primary_user', updatedAt: Date.now() }, profile);
      _memCache.profile = record;

      // LocalStorage
      try {
        localStorage.setItem('lunaris_natal_profile', JSON.stringify(record));
      } catch (e) {}

      // IndexedDB
      if (_idb) {
        try {
          await new Promise(function(res, rej) {
            var tx = _idb.transaction(STORES.PROFILE, 'readwrite');
            var store = tx.objectStore(STORES.PROFILE);
            var req = store.put(record);
            req.onsuccess = function() { res(); };
            req.onerror = function() { rej(); };
          });
        } catch (e) {}
      }

      // Cloud Firestore (if logged in)
      this.syncProfileToCloud(record);
      return true;
    },

    getNatalProfile: async function() {
      if (_memCache.profile) return _memCache.profile;

      // Try IndexedDB first
      if (_idb) {
        try {
          var record = await new Promise(function(res) {
            var tx = _idb.transaction(STORES.PROFILE, 'readonly');
            var store = tx.objectStore(STORES.PROFILE);
            var req = store.get('primary_user');
            req.onsuccess = function() { res(req.result || null); };
            req.onerror = function() { res(null); };
          });
          if (record) {
            _memCache.profile = record;
            return record;
          }
        } catch (e) {}
      }

      // Fallback LocalStorage
      try {
        var raw = localStorage.getItem('lunaris_natal_profile');
        if (raw) {
          var parsed = JSON.parse(raw);
          _memCache.profile = parsed;
          return parsed;
        }
      } catch (e) {}

      return null;
    },

    // Aliases
    getUserProfile: function() {
      return this.getNatalProfile();
    },
    saveUserProfile: function(profile) {
      return this.saveNatalProfile(profile);
    },

    /* ─── 2. EPHEMERIS & TRANSIT CACHE ─── */
    saveEphemerisCache: async function(dateKey, data) {
      if (!dateKey || !data) return;
      var record = { dateKey: dateKey, data: data, savedAt: Date.now() };
      _memCache['eph_' + dateKey] = record;

      if (_idb) {
        try {
          var tx = _idb.transaction(STORES.EPHEMERIS, 'readwrite');
          tx.objectStore(STORES.EPHEMERIS).put(record);
        } catch (e) {}
      }
    },

    getEphemerisCache: async function(dateKey) {
      if (_memCache['eph_' + dateKey]) return _memCache['eph_' + dateKey].data;

      if (_idb) {
        try {
          var record = await new Promise(function(res) {
            var tx = _idb.transaction(STORES.EPHEMERIS, 'readonly');
            var req = tx.objectStore(STORES.EPHEMERIS).get(dateKey);
            req.onsuccess = function() { res(req.result || null); };
            req.onerror = function() { res(null); };
          });
          if (record && record.data) {
            _memCache['eph_' + dateKey] = record;
            return record.data;
          }
        } catch (e) {}
      }
      return null;
    },

    /* ─── 3. COSMIC JOURNAL & ML FEEDBACK ─── */
    saveJournalFeedback: async function(entry) {
      if (!entry) return false;
      var record = Object.assign({
        timestamp: Date.now(),
        dateStr: (new Date()).toISOString().split('T')[0]
      }, entry);

      // LocalStorage list
      try {
        var existing = JSON.parse(localStorage.getItem('lunaris_cosmic_journal') || '[]');
        existing.unshift(record);
        if (existing.length > 100) existing = existing.slice(0, 100);
        localStorage.setItem('lunaris_cosmic_journal', JSON.stringify(existing));
      } catch (e) {}

      // IndexedDB
      if (_idb) {
        try {
          var tx = _idb.transaction(STORES.JOURNAL, 'readwrite');
          tx.objectStore(STORES.JOURNAL).add(record);
        } catch (e) {}
      }

      // Cloud Firestore sync
      this.syncJournalToCloud(record);
      return true;
    },

    getRecentJournalFeedback: async function(limit) {
      limit = limit || 20;

      if (_idb) {
        try {
          var results = await new Promise(function(res) {
            var tx = _idb.transaction(STORES.JOURNAL, 'readonly');
            var store = tx.objectStore(STORES.JOURNAL);
            var index = store.index('timestamp');
            var req = index.openCursor(null, 'prev');
            var list = [];
            req.onsuccess = function(e) {
              var cursor = e.target.result;
              if (cursor && list.length < limit) {
                list.push(cursor.value);
                cursor.continue();
              } else {
                res(list);
              }
            };
            req.onerror = function() { res([]); };
          });
          if (results && results.length) return results;
        } catch (e) {}
      }

      try {
        var raw = JSON.parse(localStorage.getItem('lunaris_cosmic_journal') || '[]');
        return raw.slice(0, limit);
      } catch (e) {
        return [];
      }
    },

    /* ─── 4. LEARNED ML WEIGHTS ─── */
    savePersonalWeights: async function(weights) {
      if (!weights) return false;
      var record = { key: 'active_weights', weights: weights, updatedAt: Date.now() };
      _memCache.weights = weights;

      try {
        localStorage.setItem('lunaris_personal_weights', JSON.stringify(weights));
      } catch (e) {}

      if (_idb) {
        try {
          var tx = _idb.transaction(STORES.WEIGHTS, 'readwrite');
          tx.objectStore(STORES.WEIGHTS).put(record);
        } catch (e) {}
      }

      this.syncWeightsToCloud(weights);
      return true;
    },

    getPersonalWeights: async function() {
      if (_memCache.weights) return _memCache.weights;

      if (_idb) {
        try {
          var record = await new Promise(function(res) {
            var tx = _idb.transaction(STORES.WEIGHTS, 'readonly');
            var req = tx.objectStore(STORES.WEIGHTS).get('active_weights');
            req.onsuccess = function() { res(req.result || null); };
            req.onerror = function() { res(null); };
          });
          if (record && record.weights) {
            _memCache.weights = record.weights;
            return record.weights;
          }
        } catch (e) {}
      }

      try {
        var raw = localStorage.getItem('lunaris_personal_weights');
        if (raw) {
          var parsed = JSON.parse(raw);
          _memCache.weights = parsed;
          return parsed;
        }
      } catch (e) {}

      return null;
    },

    /* ─── 5. CLOUD FIRESTORE SYNCHRONIZATION ─── */
    syncProfileToCloud: function(profile) {
      if (typeof window !== 'undefined' && window.LunarisAuth && typeof window.LunarisAuth.isLoggedIn === 'function' && window.LunarisAuth.isLoggedIn()) {
        try {
          var user = window.LunarisAuth.getUser();
          if (user && user.uid && window.LunarisAuth._db) {
            var docRef = window.LunarisAuth._db.collection('users').doc(user.uid);
            docRef.set({ astro_profile: profile, astro_updated_at: Date.now() }, { merge: true }).catch(function(){});
          }
        } catch (e) {}
      }
    },

    syncJournalToCloud: function(entry) {
      if (typeof window !== 'undefined' && window.LunarisAuth && typeof window.LunarisAuth.isLoggedIn === 'function' && window.LunarisAuth.isLoggedIn()) {
        try {
          var user = window.LunarisAuth.getUser();
          if (user && user.uid && window.LunarisAuth._db) {
            window.LunarisAuth._db.collection('users').doc(user.uid).collection('cosmic_journal').add(entry).catch(function(){});
          }
        } catch (e) {}
      }
    },

    syncWeightsToCloud: function(weights) {
      if (typeof window !== 'undefined' && window.LunarisAuth && typeof window.LunarisAuth.isLoggedIn === 'function' && window.LunarisAuth.isLoggedIn()) {
        try {
          var user = window.LunarisAuth.getUser();
          if (user && user.uid && window.LunarisAuth._db) {
            window.LunarisAuth._db.collection('users').doc(user.uid).collection('ml_intelligence').doc('weights').set({
              weights: weights,
              updatedAt: Date.now()
            }).catch(function(){});
          }
        } catch (e) {}
      }
    },

    autoSyncCloud: async function() {
      var self = this;
      if (typeof window !== 'undefined' && window.LunarisAuth && typeof window.LunarisAuth.isLoggedIn === 'function' && window.LunarisAuth.isLoggedIn()) {
        try {
          var user = window.LunarisAuth.getUser();
          if (user && user.uid && window.LunarisAuth._db) {
            // Load remote profile if local is empty
            var localProfile = await self.getNatalProfile();
            if (!localProfile) {
              var doc = await window.LunarisAuth._db.collection('users').doc(user.uid).get();
              if (doc.exists && doc.data().astro_profile) {
                await self.saveNatalProfile(doc.data().astro_profile);
              }
            }
          }
        } catch (e) {}
      }
    }
  };

  // Auto-init on script load
  LunarisDB.init();

  global.LunarisDB = LunarisDB;

})(typeof window !== 'undefined' ? window : global);
