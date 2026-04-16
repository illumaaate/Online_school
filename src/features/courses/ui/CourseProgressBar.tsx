"use client";

import Link from "next/link";
import { useCourseProgress } from "@/features/courses/lib/useCourseProgress";
import { useMemo } from "react";

type UnitItem = {
  id: string;
  title: string;
};

type ModuleItem = {
  id: string;
  title: string;
  units: UnitItem[];
};

interface Props {
  courseId: string;
  modules: ModuleItem[];
}

export function CourseProgressBar({ courseId, modules }: Props) {
  const allUnits = useMemo(
    () => modules.flatMap((m) => m.units),
    [modules],
  );
  const allUnitIds = useMemo(() => allUnits.map((u) => u.id), [allUnits]);

  const { progressPercent, completedUnits, totalUnits, isCompleted } =
    useCourseProgress(courseId, allUnitIds);

  const nextUnit = useMemo(
    () => allUnits.find((u) => !isCompleted(u.id)) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allUnits, isCompleted, completedUnits],
  );

  if (!totalUnits) return null;

  const allDone = completedUnits === totalUnits;

  return (
    <div className="skillhub-panel rounded-[1.75rem] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: label + bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-black">
              {allDone ? "Курс пройден!" : "Ваш прогресс"}
            </span>
            <span className="shrink-0 text-sm font-bold text-black">
              {progressPercent}%
            </span>
          </div>

          {/* Bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/8">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: allDone
                  ? "linear-gradient(90deg, #22c55e, #16a34a)"
                  : "linear-gradient(90deg, var(--accent), var(--accent-strong))",
              }}
            />
          </div>

          <p className="mt-1.5 text-xs text-[var(--muted)]">
            {completedUnits} из {totalUnits} занятий пройдено
          </p>
        </div>

        {/* Right: button */}
        <div className="shrink-0">
          {allDone ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-semibold text-emerald-700">Всё пройдено</span>
            </div>
          ) : nextUnit ? (
            <Link
              href={`/learn/${nextUnit.id}`}
              className="flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80"
            >
              {completedUnits === 0 ? "Начать курс" : "Продолжить"}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
