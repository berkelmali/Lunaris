import * as admin from "firebase-admin";
import { NotificationDocument } from "../types/notifications";

const db = admin.firestore();

/**
 * Dispatches an FCM alert to all active devices of a user,
 * automatically removing stale or unregistered tokens.
 */
export async function sendNotificationToUser(
  recipientUid: string,
  notification: Omit<NotificationDocument, "recipientUid" | "isRead" | "createdAt">
): Promise<void> {
  // 1. Fetch recipient's active tokens
  const tokensSnapshot = await db
    .collection("users")
    .doc(recipientUid)
    .collection("fcm_tokens")
    .get();

  if (tokensSnapshot.empty) {
    return; // User has no registered devices
  }

  const tokenDocs = tokensSnapshot.docs;
  const registrationTokens = tokenDocs.map((doc) => doc.data().token as string);

  // 2. Prepare Payload
  const payload: admin.messaging.MulticastMessage = {
    tokens: registrationTokens,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: {
      type: notification.type,
      deepLink: notification.deepLink,
      metadata: JSON.stringify(notification.metadata || {}),
    },
    webpush: {
      fcmOptions: {
        link: notification.deepLink,
      },
    },
  };

  // 3. Dispatch multicast
  const response = await admin.messaging().sendEachForMulticast(payload);

  // 4. Clean up invalid/unregistered tokens
  const tokensToDelete: Promise<FirebaseFirestore.WriteResult>[] = [];
  response.responses.forEach((res, index) => {
    if (!res.success) {
      const errorCode = res.error?.code;
      if (
        errorCode === "messaging/registration-token-not-registered" ||
        errorCode === "messaging/invalid-registration-token"
      ) {
        tokensToDelete.push(tokenDocs[index].ref.delete());
      }
    }
  });

  if (tokensToDelete.length > 0) {
    await Promise.all(tokensToDelete);
    console.log(`Pruned ${tokensToDelete.length} stale FCM tokens for user: ${recipientUid}`);
  }

  // 5. Append record to /notifications collection for in-app bell tray
  await db.collection("notifications").add({
    ...notification,
    recipientUid,
    isRead: false,
    createdAt: admin.firestore.Timestamp.now(),
  });
}
