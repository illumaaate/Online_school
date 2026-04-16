import Link from "next/link";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentCoursesProgress } from "@/features/dashboard/ui/StudentCoursesProgress";

// ─── Дашборд студента ──────────────────────────────────────────────────────

async function StudentDashboard({ userId }: { userId: string }) {
  const now = new Date();

  const [enrollments, homeworkSubmissions, recentAttempts] = await Promise.all([
    db.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            teacher: { select: { name: true } },
            modules: {
              orderBy: { position: "asc" },
              include: {
                units: {
                  orderBy: { position: "asc" },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.homeworkSubmission.findMany({
      where: { studentId: userId },
      select: { homeworkId: true, grade: true, comment: true, status: true },
    }),
    db.testAttempt.findMany({
      where: { studentId: userId, submittedAt: { not: null } },
      include: { test: { select: { id: true, title: true } } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
  ]);

  const enrolledCourseIds = enrollments.map((e) => e.courseId);

  const upcomingLessons = await db.lesson.findMany({
    where: {
      courseId: { in: enrolledCourseIds },
      startsAt: { gt: now },
    },
    include: { course: { select: { title: true } } },
    orderBy: { startsAt: "asc" },
    take: 4,
  });

  const allHomeworks = await db.homework.findMany({
    where: { courseId: { in: enrolledCourseIds } },
    include: { lesson: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const submittedHomeworkIds = new Set(homeworkSubmissions.map((s) => s.homeworkId));
  const submissionByHomeworkId = Object.fromEntries(
    homeworkSubmissions.map((s) => [s.homeworkId, s]),
  );

  const pendingHomeworks = allHomeworks.filter((hw) => !submittedHomeworkIds.has(hw.id));
  const gradedSubmissions = homeworkSubmissions
    .filter((s) => s.grade !== null)
    .map((s) => {
      const hw = allHomeworks.find((h) => h.id === s.homeworkId);
      return hw ? { ...s, homework: hw } : null;
    })
    .filter(Boolean)
    .slice(0, 5);

  const courses = enrollments.map((e) => ({
    id: e.courseId,
    title: e.course.title,
    teacherName: e.course.teacher.name,
    unitIds: e.course.modules.flatMap((m) => m.units.map((u) => u.id)),
  }));

  const totalUnits = courses.reduce((sum, c) => sum + c.unitIds.length, 0);

  return (
    <section className="space-y-6">
      {/* Hero */}
      <div className="skillhub-hero rounded-[2rem] p-7 md:p-9">
        <p className="skillhub-kicker text-xs font-semibold">Личный кабинет</p>
        <h1 className="mt-3 text-3xl font-semibold">Добро пожаловать!</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Курсов</p>
            <p className="mt-1 text-2xl font-bold text-white">{enrollments.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Занятий</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalUnits}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Тестов</p>
            <p className="mt-1 text-2xl font-bold text-white">{recentAttempts.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Не сдано ДЗ</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent)]">
              {pendingHomeworks.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* Левая колонка */}
        <div className="space-y-5">
          {/* Курсы с прогрессом */}
          <div className="skillhub-panel rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-black">Мои курсы</h2>
              <Link
                href="/courses"
                className="text-xs text-[var(--muted)] hover:text-[var(--accent-strong)]"
              >
                Все курсы →
              </Link>
            </div>
            <div className="mt-4">
              <StudentCoursesProgress courses={courses} />
            </div>
          </div>

          {/* Ближайшие уроки */}
          <div className="skillhub-panel rounded-[1.75rem] p-5">
            <h2 className="mb-4 text-base font-semibold text-black">
              Ближайшие занятия
            </h2>
            {upcomingLessons.length ? (
              <div className="space-y-2">
                {upcomingLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/lesson/${lesson.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 hover:border-[var(--accent)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-black">
                        {lesson.title}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {lesson.course.title}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs text-[var(--muted)]">
                      {new Date(lesson.startsAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Нет запланированных занятий.
              </p>
            )}
          </div>

          {/* Последние результаты тестов */}
          {recentAttempts.length > 0 && (
            <div className="skillhub-panel rounded-[1.75rem] p-5">
              <h2 className="mb-4 text-base font-semibold text-black">
                Результаты тестов
              </h2>
              <div className="space-y-2">
                {recentAttempts.map((attempt) => {
                  const pct =
                    attempt.maxScore && attempt.maxScore > 0
                      ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
                      : 0;
                  return (
                    <Link
                      key={attempt.id}
                      href={`/tests/${attempt.testId}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 hover:border-[var(--accent)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black">
                          {attempt.test.title}
                        </p>
                        {attempt.requiresReview && (
                          <p className="text-xs text-[var(--accent-strong)]">
                            Часть ответов на ручной проверке
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            pct >= 80
                              ? "bg-emerald-50 text-emerald-700"
                              : pct >= 50
                                ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {attempt.score ?? 0}/{attempt.maxScore ?? 0}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка */}
        <div className="space-y-5">
          {/* Несданные домашние задания */}
          <div className="skillhub-panel rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-black">
                Не сдано
              </h2>
              {pendingHomeworks.length > 0 && (
                <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-bold text-black">
                  {pendingHomeworks.length}
                </span>
              )}
            </div>
            {pendingHomeworks.length ? (
              <div className="mt-3 space-y-2">
                {pendingHomeworks.slice(0, 6).map((hw) => (
                  <Link
                    key={hw.id}
                    href={`/lesson/${hw.lessonId}`}
                    className="block rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 hover:border-[var(--accent)]"
                  >
                    <p className="text-sm font-medium text-black">{hw.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {hw.lesson.title}
                    </p>
                    {hw.dueDate && (
                      <p className="mt-1 text-xs text-red-600">
                        Срок:{" "}
                        {new Date(hw.dueDate).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    )}
                  </Link>
                ))}
                {pendingHomeworks.length > 6 && (
                  <p className="text-center text-xs text-[var(--muted)]">
                    и ещё {pendingHomeworks.length - 6}...
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Все задания сданы!
              </p>
            )}
          </div>

          {/* Проверенные ДЗ */}
          {gradedSubmissions.length > 0 && (
            <div className="skillhub-panel rounded-[1.75rem] p-5">
              <h2 className="mb-3 text-base font-semibold text-black">
                Проверенные ДЗ
              </h2>
              <div className="space-y-2">
                {gradedSubmissions.map((sub) => {
                  if (!sub) return null;
                  return (
                    <Link
                      key={sub.homeworkId}
                      href={`/lesson/${sub.homework.lessonId}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 hover:border-[var(--accent)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black">
                          {sub.homework.title}
                        </p>
                        {sub.comment && (
                          <p className="truncate text-xs text-[var(--muted)]">
                            {sub.comment}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          (sub.grade ?? 0) >= 80
                            ? "bg-emerald-50 text-emerald-700"
                            : (sub.grade ?? 0) >= 50
                              ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {sub.grade}/100
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Быстрые ссылки */}
          <div className="skillhub-panel rounded-[1.75rem] p-5">
            <h2 className="mb-3 text-base font-semibold text-black">
              Быстрый доступ
            </h2>
            <div className="space-y-2">
              <Link
                href="/courses"
                className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 text-sm font-medium text-black hover:border-[var(--accent)]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-base">
                  📚
                </span>
                Каталог курсов
              </Link>
              <Link
                href="/calls"
                className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 text-sm font-medium text-black hover:border-[var(--accent)]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-base">
                  📞
                </span>
                Мои звонки
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 text-sm font-medium text-black hover:border-[var(--accent)]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-base">
                  👤
                </span>
                Настройки профиля
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Дашборд учителя ──────────────────────────────────────────────────────

async function TeacherDashboard({ userId }: { userId: string }) {
  const [courses, enrollments, teachingLessons, pendingSubmissions, reviewAttempts] =
    await Promise.all([
      db.course.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      db.enrollment.findMany({
        where: { userId },
        include: { course: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.lesson.findMany({
        where: { course: { teacherId: userId } },
        orderBy: { startsAt: "asc" },
        take: 5,
        include: { course: { select: { title: true } } },
      }),
      db.homeworkSubmission.count({
        where: {
          grade: null,
          status: "submitted",
          homework: { author: { id: userId } },
        },
      }),
      db.testAttempt.count({
        where: {
          requiresReview: true,
          submittedAt: { not: null },
          answers: { some: { isCorrect: null } },
          test: {
            OR: [
              { course: { teacherId: userId } },
              { unit: { module: { course: { teacherId: userId } } } },
            ],
          },
        },
      }),
    ]);

  return (
    <section className="space-y-6">
      <div className="skillhub-hero rounded-[2rem] p-7 md:p-9">
        <p className="skillhub-kicker text-xs font-semibold">Кабинет преподавателя</p>
        <h1 className="mt-3 text-3xl font-semibold">Панель управления</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Курсов</p>
            <p className="mt-1 text-2xl font-bold text-white">{courses.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Занятий</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {teachingLessons.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">ДЗ на проверке</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent)]">
              {pendingSubmissions}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Тестов к проверке</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent)]">
              {reviewAttempts}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-black">Мои курсы</h2>
            <Link
              href="/courses"
              className="text-xs text-[var(--muted)] hover:text-[var(--accent-strong)]"
            >
              Все →
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {enrollments.map((entry) => (
              <Link
                key={entry.id}
                href={`/courses/${entry.courseId}`}
                className="block rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 text-sm font-medium hover:border-[var(--accent)]"
              >
                {entry.course.title}
              </Link>
            ))}
            {!enrollments.length && (
              <p className="text-sm text-[var(--muted)]">Пока нет записанных курсов.</p>
            )}
          </div>
        </div>

        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <h2 className="mb-4 text-base font-semibold text-black">
            Ближайшие занятия
          </h2>
          <div className="space-y-2">
            {teachingLessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lesson/${lesson.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 hover:border-[var(--accent)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black">
                    {lesson.title}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{lesson.course.title}</p>
                </div>
                <span className="shrink-0 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-[var(--muted)]">
                  {new Date(lesson.startsAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </Link>
            ))}
            {!teachingLessons.length && (
              <p className="text-sm text-[var(--muted)]">Нет запланированных занятий.</p>
            )}
          </div>
        </div>
      </div>

      <div className="skillhub-panel rounded-[1.75rem] p-5">
        <h2 className="mb-4 text-base font-semibold text-black">Доступные курсы</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="block rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 text-sm font-medium hover:border-[var(--accent)]"
            >
              {course.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Роутер ───────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === Role.STUDENT) {
    return <StudentDashboard userId={user.id} />;
  }

  return <TeacherDashboard userId={user.id} />;
}
