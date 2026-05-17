"use client";

import Link from "next/link";
import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { eduChatRoomFixtures as rooms } from "@/shared/mocks/eduChatLayoutFixtures";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import "./page.css";

function getApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function getAvatarSrc(avatarUrl?: string | null) {
  if (!avatarUrl) {
    return "";
  }

  if (avatarUrl.startsWith("http")) {
    return avatarUrl;
  }

  return `${getApiOrigin()}${avatarUrl}`;
}



const MOBILE_BP = "(max-width: 900px)";

function ChatPageContent() {
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "Пользователь";
  const firstName = userName.split(/\s+/)[0] || "Пользователь";
  const avatarSrc = getAvatarSrc(user?.avatarUrl);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chatGreeting = isMounted && firstName
    ? `Привет, ${firstName}! 👋`
    : "\u00A0";

  const chatAvatarFallbackLetter = isMounted && firstName
    ? firstName.charAt(0).toUpperCase()
    : "";

  const safeFirstName = isMounted ? firstName : "Пользователь";
  const safeAvatarSrc = isMounted ? avatarSrc : "";

  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(rooms[0]?.id ?? 1);
  const [draft, setDraft] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const selected = useMemo(
    () => rooms.find((r) => r.id === selectedId) ?? rooms[0],
    [selectedId],
  );

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

  return (
    <main className="educhat-page">
      <header className="chat-mobile-topbar" aria-label="Мобильная шапка">
        <div className="chat-mobile-brand">
          <div className="brand-icon brand-icon--sm">
            <span>✦</span>
          </div>
          <span className="brand-name">EduChat</span>
        </div>
        <Link className="chat-mobile-toplink" href={clientRoutes.classes}>
          Классы
        </Link>
      </header>

      <section className="desktop-shell">
        <aside className="classes-sidebar">
          <div className="brand">
            <div className="brand-icon">
              <span>✦</span>
            </div>
            <span className="brand-name">EduChat</span>
          </div>

          <nav className="sidebar-nav">
            <Link className="nav-link active" href={clientRoutes.chat}>
              <span className="nav-icon">●</span>
              Чаты
            </Link>
            <Link className="nav-link" href={clientRoutes.classes}>
              <span className="nav-icon">●</span>
              Классы
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
              <p>Все классы защищены паролем.</p>
            </div>
          </div>
        </aside>

        <div
          className={`chat-columns${mobileThreadOpen ? " chat-columns--thread" : ""}`}
        >
          <section className="chat-panel">
            <header className="topbar">
              <div>
                <h1 suppressHydrationWarning>{chatGreeting}</h1>
                <p>Выберите чат, чтобы начать общение</p>
              </div>

              <div className="profile-mini">
                {isMounted && avatarSrc ? (
                <img
                  className="chat-current-user-avatar"
                  src={avatarSrc}
                  alt={firstName || "Пользователь"}
                />
              ) : (
                <div className="chat-current-user-avatar chat-current-user-avatar--empty">
                  {chatAvatarFallbackLetter}
                </div>
              )}
                <span />
              </div>
            </header>

            <div className="search">
              <span>⌕</span>
              <input placeholder="Поиск по чатам" />
            </div>

            <div className="section-head">
              <h2>Мои чаты</h2>
              <button type="button">+ Создать чат</button>
            </div>

            <div className="rooms">
              {rooms.map((room) => (
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
                      {room.locked ? <span className="lock">🔒</span> : null}
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
              <button type="button">Написать</button>
            </div>
          </section>

          <aside className="preview-panel">
            <button
              type="button"
              className="chat-mobile-back"
              onClick={closeMobileThread}
              aria-label="К списку чатов"
            >
              ← Чаты
            </button>

            <div className="preview-header">
              <div>
                <h2>{selected?.title ?? "Чат"}</h2>
                <p>{selected?.onlineLabel ?? "Участники онлайн"}</p>
              </div>
              <span>{selected?.icon ?? "#"}</span>
            </div>

            <div className="messages">
              <div className="message">
                <b>Мария</b>
                <p>Всем привет! 👋</p>
              </div>
              <div className="message">
                <b>Алексей</b>
                <p>Кто уже сделал домашнее задание?</p>
              </div>
              <div className="message bot">
                <b>@botAi</b>
                <p>Я могу помочь объяснить тему или кратко суммировать чат.</p>
              </div>
            </div>

            <div className="message-input">
              <input
                placeholder="Напишите сообщение..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="button" aria-label="Отправить">
                ➤
              </button>
            </div>
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
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "Пользователь";
  const firstName = userName.split(/\s+/)[0] || "Пользователь";
  const avatarSrc = getAvatarSrc(user?.avatarUrl);

  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatPageContent />
    </Suspense>
  );
}
