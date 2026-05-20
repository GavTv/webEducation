set -e

echo "📦 Делаю backup layout..."
cp src/app/layout.tsx src/app/layout.tsx.backup-botai-widget

echo "📁 Создаю папки..."
mkdir -p src/app/api/ai
mkdir -p src/widgets/aiBot

echo "🤖 Создаю API route для GigaChat..."
cat > src/app/api/ai/route.ts <<'EOF'
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type GigaChatTokenResponse = {
  access_token: string;
  expires_at: number;
};

type GigaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DailyLimitInfo = {
  date: string;
  count: number;
};

const DAILY_LIMIT = Number(process.env.GIGACHAT_DAILY_LIMIT ?? 20);

const GIGACHAT_SCOPE = process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS";
const GIGACHAT_MODEL = process.env.GIGACHAT_MODEL ?? "GigaChat";
const GIGACHAT_AUTH_URL =
  process.env.GIGACHAT_AUTH_URL ??
  "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const GIGACHAT_API_URL =
  process.env.GIGACHAT_API_URL ??
  "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

const dailyLimits = new Map<string, DailyLimitInfo>();

const PROGRAMMING_TOPICS = [
  "JavaScript: переменные, функции, массивы, объекты, промисы, async/await.",
  "TypeScript: типы, интерфейсы, generic, типизация props и API-ответов.",
  "React: компоненты, props, state, hooks, формы, обработчики событий.",
  "Next.js: app router, pages, route handlers, client/server components.",
  "Node.js и Express: routes, controllers, services, middleware, REST API.",
  "PostgreSQL и Sequelize: модели, миграции, сиды, связи таблиц, SQL.",
  "Авторизация: JWT, access token, refresh token, cookies, localStorage.",
  "Git: branch, checkout, merge, pull, push, conflict, commit.",
  "Отладка: stack trace, npm errors, CORS, build errors, TypeScript errors.",
  "Архитектура: FSD, shared, entities, features, widgets, app.",
];

const SYSTEM_PROMPT = `
Ты AI-помощник учебного проекта webEducation.
Отвечай только по теме программирования и разработки.

Разрешённые темы:
${PROGRAMMING_TOPICS.map((topic, index) => `${index + 1}. ${topic}`).join("\n")}

Правила:
- Отвечай на русском языке.
- Объясняй как наставник новичку.
- Давай короткие ответы: максимум 10-15 строк.
- Если нужен код, давай минимальный рабочий пример.
- Если вопрос не по программированию, ответь: "Я могу помочь только с вопросами по программированию."
- Не выдумывай файлы проекта. Если не хватает контекста, попроси показать файл или ошибку.
`;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getClientKey(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "local-user";
}

function checkDailyLimit(req: NextRequest) {
  const clientKey = getClientKey(req);
  const today = getTodayKey();
  const current = dailyLimits.get(clientKey);

  if (!current || current.date !== today) {
    dailyLimits.set(clientKey, { date: today, count: 1 });
    return { allowed: true, used: 1, limit: DAILY_LIMIT };
  }

  if (current.count >= DAILY_LIMIT) {
    return { allowed: false, used: current.count, limit: DAILY_LIMIT };
  }

  current.count += 1;
  dailyLimits.set(clientKey, current);

  return { allowed: true, used: current.count, limit: DAILY_LIMIT };
}

function getBasicAuthKey() {
  const preparedAuthKey = process.env.GIGACHAT_AUTH_KEY;

  if (preparedAuthKey) {
    return preparedAuthKey.startsWith("Basic ")
      ? preparedAuthKey
      : `Basic ${preparedAuthKey}`;
  }

  const clientId = process.env.GIGACHAT_CLIENT_ID;
  const clientSecret = process.env.GIGACHAT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  return `Basic ${encoded}`;
}

