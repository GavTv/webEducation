import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type DailyLimitInfo = {
  date: string;
  count: number;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string; code?: number };
};

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 20);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ??
  "gemini-2.5-flash-lite,gemini-2.0-flash-lite"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const GEMINI_API_BASE =
  process.env.GEMINI_API_BASE?.trim() ||
  "https://generativelanguage.googleapis.com/v1beta";

const dailyLimits = new Map<string, DailyLimitInfo>();

const PROGRAMMING_TOPICS = [
  "JavaScript: переменные, функции, массивы, объекты, промисы, async/await.",
  "TypeScript: типы, интерфейсы, generic, типизация props и API-ответов.",
  "React: компоненты, props, state, hooks, формы, обработчики событий.",
  "Next.js: app router, pages, route handlers, client/server components.",
  "Node.js и Express: routes, controllers, services, middleware, REST API.",
  "PostgreSQL и Sequelize: модели, миграции, сиды, связи таблиц, SQL.",
  "Авторизация: JWT, access token, refresh token, cookies.",
  "Git: branch, checkout, merge, pull, push, conflict, commit.",
  "Отладка: stack trace, npm errors, CORS, build errors, TypeScript errors.",
  "Архитектура: FSD, shared, entities, features, widgets, app.",
];

const SYSTEM_PROMPT = `
Ты AI-помощник учебного проекта webEducation (@botAi).
Главная специализация — программирование и разработка, но ты можешь немного общаться и на другие темы.

Приоритетные темы (отвечай подробнее):
${PROGRAMMING_TOPICS.map((topic, index) => `${index + 1}. ${topic}`).join("\n")}

Допустимо кратко (2–5 строк):
- приветствия, вежливый small talk, «как дела», шутки без оскорблений;
- мотивация к учёбе, советы по обучению, организация времени;
- общие вопросы про IT-карьеру, курсы, стек технологий;
- краткие ответы на простые общие вопросы (погода, факты) — без претензии на экспертизу.

Не отвечай или вежливо откажись:
- опасный, незаконный, вредный контент;
- медицина, юриспруденция, финансовые инвестиции «как эксперт»;
- политика, религия, конфликтные споры;
- длинные разговоры далеко от учёбы — мягко верни к программированию: «Лучше всего я помогаю с кодом и учёбой — есть вопрос по проекту?»

Правила:
- Отвечай на русском языке.
- По коду и ошибкам объясняй как наставник новичку.
- Обычно 10–15 строк; на small talk — короче.
- Если нужен код, давай минимальный рабочий пример.
- Не выдумывай файлы проекта. Если не хватает контекста, попроси показать файл или ошибку.
`.trim();

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

function getModelsToTry(): string[] {
  return [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS])];
}

function shouldRetryWithNextModel(status: number, detail: string) {
  if (status === 503 || status === 429 || status === 404) return true;
  return /high demand|UNAVAILABLE|quota|not found/i.test(detail);
}

function formatGeminiError(message: string) {
  if (/quota|429/i.test(message)) {
    return "Исчерпана квота Gemini API. Проверь лимиты в Google AI Studio.";
  }
  if (/high demand|503|UNAVAILABLE/i.test(message)) {
    return "Модель Gemini перегружена. Попробуй через минуту.";
  }
  if (/API key|401|403|PERMISSION/i.test(message)) {
    return "Неверный GEMINI_API_KEY. Создай ключ в Google AI Studio.";
  }
  return "Сейчас AI не ответил. Подробности в терминале client.";
}

async function callGeminiModel(model: string, userMessage: string) {
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  const timeoutMs = Number(process.env.GEMINI_FETCH_TIMEOUT_MS ?? 30_000);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;

  if (!response.ok) {
    const detail = data.error?.message || JSON.stringify(data).slice(0, 300);
    return { ok: false as const, status: response.status, detail };
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  return {
    ok: true as const,
    text: text || "Не получилось получить ответ от Gemini.",
  };
}

async function askGemini(userMessage: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY_NOT_SET");
  }

  const models = getModelsToTry();
  let lastError = "unknown";

  for (const model of models) {
    const result = await callGeminiModel(model, userMessage);
    if (result.ok) {
      return result.text;
    }
    lastError = `${model}: ${result.status} ${result.detail}`;
    if (!shouldRetryWithNextModel(result.status, result.detail)) {
      break;
    }
  }

  throw new Error(`GEMINI_API_ERROR: ${lastError}`);
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
      const answer = await askGemini(message);

      return NextResponse.json({
        answer,
        used: limit.used,
        limit: limit.limit,
      });
    } catch (error) {
      console.error(error);

      if (error instanceof Error && error.message === "GEMINI_API_KEY_NOT_SET") {
        return NextResponse.json(
          {
            error: "GEMINI_API_KEY_NOT_SET",
            answer:
              "Не задан GEMINI_API_KEY. Локально: client/.env.local. На Vercel: Settings → Environment Variables → GEMINI_API_KEY, затем Redeploy.",
            used: limit.used,
            limit: limit.limit,
          },
          { status: 503 },
        );
      }

      const answer =
        error instanceof Error && error.message.startsWith("GEMINI_API_ERROR")
          ? formatGeminiError(error.message)
          : "Сейчас AI не ответил. Попробуй позже.";

      return NextResponse.json(
        {
          error: "GEMINI_ERROR",
          answer,
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
