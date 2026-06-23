# webEducation (EduChat)

Образовательная веб-платформа для учебных чатов: личные кабинеты для **admin**, **teacher** и **student**, групповые чаты, управление классами и AI-помощник **@botAi**.

**Демо:** 

## Возможности

- Регистрация и вход по email/паролю
- Быстрый вход через **GitHub** и **Google** (OAuth)
- Групповые чаты и учебные комнаты
- AI-ассистент для помощи в чатах
- Роли: администратор, учитель, ученик

## Стек

- **client** — Next.js, React, Redux Toolkit, TypeScript
- **server** — Express, Sequelize, PostgreSQL, JWT

## Запуск

```bash
# Backend (порт 3000)
cd server && npm install && cp .env.example .env && npm run migrate && npm run dev

# Frontend (порт 5173)
cd client && npm install && npm run dev
```

Подробнее: [server/README.md](server/README.md), [client/README.md](client/README.md).
