#!/bin/bash

set -e

cd client

echo "========== create BotAiWidget =========="

mkdir -p src/features/botAi/ui

cat > src/features/botAi/ui/BotAiWidget.tsx <<'EOF'
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import "./BotAiWidget.css";

type BotMessage = {
  id: number;
  author: "user" | "bot";
  text: string;
};

export function BotAiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 1,
      author: "bot",
      text: "Привет! Я AI-помощник. Задавайте вопросы!",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    const now = Date.now();

    setMessages((prev) => [
      ...prev,
      {
        id: now,
        author: "user",
        text: trimmedText,
      },
      {
        id: now + 1,
        author: "bot",
        text: "привет",
      },
    ]);

    setText("");
  };

  return (
    <>
      <button
        type="button"
        className="bot-ai-card"
        onClick={() => setIsOpen(true)}
        aria-label="Открыть чат с AI-ботом"
      >
        <span className="bot-ai-icon">🤖</span>

        <span className="bot-ai-info">
          <span className="bot-ai-name">@botAi</span>
          <span className="bot-ai-description">
            Ваш AI-помощник. Задавайте вопросы!
          </span>
        </span>

        <span className="bot-ai-action">Написать</span>
      </button>

      {isOpen ? (
        <div className="bot-ai-overlay" onClick={() => setIsOpen(false)}>
          <aside
            className="bot-ai-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="bot-ai-dialog-header">
              <div className="bot-ai-dialog-user">
                <div className="bot-ai-dialog-avatar">🤖</div>

                <div>
                  <h2>@botAi</h2>
                  <p>AI-помощник онлайн</p>
                </div>
              </div>

              <button
                type="button"
                className="bot-ai-close"
                onClick={() => setIsOpen(false)}
                aria-label="Закрыть чат"
              >
                ×
              </button>
            </header>

            <div className="bot-ai-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.author === "user"
                      ? "bot-ai-message bot-ai-message--user"
                      : "bot-ai-message bot-ai-message--bot"
                  }
                >
                  {message.text}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            <form className="bot-ai-form" onSubmit={handleSubmit}>
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Напишите сообщение..."
              />

              <button type="submit">Отправить</button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
EOF

cat > src/features/botAi/ui/BotAiWidget.css <<'EOF'
.bot-ai-card {
  position: fixed;
  left: 48px;
  bottom: 32px;
  z-index: 40;
  width: min(560px, calc(100vw - 96px));
  min-height: 132px;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 28px;
  background: rgba(15, 23, 42, 0.96);
  color: #ffffff;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
  cursor: pointer;
  text-align: left;
}

.bot-ai-card:hover {
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateY(-1px);
}

.bot-ai-icon {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: rgba(124, 58, 237, 0.22);
  font-size: 42px;
}

.bot-ai-info {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.bot-ai-name {
  color: #a78bfa;
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.bot-ai-description {
  color: #a1a1aa;
  font-size: 18px;
  line-height: 1.35;
}

.bot-ai-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  padding: 0 32px;
  border-radius: 22px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: #ffffff;
  font-size: 20px;
  font-weight: 900;
  white-space: nowrap;
}

.bot-ai-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: flex-end;
  background: rgba(2, 6, 23, 0.48);
  backdrop-filter: blur(6px);
}

.bot-ai-dialog {
  width: min(460px, 100vw);
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: #070a13;
  color: #ffffff;
  border-left: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: -24px 0 80px rgba(0, 0, 0, 0.42);
}

.bot-ai-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.bot-ai-dialog-user {
  display: flex;
  align-items: center;
  gap: 14px;
}

.bot-ai-dialog-avatar {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: rgba(124, 58, 237, 0.24);
  font-size: 28px;
}

.bot-ai-dialog-header h2 {
  margin: 0;
  color: #a78bfa;
  font-size: 22px;
  line-height: 1.1;
}

.bot-ai-dialog-header p {
  margin: 5px 0 0;
  color: #9ca3af;
  font-size: 14px;
}

.bot-ai-close {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

.bot-ai-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  overflow-y: auto;
}

.bot-ai-message {
  max-width: 82%;
  padding: 12px 15px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.45;
  word-break: break-word;
}

.bot-ai-message--bot {
  align-self: flex-start;
  background: rgba(30, 41, 59, 0.95);
  color: #e5e7eb;
  border-bottom-left-radius: 6px;
}

.bot-ai-message--user {
  align-self: flex-end;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: #ffffff;
  border-bottom-right-radius: 6px;
}

.bot-ai-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.bot-ai-form input {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.95);
  color: #ffffff;
  outline: none;
  padding: 14px 16px;
  font: inherit;
}

.bot-ai-form input:focus {
  border-color: rgba(139, 92, 246, 0.7);
}

.bot-ai-form button {
  border: 0;
  border-radius: 16px;
  padding: 0 18px;
  background: #7c3aed;
  color: #ffffff;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 720px) {
  .bot-ai-card {
    left: 16px;
    right: 16px;
    bottom: 16px;
    width: auto;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 14px;
    min-height: 104px;
    padding: 16px;
  }

  .bot-ai-icon {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    font-size: 32px;
  }

  .bot-ai-name {
    font-size: 23px;
  }

  .bot-ai-description {
    font-size: 15px;
  }

  .bot-ai-action {
    grid-column: 1 / -1;
    min-height: 48px;
    font-size: 16px;
  }

  .bot-ai-dialog {
    width: 100vw;
  }
}
EOF

echo "========== patch chat page =========="

node <<'NODE'
const fs = require('fs');

const file = 'src/app/chat/page.tsx';

if (!fs.existsSync(file)) {
  console.log('Не найден src/app/chat/page.tsx');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.includes('BotAiWidget')) {
  const lastImport = [...text.matchAll(/^import .*;$/gm)].pop();

  if (lastImport) {
    const index = lastImport.index + lastImport[0].length;
    text =
      text.slice(0, index) +
      '\nimport { BotAiWidget } from "@/features/botAi/ui/BotAiWidget";' +
      text.slice(index);
  }
}

if (!text.includes('<BotAiWidget />')) {
  const index = text.lastIndexOf('</main>');

  if (index === -1) {
    console.log('Не нашёл </main> в src/app/chat/page.tsx');
    process.exit(1);
  }

  text = text.slice(0, index) + '\n      <BotAiWidget />\n' + text.slice(index);
}

fs.writeFileSync(file, text);

console.log('PATCHED src/app/chat/page.tsx');
NODE

echo "========== done =========="
echo "Теперь перезапусти client: npm run dev"
