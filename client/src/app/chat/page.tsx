"use client";

import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Search, Star } from "lucide-react";
import { ChatMessageInput } from "./ChatMessageInput";
import { fetchClassAccess, joinClass } from "@/shared/lib/classesApi";
import { eduChatRoomFixtures as rooms } from "@/shared/mocks/eduChatLayoutFixtures";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import { getAvatarSrc } from "@/shared/lib/getAvatarSrc";
import { getNameInitials } from "@/shared/lib/getNameInitials";
import { AppNav } from "@/widgets/appShell/AppNav";
import { AppProfileChip } from "@/widgets/appShell/AppProfileChip";
import { BrandLogo } from "@/widgets/appShell/BrandLogo";
import { MobileBottomNav } from "@/widgets/appShell/MobileBottomNav";
import { canManageClasses } from "@/shared/lib/permissions";
import "./page.css";

const MOBILE_BP = "(max-width: 900px)";
const BOT_ROOM_ID = 999001;

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  time: string;
  isMine?: boolean;
  isBot?: boolean;
};

type ChatRoom = {
  id: number;
  title: string;
  icon: string;
  iconClass: string;
  locked?: boolean;
  author: string;
  message: string;
  time: string;
  unread?: number;
  onlineLabel?: string;
  starred?: boolean;
};

const botRoom: ChatRoom = {
  id: BOT_ROOM_ID,
  title: "@botAi",
  icon: "🤖",
  iconClass: "purple",
  author: "@botAi",
  message: "Привет! Я @botAi — ваш AI-помощник…",
  time: "сейчас",
  onlineLabel: "AI-помощник онлайн",
  starred: true,
};

const defaultMessagesByRoomId: Record<number, ChatMessage[]> = {
  [BOT_ROOM_ID]: [
    {
      id: "bot-1",
      author: "@botAi",
      text: "Привет! Я @botAi — ваш AI-помощник по обучению. Чем могу помочь?",
      time: "11:30",
      isBot: true,
    },
    {
      id: "user-1",
      author: "Вадим",
      text: "Привет! Расскажи про React hooks",
      time: "11:31",
      isMine: true,
    },
    {
      id: "bot-2",
      author: "@botAi",
      text: "React hooks — это функции, которые позволяют использовать состояние и другие возможности React без написания классов. Основные: useState, useEffect, useContext…",
      time: "11:32",
      isBot: true,
    },
  ],
  1: [
    { id: "common-1", author: "Мария", text: "Всем привет! 👋", time: "14:30" },
    {
      id: "common-2",
      author: "Алексей",
      text: "Кто уже сделал домашнее задание?",
      time: "14:31",
      isMine: true,
    },
    {
      id: "common-3",
      author: "@botAi",
      text: "Я могу помочь объяснить тему или кратко суммировать чат.",
      time: "14:32",
      isBot: true,
    },
  ],
};

