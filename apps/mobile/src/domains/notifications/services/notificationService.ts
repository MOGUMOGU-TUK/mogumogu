import * as Notifications from "expo-notifications";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { Platform } from "react-native";

import { getFirebaseServices } from "../../../services/firebase/client";

type NotifItemShape = {
  id: string;
  title: string;
  body: string;
  gongguId?: string;
  type?: string;
  receivedAt: string;
  read: boolean;
};

const NOTIFICATIONS = "notifications";
const ITEMS = "items";

export async function writeNotifDoc(
  userId: string,
  notif: { type: string; title: string; body: string; gongguId?: string }
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  try {
    await addDoc(collection(services.db, NOTIFICATIONS, userId, ITEMS), {
      ...notif,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // best-effort; Cloud Functions 없는 환경에서 권한 오류 등 무시
  }
}

export function subscribeNotifs(
  userId: string,
  onChange: (items: NotifItemShape[]) => void
): () => void {
  const services = getFirebaseServices();
  if (!services) return () => {};
  const q = query(
    collection(services.db, NOTIFICATIONS, userId, ITEMS),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => ({
          id: d.id,
          title: String(d.data().title ?? ""),
          body: String(d.data().body ?? ""),
          gongguId: d.data().gongguId as string | undefined,
          type: d.data().type as string | undefined,
          receivedAt: String(d.data().createdAt ?? new Date().toISOString()),
          read: Boolean(d.data().read),
        }))
      ),
    () => {} // 권한 오류 등은 조용히 무시 (AppShell이 uid 변경 시 재구독)
  );
}

export async function markNotifReadDoc(userId: string, notifId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await updateDoc(doc(services.db, NOTIFICATIONS, userId, ITEMS, notifId), { read: true });
}

export async function clearNotifsDoc(userId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  const snap = await getDocs(collection(services.db, NOTIFICATIONS, userId, ITEMS));
  if (snap.empty) return;
  const batch = writeBatch(services.db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

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
