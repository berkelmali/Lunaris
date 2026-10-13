import { Timestamp } from "firebase-admin/firestore";

export type NotificationType = 
  | "COSMIC_TWIN"
  | "ARCANA_ECHO"
  | "TRANSIT_ALERT"
  | "COOP_INVITE";

export type DevicePlatform = "WEB" | "IOS" | "ANDROID";

export interface UserNotificationPreferences {
  cosmicTwinsEnabled: boolean;     // Opt-in for Big Three twin alerts
  arcanaEchoEnabled: boolean;      // Opt-in for card synchronicity
  dailyTransitEnabled: boolean;    // Opt-in for planetary alerts
  quietHoursStart?: string;        // "22:00"
  quietHoursEnd?: string;          // "08:00"
}

export interface FcmTokenDocument {
  token: string;
  platform: DevicePlatform;
  deviceModel?: string;
  createdAt: Timestamp;
  lastSeenAt: Timestamp;
}

export interface NotificationDocument {
  id?: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  deepLink: string;
  metadata: {
    sourceUid?: string;
    cardId?: number;
    aspectType?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: Timestamp;
}
