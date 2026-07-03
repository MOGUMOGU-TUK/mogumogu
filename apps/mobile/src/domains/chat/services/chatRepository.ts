import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";

import type { ChatMessage, User } from "../../../types/domain";
import { getFirebaseServices } from "../../../services/firebase/client";
import { writeNotifDoc } from "../../notifications/services/notificationService";

const CHATS = "chats";
const MESSAGES = "messages";

/**
 * 공구별 채팅 메시지 실시간 구독 (mock → Firebase 전환 4단계).
 * 경로: chats/{gongguId}/messages, createdAt 오름차순.
 */
export function subscribeMessages(
  gongguId: string,
  onChange: (messages: ChatMessage[]) => void
): () => void {
  const services = getFirebaseServices();
  if (!services) {
    return () => {};
  }

  const messagesQuery = query(
    collection(services.db, CHATS, gongguId, MESSAGES),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(messagesQuery, (snap) =>
    onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<ChatMessage, "id">), id: d.id })))
  );
}

/** 채팅 메시지 전송. rules: chats/{id}/messages create = 로그인 사용자 허용. */
export async function sendMessageDoc(gongguId: string, sender: User, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }

  await addDoc(collection(services.db, CHATS, gongguId, MESSAGES), {
    gongguId,
    senderId: sender.id,
    senderName: sender.nickname,
    text: trimmed,
    messageType: "user",
    createdAt: new Date().toISOString()
  });

  // 채팅 알림 → 참여자 + 공구장에게 (발신자 제외)
  const [gongguSnap, partSnap] = await Promise.all([
    getDoc(doc(services.db, "gonggus", gongguId)),
    getDocs(query(collection(services.db, "participations"), where("gongguId", "==", gongguId))),
  ]);
  const gongguData = gongguSnap.data();
  const participantIds = partSnap.docs.map((d) => String(d.data().userId));
  const hostId = gongguData?.hostUserId as string | undefined;
  const targets = [
    ...new Set([...participantIds, ...(hostId ? [hostId] : [])]),
  ].filter((id) => id !== sender.id);
  void Promise.all(
    targets.map((uid) =>
      writeNotifDoc(uid, {
        type: "chat",
        title: `[${gongguData?.title ?? "공구"}] 새 채팅`,
        body: `${sender.nickname}: ${trimmed.slice(0, 30)}`,
        gongguId,
      })
    )
  );
}