async function getGigaChatAccessToken() {
  const now = Date.now();

  if (cachedAccessToken && cachedAccessTokenExpiresAt - 60_000 > now) {
    return cachedAccessToken;
  }

  const authKey = getBasicAuthKey();

  if (!authKey) {
    throw new Error("GIGACHAT_KEYS_NOT_SET");
  }

  const response = await fetch(GIGACHAT_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: authKey,
      RqUID: randomUUID(),
    },
    body: new URLSearchParams({
      scope: GIGACHAT_SCOPE,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GIGACHAT_AUTH_ERROR: ${response.status} ${text}`);
  }

  const data = (await response.json()) as GigaChatTokenResponse;

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = data.expires_at;

  return data.access_token;
}

async function askGigaChat(userMessage: string) {
  const accessToken = await getGigaChatAccessToken();

  const messages: GigaChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const response = await fetch(GIGACHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      model: GIGACHAT_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 700,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GIGACHAT_CHAT_ERROR: ${response.status} ${text}`);
  }

  const data = await response.json();

  return (
    data?.choices?.[0]?.message?.content ||
    "Не получилось получить ответ от GigaChat."
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "MESSAGE_REQUIRED", answer: "Напиши сообщение для бота." },
        { status: 400 },
      );
    }

    if (message.length > 1500) {
      return NextResponse.json(
        {
          error: "MESSAGE_TOO_LONG",
          answer: "Сообщение слишком длинное. Сократи вопрос до 1500 символов.",
        },
        { status: 400 },
      );
    }

    const limit = checkDailyLimit(req);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "DAILY_LIMIT_REACHED",
          answer: `Лимит AI-запросов на сегодня исчерпан: ${limit.used}/${limit.limit}. Попробуй завтра.`,
          used: limit.used,
          limit: limit.limit,
        },
        { status: 429 },
      );
    }

    try {
      const answer = await askGigaChat(message);

      return NextResponse.json({
        answer,
        used: limit.used,
        limit: limit.limit,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "GIGACHAT_KEYS_NOT_SET") {
        return NextResponse.json({
          answer: "привет",
          used: limit.used,
          limit: limit.limit,
          mock: true,
        });
      }

      console.error(error);

      return NextResponse.json(
        {
          error: "GIGACHAT_ERROR",
          answer: "Сейчас AI не ответил. Проверь ключи GigaChat или попробуй позже.",
          used: limit.used,
          limit: limit.limit,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "AI_ROUTE_ERROR", answer: "Ошибка AI route." },
      { status: 500 },
    );
  }
}
EOF

echo "💬 Создаю нижний виджет бота..."
cat > src/widgets/aiBot/AiBotWidget.tsx <<'EOF'
"use client";

import { FormEvent, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import "./AiBotWidget.css";

type BotMessage = {
  id: string;
  author: "Вы" | "@botAi";
  text: string;
  isMine?: boolean;
  isError?: boolean;
};

const startMessages: BotMessage[] = [
  {
    id: "start",
    author: "@botAi",
    text: "Привет! Я AI-помощник по программированию. Задай вопрос по JavaScript, React, Next.js, Node.js, базам данных или ошибкам.",
  },
];

export default function AiBotWidget() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>(startMessages);

  const isChatPage = pathname === "/chat" || pathname.startsWith("/chat/");

  const sendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = draft.trim();

      if (!text || isLoading) return;

      const userMessage: BotMessage = {
        id: `user-${Date.now()}`,
        author: "Вы",
        text,
        isMine: true,
      };

      setMessages((prev) => [...prev, userMessage]);
      setDraft("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: text }),
        });

        const data = await response.json().catch(() => null);

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            author: "@botAi",
            text: data?.answer || "Не получилось получить ответ.",
            isError: !response.ok,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-error-${Date.now()}`,
            author: "@botAi",
            text: "Ошибка соединения с AI route.",
            isError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [draft, isLoading],
  );

  if (!isChatPage) {
    return null;
  }

  return (
    <div className="ai-bot-widget">
      {isOpen ? (
        <section className="ai-bot-window" aria-label="Чат с AI ботом">
          <header className="ai-bot-header">
            <div>
              <h2>@botAi</h2>
              <p>AI-помощник по программированию</p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть AI чат"
            >
              ×
            </button>
          </header>

          <div className="ai-bot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-bot-message${message.isMine ? " mine" : ""}${
                  message.isError ? " error" : ""
                }`}
              >
                <b>{message.author}</b>
                <p>{message.text}</p>
              </div>
            ))}

            {isLoading ? (
              <div className="ai-bot-message">
                <b>@botAi</b>
                <p>Печатает...</p>
              </div>
            ) : null}
          </div>

          <form className="ai-bot-form" onSubmit={sendMessage}>
            <input
              placeholder="Вопрос по программированию..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={isLoading}
            />

            <button type="submit" disabled={!draft.trim() || isLoading}>
              ➤
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="ai-bot-button"
        onClick={() => setIsOpen((current) => !current)}
      >
        🤖 @botAi
      </button>
    </div>
  );
}
EOF

