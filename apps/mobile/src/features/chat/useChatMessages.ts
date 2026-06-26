import { useEffect, useState } from "react";

import { subscribeMessages } from "../../services/firebase/chatRepository";
import { isFirebaseConfigured } from "../../services/firebase/client";
import type { ChatMessage } from "../../types/domain";

/**
 * 공구별 채팅 메시지 실시간 구독 (mock → Firebase 전환 4단계).
 * Firebase 미설정 시 null 을 반환하고, 호출부는 로컬 snapshot 으로 폴백한다.
 */
export function useChatMessages(gongguId: string): ChatMessage[] | null {
  const [messages, setMessages] = useState<ChatMessage[] | null>(() =>
    isFirebaseConfigured() ? [] : null
  );

  useEffect(() => {
    if (!isFirebaseConfigured() || !gongguId) {
      setMessages(null);
      return;
    }

    return subscribeMessages(gongguId, setMessages);
  }, [gongguId]);

  return messages;
}
