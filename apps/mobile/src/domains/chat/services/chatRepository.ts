import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";

import type { ChatMessage, User } from "../../../types/domain";
import { getFirebaseServices } from "../../../services/firebase/client";

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
}
