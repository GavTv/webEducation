import type { ChatMessage as ServerChatMessage } from "@/shared/lib/chatSocket";

export type UiChatMessage = {
  id: string;
  author: string;
  text: string;
  time: string;
  isMine?: boolean;
  isBot?: boolean;
};

export function formatChatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function serverMessageToUi(
  msg: ServerChatMessage,
  myUserId?: number,
): UiChatMessage {
  return {
    id: String(msg.id),
    author: msg.sender?.name ?? msg.sender?.username ?? "Пользователь",
    text: msg.text,
    time: formatChatTime(msg.createdAt),
    isMine: myUserId != null && msg.senderId === myUserId,
  };
}
