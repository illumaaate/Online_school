import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

type CourseCard = {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  studentsCount: number;
  modulesCount: number;
  unitsCount: number;
  testsCount: number;
  liveCount: number;
  progressPercent: number;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildLevel(unitsCount: number) {
  if (unitsCount >= 45) return "Продвинутый";
  if (unitsCount >= 20) return "Средний";
  return "Базовый";
}

function buildDuration(unitsCount: number, liveCount: number) {
  const hours = Math.max(1, Math.round(unitsCount * 0.8 + liveCount * 0.5));
  return `${hours} ч обучения`;
}

function buildTag(unitTypes: string[]) {
  if (unitTypes.includes("LIVE")) return "С live-сессиями";
  if (unitTypes.includes("VIDEO")) return "Видео-курс";
  if (unitTypes.includes("TEST")) return "С практикой";
  return "Теория и практика";
}

const platformSections = [
  {
    title: "Понятная учебная траектория",
    text: "Модули, занятия и тесты собраны в единую структуру. Пользователь всегда видит следующий шаг и общий прогресс.",
  },
  {
    title: "Live-обучение и совместная работа",
    text: "Видеосвязь, интерактивная доска и учебные комнаты помогают разбирать материал в реальном времени.",
  },
  {
    title: "Контроль результата",
    text: "Тесты, домашние задания и прозрачные показатели позволяют отслеживать обучение без лишних сервисов.",
  },
  {
    title: "Единый цифровой кампус",
    text: "Материалы, расписание, коммуникация и результаты доступны в одном пространстве SkillHub.",
  },
];

export default async function HomePage() {
  const user = await getSessionUser();

  const rawCourses = await db.course.findMany({
    include: {
      teacher: { select: { name: true } },
      enrollments: { select: { userId: true } },
      modules: {
        include: {
          units: {
            include: {
              tests: { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  const allTestIds = rawCourses.flatMap((course) =>
    course.modules.flatMap((module) =>
      module.units.flatMap((unit) => unit.tests.map((test) => test.id)),
    ),
  );

  const attempts =
    user && allTestIds.length
      ? await db.testAttempt.findMany({
          where: {
            studentId: user.id,
            submittedAt: { not: null },
            testId: { in: allTestIds },
          },
          select: { testId: true },
        })
      : [];

  const completedTestIds = new Set(attempts.map((attempt) => attempt.testId));

  const courses: CourseCard[] = rawCourses.map((course) => {
    const units = course.modules.flatMap((module) => module.units);
    const tests = units.flatMap((unit) => unit.tests);

    const testsDone = tests.reduce(
      (acc, test) => acc + (completedTestIds.has(test.id) ? 1 : 0),
      0,
    );

    const progressPercent =
      tests.length > 0 ? clampPercent((testsDone / tests.length) * 100) : 0;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      teacherName: course.teacher.name,
      studentsCount: course.enrollments.length,
      modulesCount: course.modules.length,
      unitsCount: units.length,
      testsCount: tests.length,
      liveCount: units.filter((unit) => unit.unitType === "LIVE").length,
      progressPercent,
    };
  });

  return (
    <section className="space-y-10 pb-10">
      <div className="skillhub-hero rounded-[2rem] p-8 md:p-10">
        <p className="skillhub-kicker inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold text-[var(--accent)]">
          SkillHub
        </p>
        <h1 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight md:text-5xl">
          Подготовка к ЕГЭ, которая действительно работает
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-white/80 md:text-base">
          SkillHub — онлайн-школа для подготовки к ЕГЭ. Структурированные курсы,
          живые занятия с преподавателями, тесты в формате экзамена и постоянная
          обратная связь. Всё, что нужно для уверенного результата — в одном месте.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/courses"
            className="skillhub-button-primary rounded-2xl px-5 py-3 text-sm font-semibold"
          >
            Перейти в каталог
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="skillhub-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold"
            >
              Открыть кабинет
            </Link>
          ) : (
            <Link
              href="/register"
              className="skillhub-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold"
            >
              Начать обучение
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["ЕГЭ", "Программирование", "Математика", "Олимпиады", "Вебинары"].map(
          (item) => (
            <span
              key={item}
              className="skillhub-chip rounded-full px-3 py-1 text-xs font-medium"
            >
              {item}
            </span>
          ),
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-black">Рекомендуемые курсы</h2>
          <Link
            href="/courses"
            className="text-sm font-medium text-[var(--accent-strong)] hover:underline"
          >
            Смотреть все
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const level = buildLevel(course.unitsCount);
            const duration = buildDuration(course.unitsCount, course.liveCount);
            const tag = buildTag(
              rawCourses
                .find((c) => c.id === course.id)
                ?.modules.flatMap((m) => m.units.map((u) => u.unitType)) ?? [],
            );

            return (
              <article key={course.id} className="skillhub-panel rounded-[1.75rem] p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="skillhub-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">
                    {tag}
                  </span>
                  <span className="rounded-full border border-black/10 bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                    {level}
                  </span>
                </div>

                <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-black">
                  {course.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">
                  {course.description}
                </p>

                <div className="mt-4 space-y-1 text-xs text-[var(--muted)]">
                  <p>Преподаватель: {course.teacherName}</p>
                  <p>
                    Модулей: {course.modulesCount} · Занятий: {course.unitsCount}
                  </p>
                  <p>
                    Тестов: {course.testsCount} · Студентов: {course.studentsCount}
                  </p>
                  <p>Длительность: {duration}</p>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>Ваш прогресс</span>
                    <span>{course.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/10">
                    <div
                      className="skillhub-progress h-1.5 rounded-full transition-all"
                      style={{ width: `${course.progressPercent}%` }}
                    />
                  </div>
                </div>

                <Link
                  href={`/courses/${course.id}`}
                  className="skillhub-button-primary mt-5 inline-flex rounded-2xl px-4 py-2.5 text-sm font-medium"
                >
                  {course.progressPercent > 0
                    ? "Продолжить обучение"
                    : "Открыть курс"}
                </Link>
              </article>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {platformSections.map((section) => (
          <article key={section.title} className="skillhub-panel rounded-[1.75rem] p-5">
            <h3 className="text-base font-semibold text-black">{section.title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{section.text}</p>
          </article>
        ))}
      </div>

      <div className="skillhub-panel rounded-[2rem] p-8 text-center">
        <h2 className="text-2xl font-semibold text-black">
          Начните обучение уже сегодня
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Выберите программу, проходите занятия в удобном темпе и отслеживайте
          прогресс в единой системе SkillHub.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/courses"
            className="skillhub-button-primary rounded-2xl px-5 py-3 text-sm font-semibold"
          >
            Выбрать курс
          </Link>
          {!user ? (
            <Link
              href="/register"
              className="skillhub-button-outline rounded-2xl px-5 py-3 text-sm font-semibold"
            >
              Создать аккаунт
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
