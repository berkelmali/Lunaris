import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { sendNotificationToUser } from "../utils/fcm-dispatcher";

const db = admin.firestore();

export const onNatalChartCompleted = onDocumentWritten(
  {
    document: "users/{uid}",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Guard: Only proceed if profile exists and Big Three is present
    if (!afterData || !afterData.sunSign || !afterData.moonSign || !afterData.risingSign) {
      return;
    }

    // Idempotency: Prevent re-running if Big Three did not change
    const hasBigThreeChanged =
      !beforeData ||
      beforeData.sunSign !== afterData.sunSign ||
      beforeData.moonSign !== afterData.moonSign ||
      beforeData.risingSign !== afterData.risingSign;

    if (!hasBigThreeChanged) {
      return;
    }

    const newUid = event.params.uid;
    const { sunSign, moonSign, risingSign, displayName } = afterData;

    // Active threshold: Users active within the last 30 days
    const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Query exact Big Three match with composite index
      const matchesSnapshot = await db
        .collection("users")
        .where("sunSign", "==", sunSign)
        .where("moonSign", "==", moonSign)
        .where("risingSign", "==", risingSign)
        .where("lastActiveAt", ">=", thirtyDaysAgo)
        .get();

      if (matchesSnapshot.empty) return;

      const candidates = matchesSnapshot.docs.filter((doc) => doc.id !== newUid);
      if (candidates.length === 0) return;

      const now = Timestamp.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      for (const candidateDoc of candidates) {
        const candidateUid = candidateDoc.id;
        const candidateData = candidateDoc.data();

        // Check user preferences
        if (candidateData.notificationPrefs?.cosmicTwinsEnabled === false) {
          continue;
        }

        // Frequency Cap: Check recipient's last cosmic twin notification timestamp
        const cooldownRef = db
          .collection("users")
          .doc(candidateUid)
          .collection("cooldowns")
          .doc("cosmic_twin");

        const cooldownDoc = await cooldownRef.get();
        if (cooldownDoc.exists) {
          const lastSentAt = cooldownDoc.data()?.lastSentAt as Timestamp;
          if (now.toMillis() - lastSentAt.toMillis() < thirtyDaysMs) {
            continue; // Skip: Recipient was alerted too recently
          }
        }

        // Set cooldown timestamp
        await cooldownRef.set({ lastSentAt: now }, { merge: true });

        // Dispatch alert
        const formattedUser = displayName ? `@${displayName}` : "A kindred soul";
        await sendNotificationToUser(candidateUid, {
          type: "COSMIC_TWIN",
          title: "✦ Rare Cosmic Mirror Detected",
          body: `${formattedUser} just entered Lunaris with your exact ${sunSign} Sun, ${moonSign} Moon, and ${risingSign} Rising.`,
          deepLink: `https://lunaris.web.app/profile/${newUid}`,
          metadata: {
            matchedUid: newUid,
            sunSign,
            moonSign,
            risingSign,
          },
        });
      }
    } catch (error) {
      console.error("[Cosmic Twin Trigger Error]:", error);
      throw error;
    }
  }
);
