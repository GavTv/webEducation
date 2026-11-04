const dns = require('dns');
const https = require('https');
const os = require('os');
const loadEnv = require('../utils/loadEnv');

loadEnv();

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 20);
const DEFAULT_BASE = 'https://ai.starimg.ru/v1';
const DEFAULT_MODEL = 'grok-4.7';

const dailyLimits = new Map();
let discoveredModels = null;

const PROGRAMMING_TOPICS = [
  'JavaScript: variables, functions, arrays, objects, promises, and async/await.',
  'TypeScript: types, interfaces, generics, props, and API response typing.',
  'React: components, props, state, hooks, forms, and event handlers.',
  'Next.js: App Router, route handlers, and client/server components.',
  'Node.js and Express: routes, controllers, services, middleware, and REST APIs.',
  'PostgreSQL and Sequelize: models, migrations, seeders, relations, and SQL.',
  'Authentication: JWT, access tokens, refresh tokens, and cookies.',
  'Git: branches, checkout, merge, pull, push, conflicts, and commits.',
  'Debugging: stack traces, npm errors, CORS, build errors, and TypeScript errors.',
  'Architecture: Feature-Sliced Design layers and module boundaries.',
];

const SYSTEM_PROMPT = `
You are the programming and learning assistant for My Work Chat (@botAi).
Your primary expertise is software development. You may also handle brief, low-stakes conversation on related topics.

Prioritize the following topics:
${PROGRAMMING_TOPICS.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

For greetings, respectful small talk, study motivation, time management, general IT career questions, and simple general-interest questions, keep replies brief.

Decline requests that facilitate dangerous, illegal, or harmful activity. Do not present medical, legal, or investment advice as expert guidance. Avoid political, religious, and inflammatory debate. For extended unrelated conversations, politely redirect to programming or learning.

Response standards:
- Answer in Russian unless the user explicitly requests another language.
- Explain code and errors clearly, as a patient technical mentor.
- Prefer concise answers, typically no more than 10–15 lines.
- Provide the smallest complete code example that solves the stated problem.
- Never invent project files, logs, or context. Ask for the relevant code or error when necessary.
`.trim();

const AGENT_PROMPTS = {
  coder: SYSTEM_PROMPT,
  study: `You are the Learning Navigator for My Work Chat. Help users understand academic and professional subjects, create realistic study plans, and check comprehension with concise questions. Adapt explanations to the user's stated level and deadline. Teach the reasoning and support independent work; do not simply complete assignments on the user's behalf. Do not invent facts. Acknowledge uncertainty. Do not provide medical, legal, or investment advice. Reply in Russian unless the user requests another language.`,
  writer: `You are the Writing Assistant for My Work Chat. Improve the structure, clarity, tone, and correctness of emails, resumes, academic work, and professional writing. Preserve the author's intent and voice; offer a polished draft and briefly explain significant edits when useful. Never invent achievements or personal facts. Reply in Russian unless the user requests another language. Do not create dangerous, illegal, or deceptive content.`,
  career: `You are the Career Navigator for My Work Chat. Help users prepare for interviews, analyze job descriptions, and plan practical skill development. Give specific exercises and sample answers grounded in the experience the user has provided. Do not promise employment or invent information about companies. Do not provide financial or legal advice. Maintain a respectful, professional tone and reply in Russian unless the user requests another language.`,
  profile: `You are a professional profile editor for My Work Chat. Write a concise, natural profile bio of no more than 500 characters, using only the user's explicitly provided facts. Write in first person unless the user asks for another style. Do not invent education, experience, skills, achievements, goals, or availability. Do not ask follow-up questions; use the available facts to produce the strongest accurate draft, even when the input is brief. Return only the bio text, without quotation marks, headings, or commentary. Reply in Russian unless the user requests another language.`,
  reply: `You are a professional reply-writing assistant for My Work Chat. The user will provide a conversation excerpt and ask for a response. Consider the context and participants' tone, then produce one concise, ready-to-review draft. Do not invent facts or commitments. Never send the reply on the user's behalf. Return only the draft text. Reply in Russian unless the user requests another language.`,
  summary: `You are a concise chat secretary for My Work Chat. Summarize the conversation excerpt provided by the user, highlighting key topics, explicit decisions, and action items with deadlines only when stated. Do not invent owners, dates, decisions, or commitments. If there are no decisions or action items, state that clearly. Reply in Russian unless the user requests another language.`,
};

function getAgentSystemPrompt(agentId) {
  return AGENT_PROMPTS[agentId] || SYSTEM_PROMPT;
}

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
  if (/ECONNRESET|ENOTFOUND|fetch failed|ECONNREFUSED|ETIMEDOUT|UND_ERR|timeout/i.test(message)) {
    return 'AI-провайдер не ответил вовремя. Проверь соединение и попробуй ещё раз чуть позже.';
  }
  if (/503|UNAVAILABLE|high demand|overloaded/i.test(message)) {
    return 'Grok сейчас перегружен. Попробуй через минуту.';
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
    const hostname = new URL(url).hostname;
    const addresses = await dns.promises
      .lookup(hostname, { all: true, family: 4 })
      .catch(() => []);
    const usesFakeIp = addresses.some(({ address }) => {
      const [first, second] = address.split('.').map(Number);
      return first === 198 && second === 18;
    });

    if (!usesFakeIp) throw error;
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

async function callGrokModel(model, userMessage, agentId, context) {
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
          { role: 'system', content: getAgentSystemPrompt(agentId) },
          ...(context ? [{ role: 'user', content: `Conversation context:\n${context}` }] : []),
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

  const answer = extractAnswer(data);
  if (!answer) {
    return {
      ok: false,
      status: 502,
      detail: 'Provider returned an empty completion',
    };
  }

  return {
    ok: true,
    text: answer,
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

async function askGrok(userMessage, agentId, context) {
  if (!readApiKey()) {
    const err = new Error('GROK_API_KEY_NOT_SET');
    err.code = 'GROK_API_KEY_NOT_SET';
    throw err;
  }

  const models = getModelsToTry();
  let lastError = 'unknown';
  let sawMissingModel = false;

  for (const model of models) {
    const result = await callGrokModel(model, userMessage, agentId, context);
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
      const result = await callGrokModel(model, userMessage, agentId, context);
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

  static async chat(userMessage, agentId = 'coder', context = '') {
    return askGrok(userMessage, agentId, context);
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
