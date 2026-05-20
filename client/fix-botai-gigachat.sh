set -e

echo "🔎 Ищу корень Next-проекта..."

if [ ! -f "package.json" ]; then
  echo "❌ Тут нет package.json. Перейди в папку client проекта."
  pwd
  exit 1
fi

if [ ! -f "src/app/chat/page.tsx" ]; then
  echo "❌ Не найден src/app/chat/page.tsx"
  echo "Сейчас ты тут:"
  pwd
  echo "Ищу файл:"
  find .. -path "*/src/app/chat/page.tsx" -print
  exit 1
fi

echo "✅ Проект найден"

echo "📦 Делаю backup..."
cp src/app/chat/page.tsx "src/app/chat/page.tsx.backup-botai-gigachat"
cp src/app/chat/page.css "src/app/chat/page.css.backup-botai-gigachat"

mkdir -p src/app/api/ai

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
  "JavaScript и TypeScript: объясняй синтаксис, функции, массивы, объекты, async/await простыми словами.",
  "React и Next.js: помогай с компонентами, хуками, роутингом, состоянием и клиент-серверной логикой.",
  "Node.js и Express: объясняй роуты, контроллеры, сервисы, middleware, REST API.",
  "Базы данных: помогай с SQL, Sequelize, моделями, связями и миграциями.",
  "Авторизация: объясняй JWT, access token, refresh token, cookies, localStorage и безопасность.",
  "Git и командная строка: помогай с commit, branch, merge, pull, push и базовыми bash-командами.",
  "Отладка ошибок: разбирай stack trace, npm errors, TypeScript errors и ошибки сборки.",
  "Архитектура проекта: помогай с FSD, разделением entities/features/shared/widgets/pages/app.",
  "Алгоритмическое мышление: объясняй задачи, циклы, условия, структуры данных и порядок решения.",
  "Учебный стиль: отвечай как наставник новичку, коротко, по делу, с примерами кода.",
];

const SYSTEM_PROMPT = `
Ты AI-помощник учебного проекта webEducation.
Отвечай только по теме изучения программирования и разработки.

Разрешённые темы:
${PROGRAMMING_TOPICS.map((topic, index) => `${index + 1}. ${topic}`).join("\n")}

Правила:
- Отвечай на русском языке.
- Пиши понятно для начинающего разработчика.
- Не уходи в темы медицины, политики, финансов, личных отношений и другие темы вне программирования.
- Если вопрос не по программированию, мягко скажи: "Я могу помочь только с вопросами по программированию."
- Не выдумывай несуществующие файлы проекта.
- Если не хватает контекста, попроси показать файл или ошибку.
- Ответ делай компактным: максимум 10-15 строк.
`;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getClientKey(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "local-user";

  return ip;
}

function checkDailyLimit(req: NextRequest) {
  const clientKey = getClientKey(req);
  const today = getTodayKey();
  const current = dailyLimits.get(clientKey);

  if (!current || current.date !== today) {
    dailyLimits.set(clientKey, { date: today, count: 1 });

    return {
      allowed: true,
      used: 1,
      limit: DAILY_LIMIT,
    };
  }

  if (current.count >= DAILY_LIMIT) {
    return {
      allowed: false,
      used: current.count,
      limit: DAILY_LIMIT,
    };
  }

  current.count += 1;
  dailyLimits.set(clientKey, current);

  return {
    allowed: true,
    used: current.count,
    limit: DAILY_LIMIT,
  };
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
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: userMessage,
    },
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
        {
          error: "MESSAGE_REQUIRED",
          answer: "Напиши сообщение для бота.",
        },
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
      if (
        error instanceof Error &&
        error.message === "GIGACHAT_KEYS_NOT_SET"
      ) {
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
          answer:
            "Сейчас AI не ответил. Проверь ключи GigaChat или попробуй позже.",
          used: limit.used,
          limit: limit.limit,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "AI_ROUTE_ERROR",
        answer: "Ошибка AI route.",
      },
      { status: 500 },
    );
  }
}
EOF

