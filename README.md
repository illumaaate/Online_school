## SkillHub 

Онлайн-школа на `Next.js` с ролями (`admin/teacher/student`), курсами и уроками, видеокомнатой на LiveKit и интерактивной доской Excalidraw.

## Stack
- `Next.js` (App Router, TypeScript)
- `Prisma` + PostgreSQL
- Live видео: `LiveKit`
- Онлайн-доска: `@excalidraw/excalidraw`
- e2e smoke: `Playwright`

## Быстрый старт

1. Установить зависимости:

```bash
npm install
```

2. Запустить проект:

```bash
npm run dev
```

## Для установки с начала на новом устройстве/сервере
1. Установить зависимости:

```bash
npm install
```

2. Заполнить `.env` 


3. Поднять PostgreSQL и выполнить:

```bash
npm run db:generate
npm run db:push
```

4. Запустить проект:

```bash
npm run dev
```

5. Проверить smoke e2e:

```bash
npm run test:e2e
```

Готовые тестовые аккаунты 

│ (index) │ role      │ email                       │ password    │
├─────────┼───────────┼─────────────────────────────┼─────────────┤
│ 0       │ 'ADMIN'   │ 'admin@skillspace.local'    │ 'demo12345' │
│ 1       │ 'TEACHER' │ 'teacher@skillspace.local'  │ 'demo12345' │
│ 2       │ 'STUDENT' │ 'student@skillspace.local'  │ 'demo12345' │
│ 3       │ 'STUDENT' │ 'student2@skillspace.local' │ 'demo12345' │
