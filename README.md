# webEducation · EduChat

**Enterprise-grade EdTech-платформа** для организации учебного процесса, командной работы и защищённой коммуникации внутри образовательных групп.

Система объединяет ролевую модель доступа, полноценный мессенджер, управление классами и **интеллектуальный слой на базе Google Gemini AI** — для автоматизации рутинных задач преподавателя и поддержки студентов в реальном времени.

**Production:** 

---

## Назначение

EduChat решает задачу централизованной образовательной среды: единая точка входа для администраторов, преподавателей и студентов. Платформа исключает разрозненность инструментов — учебные чаты, классы, профили и AI-ассистент работают в одном контуре с единой системой авторизации.

---

## Ключевые возможности

### Ролевая модель (RBAC)

Три изолированных контура с разграничением прав:

| Роль | Контур |
|------|--------|
| **Admin** | Управление пользователями, приглашения, глобальная администрация |
| **Teacher** | Группы, задания, модерация учебных комнат |
| **Student** | Участие в чатах, выполнение заданий, личный прогресс |

### Аутентификация и безопасность

- Классическая регистрация и вход по email/password
- **OAuth 2.0** — авторизация через **GitHub** и **Google** без отдельного пароля
- **JWT** — access/refresh-токены, httpOnly-cookies, middleware-верификация на каждом защищённом маршруте
- Раздельное хранение сущностей по ролям в PostgreSQL (Admin / Teacher / Student)

### Коммуникации

- Групповые чаты и учебные комнаты с контролем доступа
- Управление классами и составом участников
- Real-time-ориентированная архитектура мессенджера (`/api/messenger`)

### AI-слой — Google Gemini

Встроенный ассистент **@botAi** на базе **Google Gemini API**:

- Генерация и обработка учебного контента по запросу
- Контекстная помощь студентам прямо в чате
- Суммаризация обсуждений и пояснение тем
- Серверный endpoint `/api/ai` — вся генерация проходит через backend, ключи не попадают на клиент

---

## Архитектура

### Production-инфраструктура

Production-среда построена на связке облачных сервисов. Взаимодействие компонентов осуществляется через **[Neon](https://neon.com)**, **[Vercel](https://vercel.com)** и **[Cloudflare Dashboard](https://dash.cloudflare.com)**:

| Сервис | Назначение |
|--------|------------|
| **[Neon](https://neon.com)** | Serverless PostgreSQL — production-база данных, connection pooling, автоматические бэкапы |
| **[Vercel](https://vercel.com)** | Хостинг и CI/CD фронтенда (Next.js), preview-деплои, edge-доставка статики |
| **[Cloudflare Dashboard](https://dash.cloudflare.com)** | DNS-домен `-----`, CDN, SSL/TLS, проксирование и маршрутизация трафика |

```
                    ┌──────────────────────────────┐
                    │  Cloudflare Dashboard        │
                    │  DNS · CDN · SSL · Proxy     │
                    │  el-----chat.ru              │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │  Vercel                      │
                    │  Next.js · CI/CD · Edge      │
                    └──────────────┬───────────────┘
                                   │ REST / JWT
                    ┌──────────────▼───────────────┐
                    │  Backend (Express)           │
                    │  /api/auth · /api/messenger  │
                    │  /api/ai · RBAC              │
                    └──────┬───────────────┬───────┘
                           │               │
              ┌────────────▼────┐   ┌──────▼──────────┐
              │  Neon           │   │  Google Gemini  │
              │  PostgreSQL     │   │  API            │
              └─────────────────┘   └─────────────────┘
                           │
                    OAuth 2.0
                    GitHub · Google
```

### Локальная разработка

```
┌─────────────────────────────────────────────────────────┐
│  Client (Next.js · React · Redux Toolkit · TypeScript)  │
│  localhost:5173                                         │
└──────────────────────────┬──────────────────────────────┘
                           │ REST / JWT
┌──────────────────────────▼──────────────────────────────┐
│  Server (Express · Sequelize · PostgreSQL)              │
│  /api/auth  ·  /api/messenger  ·  /api/ai  ·  RBAC     │
└──────────┬───────────────────────────────┬──────────────┘
           │                               │
    PostgreSQL                      Google Gemini API
    (local / Neon)                  (AI-генерация)
           │
    OAuth 2.0
    GitHub · Google
```

| Компонент | Стек |
|-----------|------|
| **Frontend** | Next.js 16, React 19, Redux Toolkit, TypeScript, Axios |
| **Backend** | Express 5, Sequelize 6, PostgreSQL, JWT, bcrypt |
| **AI** | Google Gemini API, серверный `AiService` |
| **Auth** | OAuth 2.0 (GitHub, Google), JWT access/refresh |
| **Infra** | [Neon](https://neon.com) · [Vercel](https://vercel.com) · [Cloudflare](https://dash.cloudflare.com) |

---

## Развёртывание

### Требования

- Node.js 18+
- PostgreSQL 14+ (локально) или строка подключения **[Neon](https://neon.com)** для production

### Backend (порт 3000)

```bash
cd server
npm install
cp .env.example .env
# Настроить: DB, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, GOOGLE_AI_API_KEY
npm run migrate
npm run dev
```

### Frontend (порт 5173)

```bash
cd client
npm install
# client/.env.local → NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev
```

---

## Документация

- [server/README.md](server/README.md) — API, миграции, модели
- [client/README.md](client/README.md) — клиентская часть

---