echo "🧩 Обновляю страницу чата..."

python3 <<'PY'
from pathlib import Path
import sys

page_path = Path("src/app/chat/page.tsx")
css_path = Path("src/app/chat/page.css")

s = page_path.read_text()

# 1. Добавляем FormEvent
s = s.replace(
    'import { Suspense, useCallback, useEffect, useMemo, useState } from "react";',
    'import { Suspense, useCallback, useEffect, useMemo, useState } from "react";\nimport type { FormEvent } from "react";',
)

# 2. Добавляем типы и стартовые сообщения после MOBILE_BP
marker = 'const MOBILE_BP = "(max-width: 900px)";'
insert = '''const MOBILE_BP = "(max-width: 900px)";

type BotMessage = {
  id: string;
  author: string;
  text: string;
  isMine?: boolean;
  isBot?: boolean;
  isError?: boolean;
};

const botStartMessages: BotMessage[] = [
  {
    id: "bot-start",
    author: "@botAi",
    text: "Привет! Я AI-помощник по программированию. Задай вопрос по JavaScript, React, Next.js, Node.js, базам данных или ошибкам в коде.",
    isBot: true,
  },
];'''

if "type BotMessage" not in s:
    if marker not in s:
        sys.exit("❌ Не найден MOBILE_BP в src/app/chat/page.tsx")
    s = s.replace(marker, insert)

# 3. Добавляем state для бота после mobileThreadOpen
old = '''  const [selectedId, setSelectedId] = useState(rooms[0]?.id ?? 1);
  const [draft, setDraft] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);'''

new = '''  const [selectedId, setSelectedId] = useState(rooms[0]?.id ?? 1);
  const [draft, setDraft] = useState("");
  const [botDraft, setBotDraft] = useState("");
  const [botOpen, setBotOpen] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [botMessages, setBotMessages] = useState<BotMessage[]>(botStartMessages);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);'''

if old not in s:
    sys.exit("❌ Не найден блок state. Возможно файл чата сильно поменялся.")
s = s.replace(old, new)

# 4. При выборе обычного чата закрываем режим бота
old = '''  const selectRoom = useCallback((id: number) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);'''

new = '''  const selectRoom = useCallback((id: number) => {
    setBotOpen(false);
    setSelectedId(id);

    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);'''

if old not in s:
    sys.exit("❌ Не найден selectRoom. Возможно файл чата сильно поменялся.")
s = s.replace(old, new)

# 5. Добавляем openBotChat и sendBotMessage после closeMobileThread
old = '''  const closeMobileThread = useCallback(() => setMobileThreadOpen(false), []);'''

new = '''  const closeMobileThread = useCallback(() => setMobileThreadOpen(false), []);

  const openBotChat = useCallback(() => {
    setBotOpen(true);

    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);

  const sendBotMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = botDraft.trim();

      if (!text || botLoading) return;

      const userMessage: BotMessage = {
        id: `user-${Date.now()}`,
        author: safeFirstName,
        text,
        isMine: true,
      };

      setBotMessages((prev) => [...prev, userMessage]);
      setBotDraft("");
      setBotLoading(true);

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: text }),
        });

        const data = await response.json().catch(() => null);

        const botMessage: BotMessage = {
          id: `bot-${Date.now()}`,
          author: "@botAi",
          text:
            data?.answer ||
            "Не получилось получить ответ. Попробуй ещё раз.",
          isBot: true,
          isError: !response.ok,
        };

        setBotMessages((prev) => [...prev, botMessage]);
      } catch {
        setBotMessages((prev) => [
          ...prev,
          {
            id: `bot-error-${Date.now()}`,
            author: "@botAi",
            text: "Ошибка соединения с AI route. Проверь, что Next.js dev-сервер запущен.",
            isBot: true,
            isError: true,
          },
        ]);
      } finally {
        setBotLoading(false);
      }
    },
    [botDraft, botLoading, safeFirstName],
  );'''

