import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

if (
  process.env.NODE_ENV !== "production" &&
  process.env.GIGACHAT_DISABLE_TLS_VERIFY === "1"
) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}


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
