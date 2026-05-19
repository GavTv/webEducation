"use client";

import Link from "next/link";
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
import { ArrowLeft, Lock, Search, Send, Star } from "lucide-react";
import { fetchClassAccess, joinClass } from "@/shared/lib/classesApi";
import { eduChatRoomFixtures as rooms } from "@/shared/mocks/eduChatLayoutFixtures";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import { getAvatarSrc } from "@/shared/lib/getAvatarSrc";
import { getNameInitials } from "@/shared/lib/getNameInitials";
import { BrandLogo } from "@/widgets/appShell/BrandLogo";
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
    <main className="educhat-page">
      <header className="chat-mobile-topbar" aria-label="Мобильная шапка">
        <Link className="chat-back-link" href={clientRoutes.classes}>
          <ArrowLeft size={18} strokeWidth={2} aria-hidden />
          Классы
        </Link>
      </header>

      <section className="desktop-shell">
        <aside className="classes-sidebar">
          <BrandLogo />

          <nav className="sidebar-nav">
            <Link className="nav-link active" href={clientRoutes.chat}>
              <span className="nav-icon">●</span>
              Чаты
            </Link>
            <Link className="nav-link" href={clientRoutes.profile}>
              <span className="nav-icon">♙</span>
              Профиль
            </Link>
          </nav>

          <div className="sidebar-info">
            <div className="shield-mini">🛡</div>
            <div>
              <h3>Безопасное обучение</h3>
              <p>Все классы защищены паролем</p>
            </div>
          </div>
        </aside>

        <div
          className={`chat-columns${mobileThreadOpen ? " chat-columns--thread" : ""}`}
        >
          <section className="chat-panel">
            <header className="chat-list-header">
              <div className="chat-list-header-main">
                <Link className="chat-back-link" href={clientRoutes.classes}>
                  <ArrowLeft size={18} strokeWidth={2} aria-hidden />
                  Классы
                </Link>
                <div>
                  <h1>Привет, {firstName}! 👋</h1>
                  <p>Выберите чат, чтобы начать общение</p>
                </div>
              </div>

              <Link
                className="chat-profile-chip"
                href={clientRoutes.profile}
                aria-label="Профиль"
              >
                <div className="chat-profile-avatar">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt=""
                      className="chat-profile-avatar-img"
                    />
                  ) : (
                    avatarInitials
                  )}
                </div>
                <div className="chat-profile-text">
                  <strong>{firstName}</strong>
                  <span className="chat-profile-status">
                    <span className="chat-online-dot" aria-hidden />
                    Онлайн
                  </span>
                </div>
              </Link>
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
              <button type="button" className="chat-create-btn">
                + Создать чат
              </button>
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
            <button
              type="button"
              className="chat-mobile-back"
              onClick={closeMobileThread}
              aria-label="К списку чатов"
            >
              <ArrowLeft size={18} strokeWidth={2} aria-hidden />
              Чаты
            </button>

            <header className="thread-header">
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
                    <p>{message.text}</p>
                    <footer className="message-footer">
                      <time>{message.time}</time>
                      {message.isMine ? (
                        <span className="message-read" aria-label="Прочитано">
                          ✓✓
                        </span>
                      ) : null}
                    </footer>
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

            <form className="message-input" onSubmit={sendMessage}>
              <input
                placeholder={
                  isBotChat
                    ? "Напишите сообщение боту..."
                    : "Напишите сообщение..."
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="submit"
                className="message-send-btn"
                aria-label="Отправить"
                disabled={!draft.trim()}
              >
                <Send size={20} strokeWidth={2} aria-hidden />
              </button>
            </form>
          </aside>
        </div>
      </section>
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
