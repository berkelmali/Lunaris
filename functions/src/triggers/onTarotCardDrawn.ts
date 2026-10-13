import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { sendNotificationToUser } from "../utils/fcm-dispatcher";

const db = admin.firestore();

export const onTarotCardDrawn = onDocumentCreated(
  {
    document: "tarot_pulls/{pullId}",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const pullData = event.data?.data();
    if (!pullData) return;

    const { uid: currentUid, cardId, cardName } = pullData;
    const nowMs = Date.now();
    const fourHoursAgo = Timestamp.fromMillis(nowMs - 4 * 60 * 60 * 1000);

    try {
      // 1. Fetch user's confirmed friend UIDs
      const connectionsSnap = await db
        .collection("connections")
        .where("participants", "array-contains", currentUid)
        .where("status", "==", "ACCEPTED")
        .get();

      if (connectionsSnap.empty) return;

      const friendUids = new Set<string>();
      connectionsSnap.forEach((doc) => {
        const parts = doc.data().participants as string[];
        parts.forEach((p) => {
          if (p !== currentUid) friendUids.add(p);
        });
      });

      if (friendUids.size === 0) return;

      // 2. Query recent pulls for the exact same cardId in the 4-hour window
      const syncPullsSnap = await db
        .collection("tarot_pulls")
        .where("cardId", "==", cardId)
        .where("pulledAt", ">=", fourHoursAgo)
        .get();

      if (syncPullsSnap.empty) return;

      // 3. Find if any recent pull was authored by a confirmed friend
      let matchedFriendUid: string | null = null;
      for (const snap of syncPullsSnap.docs) {
        const data = snap.data();
        if (data.uid !== currentUid && friendUids.has(data.uid)) {
          matchedFriendUid = data.uid;
          break;
        }
      }

      if (!matchedFriendUid) return;

      // 4. Rate-Limit: Deterministic pair lock to prevent duplicate alerts within 7 days
      const pairKey = [currentUid, matchedFriendUid].sort().join("_");
      const lockRef = db.collection("arcana_echo_cooldowns").doc(pairKey);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      const lockDoc = await lockRef.get();
      if (lockDoc.exists) {
        const lastEcho = lockDoc.data()?.lastEchoAt as Timestamp;
        if (nowMs - lastEcho.toMillis() < sevenDaysMs) {
          return; // Skip: Pair was notified within 7 days
        }
      }

      // Update cooldown key
      await lockRef.set({ lastEchoAt: Timestamp.now() }, { merge: true });

      // 5. Fetch usernames for notifications
      const [currentUserDoc, friendDoc] = await Promise.all([
        db.collection("users").doc(currentUid).get(),
        db.collection("users").doc(matchedFriendUid).get(),
      ]);

      const currentHandle = currentUserDoc.data()?.displayName || "Bir dostun";
      const friendHandle = friendDoc.data()?.displayName || "Bir dostun";

      // 6. Reciprocal FCM Alerts
      await Promise.all([
        sendNotificationToUser(currentUid, {
          type: "ARCANA_ECHO",
          title: "✦ Senkron Kozmik Eko",
          body: `Sen ve @${friendHandle} son 4 saat içinde "${cardName || 'Aynı Kartı'}" çektiniz. Kartlarınızı karşılaştırın.`,
          deepLink: `https://lunaris.web.app/tarot/compare?peer=${matchedFriendUid}&cardId=${cardId}`,
          metadata: { peerUid: matchedFriendUid, cardId },
        }),
        sendNotificationToUser(matchedFriendUid, {
          type: "ARCANA_ECHO",
          title: "✦ Senkron Kozmik Eko",
          body: `Sen ve @${currentHandle} son 4 saat içinde "${cardName || 'Aynı Kartı'}" çektiniz. Kartlarınızı karşılaştırın.`,
          deepLink: `https://lunaris.web.app/tarot/compare?peer=${currentUid}&cardId=${cardId}`,
          metadata: { peerUid: currentUid, cardId },
        }),
      ]);

      console.log(`[Arcana Echo] Successfully alerted pair: ${pairKey} for Card: ${cardId}`);
    } catch (error) {
      console.error("[Arcana Echo Trigger Error]:", error);
      throw error;
    }
  }
);
