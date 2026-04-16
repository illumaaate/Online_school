import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function StudentStatsPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id: courseId, studentId } = await params;
  const user = await requireUser();

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, teacherId: true },
  });
  if (!course) notFound();

  const canManage = user.role === Role.ADMIN || user.id === course.teacherId;
  if (!canManage) redirect(`/courses/${courseId}`);

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!enrollment) notFound();

  const student = enrollment.user;

  // All units in this course (ordered)
  const modules = await db.courseModule.findMany({
    where: { courseId },
    orderBy: { position: "asc" },
    include: {
      units: {
        orderBy: { position: "asc" },
        select: { id: true, title: true, unitType: true },
      },
    },
  });
  const allUnits = modules.flatMap((m) => m.units);

  // Unit progress from DB
  const unitProgressRecords = await db.unitProgress.findMany({
    where: { userId: studentId, courseId },
    select: { unitId: true, status: true, progressPercent: true, completedAt: true },
  });
  const unitProgressMap = new Map(unitProgressRecords.map((r) => [r.unitId, r]));
  const completedUnits = unitProgressRecords.filter((r) => r.status === "COMPLETED").length;
  const courseProgressPct =
    allUnits.length > 0 ? Math.round((completedUnits / allUnits.length) * 100) : 0;

  // Tests in this course
  const tests = await db.test.findMany({
    where: {
      OR: [
        { courseId },
        { unit: { module: { courseId } } },
      ],
      isPublished: true,
    },
    include: {
      questions: {
        orderBy: { position: "asc" },
        include: {
          options: { orderBy: { position: "asc" } },
        },
      },
      attempts: {
        where: { studentId, submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        include: {
          answers: {
            include: {
              question: { select: { id: true, type: true, points: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Homework
  const homeworks = await db.homework.findMany({
    where: { courseId },
    orderBy: { createdAt: "asc" },
    include: {
      submissions: {
        where: { studentId },
      },
    },
  });

  // Summary
  const totalTests = tests.length;
  const attemptedTests = tests.filter((t) => t.attempts.length > 0).length;
  const allScores = tests.flatMap((t) =>
    t.attempts
      .filter((a) => a.score !== null && a.maxScore && a.maxScore > 0)
      .map((a) => Math.round(((a.score ?? 0) / (a.maxScore ?? 1)) * 100)),
  );
  const avgScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
      : null;
  const hwSubmitted = homeworks.filter((hw) => hw.submissions.length > 0).length;
  const hwGraded = homeworks.filter(
    (hw) => hw.submissions[0]?.grade !== null && hw.submissions[0]?.grade !== undefined,
  ).length;

  function pctColor(pct: number | null) {
    if (pct === null) return "text-[var(--muted)]";
    if (pct >= 80) return "text-emerald-700";
    if (pct >= 50) return "text-[var(--accent-strong)]";
    return "text-red-600";
  }
  function pctBg(pct: number | null) {
    if (pct === null) return "bg-[var(--surface-muted)] text-[var(--muted)]";
    if (pct >= 80) return "bg-emerald-50 text-emerald-700";
    if (pct >= 50) return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
    return "bg-red-50 text-red-600";
  }

  return (
    <section className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <Link href="/courses" className="hover:text-black hover:underline">Мои курсы</Link>
        <span>›</span>
        <Link href={`/courses/${courseId}`} className="hover:text-black hover:underline">{course.title}</Link>
        <span>›</span>
        <Link href={`/courses/${courseId}/stats`} className="hover:text-black hover:underline">Статистика</Link>
        <span>›</span>
        <span className="font-medium text-black">{student.name}</span>
      </nav>

      {/* Hero */}
      <div className="skillhub-hero rounded-[2rem] p-7">
        <p className="skillhub-kicker text-xs font-semibold">Студент</p>
        <h1 className="mt-2 text-2xl font-semibold">{student.name}</h1>
        <p className="mt-1 text-sm text-white/70">{student.email}</p>
        <p className="mt-1 text-xs text-white/50">
          Записан{" "}
          {new Date(enrollment.createdAt).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Прогресс курса</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent)]">{courseProgressPct}%</p>
            <p className="mt-0.5 text-[11px] text-white/50">{completedUnits} / {allUnits.length} зан.</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Тестов сдано</p>
            <p className="mt-1 text-2xl font-bold text-white">{attemptedTests} / {totalTests}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Средний балл</p>
            <p className={`mt-1 text-2xl font-bold ${avgScore !== null ? "text-[var(--accent)]" : "text-white/40"}`}>
              {avgScore !== null ? `${avgScore}%` : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">ДЗ сдано</p>
            <p className="mt-1 text-2xl font-bold text-white">{hwSubmitted} / {homeworks.length}</p>
          </div>
        </div>
      </div>

      {/* Course map: units with real progress */}
      {allUnits.length > 0 && (
        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-black">Занятия курса</h2>
            <span className="text-xs text-[var(--muted)]">
              {completedUnits} из {allUnits.length} пройдено
            </span>
          </div>

          {/* Overall progress bar */}
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-black/8">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${courseProgressPct}%`,
                background: courseProgressPct === 100
                  ? "linear-gradient(90deg,#22c55e,#16a34a)"
                  : "linear-gradient(90deg,var(--accent),var(--accent-strong))",
              }}
            />
          </div>

          <div className="space-y-3">
            {modules.map((mod, mi) => {
              const modCompleted = mod.units.filter(
                (u) => unitProgressMap.get(u.id)?.status === "COMPLETED",
              ).length;
              return (
                <div key={mod.id}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {mi + 1}. {mod.title}
                    </p>
                    <span className="text-xs text-[var(--muted)]">
                      {modCompleted}/{mod.units.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {mod.units.map((unit) => {
                      const prog = unitProgressMap.get(unit.id);
                      const done = prog?.status === "COMPLETED";
                      const inProgress = prog?.status === "IN_PROGRESS";
                      return (
                        <div
                          key={unit.id}
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${
                            done
                              ? "border-emerald-200 bg-emerald-50"
                              : inProgress
                                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                                : "border-black/10 bg-[var(--surface-muted)]"
                          }`}
                        >
                          {done ? (
                            <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : inProgress ? (
                            <span className="h-4 w-4 shrink-0 rounded-full border-2 border-[var(--accent)] bg-white" />
                          ) : (
                            <span className="h-4 w-4 shrink-0 rounded-full border-2 border-black/15 bg-white" />
                          )}
                          <Link
                            href={`/learn/${unit.id}`}
                            className={`flex-1 truncate text-sm hover:underline ${done ? "font-medium text-emerald-800" : "text-black"}`}
                          >
                            {unit.title}
                          </Link>
                          {done && prog?.completedAt && (
                            <span className="shrink-0 text-xs text-emerald-600">
                              {new Date(prog.completedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {inProgress && (
                            <span className="shrink-0 rounded-md border border-[var(--accent)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--accent-strong)]">
                              В процессе
                            </span>
                          )}
                          {unit.unitType === "LIVE" && (
                            <span className="shrink-0 rounded-md border border-black/10 bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                              Live
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tests */}
      {tests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-black px-1">Тесты</h2>
          {tests.map((test) => {
            const attempt = test.attempts[0] ?? null;
            const pct =
              attempt?.score !== null && attempt?.maxScore && attempt.maxScore > 0
                ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
                : null;

            return (
              <div key={test.id} className="skillhub-panel rounded-[1.75rem] overflow-hidden">
                {/* Test header */}
                <div className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-black">{test.title}</h3>
                    {attempt ? (
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Сдан{" "}
                        {new Date(attempt.submittedAt!).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-[var(--muted)]">Не сдавал</p>
                    )}
                  </div>
                  {attempt ? (
                    <div className="shrink-0 text-right">
                      <span className={`rounded-xl px-3 py-1.5 text-sm font-bold ${pctBg(pct)}`}>
                        {attempt.score ?? 0} / {attempt.maxScore ?? 0}
                      </span>
                      {pct !== null && (
                        <p className={`mt-0.5 text-xs font-medium ${pctColor(pct)}`}>{pct}%</p>
                      )}
                    </div>
                  ) : (
                    <span className="shrink-0 rounded-xl bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--muted)]">
                      Не пройден
                    </span>
                  )}
                </div>

                {/* Questions breakdown */}
                {attempt && test.questions.length > 0 && (
                  <div className="border-t border-black/8 px-5 pb-5">
                    <p className="mb-3 pt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Ответы
                    </p>
                    <div className="space-y-3">
                      {test.questions.map((q, qi) => {
                        const ans = attempt.answers.find(
                          (a) => a.question.id === q.id,
                        );
                        const isCorrect = ans?.isCorrect;
                        const selectedIds = new Set(ans?.selectedOptionIds ?? []);

                        return (
                          <div
                            key={q.id}
                            className={`rounded-2xl border p-3.5 ${
                              isCorrect === true
                                ? "border-emerald-200 bg-emerald-50"
                                : isCorrect === false
                                  ? "border-red-200 bg-red-50"
                                  : "border-black/10 bg-[var(--surface-muted)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium text-black">
                                {qi + 1}. {q.question}
                              </p>
                              <div className="shrink-0 flex items-center gap-1.5">
                                {isCorrect === true && (
                                  <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    {ans?.score ?? q.points} / {q.points}
                                  </span>
                                )}
                                {isCorrect === false && (
                                  <span className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    {ans?.score ?? 0} / {q.points}
                                  </span>
                                )}
                                {isCorrect === null && ans && (
                                  <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-strong)]">
                                    На проверке
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Options */}
                            {q.options.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {q.options.map((opt) => {
                                  const chosen = selectedIds.has(opt.id);
                                  return (
                                    <li
                                      key={opt.id}
                                      className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs ${
                                        opt.isCorrect && chosen
                                          ? "bg-emerald-100 text-emerald-800 font-medium"
                                          : opt.isCorrect
                                            ? "bg-emerald-50 text-emerald-700"
                                            : chosen
                                              ? "bg-red-100 text-red-700 font-medium"
                                              : "text-[var(--muted)]"
                                      }`}
                                    >
                                      <span className={`h-3.5 w-3.5 shrink-0 rounded-full border text-[9px] font-bold leading-none flex items-center justify-center ${
                                        chosen
                                          ? opt.isCorrect
                                            ? "border-emerald-500 bg-emerald-500 text-white"
                                            : "border-red-400 bg-red-400 text-white"
                                          : opt.isCorrect
                                            ? "border-emerald-400 bg-white"
                                            : "border-black/20 bg-white"
                                      }`}>
                                        {chosen ? "✓" : opt.isCorrect ? "·" : ""}
                                      </span>
                                      {opt.text}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            {/* Open answer */}
                            {ans?.textAnswer && (
                              <div className="mt-2 rounded-xl bg-white/60 px-3 py-2">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">Ответ студента</p>
                                <p className="mt-0.5 text-sm text-black">{ans.textAnswer}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {attempt.requiresReview && (
                      <Link
                        href={`/tests/${test.id}/review`}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--accent-strong)] hover:bg-[var(--accent)] hover:text-black"
                      >
                        Проверить открытые ответы →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Homework */}
      {homeworks.length > 0 && (
        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <h2 className="mb-4 text-base font-semibold text-black">Домашние задания</h2>
          <div className="space-y-3">
            {homeworks.map((hw) => {
              const sub = hw.submissions[0] ?? null;
              return (
                <div
                  key={hw.id}
                  className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-black">{hw.title}</p>
                      {hw.dueDate && (
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          Дедлайн:{" "}
                          {new Date(hw.dueDate).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                    </div>
                    {sub ? (
                      sub.grade !== null ? (
                        <span className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold ${pctBg(sub.grade)}`}>
                          {sub.grade} / 100
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-xl bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent-strong)]">
                          Не проверено
                        </span>
                      )
                    ) : (
                      <span className="shrink-0 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
                        Не сдано
                      </span>
                    )}
                  </div>

                  {sub && (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-xl bg-white px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Ответ студента</p>
                        <p className="mt-1 text-sm text-black whitespace-pre-wrap">{sub.content}</p>
                      </div>
                      {sub.comment && (
                        <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-strong)]">Комментарий учителя</p>
                          <p className="mt-1 text-sm text-black">{sub.comment}</p>
                        </div>
                      )}
                      {sub.grade === null && (
                        <Link
                          href={`/homework/${hw.id}/submissions`}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80"
                        >
                          Проверить ДЗ →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
