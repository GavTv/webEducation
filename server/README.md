# webEducation — backend

Express + Sequelize (PostgreSQL). Роли: **admin**, **teacher**, **student** (отдельные таблицы).

## Требования

- Node.js 18+
- PostgreSQL

## Быстрый старт

```bash
cd server
npm install
cp .env.example .env
# Отредактируйте .env: DB (строка подключения Postgres) и секреты для JWT
```

Подключение к БД — переменная **`DB`** в development (так же читает **`sequelize-cli`** из `src/db/config/database.json`, как у преподавателя). Для **`test`** и **`production`** задаются **`DB_TEST`** и **`DB_PROD`**.

Создайте базу данных в PostgreSQL, затем выполните миграции из каталога `server`:

```bash
npm run migrate
npm run dev
```

Сервер слушает порт из **`PORT`** (по умолчанию в коде приложения — `3000`, в `.env.example` задан явно).

## Полезные команды

| Команда | Назначение |
|--------|------------|
| `npm run dev` | Запуск с nodemon |
| `npm start` | Обычный запуск |
| `npm run migrate` | Применить миграции |
| `npm run migrate:undo` | Откатить все миграции |

## Разделение в команде

- **Вадим** — **вход и регистрация**. Файл **`routes/authRoute.js`** под это; нужно добавить **`router.use('/auth', authRouter)`** в **`apiRoute.js`**, когда появятся маршруты.
- **Артём** — групповой мессенджер через **`routes/messageRoute.js`** (**`/api/messenger/...`**, см. ниже).

## API

Общий префикс: **`/api`** (подключение в **`routes/apiRoute.js`**).

| Префикс | Файл | Назначение |
|-----------|------|-------------|
| **`/api/admins`** | `adminRoute.js` | действия главного админа (приглашения, списки, удаление связей и т.д.) |
| **`/api/teachers`** | `teacherRoute.js` | профиль учителя, группы, задания |
| **`/api/students`** | `studentRoute.js` | профиль ученика, ответы, прогресс, комнаты |
| **`/api/messenger`** | **`messageRoute.js`** | групповые чаты: `GET/POST /groups`, сообщения по `groups/:groupId/messages` |

**`routes/viewRoute.js`** — отдача **`/`** через **`public/index.html`**, не часть **`/api`**.

Остальное (например **`/api/auth`**, health-check) — по мере подключения в **`apiRoute.js`**.
Остальное (например **`/api/auth`**, health-check) — по мере подключения в **`apiRoute.js`**.
Остальное (например **`/api/auth`**, health-check) — по мере подключения в **`apiRoute.js`**.
Остальное (например **`/api/auth`**, health-check) — по мере подключения в **`apiRoute.js`**.

Остальное (например **`/api/auth`**, health-check) — по мере подключения в **`apiRoute.js`**.
Остальное (например **`/api/auth`**, health-check) — по мере подключения в **`apiRoute.js`**.
Остальное (например **`/api/auth`**, health-check) — по мере подключения в **`apiRoute.js`**.
Остальное (например **`/api/auth`**, health-check) — по мере подключения в **`apiRoute.js`**.



## Модели и авторизация



## CORS

