import type { ChatMessage } from "../../types/domain";
import type { ChatMsg } from "./types";

export function chatMsgFromDomain(m: ChatMessage, myId: string): ChatMsg {
  if (m.messageType === "system") return { type: "system", text: m.text };
  return {
    type: m.senderId === myId ? "me" : "other",
    name: m.senderName,
    text: m.text,
    time: new Date(m.createdAt).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export const SEED_MSGS: ChatMsg[] = [
  {
    type: "system",
    text: "공구방이 열렸어요. 픽업 장소와 소분 방식을 확인해주세요",
  },
  {
    type: "other",
    name: "공구장",
    text: "안녕하세요! 픽업 시간에 맞춰 준비해둘게요 😊",
    time: "오후 4:02",
  },
];
