import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/shared/lib/axiosInstance";

/** Origin API-сервера без `/api` (Socket.IO висит на том же хосте, что Express). */
export function getApiOrigin(): string {
  let raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000").trim();
  raw = raw.replace(/\/+$/, "");
  raw = raw.replace(/\/api$/i, "");
  return raw;
}

export type ChatSocketUser = {
  id: number;
  name: string;
  username?: string;
  avatarUrl?: string | null;
};

export type ChatMessageSender = {
  id: number;
  name: string;
  email?: string;
  username?: string;
  avatarUrl?: string | null;
};

export type ChatMessage = {
  id: number;
  roomId: number;
  senderId: number;
  senderRole: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  sender?: ChatMessageSender | null;
};

export type WsReadyPayload = {
  message: string;
  user: ChatSocketUser;
};

export type RoomHistoryPayload = {
  roomId: number;
  messages: ChatMessage[];
};

export type ChannelHistoryPayload = {
  channelId: number;
  messages: ChatMessage[];
};

export type MessageNewPayload = {
  message: ChatMessage;
};

export type RoomJoinedPayload = {
  status: string;
  event: string;
  roomId: number;
};

export type SocketErrorPayload = {
  status: string;
  message: string;
};

/** Подключение к WS с access token из axios (после login/refresh). */
export function createChatSocket(): Socket {
  const token = getAccessToken();

  return io(getApiOrigin(), {
    withCredentials: true,
    auth: {
      token: token || undefined,
    },
  });
}

/** roomId в payload — сервер принимает roomId, groupId или channelId. */
export function emitJoinRoom(
  socket: Socket,
  roomId: number,
  callback?: (res: RoomJoinedPayload | SocketErrorPayload) => void,
) {
  socket.emit("room:join", { roomId, groupId: roomId, channelId: roomId }, callback);
}

export function emitSendMessage(
  socket: Socket,
  roomId: number,
  text: string,
  callback?: (res: { status: string; event?: string; message?: ChatMessage }) => void,
) {
  const payload = { roomId, groupId: roomId, channelId: roomId, text };
  socket.emit("message:send", payload, callback);
}
