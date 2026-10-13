/* ============================================================
   LUNARIS — İstemci Tabanlı Kozmik Sosyal & Bildirim Motoru
   (cosmic-social-client.js — 100% Free / Serverless Mimari)
   ============================================================ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  Timestamp, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

function getDb() {
  if (window.LunarisDB) return window.LunarisDB;
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

export class CosmicSocialClient {
  /**
   * Doğum haritası tamamlandığında profil belgesini günceller ve Kozmik İkizleri arar.
   */
  async saveNatalBigThreeAndCheckTwins(currentUid, sunSign, moonSign, risingSign, displayName) {
    if (!currentUid || !sunSign || !moonSign || !risingSign) return;

    const db = getDb();

    // 1. Kullanıcı profilini güncelle (Kozmik İkiz aramasında diğerlerinin bulabilmesi için)
    try {
      const userRef = doc(db, "users", currentUid);
      await setDoc(userRef, {
        sunSign,
        moonSign,
        risingSign,
        lastActiveAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Profil burçları güncellenirken uyarı:", e);
    }

    // 2. Son 30 günde aktif olan ve aynı Big Three'ye sahip kişileri tara
    try {
      const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, "users"),
        where("sunSign", "==", sunSign),
        where("moonSign", "==", moonSign),
        where("risingSign", "==", risingSign),
        where("lastActiveAt", ">=", thirtyDaysAgo)
      );

      const snap = await getDocs(q);
      const matched = snap.docs.filter(d => d.id !== currentUid);
      const senderName = displayName ? `@${displayName}` : "Ruh ikizin";

      for (const mDoc of matched) {
        const targetUid = mDoc.id;
        // 30 günlük sıklık kontrolü
        const cooldownRef = doc(db, "users", targetUid, "cooldowns", "cosmic_twin");
        const cdSnap = await getDoc(cooldownRef);
        if (cdSnap.exists()) {
          const last = cdSnap.data().lastSentAt?.toMillis() || 0;
          if (Date.now() - last < 30 * 24 * 60 * 60 * 1000) continue;
        }

        await setDoc(cooldownRef, { lastSentAt: serverTimestamp() }, { merge: true });

        // Hedef kullanıcıya In-App bildirim oluştur
        await addDoc(collection(db, "notifications"), {
          recipientUid: targetUid,
          type: "COSMIC_TWIN",
          title: "✦ Nadir Kozmik Ayna Belirdi",
          body: `${senderName} seninle birebir aynı ${sunSign} Güneş, ${moonSign} Ay ve ${risingSign} Yükselen ile Lunaris'e adım attı.`,
          deepLink: `benim-alanim.html?user=${currentUid}`,
          metadata: { sourceUid: currentUid, sunSign, moonSign, risingSign },
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      if (matched.length > 0 && typeof window.showToast === "function") {
        window.showToast(`✨ ${matched.length} Kozmik İkizine sinyal gönderildi!`, 4000);
      }
    } catch (e) {
      console.warn("[Cosmic Twin Scan Warning]:", e);
    }
  }

  /**
   * Kullanıcı kart çektiğinde son 4 saat içinde aynı kartı çeken arkadaşını bulur.
   */
  async checkArcanaEcho(currentUid, cardId, cardName, displayName) {
    if (!currentUid) return;
    const db = getDb();

    try {
      // 1. Çekilen kartı tarot_pulls koleksiyonuna ekle
      await addDoc(collection(db, "tarot_pulls"), {
        uid: currentUid,
        cardId: typeof cardId === "number" ? cardId : 0,
        cardName: cardName || "Tarot",
        pulledAt: serverTimestamp()
      });

      // 2. Kullanıcının arkadaş listesini çek
      const connQ = query(
        collection(db, "connections"),
        where("participants", "array-contains", currentUid),
        where("status", "==", "ACCEPTED")
      );
      const connSnap = await getDocs(connQ);
      const friendUids = new Set();
      connSnap.forEach(d => {
        d.data().participants.forEach(p => { if (p !== currentUid) friendUids.add(p); });
      });

      if (friendUids.size === 0) return;

      // 3. Son 4 saat içindeki aynı kart çekimlerini sorgula
      const fourHoursAgo = Timestamp.fromMillis(Date.now() - 4 * 60 * 60 * 1000);
      const pullsQ = query(
        collection(db, "tarot_pulls"),
        where("cardId", "==", cardId),
        where("pulledAt", ">=", fourHoursAgo)
      );
      const pullsSnap = await getDocs(pullsQ);

      let matchedFriendUid = null;
      for (const pDoc of pullsSnap.docs) {
        const pData = pDoc.data();
        if (pData.uid !== currentUid && friendUids.has(pData.uid)) {
          matchedFriendUid = pData.uid;
          break;
        }
      }

      if (!matchedFriendUid) return;

      // 4. 7 günlük eşleşme kilidi
      const pairKey = [currentUid, matchedFriendUid].sort().join("_");
      const lockRef = doc(db, "arcana_echo_cooldowns", pairKey);
      const lockSnap = await getDoc(lockRef);
      if (lockSnap.exists()) {
        const last = lockSnap.data().lastEchoAt?.toMillis() || 0;
        if (Date.now() - last < 7 * 24 * 60 * 60 * 1000) return;
      }

      await setDoc(lockRef, { lastEchoAt: serverTimestamp() }, { merge: true });

      const myName = displayName ? `@${displayName}` : "Bir dostun";

      // Her iki tarafa da bildirim üret
      await addDoc(collection(db, "notifications"), {
        recipientUid: matchedFriendUid,
        type: "ARCANA_ECHO",
        title: "✦ Senkron Kozmik Eko",
        body: `${myName} ile son 4 saat içinde aynı "${cardName}" kartını çektiniz. Evrenin eşzamanlılığını kutlayın!`,
        deepLink: `#tarot`,
        metadata: { peerUid: currentUid, cardId },
        isRead: false,
        createdAt: serverTimestamp()
      });

      if (typeof window.showToast === "function") {
        window.showToast(`🔮 Bir dostunla aynı kartı çektin: ${cardName}!`, 4500);
      }
    } catch (e) {
      console.warn("[Arcana Echo Check Warning]:", e);
    }
  }

  /**
   * Aktif kullanıcının okunmamış bildirimlerini canlı dinler
   */
  subscribeToNotifications(currentUid, onUpdate) {
    if (!currentUid) return () => {};
    const db = getDb();
    const q = query(
      collection(db, "notifications"),
      where("recipientUid", "==", currentUid),
      where("isRead", "==", false)
    );
    return onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (typeof onUpdate === "function") onUpdate(notifs);
    });
  }

  /**
   * Bildirimi okundu olarak işaretler
   */
  async markAsRead(notificationId) {
    if (!notificationId) return;
    const db = getDb();
    try {
      await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
    } catch (e) {}
  }
}

export const cosmicSocialService = new CosmicSocialClient();
