import * as Notifications from "expo-notifications";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Platform } from "react-native";

import { getFirebaseServices } from "../../../services/firebase/client";

export type NotifSettings = {
  join: boolean;
  full: boolean;
  deadline: boolean;
  chat: boolean;
};

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  join: true,
  full: true,
  deadline: true,
  chat: false
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

/**
 * 알림 권한 요청 + FCM 디바이스 토큰 취득 후 Firestore에 저장.
 * 실제 FCM 토큰은 EAS Development Build 이상에서만 발급된다.
 */
export async function initNotifications(uid: string): Promise<void> {
  if (Platform.OS === "web") return;

  // 알림 설정 문서는 FCM 토큰 여부와 무관하게 항상 생성
  await ensureUserDoc(uid);

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  try {
    const tokenResult = await Notifications.getDevicePushTokenAsync();
    await saveFcmToken(uid, tokenResult.data as string);
  } catch {
    // 에뮬레이터 또는 Google Play Services 미지원 환경에서는 토큰 발급 불가
  }
}

async function ensureUserDoc(uid: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await setDoc(doc(services.db, "users", uid), { fcmToken: null }, { merge: true });
}

async function saveFcmToken(uid: string, fcmToken: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await setDoc(doc(services.db, "users", uid), { fcmToken }, { merge: true });
}

export async function loadNotifSettings(uid: string): Promise<NotifSettings> {
  const services = getFirebaseServices();
  if (!services) return DEFAULT_NOTIF_SETTINGS;

  const snap = await getDoc(doc(services.db, "users", uid));
  const data = snap.data();
  if (!data?.notifSettings) return DEFAULT_NOTIF_SETTINGS;
  return { ...DEFAULT_NOTIF_SETTINGS, ...(data.notifSettings as Partial<NotifSettings>) };
}

export async function saveNotifSettings(uid: string, settings: NotifSettings): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await setDoc(doc(services.db, "users", uid), { notifSettings: settings }, { merge: true });
}
