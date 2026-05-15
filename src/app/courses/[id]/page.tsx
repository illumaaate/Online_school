import Link from "next/link";
import type { ReactElement } from "react";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseActions } from "@/features/courses/ui/CourseActions";
import {
  CourseProgramSidebar,
  type ProgramModuleItem,
} from "@/features/courses/ui/CourseProgramSidebar";
import {
  CourseProgressBar,
  type CourseProgressModuleItem,
} from "@/features/courses/ui/CourseProgressBar";
import {
  collectUnitsFromTree,
  flattenModuleTree,
  getCourseModuleTree,
  type CourseTreeModule,
} from "@/features/courses/lib/courseTree";

function mapTreeForSidebar(modules: CourseTreeModule[]): ProgramModuleItem[] {
  return modules.map((module) => ({
    id: module.id,
    title: module.title,
    units: module.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      unitType: unit.unitType,
      tests: unit.tests.map((test) => ({ id: test.id, title: test.title })),
    })),
    children: mapTreeForSidebar(module.children),
  }));
}

function mapModulesForProgress(
  modules: ProgramModuleItem[],
): CourseProgressModuleItem[] {
  return modules.map((module) => ({
    id: module.id,
    title: module.title,
    units: module.units.map((unit) => ({ id: unit.id, title: unit.title })),
    children: module.children?.map(
      (child) => mapModulesForProgress([child])[0],
    ),
  }));
}

function renderCourseMap(
  modules: CourseTreeModule[],
  depth = 0,
): ReactElement[] {
  return modules.map((module, moduleIndex) => (
    <article
      key={module.id}
      className="skillhub-panel rounded-[1.75rem] p-5"
      style={{ marginLeft: depth > 0 ? `${depth * 16}px` : undefined }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">
          {moduleIndex + 1}
        </div>
        <div>
          <h3 className="text-base font-semibold text-black">{module.title}</h3>
          <p className="text-xs text-[var(--muted)]">
            {module.units.length} занятий в этой главе
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {module.units.map((unit) => (
          <div key={unit.id} className="space-y-2">
            <Link
              href={`/learn/${unit.id}`}
              className="flex items-center gap-2 rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium text-black hover:border-black/20"
            >
              <span className="truncate">{unit.title}</span>
              {unit.unitType === "LIVE" ? (
                <span className="ml-auto shrink-0 rounded-md border border-black/10 bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                  Live
                </span>
              ) : null}
            </Link>

            {unit.tests.length ? (
              <div className="ml-7 space-y-2 border-l border-black/15 pl-3">
                {unit.tests.map((test) => (
                  <Link
                    key={test.id}
                    href={`/tests/${test.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black hover:border-black/20"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/15 text-[10px] font-semibold text-[var(--muted)]">
                      ✓
                    </span>
                    <span className="truncate font-medium">{test.title}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {!module.units.length ? (
          <p className="rounded-2xl border border-dashed border-black/10 bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
            В этой главе пока нет занятий.
          </p>
        ) : null}
      </div>

      {module.children.length ? (
        <div className="mt-4 space-y-4">
          {renderCourseMap(module.children, depth + 1)}
        </div>
      ) : null}
    </article>
  ));
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

  const modulesTree = await getCourseModuleTree(course.id);
  const flatModules = flattenModuleTree(modulesTree);
  const allUnits = collectUnitsFromTree(modulesTree);

  const totalUnits = allUnits.length;
  const totalTests = allUnits.reduce((sum, unit) => sum + unit.tests.length, 0);
  const totalLive = allUnits.filter((unit) => unit.unitType === "LIVE").length;
  const totalMaterials = allUnits.filter(
    (unit) => unit.unitType === "MATERIAL" || unit.unitType === "VIDEO",
  ).length;

  const sidebarModules = mapTreeForSidebar(modulesTree);

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
              Модулей: {flatModules.length}
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
              <p className="text-[11px] uppercase tracking-wide opacity-80">
                Материалы
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {totalMaterials}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide opacity-80">
                Live-уроки
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {totalLive}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide opacity-80">
                Тесты
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {totalTests}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide opacity-80">
                Статус
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {isEnrolled ? "Вы записаны" : "Не записаны"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isEnrolled && (
        <CourseProgressBar
          courseId={course.id}
          modules={mapModulesForProgress(sidebarModules)}
        />
      )}

      {canManage && (
        <div className="flex items-center gap-3">
          <Link
            href={`/courses/${course.id}/stats`}
            className="flex items-center gap-2 rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-2.5 text-sm font-medium text-black hover:border-[var(--accent)]"
          >
            <svg
              className="h-4 w-4 text-[var(--muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Статистика курса
          </Link>
        </div>
      )}

      <CourseActions
        courseId={course.id}
        canManage={canManage}
        isAdmin={user.role === Role.ADMIN}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="skillhub-panel rounded-[1.75rem] p-5">
            <h2 className="text-lg font-semibold text-black">Карта курса</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Последовательный roadmap по модулям, занятиям и тестам.
            </p>
          </div>

          {renderCourseMap(modulesTree)}

          {!modulesTree.length ? (
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
