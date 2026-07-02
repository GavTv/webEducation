const loadEnv = require('../utils/loadEnv');

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 20);

function readGeminiApiKey() {
  loadEnv();
  return process.env.GEMINI_API_KEY?.trim() ?? '';
}

function readGeminiModel() {
  loadEnv();
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}
const GEMINI_FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ??
  'gemini-2.5-flash-lite,gemini-2.0-flash-lite'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const GEMINI_API_BASE =
  process.env.GEMINI_API_BASE?.trim() ||
  'https://generativelanguage.googleapis.com/v1beta';

const dailyLimits = new Map();

const PROGRAMMING_TOPICS = [
  'JavaScript: переменные, функции, массивы, объекты, промисы, async/await.',
  'TypeScript: типы, интерфейсы, generic, типизация props и API-ответов.',
  'React: компоненты, props, state, hooks, формы, обработчики событий.',
  'Next.js: app router, pages, route handlers, client/server components.',
  'Node.js и Express: routes, controllers, services, middleware, REST API.',
  'PostgreSQL и Sequelize: модели, миграции, сиды, связи таблиц, SQL.',
  'Авторизация: JWT, access token, refresh token, cookies.',
  'Git: branch, checkout, merge, pull, push, conflict, commit.',
  'Отладка: stack trace, npm errors, CORS, build errors, TypeScript errors.',
  'Архитектура: FSD, shared, entities, features, widgets, app.',
];

const SYSTEM_PROMPT = `
Ты AI-помощник проекта My Work Chat (@botAi).
Главная специализация — программирование и разработка, но ты можешь немного общаться и на другие темы.

Приоритетные темы (отвечай подробнее):
${PROGRAMMING_TOPICS.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

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

function getModelsToTry() {
  return [...new Set([readGeminiModel(), ...GEMINI_FALLBACK_MODELS])];
}

function shouldRetryWithNextModel(status, detail) {
  if (status === 503 || status === 429 || status === 404) return true;
  return /high demand|UNAVAILABLE|quota|not found/i.test(detail);
}

function formatGeminiError(message) {
  if (/quota|429/i.test(message)) {
    return 'Исчерпана квота Gemini API. Проверь лимиты в Google AI Studio.';
  }
  if (/high demand|503|UNAVAILABLE/i.test(message)) {
    return 'Модель Gemini перегружена. Попробуй через минуту.';
  }
  if (/API key|401|403|PERMISSION/i.test(message)) {
    return 'Неверный GEMINI_API_KEY. Создай ключ в Google AI Studio.';
  }
  return 'Сейчас AI не ответил. Подробности в логах сервера.';
}

function checkDailyLimit(userId) {
  const clientKey = String(userId);
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

async function callGeminiModel(model, userMessage) {
  const apiKey = readGeminiApiKey();
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
  const timeoutMs = Number(process.env.GEMINI_FETCH_TIMEOUT_MS ?? 30_000);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 700,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.error?.message || JSON.stringify(data).slice(0, 300);
    return { ok: false, status: response.status, detail };
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  return {
    ok: true,
    text: text || 'Не получилось получить ответ от Gemini.',
  };
}

async function askGemini(userMessage) {
  if (!readGeminiApiKey()) {
    const err = new Error('GEMINI_API_KEY_NOT_SET');
    err.code = 'GEMINI_API_KEY_NOT_SET';
    throw err;
  }

  const models = getModelsToTry();
  let lastError = 'unknown';

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

  const err = new Error(`GEMINI_API_ERROR: ${lastError}`);
  err.code = 'GEMINI_API_ERROR';
  throw err;
}

class GeminiService {
  static isConfigured() {
    return Boolean(readGeminiApiKey());
  }

  static checkDailyLimit(userId) {
    return checkDailyLimit(userId);
  }

  static async chat(userMessage) {
    return askGemini(userMessage);
  }

  static formatGeminiError(message) {
    return formatGeminiError(message);
  }

  static getMissingKeyMessage() {
    return (
      'GEMINI_API_KEY не задан на сервере. Создай ключ: https://aistudio.google.com/apikey ' +
      '(это не Project ID). Добавь в server/.env локально и в Environment на Render, затем перезапусти сервер.'
    );
  }
}

module.exports = GeminiService;