s = s.replace(old, new)

# 6. Кнопка Написать в нижней карточке
s = s.replace(
    '<button type="button">Написать</button>',
    '<button type="button" onClick={openBotChat}>Написать</button>',
)

# 7. Меняем header справа на условный bot/обычный чат
s = s.replace(
'''            <div className="preview-header">
              <div>
                <h2>{selected?.title ?? "Чат"}</h2>
                <p>{selected?.onlineLabel ?? "Участники онлайн"}</p>
              </div>
              <span>{selected?.icon ?? "#"}</span>
            </div>''',
'''            <div className="preview-header">
              <div>
                <h2>{botOpen ? "@botAi" : selected?.title ?? "Чат"}</h2>
                <p>
                  {botOpen
                    ? "AI-помощник по программированию"
                    : selected?.onlineLabel ?? "Участники онлайн"}
                </p>
              </div>
              <span>{botOpen ? "🤖" : selected?.icon ?? "#"}</span>
            </div>'''
)

# 8. Меняем статичные сообщения и input на условный bot/обычный режим
old = '''            <div className="messages">
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
            </div>'''

new = '''            <div className="messages">
              {botOpen ? (
                <>
                  {botMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`message${message.isMine ? " mine" : ""}${
                        message.isBot ? " bot" : ""
                      }${message.isError ? " error" : ""}`}
                    >
                      <b>{message.author}</b>
                      <p>{message.text}</p>
                    </div>
                  ))}

                  {botLoading ? (
                    <div className="message bot">
                      <b>@botAi</b>
                      <p>Печатает...</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="message">
                    <b>Мария</b>
                    <p>Всем привет! 👋</p>
                  </div>
                  <div className="message mine">
                    <b>Алексей</b>
                    <p>Кто уже сделал домашнее задание?</p>
                  </div>
                  <div className="message bot">
                    <b>@botAi</b>
                    <p>Я могу помочь объяснить тему или кратко суммировать чат.</p>
                  </div>
                </>
              )}
            </div>

            {botOpen ? (
              <form className="message-input" onSubmit={sendBotMessage}>
                <input
                  placeholder="Вопрос по программированию..."
                  value={botDraft}
                  onChange={(e) => setBotDraft(e.target.value)}
                  disabled={botLoading}
                />
                <button
                  type="submit"
                  aria-label="Отправить"
                  disabled={!botDraft.trim() || botLoading}
                >
                  ➤
                </button>
              </form>
            ) : (
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
            )}'''

if old not in s:
    sys.exit("❌ Не найден блок messages/input. Возможно файл чата сильно поменялся.")
s = s.replace(old, new)

# 9. Убираем лишние переменные в export default, если они там остались и не используются
s = s.replace(
'''export default function ChatPage() {
  const user = useAppSelector((state) => state.user.user);
  const userName = user?.name?.trim() || "Пользователь";
  const firstName = userName.split(/\\s+/)[0] || "Пользователь";
  const avatarSrc = getAvatarSrc(user?.avatarUrl);

  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatPageContent />
    </Suspense>
  );
}''',
'''export default function ChatPage() {
  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatPageContent />
    </Suspense>
  );
}'''
)

page_path.write_text(s)

css = css_path.read_text()

css = css.replace(
'''.message:nth-child(2) {
  margin-left: auto;
  background: rgba(124, 60, 255, 0.18);
}''',
'''.message.mine {
  margin-left: auto;
  background: rgba(124, 60, 255, 0.18);
}'''
)

if ".message.error" not in css:
    css += '''

.message.error {
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.22);
}

.message-input button:disabled,
.message-input input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
'''

css_path.write_text(css)

print("✅ Чат-страница обновлена")
PY

echo "🧪 Проверяю TypeScript/сборку..."
npm run build

echo ""
echo "✅ Готово."
echo ""
echo "Теперь добавь ключи GigaChat в .env.local."
echo "В конце этого сообщения есть отдельный блок, что именно вставить."
