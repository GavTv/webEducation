# webEducation — backend

Express + Sequelize (PostgreSQL) + Socket.IO. Пользователи в таблице **`Users`** (роли: **admin**, **teacher**, **student**).

## Требования

- Node.js 18+
- PostgreSQL

## Быстрый старт

```bash
cd server
npm install
cp .env.example .env
# DB, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, CORS_ORIGINS
```

```bash
npm run migrate
npm run dev
```

Порт — **`PORT`** (по умолчанию `3000`). Клиент (Next.js) ходит на **`/api`** и WebSocket этого же сервера.

## Команды

| Команда | Назначение |
|--------|------------|
| `npm run dev` | nodemon |
| `npm run migrate` | миграции |
| `npm run seed:admin` | mock-админ (локально) |
| `npm run cleanup:demo` | удалить демо-данные из БД |

## API (`/api`)

| Префикс | Назначение |
|---------|------------|
| **`/api/auth`** | вход, регистрация, профиль, OAuth, сброс пароля |
| **`/api/admin`** | список пользователей, смена роли, удаление |
| **`/api/classes`** | группы, каналы, пароль группы |

Чат: **WebSocket** (`ws/chatSocket.js`), сообщения в таблице **`Messages`**.

## CORS

**`CORS_ORIGINS`** в `.env` — через запятую (URL фронтенда).
