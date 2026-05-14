"use client";

import { useMemo, useState } from "react";
import { eduChatRoomFixtures as rooms } from "@/shared/mocks/eduChatLayoutFixtures";
import "./page.css";

export default function ChatPage() {
  const [selectedId, setSelectedId] = useState(rooms[0]?.id ?? 1);
  const [draft, setDraft] = useState("");

  const selected = useMemo(
    () => rooms.find((r) => r.id === selectedId) ?? rooms[0],
    [selectedId],
  );

  return (
    <main className="educhat-page">
      <section className="desktop-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="logo">↻</div>
            <span>EduChat</span>
          </div>

          <nav className="side-nav">
            <button type="button" className="side-link active">
              Чаты
            </button>
            <button type="button" className="side-link">
              Профиль
            </button>
          </nav>

          <div className="sidebar-card">
            <span className="small-label">@botAi</span>
            <p>AI-помощник для учебных чатов</p>
          </div>
        </aside>

        <section className="chat-panel">
          <header className="topbar">
            <div>
              <h1>Привет, Иван! 👋</h1>
              <p>Выберите чат, чтобы начать общение</p>
            </div>

            <div className="profile-mini">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=faces"
                alt="Профиль"
              />
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
                onClick={() => setSelectedId(room.id)}
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
      </section>
    </main>
  );
}
