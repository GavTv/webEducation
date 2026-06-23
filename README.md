# webEducation

Образовательная веб-платформа: личные кабинеты для администратора, учителя и ученика, групповые чаты и управление классами.

## Стек

- **client** — Next.js, React, Redux Toolkit, TypeScript
- **server** — Express, Sequelize, PostgreSQL, JWT

## Запуск

```bash
# Backend (порт 3000)
cd server && npm install && npm run migrate && npm run dev

# Frontend (порт 5173)
cd client && npm install && npm run dev
```

Подробнее: [server/README.md](server/README.md), [client/README.md](client/README.md).
