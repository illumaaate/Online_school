"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CourseProgramSidebar,
  type ProgramModuleItem,
} from "@/features/courses/ui/CourseProgramSidebar";
import {
  useCourseProgress,
  useUnitProgress,
} from "@/features/courses/lib/useCourseProgress";

type LearnProgressClientProps = {
  courseId: string;
  activeUnitId: string;
  activeTestId?: string | null;
  modules: ProgramModuleItem[];
  className?: string;
};

function getNextUnitId(modules: ProgramModuleItem[], activeUnitId: string) {
  const unitIds = modules.flatMap((module) => module.units.map((unit) => unit.id));
  const index = unitIds.findIndex((id) => id === activeUnitId);
  if (index < 0 || index >= unitIds.length - 1) return null;
  return unitIds[index + 1];
}

export default function LearnProgressClient({
  courseId,
  activeUnitId,
  activeTestId = null,
  modules,
  className,
}: LearnProgressClientProps) {
  const [notice, setNotice] = useState("");

  const allUnitIds = useMemo(
    () => modules.flatMap((module) => module.units.map((unit) => unit.id)),
    [modules],
  );

  const nextUnitId = useMemo(
    () => getNextUnitId(modules, activeUnitId),
    [modules, activeUnitId],
  );

  const {
    progressPercent: courseProgressPercent,
    completedUnits,
    totalUnits,
  } = useCourseProgress(courseId, allUnitIds);

  const {
    progressPercent: unitProgressPercent,
    completed,
    markVisited,
    markCompleted,
    setPercent,
  } = useUnitProgress(courseId, activeUnitId);

  useEffect(() => {
    markVisited(20);
  }, [activeUnitId, courseId, markVisited]);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 1800);
  }

  function handleMarkInProgress() {
    const next = Math.max(20, unitProgressPercent);
    setPercent(next);
    showNotice("Занятие отмечено как «в процессе»");
  }

  function handleMarkCompleted() {
    markCompleted();
    showNotice("Занятие отмечено как пройденное");
  }

  function handleResetCurrent() {
    setPercent(0);
    showNotice("Прогресс текущего занятия сброшен");
  }

  return (
    <aside className={className ?? "space-y-4"}>
      <section className="skillhub-panel rounded-[1.75rem] p-4">
        <h3 className="text-sm font-semibold text-black">Ваш прогресс</h3>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Курс</span>
            <span>{courseProgressPercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-black/10">
            <div
              className="skillhub-progress h-1.5 rounded-full transition-all"
              style={{ width: `${courseProgressPercent}%` }}
            />
          </div>

          <p className="text-xs text-[var(--muted)]">
            Пройдено занятий:{" "}
            <span className="font-medium text-black">
              {completedUnits}/{totalUnits}
            </span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={handleMarkInProgress}
            className="skillhub-button-outline rounded-2xl px-3 py-2 text-sm"
          >
            Отметить «в процессе»
          </button>

          <button
            type="button"
            onClick={handleMarkCompleted}
            className="skillhub-button-primary rounded-2xl px-3 py-2 text-sm font-medium"
          >
            Отметить как пройденное
          </button>

          <button
            type="button"
            onClick={handleResetCurrent}
            className="skillhub-button-outline rounded-2xl px-3 py-2 text-sm"
          >
            Сбросить прогресс занятия
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Текущее занятие</span>
          <span>{completed ? "Завершено" : `${unitProgressPercent}%`}</span>
        </div>

        {notice ? (
          <p className="skillhub-chip mt-2 rounded-xl px-2.5 py-1.5 text-xs">
            {notice}
          </p>
        ) : null}

        {nextUnitId ? (
          <Link
            href={`/learn/${nextUnitId}`}
            className="skillhub-button-outline mt-3 inline-flex w-full items-center justify-center rounded-2xl px-3 py-2 text-sm font-medium"
          >
            Следующее занятие →
          </Link>
        ) : null}
      </section>

      <CourseProgramSidebar
        courseId={courseId}
        modules={modules}
        activeUnitId={activeUnitId}
        activeTestId={activeTestId}
      />
    </aside>
  );
}
