## SkillSpace School MVP

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

2. Создать `.env` из примера:

```bash
cp .env.example .env
```

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

## Основные страницы
- `/` — лендинг в стиле SkillSpace
- `/login`, `/register` — auth
- `/dashboard` — личный кабинет по роли
- `/courses` и `/courses/[id]` — каталог и курс
- `/lesson/[id]` — страница урока (видео + доска + чат + домашки)

## Важно про LiveKit
- Нужно заполнить `NEXT_PUBLIC_LIVEKIT_WS_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
- Токен для комнаты создается в `api/lessons/[id]/livekit-token`.

## Источник онлайн-доски
Используется Excalidraw: [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw).
