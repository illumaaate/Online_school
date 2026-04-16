import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentsTable } from "@/features/courses/ui/StudentsTable";

export default async function CourseStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const course = await db.course.findUnique({
    where: { id },
    select: { id: true, title: true, teacherId: true },
  });

  if (!course) notFound();

  const canManage =
    user.role === Role.ADMIN || user.id === course.teacherId;
  if (!canManage) redirect(`/courses/${id}`);

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [enrollments, tests, homeworks, totalUnits, allUnitProgress] = await Promise.all([
    db.enrollment.findMany({
      where: { courseId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),

    db.test.findMany({
      where: {
        OR: [
          { courseId: id },
          { unit: { module: { courseId: id } } },
        ],
        isPublished: true,
      },
      include: {
        attempts: {
          where: { submittedAt: { not: null } },
          select: {
            id: true,
            studentId: true,
            score: true,
            maxScore: true,
            submittedAt: true,
            requiresReview: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    db.homework.findMany({
      where: { courseId: id },
      include: {
        submissions: {
          select: {
            id: true,
            studentId: true,
            grade: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    db.lessonUnit.count({
      where: { module: { courseId: id } },
    }),

    db.unitProgress.findMany({
      where: { courseId: id },
      select: { userId: true, unitId: true, status: true, progressPercent: true },
    }),
  ]);

  const studentIds = new Set(enrollments.map((e) => e.userId));
  const totalStudents = enrollments.length;

  // ── Per-test stats ─────────────────────────────────────────────────────────
  const testStats = tests.map((test) => {
    const studentAttempts = test.attempts.filter((a) =>
      studentIds.has(a.studentId),
    );
    const uniqueStudents = new Set(studentAttempts.map((a) => a.studentId)).size;
    const scores = studentAttempts
      .filter((a) => a.score !== null && a.maxScore && a.maxScore > 0)
      .map((a) => Math.round(((a.score ?? 0) / (a.maxScore ?? 1)) * 100));
    const avgPct =
      scores.length > 0
        ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
        : null;
    const pendingReview = studentAttempts.filter(
      (a) => a.requiresReview,
    ).length;

    return {
      id: test.id,
      title: test.title,
      totalAttempts: studentAttempts.length,
      uniqueStudents,
      completionPct:
        totalStudents > 0
          ? Math.round((uniqueStudents / totalStudents) * 100)
          : 0,
      avgPct,
      pendingReview,
    };
  });

  // ── Per-homework stats ─────────────────────────────────────────────────────
  const hwStats = homeworks.map((hw) => {
    const subs = hw.submissions.filter((s) => studentIds.has(s.studentId));
    const graded = subs.filter((s) => s.grade !== null);
    const grades = graded.map((s) => s.grade as number);
    const avgGrade =
      grades.length > 0
        ? Math.round(grades.reduce((s, v) => s + v, 0) / grades.length)
        : null;

    return {
      id: hw.id,
      title: hw.title,
      dueDate: hw.dueDate,
      submitted: subs.length,
      graded: graded.length,
      pending: subs.length - graded.length,
      notSubmitted: totalStudents - subs.length,
      avgGrade,
    };
  });

  // ── Per-student stats ──────────────────────────────────────────────────────
  const studentStats = enrollments.map((enrollment) => {
    const sid = enrollment.userId;

    const testAttemptsByStudent = tests.flatMap((t) =>
      t.attempts.filter((a) => a.studentId === sid),
    );
    const testsDone = new Set(
      testAttemptsByStudent.map((a) => tests.find((t) =>
        t.attempts.some((ta) => ta.id === a.id),
      )?.id),
    ).size;

    const scores = testAttemptsByStudent
      .filter((a) => a.score !== null && a.maxScore && a.maxScore > 0)
      .map((a) => Math.round(((a.score ?? 0) / (a.maxScore ?? 1)) * 100));
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
        : null;

    const hwSubs = homeworks.flatMap((hw) =>
      hw.submissions.filter((s) => s.studentId === sid),
    );
    const hwDone = hwSubs.length;
    const hwGraded = hwSubs.filter((s) => s.grade !== null).length;

    // Unit progress from DB
    const studentProgress = allUnitProgress.filter((p) => p.userId === sid);
    const unitsCompleted = studentProgress.filter((p) => p.status === "COMPLETED").length;
    const unitProgressPct =
      totalUnits > 0 ? Math.round((unitsCompleted / totalUnits) * 100) : 0;

    return {
      id: sid,
      name: enrollment.user.name,
      email: enrollment.user.email,
      enrolledAt: enrollment.createdAt,
      testsDone,
      testsTotal: tests.length,
      avgScore,
      hwDone,
      hwTotal: homeworks.length,
      hwGraded,
      unitsCompleted,
      unitProgressPct,
    };
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalAttempts = tests.reduce((s, t) => s + t.attempts.filter(a => studentIds.has(a.studentId)).length, 0);
  const allScores = tests.flatMap((t) =>
    t.attempts
      .filter((a) => studentIds.has(a.studentId) && a.score !== null && a.maxScore && a.maxScore > 0)
      .map((a) => Math.round(((a.score ?? 0) / (a.maxScore ?? 1)) * 100)),
  );
  const avgScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
      : null;
  const pendingHw = homeworks.reduce(
    (s, hw) =>
      s +
      hw.submissions.filter(
        (sub) => studentIds.has(sub.studentId) && sub.grade === null,
      ).length,
    0,
  );

  function scoreColor(pct: number | null) {
    if (pct === null) return "text-[var(--muted)]";
    if (pct >= 80) return "text-emerald-700";
    if (pct >= 50) return "text-[var(--accent-strong)]";
    return "text-red-600";
  }
  function scoreBg(pct: number | null) {
    if (pct === null) return "bg-[var(--surface-muted)]";
    if (pct >= 80) return "bg-emerald-50";
    if (pct >= 50) return "bg-[var(--accent-soft)]";
    return "bg-red-50";
  }

  return (
    <section className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <Link href="/courses" className="hover:text-black hover:underline">Мои курсы</Link>
        <span>›</span>
        <Link href={`/courses/${id}`} className="hover:text-black hover:underline">{course.title}</Link>
        <span>›</span>
        <span className="font-medium text-black">Статистика</span>
      </nav>

      {/* Hero */}
      <div className="skillhub-hero rounded-[2rem] p-7 md:p-9">
        <p className="skillhub-kicker text-xs font-semibold">Аналитика курса</p>
        <h1 className="mt-3 text-2xl font-semibold">{course.title}</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Студентов</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalStudents}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Занятий</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalUnits}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Попыток тестов</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalAttempts}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Средний балл</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent)]">
              {avgScore !== null ? `${avgScore}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Tests */}
      {testStats.length > 0 && (
        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <h2 className="mb-4 text-base font-semibold text-black">Тесты</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs text-[var(--muted)]">
                  <th className="pb-2 pr-4 font-medium">Тест</th>
                  <th className="pb-2 pr-4 font-medium text-right">Сдали</th>
                  <th className="pb-2 pr-4 font-medium text-right">Охват</th>
                  <th className="pb-2 pr-4 font-medium text-right">Средний балл</th>
                  <th className="pb-2 font-medium text-right">На проверке</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {testStats.map((t) => (
                  <tr key={t.id} className="group">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/tests/${t.id}`}
                        className="font-medium text-black hover:underline"
                      >
                        {t.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--muted)]">
                      {t.uniqueStudents} / {totalStudents}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-black/8">
                          <div
                            className="h-full rounded-full bg-[var(--accent)]"
                            style={{ width: `${t.completionPct}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs text-[var(--muted)]">{t.completionPct}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {t.avgPct !== null ? (
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${scoreBg(t.avgPct)} ${scoreColor(t.avgPct)}`}>
                          {t.avgPct}%
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {t.pendingReview > 0 ? (
                        <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-strong)]">
                          {t.pendingReview}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Homework */}
      {hwStats.length > 0 && (
        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-black">Домашние задания</h2>
            {pendingHw > 0 && (
              <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-bold text-black">
                {pendingHw} на проверке
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs text-[var(--muted)]">
                  <th className="pb-2 pr-4 font-medium">Задание</th>
                  <th className="pb-2 pr-4 font-medium text-right">Сдали</th>
                  <th className="pb-2 pr-4 font-medium text-right">Не сдали</th>
                  <th className="pb-2 pr-4 font-medium text-right">Проверено</th>
                  <th className="pb-2 font-medium text-right">Средняя оценка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {hwStats.map((hw) => (
                  <tr key={hw.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-black">{hw.title}</p>
                      {hw.dueDate && (
                        <p className="text-xs text-[var(--muted)]">
                          Дедлайн:{" "}
                          {new Date(hw.dueDate).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--muted)]">
                      {hw.submitted} / {totalStudents}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {hw.notSubmitted > 0 ? (
                        <span className="text-sm font-medium text-red-600">{hw.notSubmitted}</span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Все</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--muted)]">
                      {hw.graded} / {hw.submitted}
                    </td>
                    <td className="py-3 text-right">
                      {hw.avgGrade !== null ? (
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${scoreBg(hw.avgGrade)} ${scoreColor(hw.avgGrade)}`}>
                          {hw.avgGrade}/100
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Students table */}
      <div className="skillhub-panel rounded-[1.75rem] p-5">
        <h2 className="mb-4 text-base font-semibold text-black">
          Студенты
          <span className="ml-2 text-sm font-normal text-[var(--muted)]">({totalStudents})</span>
        </h2>
        <StudentsTable students={studentStats} courseId={id} />
      </div>

      {testStats.length === 0 && hwStats.length === 0 && totalStudents === 0 && (
        <div className="skillhub-panel rounded-[1.75rem] p-8 text-center text-[var(--muted)]">
          Пока нет данных. Добавьте студентов, тесты и задания, чтобы здесь появилась статистика.
        </div>
      )}
    </section>
  );
}