echo "🎨 Создаю стили виджета..."
cat > src/widgets/aiBot/AiBotWidget.css <<'EOF'
.ai-bot-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  font-family: inherit;
}

.ai-bot-button {
  border: 0;
  border-radius: 999px;
  padding: 14px 20px;
  color: white;
  background: linear-gradient(135deg, #8b5cf6, #5b31d6);
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(91, 49, 214, 0.35);
}

.ai-bot-window {
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(100dvh - 112px));
  margin-bottom: 16px;
  border: 1px solid rgba(139, 92, 246, 0.28);
  border-radius: 24px;
  background: rgba(17, 17, 24, 0.96);
  color: #f8fafc;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(18px);
}

.ai-bot-header {
  padding: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-bot-header h2 {
  margin: 0;
  font-size: 20px;
}

.ai-bot-header p {
  margin: 4px 0 0;
  color: #a1a1aa;
  font-size: 13px;
}

.ai-bot-header button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.ai-bot-messages {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-bot-message {
  max-width: 88%;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.ai-bot-message.mine {
  margin-left: auto;
  background: rgba(139, 92, 246, 0.24);
}

.ai-bot-message.error {
  border: 1px solid rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.25);
}

.ai-bot-message b {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  color: #c4b5fd;
}

.ai-bot-message p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.45;
  font-size: 14px;
}

.ai-bot-form {
  display: flex;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-bot-form input {
  flex: 1;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 12px 14px;
  color: white;
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}

.ai-bot-form button {
  width: 46px;
  border: 0;
  border-radius: 16px;
  color: white;
  background: linear-gradient(135deg, #8b5cf6, #5b31d6);
  cursor: pointer;
  font-weight: 900;
}

.ai-bot-form button:disabled,
.ai-bot-form input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .ai-bot-widget {
    right: 16px;
    bottom: 16px;
  }

  .ai-bot-window {
    height: calc(100dvh - 96px);
  }
}
EOF

echo "🧩 Подключаю виджет в layout.tsx..."
python3 <<'PY'
from pathlib import Path
import sys

path = Path("src/app/layout.tsx")
text = path.read_text()

if 'import AiBotWidget from "@/widgets/aiBot/AiBotWidget";' not in text:
    text = text.replace(
        'import AuthSessionProvider from "@/application/AuthSessionProvider";',
        'import AuthSessionProvider from "@/application/AuthSessionProvider";\nimport AiBotWidget from "@/widgets/aiBot/AiBotWidget";',
    )

old = '<ApplicationLayout>{children}</ApplicationLayout>'
new = '<ApplicationLayout>{children}</ApplicationLayout>\n              <AiBotWidget />'

if "<AiBotWidget />" not in text:
    if old not in text:
        sys.exit("❌ Не нашёл ApplicationLayout в src/app/layout.tsx")
    text = text.replace(old, new)

path.write_text(text)
print("✅ layout.tsx обновлён")
PY

echo ""
echo "✅ Готово. Проверяю сборку..."
npm run build
