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

  // Profil Fotoğrafı Güncelleme (Base64 / URL / Mistik İkon)
  updateProfilePicture: async (photoURL) => {
    if (!currentUser) return false;
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
        if (photoURL && photoURL.startsWith("http") && photoURL.length < 2048) {
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
export const LunarisWall = {
  isConfigured: () => isReady,

  getSeedAndLocalMessages: () => {
    let localPosts = [];
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
      localPosts = local.map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt)
      }));
    } catch (e) {}

    const seedPosts = [
      {
        id: "seed_1",
        name: "Selena",
        handle: "selena.moon",
        authorUid: "seed_selena",
        photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Selena",
        text: "Yeni ay döngüsü başladığında kartlar bana güç verdi. Hepinize huzur dolu bir gece dilerim ✨",
        mood: "starry",
        likes: 14,
        createdAt: new Date(Date.now() - 1000 * 60 * 42)
      },
      {
        id: "seed_2",
        name: "Deniz K.",
        handle: "deniz.akrep",
        authorUid: "seed_deniz",
        photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Deniz",
        text: "Akrep & Yengeç uyumu harika çıktı, evrenin işaretleri asla yanıltmıyor 💜",
        mood: "loved",
        likes: 9,
        createdAt: new Date(Date.now() - 1000 * 60 * 180)
      },
      {
        id: "seed_3",
        name: "Orion",
        handle: "orion.gezgin",
        authorUid: "seed_orion",
        photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Orion",
        text: "Merkür retrosu bitene kadar büyük kararları askıya aldım, sezgilerime güveniyorum.",
        mood: "dreamy",
        likes: 21,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8)
      }
    ];

    const map = new Map();
    localPosts.forEach(p => map.set(p.id, p));
    seedPosts.forEach(p => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    const merged = Array.from(map.values());
    merged.sort((a,b) => b.createdAt - a.createdAt);
    return merged;
  },

  // Yeni Gönderi Paylaşma (Tüm kullanıcılara canlı gider)
  postMessage: async (text, mood = "starry") => {
    const user = currentUser || getStoredUser();
    if (!user) {
      return Promise.reject({ code: "auth/unauthenticated" });
    }

    const authorName = (user.displayName || user.username || (user.email ? user.email.split("@")[0] : "Kozmik Gezgin")).trim();
    const rawHandle = (user.username || user.displayName || (user.email ? user.email.split("@")[0] : "gezgin")).toLowerCase().replace(/[^a-z0-9._]/g, "");
    const authorHandle = rawHandle || "gezgin";
    
    let photoURL = user.photoURL || null;
    if (!photoURL && user.uid) {
      try { photoURL = localStorage.getItem("lunaris_user_photo_" + user.uid) || null; } catch(e){}
    }

    const postData = {
      name: authorName,
      handle: authorHandle,
      authorUid: user.uid || ("user_" + Date.now()),
      photoURL: photoURL,
      text: text.trim(),
      mood: mood,
      likes: 0
    };

    // 1. Yerel hafızaya hemen kaydet (Anında arayüzde göstermek için)
    const localPost = {
      id: "local_msg_" + Date.now(),
      ...postData,
      createdAt: new Date().toISOString()
    };
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
      list.unshift(localPost);
      localStorage.setItem(LOCAL_STORAGE_KEY_WALL, JSON.stringify(list.slice(0, 100)));
    } catch(e){}

    // 2. Firestore aktifse her kayıtlı kullanıcı için doğrudan Firestore'a yaz (Böylece herkes görür!)
    if (isReady) {
      try {
        const ref = collection(db, "wallPosts");
        const docRef = await addDoc(ref, {
          ...postData,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      } catch (err) {
        console.warn("Firestore duvar gönderim uyarısı:", err);
      }
    }
    return localPost.id;
  },

  // Canlı Gerçek Zamanlı Akış Dinleyici (Real-time listener like Twitter)
  subscribeMessages: (callback) => {
    if (!isReady) {
      callback(LunarisWall.getSeedAndLocalMessages());
      return () => {};
    }

    try {
      const ref = collection(db, "wallPosts");
      const q = query(ref, orderBy("createdAt", "desc"), limit(80));
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const firestorePosts = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let created = new Date();
            if (data.createdAt && typeof data.createdAt.toDate === "function") {
              created = data.createdAt.toDate();
            } else if (data.createdAt) {
              created = new Date(data.createdAt);
            }
            firestorePosts.push({
              id: docSnap.id,
              name: data.name || "Kozmik Gezgin",
              handle: data.handle || (data.name ? data.name.toLowerCase().replace(/[^a-z0-9._]/g, "") : "gezgin"),
              authorUid: data.authorUid || "",
              photoURL: data.photoURL || null,
              text: data.text || "",
              mood: data.mood || "starry",
              likes: data.likes || 0,
              createdAt: created
            });
          });

          // Yerel gönderileri ve seed verileri birleştir
          let localPosts = [];
          try {
            const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
            localPosts = local.map(m => ({ ...m, createdAt: new Date(m.createdAt) }));
          } catch(e){}

          const map = new Map();
          firestorePosts.forEach(p => map.set(p.id, p));
          localPosts.forEach(p => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          const merged = Array.from(map.values());
          merged.sort((a,b) => b.createdAt - a.createdAt);
          callback(merged);
        } else {
          callback(LunarisWall.getSeedAndLocalMessages());
        }
      }, (err) => {
        console.warn("Realtime wall error, using local fallback:", err);
        callback(LunarisWall.getSeedAndLocalMessages());
      });
    } catch (e) {
      console.warn("Wall snapshot listener error:", e);
      callback(LunarisWall.getSeedAndLocalMessages());
      return () => {};
    }
  },

  // Tek seferlik mesaj yükleme
  loadMessages: async () => {
    if (isReady) {
      try {
        const ref = collection(db, "wallPosts");
        const q = query(ref, orderBy("createdAt", "desc"), limit(80));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const firestorePosts = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            let created = new Date();
            try {
              if (data.createdAt && typeof data.createdAt.toDate === "function") {
                created = data.createdAt.toDate();
              } else if (data.createdAt) {
                created = new Date(data.createdAt);
              }
            } catch (e) {}
            firestorePosts.push({
              id: docSnap.id,
              name: data.name || "Kozmik Gezgin",
              handle: data.handle || (data.name ? data.name.toLowerCase().replace(/[^a-z0-9._]/g, "") : "gezgin"),
              authorUid: data.authorUid || "",
              photoURL: data.photoURL || null,
              text: data.text || "",
              mood: data.mood || "starry",
              likes: data.likes || 0,
              createdAt: created
            });
          });

          let localPosts = [];
          try {
            const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
            localPosts = local.map(m => ({ ...m, createdAt: new Date(m.createdAt) }));
          } catch(e){}

          const map = new Map();
          firestorePosts.forEach(p => map.set(p.id, p));
          localPosts.forEach(p => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          const merged = Array.from(map.values());
          merged.sort((a,b) => b.createdAt - a.createdAt);
          return merged;
        }
      } catch (err) {
        console.warn("Firestore duvarı okunamadı:", err);
      }
    }
    return LunarisWall.getSeedAndLocalMessages();
  },

  // Beğeni Gönderme
  likeMessage: async (id) => {
    if (isReady && !id.startsWith("local_") && !id.startsWith("seed_")) {
      try {
        const ref = doc(db, "wallPosts", id);
        await updateDoc(ref, { likes: increment(1) });
        return true;
      } catch (e) {
        console.warn("Beğeni Firestore'a kaydedilemedi:", e);
      }
    }
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
      const idx = list.findIndex((m) => m.id === id);
      if (idx !== -1) {
        list[idx].likes = (list[idx].likes || 0) + 1;
        localStorage.setItem(LOCAL_STORAGE_KEY_WALL, JSON.stringify(list));
      }
      return true;
    } catch (e) {}
    return false;
  },

  // Gönderiyi Silme (Sadece Yazar için)
  deleteMessage: async (id) => {
    const user = currentUser || getStoredUser();
    if (!user) return false;
    if (isReady && !id.startsWith("local_") && !id.startsWith("seed_")) {
      try {
        const ref = doc(db, "wallPosts", id);
        await deleteDoc(ref);
      } catch (e) {
        console.warn("Mesaj Firestore'dan silinemedi:", e);
      }
    }
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_WALL) || "[]");
      const filtered = list.filter(m => m.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY_WALL, JSON.stringify(filtered));
    } catch(e){}
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


if (typeof window.updateAccountUI === "function") {
  window.updateAccountUI(currentUser);
}