function ChatPageContent() {
  const router = useRouter();
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "";
  const nameParts = userName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Пользователь";
  const lastName = nameParts[1] || "";
  const avatarInitials = getNameInitials(firstName, lastName, user?.name);
  const avatarSrc = getAvatarSrc(user?.avatarUrl);
  const canCreateChat = canManageClasses(user?.role);

  const searchParams = useSearchParams();
  const chatRooms = useMemo(() => [botRoom, ...rooms], []);
  const [selectedId, setSelectedId] = useState(chatRooms[0]?.id ?? BOT_ROOM_ID);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [messagesByRoomId, setMessagesByRoomId] =
    useState<Record<number, ChatMessage[]>>(defaultMessagesByRoomId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastScrolledRoomRef = useRef<number | null>(null);

  const selected = useMemo(
    () => chatRooms.find((r) => r.id === selectedId) ?? chatRooms[0],
    [chatRooms, selectedId],
  );

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chatRooms;
    return chatRooms.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q),
    );
  }, [chatRooms, searchQuery]);

  const selectedMessages = messagesByRoomId[selected?.id ?? BOT_ROOM_ID] ?? [];
  const isBotChat = selected?.id === BOT_ROOM_ID;

  const displayAuthorName = useMemo(() => {
    if (!userName) return firstName;
    return firstName;
  }, [firstName, userName]);

  useEffect(() => {
    const roomChanged = lastScrolledRoomRef.current !== selectedId;
    lastScrolledRoomRef.current = selectedId;

    const behavior = roomChanged ? "auto" : "smooth";

    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    });

    return () => cancelAnimationFrame(id);
  }, [selectedMessages, selectedId]);

  useEffect(() => {
    const classId = searchParams.get("classId");
    if (!classId) return;
    const id = Number(classId);
    if (!Number.isFinite(id)) return;
    const room = rooms.find((r) => r.id === id);
    if (room) {
      setSelectedId(id);
      const mq = window.matchMedia(MOBILE_BP);
      if (mq.matches) setMobileThreadOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const classId = searchParams.get("classId");
    if (!user || !classId) return;
    const id = Number(classId);
    if (!Number.isFinite(id)) return;

    let cancelled = false;

    (async () => {
      try {
        const access = await fetchClassAccess(id);
        if (cancelled) return;
        if (access.hasAccess && !access.needsPassword) {
          if (!access.isMember) {
            await joinClass(id);
          }
          return;
        }
        if (!access.hasAccess) {
          router.replace(clientRoutes.classes);
        }
      } catch {
        if (!cancelled) router.replace(clientRoutes.classes);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, searchParams, router]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BP);
    const sync = () => {
      if (!mq.matches) setMobileThreadOpen(false);
    };
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const selectRoom = useCallback((id: number) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);

  const closeMobileThread = useCallback(() => setMobileThreadOpen(false), []);

  const openBotChat = useCallback(() => {
    selectRoom(BOT_ROOM_ID);
  }, [selectRoom]);

  const formatTime = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const sendMessage = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = draft.trim();

      if (!text || !selected) return;

      const userMessage: ChatMessage = {
        id: `${selected.id}-user-${Date.now()}`,
        author: displayAuthorName,
        text,
        time: formatTime(),
        isMine: true,
      };

      const botReply: ChatMessage = {
        id: `${selected.id}-bot-${Date.now()}`,
        author: "@botAi",
        text: "Спасибо за сообщение! Скоро здесь будет ответ от AI.",
        time: formatTime(),
        isBot: true,
      };

      setMessagesByRoomId((prev) => ({
        ...prev,
        [selected.id]: [
          ...(prev[selected.id] ?? []),
          userMessage,
          ...(isBotChat ? [botReply] : []),
        ],
      }));

      setDraft("");
    },
    [draft, displayAuthorName, isBotChat, selected],
  );

  return (
    <main
      className={`educhat-page app-page classes-page app-page--with-tabbar${
        mobileThreadOpen ? " app-page--hide-tabbar" : ""
      }`}
    >
      <section className="desktop-shell app-shell">
        <aside className="classes-sidebar app-sidebar">
          <BrandLogo />

          <AppNav active="chat" />

          <div className="sidebar-info">
            <div className="shield-mini">🛡</div>
            <div>
              <h3>Безопасное обучение</h3>
              <p>Классы могут быть защищены паролем</p>
            </div>
          </div>
        </aside>

        <div
          className={`chat-columns${mobileThreadOpen ? " chat-columns--thread" : ""}`}
        >
          <section className="chat-panel">
            <header className="chat-list-header app-content-header">
              <div className="chat-list-header-main">
                <div>
                  <h1>Чаты</h1>
                  <p className="app-header-subtitle app-only-desktop">
                    Выберите чат, чтобы начать общение
                  </p>
                </div>
              </div>

              <AppProfileChip
                firstName={firstName}
                avatarSrc={avatarSrc}
                avatarInitials={avatarInitials}
                href={clientRoutes.profile}
              />
            </header>

            <div className="chat-toolbar">
              <label className="chat-search">
                <Search size={20} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  placeholder="Поиск по чатам"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
              {canCreateChat ? (
                <button type="button" className="chat-create-btn">
                  + Создать чат
                </button>
              ) : null}
            </div>

            <div className="rooms">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={`room-card${room.id === selected?.id ? " selected" : ""}`}
                  onClick={() => selectRoom(room.id)}
                >
                  <div className={`room-icon ${room.iconClass}`}>{room.icon}</div>

                  <div className="room-info">
                    <h3>
                      {room.title}
                      {room.starred ? (
                        <Star
                          className="room-star"
                          size={14}
                          fill="currentColor"
                          aria-hidden
                        />
                      ) : null}
                      {room.locked ? (
                        <Lock
                          className="room-lock"
                          size={14}
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : null}
                    </h3>
                    <p>
                      {room.author}: {room.message}
                    </p>
                  </div>

                  <div className="room-meta">
                    <span>{room.time}</span>
                    {room.unread ? <b>{room.unread}</b> : null}
                  </div>
                </button>
              ))}
            </div>

            <div className="bot-card">
              <div className="bot-avatar">🤖</div>
              <div>
                <h3>@botAi</h3>
                <p>Ваш AI-помощник. Задавайте вопросы!</p>
              </div>
              <button type="button" onClick={openBotChat}>
                Написать
              </button>
            </div>
          </section>

          <aside className="thread-panel">
            <header className="thread-header">
              <button
                type="button"
                className="thread-back-btn"
                onClick={closeMobileThread}
                aria-label="К списку чатов"
              >
                <ArrowLeft size={20} strokeWidth={2} aria-hidden />
              </button>
              <div className={`thread-avatar ${selected?.iconClass ?? "purple"}`}>
                {selected?.icon ?? "🤖"}
              </div>
              <div className="thread-header-text">
                <h2>{selected?.title ?? "Чат"}</h2>
                <p>
                  <span className="chat-online-dot" aria-hidden />
                  {selected?.onlineLabel ?? "Участники онлайн"}
                </p>
              </div>
            </header>

            <div className="messages-wrap">
              <div className="chat-date-pill">Сегодня</div>
              {selectedMessages.map((message) => (
                <article
                  key={message.id}
                  className={`message-row${message.isMine ? " message-row--mine" : ""}${
                    message.isBot ? " message-row--bot" : ""
                  }`}
                >
                  {!message.isMine ? (
                    <div
                      className={`message-avatar ${selected?.iconClass ?? "purple"}`}
                      aria-hidden
                    >
                      {message.isBot ? "🤖" : message.author.charAt(0)}
                    </div>
                  ) : null}
                  <div
                    className={`message-bubble${message.isMine ? " message-bubble--mine" : ""}${
                      message.isBot ? " message-bubble--bot" : ""
                    }`}
                  >
                    <span className="message-author">{message.author}</span>
                    <div className="message-body">
                      <p>{message.text}</p>
                      <footer className="message-footer">
                        <time>{message.time}</time>
                      </footer>
                    </div>
                  </div>
                  {message.isMine ? (
                    <div className="message-avatar message-avatar--user" aria-hidden>
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" />
                      ) : (
                        avatarInitials
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
              <div ref={messagesEndRef} className="messages-end" aria-hidden />
            </div>

            <ChatMessageInput
              value={draft}
              onChange={setDraft}
              onSubmit={sendMessage}
              placeholder={
                isBotChat
                  ? "Напишите сообщение боту..."
                  : "Напишите сообщение..."
              }
            />
          </aside>
        </div>
      </section>

      <MobileBottomNav active="chat" />
    </main>
  );
}

function ChatFallback() {
  return (
    <main className="educhat-page educhat-page--loading">
      <section className="desktop-shell desktop-shell--loading" />
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatPageContent />
    </Suspense>
  );
}
