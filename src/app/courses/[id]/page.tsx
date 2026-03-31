import Link from "next/link";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseActions } from "@/features/courses/ui/CourseActions";
import { CourseProgramSidebar } from "@/features/courses/ui/CourseProgramSidebar";

function unitTypeLabel(unitType: string) {
  switch (unitType) {
    case "MATERIAL":
      return "Материал";
    case "VIDEO":
      return "Видео";
    case "TEST":
      return "Тест";
    case "LIVE":
      return "Live";
    default:
      return unitType;
  }
}

export default async function CourseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const course = await db.course.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      enrollments: { select: { userId: true } },
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
  });

  if (!course) {
    return (
      <section className="skillhub-panel rounded-[1.75rem] p-8">
        <h1 className="text-xl font-semibold">Курс не найден</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Возможно, курс был удален или ссылка устарела.
        </p>
      </section>
    );
  }

  const canManage = user.role === Role.ADMIN || user.id === course.teacher.id;
  const isEnrolled = course.enrollments.some(
    (enrollment) => enrollment.userId === user.id,
  );

  const totalUnits = course.modules.reduce(
    (sum, module) => sum + module.units.length,
    0,
  );
  const totalTests = course.modules.reduce(
    (sum, module) =>
      sum +
      module.units.reduce((unitsSum, unit) => unitsSum + unit.tests.length, 0),
    0,
  );
  const totalLive = course.modules.reduce(
    (sum, module) =>
      sum + module.units.filter((unit) => unit.unitType === "LIVE").length,
    0,
  );
  const totalMaterials = course.modules.reduce(
    (sum, module) =>
      sum +
      module.units.filter(
        (unit) => unit.unitType === "MATERIAL" || unit.unitType === "VIDEO",
      ).length,
    0,
  );

  const sidebarModules = course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    units: module.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      unitType: unit.unitType,
      tests: unit.tests.map((test) => ({ id: test.id, title: test.title })),
    })),
  }));

  return (
    <section className="space-y-6">
      <div className="skillhub-hero relative overflow-hidden rounded-[2rem] p-7 md:p-9">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_center,rgba(247,148,29,0.18),transparent_72%)]" />
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-[var(--accent)]">
            Онлайн-курс
          </p>

          <h1 className="mt-4 max-w-3xl text-3xl font-semibold md:text-4xl">
            {course.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">
            {course.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1">
              Преподаватель: {course.teacher.name}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              Студентов: {course.enrollments.length}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              Модулей: {course.modules.length}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              Занятий: {totalUnits}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              Тестов: {totalTests}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-white/80 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide opacity-80">Материалы</p>
              <p className="mt-1 text-lg font-semibold text-white">{totalMaterials}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide opacity-80">Live-уроки</p>
              <p className="mt-1 text-lg font-semibold text-white">{totalLive}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide opacity-80">Тесты</p>
              <p className="mt-1 text-lg font-semibold text-white">{totalTests}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide opacity-80">Статус</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {isEnrolled ? "Вы записаны" : "Не записаны"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <CourseActions courseId={course.id} canManage={canManage} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="skillhub-panel rounded-[1.75rem] p-5">
            <h2 className="text-lg font-semibold text-black">Карта курса</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Последовательный roadmap по модулям, занятиям и тестам.
            </p>
          </div>

          {course.modules.map((module, moduleIndex) => (
            <article key={module.id} className="skillhub-panel rounded-[1.75rem] p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">
                  {moduleIndex + 1}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-black">{module.title}</h3>
                  <p className="text-xs text-[var(--muted)]">
                    {module.units.length} занятий в модуле
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {module.units.map((unit) => (
                  <div
                    key={unit.id}
                    className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/learn/${unit.id}`}
                        className="truncate text-sm font-medium text-black hover:underline"
                      >
                        {unit.title}
                      </Link>
                      <span className="rounded-md border border-black/10 px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                        {unitTypeLabel(unit.unitType)}
                      </span>
                    </div>

                    {unit.tests.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {unit.tests.map((test) => (
                          <Link
                            key={test.id}
                            href={`/tests/${test.id}`}
                            className="skillhub-chip rounded-lg px-2.5 py-1 text-xs font-medium"
                          >
                            Тест: {test.title}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                {!module.units.length ? (
                  <p className="rounded-2xl border border-dashed border-black/10 bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
                    В этом модуле пока нет занятий.
                  </p>
                ) : null}
              </div>
            </article>
          ))}

          {!course.modules.length ? (
            <div className="skillhub-panel rounded-[1.75rem] p-8 text-center text-[var(--muted)]">
              В курсе пока нет модулей. Добавьте первый модуль через блок
              управления курсом выше.
            </div>
          ) : null}
        </div>

        <CourseProgramSidebar
          courseId={course.id}
          modules={sidebarModules}
          className="h-fit xl:sticky xl:top-6"
        />
      </div>
    </section>
  );
}
