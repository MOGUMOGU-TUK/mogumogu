import type { NotifSettings } from "./services/notificationService";

export type NotifKey = keyof NotifSettings;

export type NotifItem = {
  id: string;
  title: string;
  body: string;
  gongguId?: string;
  type?: string;
  receivedAt: string;
  read: boolean;
};

export const NOTIF_ITEMS: Array<{ key: NotifKey; label: string }> = [
  { key: "join", label: "새 참여자 발생" },
  { key: "full", label: "모집 인원 달성" },
  { key: "deadline", label: "모집 마감 임박" },
  { key: "chat", label: "새 채팅 메시지" },
];

export const TYPE_LABEL: Record<string, string> = {
  join: "새 참여자",
  full: "모집 완료",
  deadline: "마감 임박",
  chat: "채팅 메시지",
};
