/* ============================================================
   LUNARIS — Merkezi Firebase Yapılandırma ve Servis Modülü
   (firebase-config.js)
   
   Bu dosya index.html, araclar.html ve blog.html tarafından
   ortaklaşa kullanılır.
   
   Firebase Projenizi Bağlamak İçin:
   1. https://console.firebase.google.com/ adresine gidin.
   2. Bir proje oluşturun ve Web uygulaması ekleyin.
   3. "Authentication" (E-posta/Şifre ve Google) ve "Firestore Database"i aktif edin.
   4. Aşağıdaki `firebaseConfig` nesnesine kendi bilgilerinizi yapıştırın.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where,
  orderBy, 
  limit, 
  getDocs, 
  onSnapshot,
  deleteDoc,
  serverTimestamp, 
  doc, 
  getDoc,
  setDoc,
  updateDoc, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// ============================================================
// 1. FIREBASE PROJE BİLGİLERİ (env.js dosyasından yüklenir)
// ============================================================
import ENV from "./env.js";

export const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID,
  measurementId: ENV.FIREBASE_MEASUREMENT_ID
};

// Yapılandırma geçerli mi kontrolü
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey.indexOf("BURAYA_") === -1 &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId.indexOf("BURAYA_") === -1
  );
}

// ============================================================
// 2. FIREBASE BAŞLATMA & SERVİSLER
// ============================================================
let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let currentUser = null;
let isReady = false;

// Demo/Yerel Mod ve Dil için Hafıza Anahtarları
const LOCAL_STORAGE_KEY_USER = "lunaris_local_user";
const LOCAL_STORAGE_ACTIVE_USER = "lunaris_active_user";
const LOCAL_STORAGE_KEY_READINGS = "lunaris_local_readings";
const LOCAL_STORAGE_KEY_HOROSCOPES = "lunaris_local_horoscopes";
const LOCAL_STORAGE_KEY_WALL = "lunaris_local_wall";
const PREFERRED_LANG_KEY = "lunaris_preferred_lang";

// Güvenli yerel kullanıcı oturumu okuma & yazma
function getStoredUser() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVE_USER) || localStorage.getItem(LOCAL_STORAGE_KEY_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveStoredUser(userObj) {
  if (!userObj) {
    try {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_USER);
      localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
    } catch(e){}
    return;
  }
  const clean = {
    uid: userObj.uid,
    email: userObj.email || "",
    displayName: userObj.displayName || userObj.username || (userObj.email ? userObj.email.split("@")[0] : "Kozmik Gezgin"),
    username: userObj.username || userObj.displayName || (userObj.email ? userObj.email.split("@")[0] : "Kozmik Gezgin"),
    photoURL: userObj.photoURL || null,
    isDemo: Boolean(userObj.isDemo),
    preferredLang: userObj.preferredLang || localStorage.getItem(PREFERRED_LANG_KEY) || "tr"
  };
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_USER, JSON.stringify(clean));
    if (clean.isDemo) {
      localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(clean));
    }
  } catch (e) {}
}

// Başlangıçta kayıtlı oturumu hafızadan hemen yükle (F5 anında sıfır bekleme)
currentUser = getStoredUser();

// Kullanıcı dil ve profil senkronizasyonu
async function syncUserLanguagePreference(user) {
  if (!user) return;
  const localLang = localStorage.getItem(PREFERRED_LANG_KEY) || "tr";

  if (isReady && !user.isDemo) {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        let changed = false;
        if (data.username && currentUser) {
          currentUser.username = data.username;
          currentUser.displayName = data.username;
          changed = true;
        }
        if (data.photoURL && currentUser) {
          currentUser.photoURL = data.photoURL;
          changed = true;
          try { localStorage.setItem("lunaris_user_photo_" + user.uid, data.photoURL); } catch(e){}
        }
        if (changed) {
          saveStoredUser(currentUser);
          if (typeof window.updateAccountUI === "function") {
            window.updateAccountUI(currentUser);
          }
        }
        if (data.preferredLang && data.preferredLang !== localLang) {
          localStorage.setItem(PREFERRED_LANG_KEY, data.preferredLang);
          if (typeof window.setLang === "function") {
            window.setLang(data.preferredLang);
          } else if (typeof window.applyLangToDOM === "function") {
            window.applyLangToDOM(data.preferredLang);
          }
          return;
        }
      }
      await setDoc(userRef, { 
        preferredLang: localLang, 
        email: user.email || (currentUser && currentUser.email) || "",
        displayName: (currentUser && currentUser.displayName) || user.displayName || user.email?.split("@")[0] || "Gezgin",
        photoURL: (currentUser && currentUser.photoURL) || user.photoURL || null
      }, { merge: true });
    } catch (e) {
      console.warn("Dil tercihi senkronizasyonu hatası:", e);
    }
  } else if (user.isDemo) {
    if (user.preferredLang && user.preferredLang !== localLang) {
      localStorage.setItem(PREFERRED_LANG_KEY, user.preferredLang);
      if (typeof window.setLang === "function") {
        window.setLang(user.preferredLang);
      }
    } else {
      user.preferredLang = localLang;
      saveStoredUser(user);
    }
  }
}

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    isReady = true;

    // Hemen başlangıçta arayüzü hafızadaki kullanıcı ile güncelle
    if (currentUser && typeof window.updateAccountUI === "function") {
      window.updateAccountUI(currentUser);
    }

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const cachedUser = getStoredUser();
        const cachedPhoto = (cachedUser && cachedUser.uid === user.uid && cachedUser.photoURL) || localStorage.getItem("lunaris_user_photo_" + user.uid) || null;
        const cachedName = (cachedUser && cachedUser.uid === user.uid && (cachedUser.displayName || cachedUser.username)) || null;
        
        const cleanUser = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || cachedName || (user.email ? user.email.split("@")[0] : "Kozmik Gezgin"),
          username: cachedName || user.displayName || (user.email ? user.email.split("@")[0] : "Kozmik Gezgin"),
          photoURL: user.photoURL || cachedPhoto || null,
          isDemo: false,
          preferredLang: (cachedUser && cachedUser.preferredLang) || localStorage.getItem(PREFERRED_LANG_KEY) || "tr"
        };
        currentUser = cleanUser;
        saveStoredUser(cleanUser);

        if (typeof window.updateAccountUI === "function") {
          window.updateAccountUI(currentUser);
        }

        await syncUserLanguagePreference(user);
        if (typeof window.updateAccountUI === "function") {
          window.updateAccountUI(currentUser);
        }
        if (typeof window.refreshUserReadings === "function") {
          window.refreshUserReadings();
        }
        if (typeof window.refreshUserHoroscopes === "function") {
          window.refreshUserHoroscopes();
        }
      } else {
        // Firebase kullanıcısı o an null gelse bile (ağ gecikmesi / yerel hesap):
        // Yerel hafızada aktif oturum varsa bunu koru; sadece LunarisAuth.logout() ile sıfırlanır
        const stored = getStoredUser();
        if (stored) {
          currentUser = stored;
          if (typeof window.updateAccountUI === "function") {
            window.updateAccountUI(currentUser);
          }
        } else {
          currentUser = null;
          saveStoredUser(null);
          if (typeof window.updateAccountUI === "function") {
            window.updateAccountUI(null);
          }
        }
      }
    });
    console.log("✨ Lunaris: Firebase bağlantısı başarıyla kuruldu.");
  } catch (error) {
    console.warn("⚠️ Lunaris: Firebase başlatılırken hata oluştu:", error);
  }
} else {
  console.info("🌌 Lunaris: Firebase henüz yapılandırılmadı. Demo/Yerel mod aktif.");
  if (currentUser && typeof window.updateAccountUI === "function") {
    window.updateAccountUI(currentUser);
    syncUserLanguagePreference(currentUser);
  }
}

// ============================================================
// 3. AUTH SERVİSİ
// ============================================================
export const LunarisAuth = {
  isConfigured: () => isReady,
  isLoggedIn: () => Boolean(currentUser || getStoredUser()),
  getUser: () => currentUser || getStoredUser(),
  isDemoUser: () => Boolean((currentUser && currentUser.isDemo) || (getStoredUser() && getStoredUser().isDemo)),

  // Dil Tercihini Kaydetme
  setPreferredLang: async (lang) => {
    try {
      localStorage.setItem(PREFERRED_LANG_KEY, lang);
      if (currentUser) {
        currentUser.preferredLang = lang;
        saveStoredUser(currentUser);
        if (isReady && !currentUser.isDemo && auth && auth.currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, { preferredLang: lang }, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Dil tercihi kaydedilemedi:", e);
    }
  },

  getPreferredLang: () => {
    return (currentUser && currentUser.preferredLang) || localStorage.getItem(PREFERRED_LANG_KEY) || "tr";
  },

  // Profil Fotoğrafı Güvenlik Doğrulaması (XSS & SVG Engelleme)
  isSafePhotoURL: (url) => {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim().toLowerCase();
    // HTTPS URL'ler
    if (trimmed.startsWith("https://") || trimmed.startsWith("http://localhost")) {
      return url.length <= 2048 && !trimmed.includes("javascript:") && !trimmed.includes("<");
    }
    // Sadece güvenli raster görsel MIME tipleri (SVG hariç tutulur - XSS engeli)
    if (trimmed.startsWith("data:image/jpeg;") || 
        trimmed.startsWith("data:image/png;") || 
        trimmed.startsWith("data:image/webp;") || 
        trimmed.startsWith("data:image/gif;")) {
      return url.length <= 1500000 && !trimmed.includes("script") && !trimmed.includes("<");
    }
    return false;
  },

  // Profil Fotoğrafı Güncelleme (Base64 / URL / Mistik İkon)
  updateProfilePicture: async (photoURL) => {
    if (!currentUser) return false;
    if (photoURL && !LunarisAuth.isSafePhotoURL(photoURL)) {
      console.warn("Geçersiz veya güvensiz fotoğraf URL formatı!");
      return false;
    }
    try {
      currentUser.photoURL = photoURL;
      saveStoredUser(currentUser);

      // 1. Yerel hafıza güncellemesi
      try {
        localStorage.setItem("lunaris_user_photo_" + currentUser.uid, photoURL || "");
      } catch(e){}

      // 2. Arayüzü anında güncelle
      if (typeof window.updateAccountUI === "function") {
        window.updateAccountUI(currentUser);
      }

      // 3. Firebase senkronizasyonu
      if (isReady && !currentUser.isDemo && auth && auth.currentUser) {
        if (photoURL && photoURL.startsWith("https://")) {
          try {
            await updateProfile(auth.currentUser, { photoURL });
          } catch (authErr) {
            console.warn("Auth photoURL uyarısı:", authErr);
          }
        }
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, { photoURL }, { merge: true });
        } catch (dbErr) {
          console.warn("Firestore photoURL kaydı uyarısı:", dbErr);
        }
      }
      return true;
    } catch (e) {
      console.warn("Profil fotoğrafı güncellenemedi:", e);
      if (typeof window.updateAccountUI === "function") {
        window.updateAccountUI(currentUser);
      }
      return true;
    }
  },

  // Kullanıcı Adı, E-posta & Şifre ile Kayıt
  signup: async (username, email, password) => {
    const currentLang = localStorage.getItem(PREFERRED_LANG_KEY) || "tr";
    const cleanUsername = (username || "").trim();
    if (!cleanUsername) {
      return Promise.reject({ code: "auth/empty-username" });
    }

    if (!isReady) {
      return LunarisAuth.signupDemo(cleanUsername, email, password);
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    try {
      await updateProfile(fbUser, { displayName: cleanUsername });
    } catch (err) {
      console.warn("Profil adı güncellenemedi:", err);
    }

    const cleanUser = {
      uid: fbUser.uid,
      email: email,
      displayName: cleanUsername,
      username: cleanUsername,
      photoURL: null,
      isDemo: false,
      preferredLang: currentLang
    };
    currentUser = cleanUser;
    saveStoredUser(cleanUser);

    if (typeof window.updateAccountUI === "function") {
      window.updateAccountUI(cleanUser);
    }

    try {
      const userRef = doc(db, "users", fbUser.uid);
      await setDoc(userRef, { 
        username: cleanUsername,
        displayName: cleanUsername,
        email: email, 
        preferredLang: currentLang,
        createdAt: serverTimestamp() 
      }, { merge: true });
    } catch (e) {}

    return cleanUser;
  },

  // E-posta & Şifre ile Giriş
  login: async (email, password) => {
    if (!isReady) {
      return LunarisAuth.loginDemo(email, password);
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;
    
    let photo = localStorage.getItem("lunaris_user_photo_" + fbUser.uid) || fbUser.photoURL || null;
    let name = fbUser.displayName || email.split("@")[0];

    try {
      const userRef = doc(db, "users", fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const d = snap.data();
        if (d.username) name = d.username;
        if (d.photoURL) photo = d.photoURL;
      }
    } catch(e){}

    const cleanUser = {
      uid: fbUser.uid,
      email: fbUser.email || email,
      displayName: name,
      username: name,
      photoURL: photo,
      isDemo: false,
      preferredLang: localStorage.getItem(PREFERRED_LANG_KEY) || "tr"
    };
    currentUser = cleanUser;
    saveStoredUser(cleanUser);

    if (typeof window.updateAccountUI === "function") {
      window.updateAccountUI(cleanUser);
    }

    syncUserLanguagePreference(fbUser).catch(() => {});
    return cleanUser;
  },

  // Google ile Giriş
  loginWithGoogle: async () => {
    if (!isReady) {
      return LunarisAuth.loginDemo("yildiz.gezgin@gmail.com", "demo123", "YıldızGezgini");
    }
    const result = await signInWithPopup(auth, googleProvider);
    if (result && result.user) {
      const fbUser = result.user;
      const cleanName = fbUser.displayName || fbUser.email?.split("@")[0] || "Gezgin";
      const cleanUser = {
        uid: fbUser.uid,
        email: fbUser.email || "",
        displayName: cleanName,
        username: cleanName,
        photoURL: fbUser.photoURL || null,
        isDemo: false,
        preferredLang: localStorage.getItem(PREFERRED_LANG_KEY) || "tr"
      };
      currentUser = cleanUser;
      saveStoredUser(cleanUser);

      if (typeof window.updateAccountUI === "function") {
        window.updateAccountUI(cleanUser);
      }

      try {
        const userRef = doc(db, "users", fbUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            username: cleanName,
            displayName: cleanName,
            email: fbUser.email,
            photoURL: fbUser.photoURL || null,
            preferredLang: localStorage.getItem(PREFERRED_LANG_KEY) || "tr",
            createdAt: serverTimestamp()
          }, { merge: true });
        }
      } catch(e) {
        console.warn("Google profili kaydedilemedi:", e);
      }

      syncUserLanguagePreference(fbUser).catch(() => {});
      return cleanUser;
    }
  },

  // Şifre Sıfırlama E-postası Gönderme
  resetPassword: async (email) => {
    if (!isReady) {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ demo: true }), 500);
      });
    }
    return sendPasswordResetEmail(auth, email);
  },

  // Çıkış Yapma (Her durumda anında ve eksiksiz temizleme)
  logout: async () => {
    try {
      if (isReady && auth && auth.currentUser) {
        await signOut(auth);
      }
    } catch(e) {
      console.warn("SignOut uyarısı:", e);
    }
    currentUser = null;
    saveStoredUser(null);
    if (typeof window.updateAccountUI === "function") {
      window.updateAccountUI(null);
    }
    return true;
  },

  // ---- DEMO / YEREL HESAP MODU DESTEĞİ ----
  signupDemo: (username, email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanName = (username || "").trim();
        if (!cleanName) {
          return reject({ code: "auth/empty-username" });
        }
        if (!email || !email.includes("@")) {
          return reject({ code: "auth/invalid-email" });
        }
        if (!password || password.length < 6) {
          return reject({ code: "auth/weak-password" });
        }
        const currentLang = localStorage.getItem(PREFERRED_LANG_KEY) || "tr";
        const demoUser = {
          uid: "demo_" + Date.now(),
          username: cleanName,
          displayName: cleanName,
          email: email,
          isDemo: true,
          preferredLang: currentLang,
          photoURL: null
        };
        currentUser = demoUser;
        saveStoredUser(demoUser);
        if (typeof window.updateAccountUI === "function") {
          window.updateAccountUI(demoUser);
        }
        resolve(demoUser);
      }, 250);
    });
  },

  loginDemo: (email, password, customName = "") => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!email || !email.includes("@")) {
          return reject({ code: "auth/invalid-email" });
        }
        if (!password || password.length < 4) {
          return reject({ code: "auth/wrong-password" });
        }
        const name = customName || email.split("@")[0];
        const currentLang = localStorage.getItem(PREFERRED_LANG_KEY) || "tr";
        const demoUser = {
          uid: "demo_" + Math.abs(email.split("").reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)),
          username: name,
          displayName: name,
          email: email,
          isDemo: true,
          preferredLang: currentLang,
          photoURL: null
        };
        currentUser = demoUser;
        saveStoredUser(demoUser);
        if (typeof window.updateAccountUI === "function") {
          window.updateAccountUI(demoUser);
        }
        resolve(demoUser);
      }, 250);
    });
  },

  // 1. Tarot Falı Kaydetme
  saveReading: async (cardKeys, comboText, lang = "tr") => {
    if (!currentUser) return null;

    const readingData = {
      cards: cardKeys,
      comboText: comboText,
      lang: lang,
      createdAt: new Date().toISOString()
    };

    // Her zaman yerel hafızaya hemen kaydet (Asla kaybolmaması için)
    try {
      const key = LOCAL_STORAGE_KEY_READINGS + "_" + currentUser.uid;
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift({ id: "local_t_" + Date.now(), ...readingData, createdAt: new Date() });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch (err) {
      console.warn("Yerel fal kaydı hatası:", err);
    }

    if (isReady && !currentUser.isDemo) {
      try {
        const ref = collection(db, "users", currentUser.uid, "readings");
        const docRef = await addDoc(ref, {
          ...readingData,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      } catch (e) {
        console.warn("Firestore fal kaydı uyarısı (Firestore kurallarınızı kontrol edin):", e);
      }
    }
    return "saved";
  },

  // Geçmiş Tarot Fallarını Getirme
  loadReadings: async () => {
    if (!currentUser) return [];

    let localItems = [];
    try {
      const key = LOCAL_STORAGE_KEY_READINGS + "_" + currentUser.uid;
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      localItems = list.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));
    } catch (e) {
      localItems = [];
    }

    if (isReady && !currentUser.isDemo) {
      try {
        const ref = collection(db, "users", currentUser.uid, "readings");
        const q = query(ref, orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const out = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            let dateObj = new Date();
            if (data.createdAt && typeof data.createdAt.toDate === "function") {
              dateObj = data.createdAt.toDate();
            }
            out.push({ id: docSnap.id, ...data, createdAt: dateObj });
          });
          return out;
        }
      } catch (e) {
        console.warn("Firestore tarot geçmişi okunamadı (Yerel kayıtlar gösteriliyor):", e);
      }
    }
    return localItems;
  },

  // 2. Günlük Burç Yorumunu Kaydetme
  saveHoroscope: async (horoData) => {
    if (!currentUser) return null;

    const payload = {
      ...horoData,
      createdAt: new Date().toISOString()
    };

    // Her zaman yerel hafızaya hemen kaydet
    try {
      const key = LOCAL_STORAGE_KEY_HOROSCOPES + "_" + currentUser.uid;
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift({ id: "local_h_" + Date.now(), ...payload, createdAt: new Date() });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch (err) {
      console.warn("Yerel burç kaydı hatası:", err);
    }

    if (isReady && !currentUser.isDemo) {
      try {
        const ref = collection(db, "users", currentUser.uid, "horoscopes");
        const docRef = await addDoc(ref, {
          ...payload,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      } catch (e) {
        console.warn("Firestore burç kaydı uyarısı (Firestore kurallarınızı kontrol edin):", e);
      }
    }
    return "saved";
  },

  // Kaydedilen Burç Yorumlarını Getirme
  loadHoroscopes: async () => {
    if (!currentUser) return [];

    let localItems = [];
    try {
      const key = LOCAL_STORAGE_KEY_HOROSCOPES + "_" + currentUser.uid;
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      localItems = list.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }));
    } catch (e) {
      localItems = [];
    }

    if (isReady && !currentUser.isDemo) {
      try {
        const ref = collection(db, "users", currentUser.uid, "horoscopes");
        const q = query(ref, orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const out = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            let dateObj = new Date();
            if (data.createdAt && typeof data.createdAt.toDate === "function") {
              dateObj = data.createdAt.toDate();
            }
            out.push({ id: docSnap.id, ...data, createdAt: dateObj });
          });
          return out;
        }
      } catch (e) {
        console.warn("Firestore burç geçmişi okunamadı (Yerel kayıtlar gösteriliyor):", e);
      }
    }
    return localItems;
  }
};

// ============================================================
// 4. TOPLULUK DUVARI (TWITTER/X TARZI CANLI KOZMİK AKIŞ)
// ============================================================
// ============================================================
// 4. TOPLULUK DUVARI (FACEBOOK / X BENZERİ CANLI KOZMİK SOSYAL AKIŞ)
// ============================================================
const WALL_CHANNEL_NAME = "lunaris_wall_sync_v2";
let wallBroadcastChannel = null;
try {
  if (typeof window !== "undefined" && typeof window.BroadcastChannel === "function") {
    wallBroadcastChannel = new BroadcastChannel(WALL_CHANNEL_NAME);
  }
} catch (e) {}

// Test mesajlarını temizleyen filtre fonksiyonu
function isCleanPost(post) {
  if (!post || !post.text) return false;
  const t = (post.text + " " + (post.name || "") + " " + (post.handle || "")).toLowerCase();
  return !t.includes("test message") && 
         !t.includes("hello world") && 
         !t.includes("test from node") && 
         !t.includes("test_user") &&
         !t.includes("xss_test") &&
         !t.includes("<script") &&
         !t.includes("alert(") &&
         !t.includes("onerror=") &&
         !t.includes("bağlantı kopması") &&
         !t.includes("canlı yayın testi");
}

export const LunarisWall = {
  isConfigured: () => true, // API sunucusu veya Firebase ile daima aktiftir

  // Hoş ve ilham verici varsayılan topluluk paylaşımları (Test mesajı içermez)
  getSeedPosts: () => [
    {
      id: "seed_aylin_1",
      name: "Aylin Yıldız",
      handle: "aylin.yildiz",
      authorUid: "seed_aylin",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Aylin",
      text: "Bu geceki Hilal enerjisiyle Tarot açılımımda 'Yıldız' kartını çektim. İçimdeki tüm şüpheler yerini derin bir huzura bıraktı. Herkesin dilekleri evrene ulaşsın ✨🌙",
      mood: "starry",
      likes: 34,
      comments: [
        {
          id: "c_1_1",
          name: "Mert K.",
          text: "Yıldız kartı daima umudun ve yenilenmenin habercisidir, enerjin harika!",
          createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 35)
    },
    {
      id: "seed_mert_2",
      name: "Mert K.",
      handle: "mert.astro",
      authorUid: "seed_mert",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Mert",
      text: "Jüpiter Boğa geçişi hayatımda yeni kapılar aralıyor! Sabırla ektiğimiz niyet tohumları filizlenmeye başladı, içinizdeki ışığa güvenin 🍀🪐",
      mood: "lucky",
      likes: 27,
      comments: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 95)
    },
    {
      id: "seed_selin_3",
      name: "Selin Doğan",
      handle: "selin.mistik",
      authorUid: "seed_selin",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Selin",
      text: "Venüs ve Ay uyumu ruhumuzu sıcacık yapıyor. Sevgi paylaştıkça çoğalan tek kozmik enerjidir, bugün birine sebepsizce güzel bir enerji yollayın 💜🔮",
      mood: "loved",
      likes: 42,
      comments: [
        {
          id: "c_3_1",
          name: "Aylin Yıldız",
          text: "Tüm sevgimiz evrene yayılsın ✨",
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 180)
    },
    {
      id: "seed_kaan_4",
      name: "Kaan Çelik",
      handle: "kaan.kozmik",
      authorUid: "seed_kaan",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Kaan",
      text: "12. evdeki sezgisel döngü rüyalarımı inanılmaz berraklaştırdı. Gece fısıltılarını günlüğüme not ettim, evrenin rehberliği harika 🌌✨",
      mood: "dreamy",
      likes: 19,
      comments: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 300)
    },
    {
      id: "seed_elif_5",
      name: "Elif Nur",
      handle: "elif.tarot",
      authorUid: "seed_elif",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Elif",
      text: "Kupa Kraliçesi rehberliğinde şefkat ve dinginlik dolu bir gün. Kalbinizin sesini dinlediğinizde her yol aydınlanıyor 🕊️🕯️",
      mood: "starry",
      likes: 38,
      comments: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 500)
    },
    {
      id: "seed_can_6",
      name: "Can Berk",
      handle: "can.orion",
      authorUid: "seed_can",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Can",
      text: "Bugün tüm kozmik yolculara bereket ve ilham diliyorum! Haritanızdaki potansiyeli keşfettikçe hayatın ritmi değişiyor ☀️⚡",
      mood: "lucky",
      likes: 25,
      comments: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 750)
    }
  ],

  getSeedAndLocalMessages: () => {
    let localPosts = [];
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
      localPosts = local
        .filter(isCleanPost)
        .map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt)
        }));
      // Eski test mesajlarını yerel hafızadan da kalıcı olarak sil
      if (local.length !== localPosts.length) {
        localStorage.setItem(LOCAL_STORAGE_KEY_WALL, JSON.stringify(localPosts));
      }
    } catch (e) {}

    const seedPosts = LunarisWall.getSeedPosts();
    const map = new Map();
    localPosts.forEach(p => map.set(p.id, p));
    seedPosts.forEach(p => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    const merged = Array.from(map.values());
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return merged;
  },

  // Yeni Gönderi Paylaşma (Facebook tarzı: Diğer tüm kullanıcıların anında görebileceği şekilde sunucuya & Firestore'a yayar)
  postMessage: async (text, mood = "starry") => {
    const user = currentUser || getStoredUser();
    const authorName = ((user && (user.displayName || user.username)) || (user && user.email ? user.email.split("@")[0] : "Kozmik Gezgin")).trim();
    const rawHandle = ((user && (user.username || user.displayName)) || (user && user.email ? user.email.split("@")[0] : "gezgin")).toLowerCase().replace(/[^a-z0-9._]/g, "");
    const authorHandle = rawHandle || "gezgin";
    
    let photoURL = (user && user.photoURL) || null;
    if (!photoURL && user && user.uid) {
      try { photoURL = localStorage.getItem("lunaris_user_photo_" + user.uid) || null; } catch(e){}
    }
    if (!photoURL) {
      photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorName)}`;
    }

    const postData = {
      name: authorName,
      handle: authorHandle,
      authorUid: (user && user.uid) || ("guest_" + Date.now()),
      photoURL: photoURL,
      text: text.trim(),
      mood: mood,
      likes: 0,
      comments: []
    };

    let createdPost = null;

    // 1. Ortak Sunucu API'sine POST isteği gönder (Diğer tarayıcılar ve cihazlar görsün)
    try {
      const resp = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData)
      });
      if (resp.ok) {
        const resData = await resp.json();
        if (resData && resData.post) {
          createdPost = resData.post;
        }
      }
    } catch (apiErr) {
      // Çevrimdışı / doğrudan statik dosya modunda devam et
    }

    if (!createdPost) {
      createdPost = {
        id: "local_msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        ...postData,
        createdAt: new Date().toISOString()
      };
    }

    // 2. Yerel hafızaya kaydet
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]").filter(isCleanPost);
      list.unshift(createdPost);
      localStorage.setItem(LOCAL_STORAGE_KEY_WALL, JSON.stringify(list.slice(0, 100)));
    } catch (e) {}

    // 3. Aynı tarayıcıdaki diğer sekmelere anında fısılda
    if (wallBroadcastChannel) {
      try {
        wallBroadcastChannel.postMessage({ type: "new_post", post: createdPost });
      } catch (e) {}
    }

    // 4. Firestore'a yaz (Kullanıcı Firebase ile oturum açmışsa buluta da kalıcı kaydeder)
    if (isReady && auth && auth.currentUser) {
      try {
        const ref = collection(db, "wallPosts");
        await addDoc(ref, {
          ...postData,
          authorUid: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Firestore bulut kaydı uyarısı:", err);
      }
    }

    return createdPost.id;
  },

  // Canlı Gerçek Zamanlı Akış Dinleyici (Facebook / SSE / Firestore / BroadcastChannel üçlü senkronizasyon)
  subscribeMessages: (callback) => {
    let currentPosts = LunarisWall.getSeedAndLocalMessages();
    callback(currentPosts);

    const updateFeed = (newPosts) => {
      if (!Array.isArray(newPosts)) return;
      const clean = newPosts.filter(isCleanPost);
      const map = new Map();
      clean.forEach(p => map.set(p.id, p));
      currentPosts.forEach(p => {
        if (!map.has(p.id) && isCleanPost(p)) map.set(p.id, p);
      });
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      currentPosts = merged;
      callback(merged);
    };

    // 1. Ortak Sunucudan ilk yükleme
    fetch("/api/wall")
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.posts) && data.posts.length > 0) {
          updateFeed(data.posts);
        }
      })
      .catch(() => {});

    // 2. Server-Sent Events (SSE) ile anlık canlı akış (Facebook gibi sıfır bekleme)
    let eventSource = null;
    try {
      if (typeof window !== "undefined" && typeof window.EventSource === "function") {
        eventSource = new EventSource("/api/wall/stream");
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "new_post" && data.post) {
              updateFeed([data.post, ...currentPosts]);
            } else if (data.type === "like_post" && data.id) {
              const p = currentPosts.find(x => x.id === data.id);
              if (p) {
                p.likes = data.likes;
                callback([...currentPosts]);
              }
            } else if (data.type === "new_comment" && data.postId && data.comment) {
              const p = currentPosts.find(x => x.id === data.postId);
              if (p) {
                if (!p.comments) p.comments = [];
                p.comments.push(data.comment);
                callback([...currentPosts]);
              }
            } else if (data.type === "delete_post" && data.id) {
              currentPosts = currentPosts.filter(x => x.id !== data.id);
              callback([...currentPosts]);
            }
          } catch (e) {}
        };
      }
    } catch (e) {}

    // 3. BroadcastChannel (Aynı tarayıcıdaki sekmeler arası anlık senkronizasyon)
    const onBroadcast = (evt) => {
      if (!evt.data) return;
      if (evt.data.type === "new_post" && evt.data.post) {
        updateFeed([evt.data.post, ...currentPosts]);
      } else if (evt.data.type === "like_post" && evt.data.id) {
        const p = currentPosts.find(x => x.id === evt.data.id);
        if (p) {
          p.likes = evt.data.likes;
          callback([...currentPosts]);
        }
      } else if (evt.data.type === "new_comment" && evt.data.postId && evt.data.comment) {
        const p = currentPosts.find(x => x.id === evt.data.postId);
        if (p) {
          if (!p.comments) p.comments = [];
          p.comments.push(evt.data.comment);
          callback([...currentPosts]);
        }
      }
    };
    if (wallBroadcastChannel) {
      wallBroadcastChannel.addEventListener("message", onBroadcast);
    }

    // 4. Firestore Canlı Dinleyici (Bulut bağlantısı varsa)
    let fsUnsub = null;
    if (isReady) {
      try {
        const ref = collection(db, "wallPosts");
        const q = query(ref, orderBy("createdAt", "desc"), limit(80));
        fsUnsub = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const fsPosts = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              let created = new Date();
              if (d.createdAt && typeof d.createdAt.toDate === "function") {
                created = d.createdAt.toDate();
              } else if (d.createdAt) {
                created = new Date(d.createdAt);
              }
              fsPosts.push({
                id: docSnap.id,
                name: d.name || "Kozmik Gezgin",
                handle: d.handle || "gezgin",
                authorUid: d.authorUid || "",
                photoURL: d.photoURL || null,
                text: d.text || "",
                mood: d.mood || "starry",
                likes: d.likes || 0,
                comments: d.comments || [],
                createdAt: created
              });
            });
            updateFeed(fsPosts);
          }
        }, (err) => {
          console.warn("Firestore duvar dinleme uyarısı:", err);
        });
      } catch (e) {}
    }

    // Temizleme fonksiyonu
    return () => {
      if (eventSource) {
        try { eventSource.close(); } catch(e){}
      }
      if (wallBroadcastChannel) {
        try { wallBroadcastChannel.removeEventListener("message", onBroadcast); } catch(e){}
      }
      if (typeof fsUnsub === "function") {
        try { fsUnsub(); } catch(e){}
      }
    };
  },

  // Tek Seferlik Mesaj Yükleme
  loadMessages: async () => {
    try {
      const resp = await fetch("/api/wall");
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.posts) && data.posts.length > 0) {
          const clean = data.posts.filter(isCleanPost).map(p => ({
            ...p,
            createdAt: new Date(p.createdAt)
          }));
          return clean;
        }
      }
    } catch (e) {}
    return LunarisWall.getSeedAndLocalMessages();
  },

  // Beğeni Gönderme (Sunucu, Firestore & Yerel Hafıza)
  likeMessage: async (id) => {
    // 1. Sunucu API'sine gönder
    try {
      await fetch(`/api/wall/${encodeURIComponent(id)}/like`, { method: "POST" });
    } catch (e) {}

    // 2. Firestore güncellemesi
    if (isReady && !id.startsWith("local_") && !id.startsWith("seed_")) {
      try {
        const ref = doc(db, "wallPosts", id);
        await updateDoc(ref, { likes: increment(1) });
      } catch (e) {}
    }

    // 3. Yerel hafıza güncellemesi
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
      const idx = list.findIndex((m) => m.id === id);
      if (idx !== -1) {
        list[idx].likes = (list[idx].likes || 0) + 1;
        localStorage.setItem(LOCAL_STORAGE_KEY_WALL, JSON.stringify(list));
      }
    } catch (e) {}

    // 4. Sekmeler arası senkronizasyon
    if (wallBroadcastChannel) {
      try {
        wallBroadcastChannel.postMessage({ type: "like_post", id });
      } catch (e) {}
    }
    return true;
  },

  // Facebook Tarzı Yorum Ekleme
  addComment: async (postId, commentText) => {
    const user = currentUser || getStoredUser();
    const authorName = ((user && (user.displayName || user.username)) || (user && user.email ? user.email.split("@")[0] : "Kozmik Yolcu")).trim();
    let photoURL = (user && user.photoURL) || null;
    if (!photoURL) {
      photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorName)}`;
    }

    const payload = {
      name: authorName,
      text: commentText.trim(),
      photoURL: photoURL
    };

    let newComment = null;
    try {
      const resp = await fetch(`/api/wall/${encodeURIComponent(postId)}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const d = await resp.json();
        newComment = d.comment;
      }
    } catch (e) {}

    if (!newComment) {
      newComment = {
        id: "c_" + Date.now(),
        name: authorName,
        text: commentText.trim(),
        photoURL: photoURL,
        createdAt: new Date().toISOString()
      };
    }

    // Yerel güncelleme
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
      const target = list.find(m => m.id === postId);
      if (target) {
        if (!target.comments) target.comments = [];
        target.comments.push(newComment);
        localStorage.setItem(LOCAL_STORAGE_KEY_WALL, JSON.stringify(list));
      }
    } catch (e) {}

    if (wallBroadcastChannel) {
      try {
        wallBroadcastChannel.postMessage({ type: "new_comment", postId, comment: newComment });
      } catch (e) {}
    }
    return newComment;
  },

  // Gönderi Silme
  deleteMessage: async (id) => {
    try {
      await fetch(`/api/wall/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (e) {}

    if (isReady && !id.startsWith("local_") && !id.startsWith("seed_")) {
      try {
        const ref = doc(db, "wallPosts", id);
        await deleteDoc(ref);
      } catch (e) {}
    }

    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
      const filtered = list.filter(m => m.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY_WALL, JSON.stringify(filtered));
    } catch (e) {}

    if (wallBroadcastChannel) {
      try {
        wallBroadcastChannel.postMessage({ type: "delete_post", id });
      } catch (e) {}
    }
    return true;
  }
};


// ============================================================
// 5. KOZMİK DİLEK GALAKSİSİ (INTERACTIVE CONSTELLATION WISHES)
// ============================================================
const LOCAL_STORAGE_KEY_WISHES = "lunaris_wishes_cache";

export const LunarisWishes = {
  isConfigured: () => isReady,

  sendWish: async (text, category = "love") => {
    const authorName = currentUser ? (currentUser.displayName || currentUser.username || "Kozmik Yolcu") : "Anonim Gezgin";
    const authorUid = currentUser ? currentUser.uid : "anon_" + Date.now();
    
    // Rastgele galaksi koordinatı (0..100)
    const x = Math.floor(Math.random() * 80) + 10;
    const y = Math.floor(Math.random() * 70) + 15;
    const colorHues = {
      love: "#FF7B90",
      peace: "#7B9EFA",
      wealth: "#FFD166",
      health: "#06D6A0",
      future: "#B580FF"
    };

    const wishItem = {
      id: "wish_" + Date.now() + "_" + Math.floor(Math.random()*1000),
      text: text.trim(),
      author: authorName,
      authorUid: authorUid,
      category: category,
      color: colorHues[category] || "#FFD166",
      x: x,
      y: y,
      size: Math.random() * 1.5 + 2,
      lightCount: 1,
      createdAt: new Date().toISOString()
    };

    // 1. Yerel önbelleğe ve kullanıcının özel dilekler listesine ekle
    try {
      const localList = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WISHES) || "[]");
      localList.unshift(wishItem);
      if (localList.length > 50) localList.pop();
      localStorage.setItem(LOCAL_STORAGE_KEY_WISHES, JSON.stringify(localList));

      // Kullanıcının kendi dilekleri
      const userKey = "lunaris_user_wishes_" + authorUid;
      const myWishes = JSON.parse(localStorage.getItem(userKey) || "[]");
      myWishes.unshift(wishItem);
      if (myWishes.length > 50) myWishes.pop();
      localStorage.setItem(userKey, JSON.stringify(myWishes));
    } catch(e){}

    // 2. Firestore'a yaz
    if (isReady) {
      try {
        const wishDoc = doc(collection(db, "constellationWishes"));
        await setDoc(wishDoc, {
          text: wishItem.text,
          author: wishItem.author,
          authorUid: wishItem.authorUid,
          category: wishItem.category,
          color: wishItem.color,
          x: wishItem.x,
          y: wishItem.y,
          size: wishItem.size,
          lightCount: 1,
          createdAt: serverTimestamp()
        });
        wishItem.id = wishDoc.id;
      } catch(e) {
        console.warn("Dilek Firestore'a yazılamadı:", e);
      }
    }
    return wishItem;
  },

  loadWishes: async () => {
    let localWishes = [];
    try {
      localWishes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WISHES) || "[]");
    } catch(e){}

    if (isReady) {
      try {
        const q = query(collection(db, "constellationWishes"), orderBy("createdAt", "desc"), limit(40));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const firestoreWishes = [];
          snap.forEach((d) => {
            const data = d.data();
            firestoreWishes.push({
              id: d.id,
              text: data.text || "",
              author: data.author || "Anonim",
              category: data.category || "love",
              color: data.color || "#FFD166",
              x: data.x || Math.random() * 80 + 10,
              y: data.y || Math.random() * 70 + 15,
              size: data.size || 2.5,
              lightCount: data.lightCount || 1,
              createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()) : new Date().toISOString()
            });
          });
          return firestoreWishes;
        }
      } catch(e) {
        console.warn("Firestore dilekleri okunamadı:", e);
      }
    }

    if (localWishes.length > 0) return localWishes;
    return LunarisWishes.getSeedWishes();
  },

  loadMyWishes: async () => {
    const authorUid = currentUser ? currentUser.uid : "anon";
    let myWishes = [];
    try {
      const userKey = "lunaris_user_wishes_" + authorUid;
      myWishes = JSON.parse(localStorage.getItem(userKey) || "[]");
      if (myWishes.length === 0 && !currentUser) {
        // Fallback: check generic anon
        myWishes = JSON.parse(localStorage.getItem("lunaris_user_wishes_anon") || "[]");
      }
    } catch (e) {}

    if (isReady && currentUser && !currentUser.isDemo) {
      try {
        const q = query(collection(db, "constellationWishes"), where("authorUid", "==", currentUser.uid), orderBy("createdAt", "desc"), limit(30));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteWishes = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteWishes.push({
              id: d.id,
              text: data.text || "",
              author: data.author || "Anonim",
              category: data.category || "love",
              color: data.color || "#FFD166",
              lightCount: data.lightCount || 1,
              createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()) : new Date().toISOString()
            });
          });
          return remoteWishes;
        }
      } catch (e) {
        console.warn("Kullanıcı dilekleri Firestore'dan okunamadı:", e);
      }
    }
    return myWishes;
  },

  sendLight: async (wishId) => {
    if (isReady && !wishId.startsWith("wish_") && !wishId.startsWith("seed_")) {
      try {
        const ref = doc(db, "constellationWishes", wishId);
        await updateDoc(ref, { lightCount: increment(1) });
        return true;
      } catch(e){}
    }
    // Yerel güncelleme
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WISHES) || "[]");
      const item = list.find(w => w.id === wishId);
      if (item) {
        item.lightCount = (item.lightCount || 1) + 1;
        localStorage.setItem(LOCAL_STORAGE_KEY_WISHES, JSON.stringify(list));
      }
      return true;
    } catch(e){}
    return false;
  },

  getSeedWishes: () => {
    return [
      { id: "seed_w1", text: "2026 hepimize içsel huzur, aşk ve bereket getirsin ✨", author: "Ayla", category: "peace", color: "#7B9EFA", x: 22, y: 35, size: 3.5, lightCount: 28 },
      { id: "seed_w2", text: "Ruh eşimle bu yıl karşılaşmak istiyorum 💜", author: "Mert", category: "love", color: "#FF7B90", x: 68, y: 28, size: 4, lightCount: 42 },
      { id: "seed_w3", text: "Tüm hayallerim gerçeğe dönüşsün, cesaretim hiç bitmesin 🌟", author: "Kozmik Gezgin", category: "future", color: "#B580FF", x: 45, y: 55, size: 3.8, lightCount: 35 },
      { id: "seed_w4", text: "Sevdiklerimin sağlığı ve bolluk için evrene niyet ediyorum 🌿", author: "Selin", category: "health", color: "#06D6A0", x: 80, y: 62, size: 3.2, lightCount: 19 },
      { id: "seed_w5", text: "Maddi ve manevi özgürlük kapıları ardına kadar açılsın 💰", author: "Can", category: "wealth", color: "#FFD166", x: 30, y: 72, size: 3.6, lightCount: 31 }
    ];
  }
};

window.LunarisAuth = LunarisAuth;
window.LunarisWall = LunarisWall;
window.LunarisWishes = LunarisWishes;
window.firebaseConfig = firebaseConfig;

/* ══════════════════════════════════════════════════
   ML DATA SERVİSİ
   Feedback toplama, eğitilmiş model yükleme
   ══════════════════════════════════════════════════ */

