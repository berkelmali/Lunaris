import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK once at the root entry point
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export all Cloud Functions
export { onSessionResolved } from "./onSessionResolved";
export { onNatalChartCompleted } from "./triggers/onNatalChartCompleted";
export { onTarotCardDrawn } from "./triggers/onTarotCardDrawn";
