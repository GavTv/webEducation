const dns = require('dns');
const https = require('https');
const os = require('os');
const loadEnv = require('../utils/loadEnv');

loadEnv();

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 20);
const DEFAULT_BASE = 'https://ai.starimg.ru/v1';
const DEFAULT_MODEL = 'grok-4';

const dailyLimits = new Map();
let discoveredModels = null;

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

function readApiKey() {
  loadEnv();
  return process.env.GROK_API_KEY?.trim() ?? '';
}

function readApiBase() {
  loadEnv();
  const raw = process.env.GROK_API_BASE?.trim() || DEFAULT_BASE;
  return raw.replace(/\/+$/, '');
}

function readModel() {
  loadEnv();
  return process.env.GROK_MODEL?.trim() || DEFAULT_MODEL;
}

function readFallbackModels() {
  loadEnv();
  return (process.env.GROK_FALLBACK_MODELS ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getModelsToTry() {
  return [...new Set([readModel(), ...readFallbackModels()])];
}

function shouldRetryWithNextModel(status, detail) {
  if (status === 404) return true;
  return /model.*not found|does not exist|unknown model|invalid model/i.test(
    detail,
  );
}

function formatGrokError(message) {
  if (/quota|429|insufficient/i.test(message)) {
    return 'Лимит Grok у провайдера исчерпан. Проверь остаток токенов в AI STAR.';
  }
  if (/401|403|API key|invalid key|Unauthorized/i.test(message)) {
    return 'Ключ Grok отклонён. Проверь GROK_API_KEY в server/.env.';
  }
  if (/model.*not found|404|invalid model/i.test(message)) {
    return 'Модель Grok не найдена. Укажи id из «Доступные модели» в GROK_MODEL.';
  }
  if (/503|UNAVAILABLE|high demand|timeout/i.test(message)) {
    return 'Grok сейчас перегружен. Попробуй через минуту.';
  }
  if (/ECONNRESET|ENOTFOUND|fetch failed|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
    return 'Не удалось связаться с Grok (ai.starimg.ru). Проверь сеть и GROK_API_BASE.';
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

function isNetworkFailure(error) {
  const detail = `${error?.cause?.code || ''} ${error?.code || ''} ${error?.message || ''}`;
  return /ECONNRESET|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|EHOSTUNREACH|fetch failed|UND_ERR|SSL_ERROR/i.test(
    detail,
  );
}

/** IPv4 физического интерфейса, чтобы не уходить в VPN-туннель (utun). */
function getDirectLocalAddress() {
  const fromEnv = process.env.GROK_LOCAL_ADDRESS?.trim();
  if (fromEnv) return fromEnv;

  const nets = os.networkInterfaces();
  const names = ['en0', 'en1', 'en2', ...Object.keys(nets)];
  const seen = new Set();

  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (/^(utun|awdl|llw|lo|bridge|gif|stf|ap|ipsec)/.test(name)) continue;
    const addr = (nets[name] || []).find(
      (item) => (item.family === 'IPv4' || item.family === 4) && !item.internal,
    );
    if (addr) return addr.address;
  }

  return undefined;
}

function resolvePublicIpv4(hostname) {
  const resolver = new dns.Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']);

  return new Promise((resolve, reject) => {
    resolver.resolve4(hostname, (error, addresses) => {
      if (error || !addresses?.length) {
        reject(error || new Error('DNS failed'));
        return;
      }
      resolve(addresses[0]);
    });
  });
}

/**
 * Прямой запрос мимо fake-ip DNS (198.18.0.0/15) и VPN-маршрута.
 * Нужен, когда системный fetch обрывается на TLS внутри туннеля.
 */
async function fetchDirect(url, { method = 'GET', headers = {}, body, timeoutMs }) {
  const target = new URL(url);
  const ip = await resolvePublicIpv4(target.hostname);
  const localAddress = getDirectLocalAddress();

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: target.hostname,
        path: `${target.pathname}${target.search}`,
        method,
        headers: {
          ...headers,
          Host: target.hostname,
        },
        localAddress,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => (text ? JSON.parse(text) : {}),
          });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('ETIMEDOUT'));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function fetchGrok(url, options) {
  try {
    return await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    return fetchDirect(url, options);
  }
}

function extractAnswer(data) {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'string' ? part : part?.text || part?.content || '',
      )
      .join('')
      .trim();
  }
  return '';
}

async function callGrokModel(model, userMessage) {
  const url = `${readApiBase()}/chat/completions`;
  const timeoutMs = Number(process.env.GROK_FETCH_TIMEOUT_MS ?? 30_000);

  let response;
  try {
    response = await fetchGrok(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${readApiKey()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 700,
      }),
      timeoutMs,
    });
  } catch (error) {
    const detail = error?.cause?.code || error?.message || 'fetch failed';
    return { ok: false, status: 0, detail: String(detail) };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      data.error?.message ||
      data.message ||
      JSON.stringify(data).slice(0, 300);
    return { ok: false, status: response.status, detail };
  }

  return {
    ok: true,
    text: extractAnswer(data) || 'Не получилось получить ответ от Grok.',
  };
}

async function listGrokModels() {
  if (discoveredModels) return discoveredModels;

  const response = await fetchGrok(`${readApiBase()}/models`, {
    headers: { Authorization: `Bearer ${readApiKey()}` },
    timeoutMs: 15_000,
  }).catch(() => null);

  if (!response?.ok) {
    discoveredModels = [];
    return discoveredModels;
  }

  const data = await response.json().catch(() => ({}));
  const ids = (Array.isArray(data.data) ? data.data : [])
    .map((item) => (typeof item?.id === 'string' ? item.id : ''))
    .filter((id) => /grok/i.test(id));

  discoveredModels = [...new Set(ids)];
  return discoveredModels;
}

async function askGrok(userMessage) {
  if (!readApiKey()) {
    const err = new Error('GROK_API_KEY_NOT_SET');
    err.code = 'GROK_API_KEY_NOT_SET';
    throw err;
  }

  const models = getModelsToTry();
  let lastError = 'unknown';
  let sawMissingModel = false;

  for (const model of models) {
    const result = await callGrokModel(model, userMessage);
    if (result.ok) return result.text;

    lastError = `${model}: ${result.status} ${result.detail}`;
    if (!shouldRetryWithNextModel(result.status, result.detail)) break;
    sawMissingModel = true;
  }

  if (sawMissingModel) {
    const extra = (await listGrokModels()).filter(
      (model) => !models.includes(model),
    );
    for (const model of extra.slice(0, 3)) {
      const result = await callGrokModel(model, userMessage);
      if (result.ok) return result.text;
      lastError = `${model}: ${result.status} ${result.detail}`;
      if (!shouldRetryWithNextModel(result.status, result.detail)) break;
    }
  }

  const err = new Error(`GROK_API_ERROR: ${lastError}`);
  err.code = 'GROK_API_ERROR';
  throw err;
}

class GrokService {
  static isConfigured() {
    return Boolean(readApiKey());
  }

  static checkDailyLimit(userId) {
    return checkDailyLimit(userId);
  }

  static async chat(userMessage) {
    return askGrok(userMessage);
  }

  static formatGrokError(message) {
    return formatGrokError(message);
  }

  static getMissingKeyMessage() {
    return (
      'GROK_API_KEY не задан на сервере. Возьми API-ключ на https://ai.starimg.ru ' +
      'и добавь его в server/.env (GROK_API_KEY), затем перезапусти сервер.'
    );
  }
}

module.exports = GrokService;