let _lastMLFeedbackTime = 0;
const MAX_ML_FEEDBACK_PER_DAY = 25;

export const LunarisMLData = {

  /**
   * ML Feedback kaydet — anonim (kullanıcı ID gönderilmez)
   * Rate limiting ve şema doğrulaması içerir
   */
  saveMLFeedback: async (feedbackData) => {
    if (!feedbackData || (feedbackData.rating !== 0 && feedbackData.rating !== 1)) {
      return false;
    }

    // Rate Limiting (DoS / Spam Koruması)
    const now = Date.now();
    if (now - _lastMLFeedbackTime < 4000) {
      console.warn("Lütfen geri bildirimler arasında birkaç saniye bekleyin.");
      return false;
    }

    try {
      const todayKey = "lunaris_fb_limit_" + new Date().toISOString().slice(0, 10);
      const todayCount = parseInt(localStorage.getItem(todayKey) || "0", 10);
      if (todayCount >= MAX_ML_FEEDBACK_PER_DAY) {
        console.warn("Günlük maksimum geri bildirim sınırına ulaştınız.");
        return false;
      }
      localStorage.setItem(todayKey, (todayCount + 1).toString());
    } catch(e){}

    _lastMLFeedbackTime = now;

    // Şema ve Vektör Doğrulaması
    const cleanSignVec = Array.isArray(feedbackData.signVector) && feedbackData.signVector.length === 8 
      ? feedbackData.signVector.map(v => Math.max(0, Math.min(1, parseFloat(v) || 0))) 
      : [];
    const cleanTempVec = Array.isArray(feedbackData.temporalVector) && feedbackData.temporalVector.length === 8 
      ? feedbackData.temporalVector.map(v => Math.max(0, Math.min(1, parseFloat(v) || 0))) 
      : [];

    if (cleanSignVec.length !== 8 || cleanTempVec.length !== 8) {
      console.warn("Geçersiz vektör formatı, feedback reddedildi.");
      return false;
    }

    const payload = {
      signKey: String(feedbackData.signKey || "").slice(0, 20),
      category: String(feedbackData.category || "").slice(0, 20),
      readingType: String(feedbackData.readingType || "horoscope").slice(0, 20),
      score: Math.max(0, Math.min(1, parseFloat(feedbackData.score) || 0.5)),
      signVector: cleanSignVec,
      temporalVector: cleanTempVec,
      mlScores: Array.isArray(feedbackData.mlScores) ? feedbackData.mlScores.slice(0, 6) : [],
      natalVector: Array.isArray(feedbackData.natalVector) && feedbackData.natalVector.length === 8 ? feedbackData.natalVector : null,
      rating: feedbackData.rating === 1 ? 1 : 0,
      readDuration: Math.min(300, Math.max(0, parseFloat(feedbackData.readDuration) || 0)),
      dayOfWeek: new Date().getDay(),
      lang: String(feedbackData.lang || "tr").slice(0, 5)
    };

    // 1. Firestore'a kaydet (anonim)
    if (isReady) {
      try {
        await addDoc(collection(db, "ml_feedback"), {
          ...payload,
          createdAt: serverTimestamp()
        });
      } catch(e) {
        console.warn("ML feedback Firestore kayıt uyarısı:", e);
      }
    }

    // 2. localStorage'a da kaydet (kişisel ML eğitimi + offline fallback)
    try {
      const localFB = JSON.parse(localStorage.getItem("lunaris_ml_feedback") || "[]");
      localFB.push({
        ...payload,
        createdAt: new Date().toISOString()
      });
      // Son 200 feedback'i tut
      localStorage.setItem("lunaris_ml_feedback", JSON.stringify(localFB.slice(-200)));
    } catch(e) {
      console.warn("ML feedback localStorage kayıt uyarısı:", e);
    }
    return true;
  },

  /**
   * Eğitilmiş ağırlıkları statik JSON'dan çek (Firebase Hosting — ücretsiz)
   * Döndürür: { version, weights, sampleCount, ... } veya null
   */
  loadTrainedWeights: async () => {
    try {
      const cacheBuster = Math.floor(Date.now() / 3600000); // Saatlik cache
      const resp = await fetch("/ml-weights.json?v=" + cacheBuster);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.weights) return data;
      }
    } catch(e) {
      // Dosya henüz yoksa veya offline — sessizce devam et
    }
    return null;
  },

  /**
   * Kişisel feedback'leri localStorage'dan oku
   */
  getLocalFeedback: () => {
    try {
      return JSON.parse(localStorage.getItem("lunaris_ml_feedback") || "[]");
    } catch(e) {
      return [];
    }
  },

  /**
   * Kişisel eğitilmiş ağırlıkları localStorage'dan oku
   */
  getPersonalWeights: () => {
    try {
      const raw = localStorage.getItem("lunaris_personal_weights");
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
  }
};

window.LunarisMLData = LunarisMLData;

/* ══════════════════════════════════════════════════
   BAŞLANGIÇ — Eğitilmiş ML Modelini Otomatik Yükle
   ══════════════════════════════════════════════════ */

async function initTrainedML() {
  // 1. Global eğitilmiş modeli yükle (statik JSON — hosting)
  try {
    const weightsData = await LunarisMLData.loadTrainedWeights();
    if (weightsData && window.LunarisML) {
      window.LunarisML.loadTrainedModel(weightsData);
    }
  } catch(e) {}

  // 2. Kişisel modeli localStorage'dan yükle
  try {
    const personalW = LunarisMLData.getPersonalWeights();
    if (personalW && window.LunarisML) {
      window.LunarisML.loadPersonalWeights(personalW);
    }
  } catch(e) {}
}

// Sayfa hazır olduğunda ML modelini yükle
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initTrainedML, 500);
  } else {
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(initTrainedML, 500);
    });
  }
}


if (typeof window.updateAccountUI === "function") {
  window.updateAccountUI(currentUser);
}
