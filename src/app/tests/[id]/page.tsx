import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseProgramSidebar } from "@/features/courses/ui/CourseProgramSidebar";
import { TestRunner } from "@/features/tests/ui/TestRunner";

export default async function TestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const test = await db.test.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: true },
        orderBy: { position: "asc" },
      },
      unit: {
        select: {
          id: true,
          title: true,
          module: {
            select: {
              id: true,
              title: true,
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
      lesson: {
        select: {
          id: true,
          title: true,
          courseId: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!test) {
    return (
      <section className="skillhub-panel rounded-[1.75rem] p-8">
        <h1 className="text-xl font-semibold">Тест не найден</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Возможно, ссылка устарела или тест был удален.
        </p>
      </section>
    );
  }

  const resolvedCourseId =
    test.course?.id ?? test.unit?.module.course.id ?? test.lesson?.courseId ?? null;
  const resolvedUnitId = test.unit?.id ?? null;

  const courseProgram = resolvedCourseId
    ? await db.course.findUnique({
        where: { id: resolvedCourseId },
        include: {
          modules: {
            orderBy: { position: "asc" },
            include: {
              units: {
                orderBy: { position: "asc" },
                include: {
                  tests: {
                    select: { id: true, title: true },
                    orderBy: { createdAt: "asc" },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  const sidebarModules =
    courseProgram?.modules.map((module) => ({
      id: module.id,
      title: module.title,
      units: module.units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        unitType: unit.unitType,
        tests: unit.tests.map((item) => ({ id: item.id, title: item.title })),
      })),
    })) ?? [];

  const totalQuestions = test.questions.length;
  const totalPoints = test.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );

  const breadcrumbsCourseTitle =
    test.course?.title ?? test.unit?.module.course.title ?? "Курс";
  const breadcrumbsCourseId =
    test.course?.id ?? test.unit?.module.course.id ?? resolvedCourseId;

  return (
    <section className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <Link href="/courses" className="hover:text-black hover:underline">
          Мои курсы
        </Link>
        <span>›</span>
        {breadcrumbsCourseId ? (
          <Link
            href={`/courses/${breadcrumbsCourseId}`}
            className="hover:text-black hover:underline"
          >
            {breadcrumbsCourseTitle}
          </Link>
        ) : (
          <span>{breadcrumbsCourseTitle}</span>
        )}
        <span>›</span>
        <span className="font-medium text-black">{test.title}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <header className="skillhub-panel rounded-[1.75rem] p-6">
            <div className="h-1.5 w-full rounded-full bg-black/10">
              <div className="skillhub-progress h-1.5 w-full rounded-full" />
            </div>

            <p className="skillhub-kicker mt-4 text-center text-xs font-medium">
              Формат экзамена
            </p>
            <h1 className="mt-2 text-center text-2xl font-semibold text-black">
              {test.title}
            </h1>
            <p className="mt-2 text-center text-sm text-[var(--muted)]">
              {test.description ?? "Решите задания и отправьте ответы на проверку."}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Вопросов
                </p>
                <p className="mt-1 text-xl font-semibold text-black">{totalQuestions}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Максимум баллов
                </p>
                <p className="mt-1 text-xl font-semibold text-black">{totalPoints}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  Статус
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--accent-strong)]">
                  Готов к прохождению
                </p>
              </div>
            </div>
          </header>

          <div className="skillhub-panel rounded-[1.75rem] p-6">
            <TestRunner
              testId={test.id}
              questions={test.questions}
              relatedCourseId={resolvedCourseId ?? undefined}
              relatedUnitId={resolvedUnitId ?? undefined}
            />
          </div>
        </div>

        <CourseProgramSidebar
          courseId={resolvedCourseId ?? undefined}
          modules={sidebarModules}
          activeUnitId={resolvedUnitId}
          activeTestId={test.id}
          className="h-fit xl:sticky xl:top-6"
        />
      </div>
    </section>
  );
}
