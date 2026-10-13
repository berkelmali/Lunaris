/* ============================================================
   LUNARIS — Co-Op Çift Düğümlü Tarot İstemci Modülü
   (coop-tarot-client.js — 100% Free / Serverless Mimari)
   ============================================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

function getDb() {
  if (window.LunarisDB) return window.LunarisDB;
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// Element kombinasyonları sözlüğü
const ELEMENT_COMBINATIONS = {
  "FIRE_FIRE": "Çift Ateş (Volkanik Işıma & Yüksek Eylem Gücü)",
  "FIRE_WATER": "Ateş + Su (Buhar, Tutku & Duygusal Dönüşüm)",
  "FIRE_AIR": "Ateş + Hava (Yayılan Alev & Vizyoner Zihin)",
  "FIRE_EARTH": "Ateş + Toprak (Ocak Taşı, Köklü Tutku & Üretim)",
  "WATER_WATER": "Çift Su (Dipsiz Sezgi & Psişik Rezonans)",
  "WATER_AIR": "Su + Hava (Sis, Şiirsel İfade & Bilinçaltı Uyanışı)",
  "WATER_EARTH": "Su + Toprak (Verimli Toprak, Kalıcı Tezahür)",
  "AIR_AIR": "Çift Hava (Zihinsel Telepati & Soyut Felsefe)",
  "AIR_EARTH": "Hava + Toprak (Yapısal Mimari & Pratik Mantık)",
  "EARTH_EARTH": "Çift Toprak (Tektonik Denge & Sarsılmaz Temeller)",
};

export class CoopTarotClient {
  constructor() {
    this.activeUnsubscribe = null;
  }

  /**
   * İki kart arasındaki kozmik sentezi istemci tarafında deterministik hesaplar.
   */
  calculateSynthesis(cardA, cardB) {
    const elemA = cardA.element || "FIRE";
    const elemB = cardB.element || "WATER";
    const sorted = [elemA, elemB].sort();
    const comboKey = `${sorted[0]}_${sorted[1]}`;
    const elementalAlchemy = ELEMENT_COMBINATIONS[comboKey] || "Evrensel Kozmik Denge";

    const idA = typeof cardA.cardId === "number" ? cardA.cardId : 0;
    const idB = typeof cardB.cardId === "number" ? cardB.cardId : 0;
    const arcanaDistance = Math.abs(idA - idB);

    let resonanceScore = 100 - (arcanaDistance * 2.8);
    if (cardA.isReversed) resonanceScore -= 7;
    if (cardB.isReversed) resonanceScore -= 7;
    resonanceScore = Math.max(35, Math.min(99, Math.round(resonanceScore)));

    const nameA = cardA.name?.tr || cardA.name || "Kök Kart";
    const nameB = cardB.name?.tr || cardB.name || "Katalizör Kart";

    return {
      compositeResonanceScore: resonanceScore,
      elementalAlchemy,
      relationalTheme: `${nameA} ✦ ${nameB} Kozmik Buluşması`,
      actionableInsight: `İlk kartınız (${nameA}) aranızdaki bağı kuruyor; ikinci kartınız (${nameB}) ortak yolunuzu ve güzellikleri aydınlatıyor.`,
      calculatedAt: Timestamp.now()
    };
  }

  /**
   * Yeni bir Co-Op Tarot seansı başlatır (Kullanıcı A)
   */
  async createSession(initiatorUid, recipientUid = "pending_invite") {
    const db = getDb();
    const expiresAt = Timestamp.fromMillis(Date.now() + 12 * 60 * 60 * 1000); // 12 saat TTL
    const sessionRef = await addDoc(collection(db, "coop_sessions"), {
      initiatorUid,
      recipientUid,
      status: "PENDING_RECIPIENT",
      initiatorHasDrawn: false,
      recipientHasDrawn: false,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt
    });
    return sessionRef.id;
  }

  /**
   * Paylaşılabilir davet bağlantısı üretir
   */
  getShareableLink(sessionId) {
    const base = window.location.origin + window.location.pathname.replace(/\/$/, "");
    return `${base}?coop=${sessionId}#tarot`;
  }

  /**
   * Seans detayını tek seferlik çeker
   */
  async getSession(sessionId) {
    const db = getDb();
    const snap = await getDoc(doc(db, "coop_sessions", sessionId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  /**
   * Kullanıcı kart çeker (Anti-Cheat: Kullanıcı B çekmeden önce A'nın kartını göremez)
   */
  async commitDraw(sessionId, uid, card, isInitiator = false) {
    const db = getDb();
    const sessionRef = doc(db, "coop_sessions", sessionId);
    const myDrawRef = doc(db, "coop_sessions", sessionId, "draws", uid);

    // 1. Kendi kartını alt koleksiyona kaydet
    await setDoc(myDrawRef, {
      uid,
      card,
      drawnAt: serverTimestamp()
    });

    if (isInitiator) {
      await updateDoc(sessionRef, {
        initiatorHasDrawn: true,
        status: "INITIATOR_DRAWN"
      });
    } else {
      // Kullanıcı B çekti -> recipientUid eşleşmesi ve recipientHasDrawn = true
      await updateDoc(sessionRef, {
        recipientUid: uid,
        recipientHasDrawn: true
      });

      // Kullanıcı A'nın kartını alt koleksiyondan oku (güvenlik kuralı artık izin verir)
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();

      const initiatorDrawRef = doc(db, "coop_sessions", sessionId, "draws", sessionData.initiatorUid);
      const initiatorSnap = await getDoc(initiatorDrawRef);

      if (initiatorSnap.exists()) {
        const cardA = initiatorSnap.data().card;
        const cardB = card;

        // Tarayıcı üzerinde hesapla (0 sunucu maliyeti)
        const synthesisPayload = this.calculateSynthesis(cardA, cardB);

        // Seansı 'RESOLVED' durumuna getir ve iki kartı herkese aç
        await updateDoc(sessionRef, {
          revealedCards: {
            initiatorCard: cardA,
            recipientCard: cardB
          },
          synthesisPayload,
          status: "RESOLVED"
        });
      }
    }
  }

  /**
   * Seans değişikliklerini canlı olarak dinler
   */
  subscribe(sessionId, handlers = {}) {
    this.unsubscribe();
    const db = getDb();
    const sessionRef = doc(db, "coop_sessions", sessionId);

    this.activeUnsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (!snapshot.exists()) {
        if (handlers.onError) handlers.onError(new Error("Seans bulunamadı veya süresi doldu."));
        return;
      }

      const data = snapshot.data();

      if (data.status === "RESOLVED" && data.synthesisPayload && data.revealedCards) {
        if (handlers.onResolved) handlers.onResolved(data);
      } else if (data.status === "INITIATOR_DRAWN") {
        if (handlers.onInitiatorDrawn) handlers.onInitiatorDrawn(data);
      } else if (data.status === "PENDING_RECIPIENT") {
        if (handlers.onPending) handlers.onPending(data);
      }
    }, (error) => {
      if (handlers.onError) handlers.onError(error);
    });

    return this.activeUnsubscribe;
  }

  unsubscribe() {
    if (this.activeUnsubscribe) {
      this.activeUnsubscribe();
      this.activeUnsubscribe = null;
    }
  }
}

export const coopTarotService = new CoopTarotClient();
