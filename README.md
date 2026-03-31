# SkillHub

Онлайн-платформа для обучения: курсы, модули, тесты, домашние задания, live-занятия с видео и интерактивной доской.

## Стек технологий

- **Next.js 16** (App Router, TypeScript)
- **Prisma** + PostgreSQL
- **LiveKit** — live видео
- **Excalidraw** — интерактивная доска
- **Tailwind CSS v4**
- **Playwright** — e2e тесты

---

## Что потребуется перед установкой

- [Node.js](https://nodejs.org/) версии **18 или новее**
- [PostgreSQL](https://www.postgresql.org/) — база данных
- [Docker](https://www.docker.com/) — для запуска LiveKit локально (опционально)

---

## Полная инструкция по установке

### 1. Клонируй репозиторий

```bash
git clone https://github.com/illumaaate/Online_school.git
cd Online_school
```

### 2. Установи зависимости

```bash
npm install
```

### 3. Настрой переменные окружения

Скопируй пример и заполни своими данными:

```bash
cp .env.example .env
```

Открой файл `.env` и укажи:

```env
# Строка подключения к PostgreSQL
# Формат: postgresql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@ХОСТ:ПОРТ/ИМЯ_БД
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillhub?schema=public"

# LiveKit — адрес сервера (ws:// для локального, wss:// для облачного)
NEXT_PUBLIC_LIVEKIT_WS_URL="ws://localhost:7880"

# LiveKit — ключ и секрет
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
```

### 4. Подними PostgreSQL

Если PostgreSQL уже установлен — убедись что он запущен и создай базу данных:

```sql
CREATE DATABASE skillhub;
```

Или через Docker одной командой:

```bash
docker run -d \
  --name skillhub-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=skillhub \
  -p 5432:5432 \
  postgres:16
```

### 5. Примени схему базы данных

```bash
npm run db:generate
npm run db:push
```

### 6. (Опционально) Заполни базу тестовыми данными

```bash
npm run db:seed
```

После этого будут доступны готовые аккаунты:

| Роль      | Email                       | Пароль    |
|-----------|-----------------------------|-----------|
| `ADMIN`   | admin@skillspace.local      | demo12345 |
| `TEACHER` | teacher@skillspace.local    | demo12345 |
| `STUDENT` | student@skillspace.local    | demo12345 |
| `STUDENT` | student2@skillspace.local   | demo12345 |

### 7. Запусти проект

```bash
npm run dev
```

Открой в браузере: [http://localhost:3000](http://localhost:3000)

---

## Запуск LiveKit локально (для видеозвонков)

Если нет аккаунта LiveKit Cloud, запусти сервер через Docker:

```bash
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server \
  --dev \
  --bind 0.0.0.0
```

В `.env` при этом должно быть:
```env
NEXT_PUBLIC_LIVEKIT_WS_URL="ws://localhost:7880"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
```

---

## Роли пользователей

| Роль      | Возможности |
|-----------|-------------|
| `STUDENT` | Просмотр курсов, прохождение тестов, участие в live-занятиях |
| `TEACHER` | Всё что студент + создание курсов, модулей, занятий и тестов |
| `ADMIN`   | Полный доступ ко всем функциям |

При регистрации через сайт создаётся аккаунт студента. Роль меняется напрямую в базе данных.

---

## Все доступные команды

```bash
npm run dev           # Запуск в режиме разработки
npm run build         # Сборка для продакшена
npm run start         # Запуск собранного проекта
npm run db:generate   # Сгенерировать Prisma-клиент
npm run db:push       # Применить схему к базе данных
npm run db:seed       # Заполнить базу тестовыми данными
npm run test:e2e      # Запустить e2e тесты (Playwright)
npm run lint          # Проверка кода линтером
```
