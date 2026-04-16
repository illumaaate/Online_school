"use client";

import Link from "next/link";
import clsx from "clsx";
import { useMemo } from "react";
import { useCourseProgress } from "@/features/courses/lib/useCourseProgress";

export type ProgramTestItem = {
  id: string;
  title: string;
};

export type ProgramUnitItem = {
  id: string;
  title: string;
  unitType: "MATERIAL" | "VIDEO" | "TEST" | "LIVE" | string;
  tests?: ProgramTestItem[];
};

export type ProgramModuleItem = {
  id: string;
  title: string;
  units: ProgramUnitItem[];
};

type CourseProgramSidebarProps = {
  modules: ProgramModuleItem[];
  courseId?: string;
  activeUnitId?: string | null;
  activeTestId?: string | null;
  progressPercent?: number;
  className?: string;
};

function unitTypeLabel(unitType: ProgramUnitItem["unitType"]) {
  return unitType === "LIVE" ? "Live" : null;
}

function calcProgressFallback(
  modules: ProgramModuleItem[],
  activeUnitId?: string | null,
) {
  const allUnits = modules.flatMap((module) => module.units);
  if (!allUnits.length || !activeUnitId) return 0;

  const activeIndex = allUnits.findIndex((unit) => unit.id === activeUnitId);
  if (activeIndex < 0) return 0;

  return Math.max(
    0,
    Math.min(100, Math.round(((activeIndex + 1) / allUnits.length) * 100)),
  );
}

export function CourseProgramSidebar({
  modules,
  courseId,
  activeUnitId,
  activeTestId,
  progressPercent,
  className,
}: CourseProgramSidebarProps) {
  const allUnitIds = useMemo(
    () => modules.flatMap((module) => module.units.map((unit) => unit.id)),
    [modules],
  );

  const {
    progressPercent: storedProgress,
    isCompleted,
    markVisited,
    markCompleted,
    setUnitPercent,
  } = useCourseProgress(courseId ?? "", allUnitIds);

  const computedProgress =
    progressPercent ??
    (courseId ? storedProgress : calcProgressFallback(modules, activeUnitId));

  return (
    <aside className={clsx("skillhub-panel rounded-[1.75rem] p-4", className)}>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-black">Программа курса</h3>
          <span className="text-xs font-medium text-[var(--muted)]">
            {computedProgress}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-black/10">
          <div
            className="skillhub-progress h-1.5 rounded-full transition-all"
            style={{ width: `${computedProgress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {modules.map((module, moduleIndex) => {
          const totalUnits = module.units.length;
          const completedUnits = module.units.reduce((count, unit) => {
            const done = courseId ? isCompleted(unit.id) : unit.id !== activeUnitId;
            return count + (done ? 1 : 0);
          }, 0);

          return (
            <section
              key={module.id}
              className="rounded-[1.5rem] border border-black/10 bg-[var(--surface-muted)] p-3"
            >
              <div className="mb-2 flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">
                  {moduleIndex + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-black">
                    {module.title}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {completedUnits} из {totalUnits} занятий
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5">
                {module.units.map((unit) => {
                  const isActiveUnit = unit.id === activeUnitId;
                  const hasActiveTest = !!unit.tests?.some(
                    (test) => test.id === activeTestId,
                  );
                  const done = courseId ? isCompleted(unit.id) : false;

                  return (
                    <li key={unit.id}>
                      <div
                        className={clsx(
                          "rounded-2xl border px-3 py-2 transition",
                          isActiveUnit || hasActiveTest
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-transparent bg-white hover:border-black/10 hover:bg-[#fcfcfc]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {courseId ? (
                            <button
                              type="button"
                              aria-label={
                                done
                                  ? "Снять отметку о прохождении"
                                  : "Отметить занятие как пройденное"
                              }
                              onClick={() => {
                                if (done) {
                                  setUnitPercent(unit.id, 0);
                                } else {
                                  markCompleted(unit.id);
                                }
                              }}
                              className={clsx(
                                "h-5 w-5 shrink-0 rounded-full border text-[11px] font-bold leading-none transition",
                                done
                                  ? "border-black bg-black text-white"
                                  : "border-black/15 bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]",
                              )}
                            >
                              {done ? "✓" : ""}
                            </button>
                          ) : (
                            <span className="h-5 w-5 shrink-0" />
                          )}

                          <Link
                            href={`/learn/${unit.id}`}
                            onClick={() => {
                              if (courseId) {
                                markVisited(unit.id, done ? 100 : 15);
                              }
                            }}
                            className={clsx(
                              "min-w-0 flex-1 truncate text-sm",
                              isActiveUnit || hasActiveTest
                                ? "font-semibold text-black"
                                : "text-[var(--muted)]",
                            )}
                          >
                            {unit.title}
                          </Link>

                          {unitTypeLabel(unit.unitType) ? (
                            <span
                              className={clsx(
                                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
                                isActiveUnit || hasActiveTest
                                  ? "border border-[var(--accent)] bg-white text-[var(--accent-strong)]"
                                  : "border border-black/10 bg-white text-[var(--muted)]",
                              )}
                            >
                              {unitTypeLabel(unit.unitType)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {unit.tests?.length ? (
                        <ul className="mt-1.5 space-y-1 pl-8">
                          {unit.tests.map((test) => {
                            const isActiveTest = test.id === activeTestId;

                            return (
                              <li key={test.id}>
                                <Link
                                  href={`/tests/${test.id}`}
                                  className={clsx(
                                    "block rounded-xl border px-2.5 py-1.5 text-xs transition",
                                    isActiveTest
                                      ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-black"
                                      : "border-transparent bg-white text-[var(--muted)] hover:border-black/10 hover:bg-[#fcfcfc] hover:text-black",
                                  )}
                                >
                                  Тест: {test.title}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {!modules.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-[var(--surface-muted)] p-4 text-center text-sm text-[var(--muted)]">
            В курсе пока нет модулей.
          </div>
        ) : null}
      </div>
    </aside>
  );
}
