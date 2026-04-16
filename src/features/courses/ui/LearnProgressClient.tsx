"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CourseProgramSidebar,
  type ProgramModuleItem,
} from "@/features/courses/ui/CourseProgramSidebar";
import {
  useCourseProgress,
  useUnitProgress,
} from "@/features/courses/lib/useCourseProgress";
import { getCourseProgress } from "@/features/courses/lib/progress";

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
  const router = useRouter();
  const [notice, setNotice] = useState("");

  const allUnitIds = useMemo(
    () => modules.flatMap((module) => module.units.map((unit) => unit.id)),
    [modules],
  );

  const nextUnitId = useMemo(
    () => getNextUnitId(modules, activeUnitId),
    [modules, activeUnitId],
  );

  const { progressPercent: courseProgressPercent, completedUnits, totalUnits } =
    useCourseProgress(courseId, allUnitIds);

  const { completed, markVisited, markCompleted, setPercent } =
    useUnitProgress(courseId, activeUnitId);

  // One-time bulk sync: push all localStorage progress for this course to DB
  useEffect(() => {
    const sessionKey = `skillhub:synced:${courseId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    const state = getCourseProgress(courseId);
    if (!state) return;

    Object.entries(state.units).forEach(([unitId, rec]) => {
      if (!rec || rec.progressPercent === 0) return;
      fetch(`/api/units/${unitId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: rec.status,
          progressPercent: rec.progressPercent,
        }),
      }).catch(() => null);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Mark as visited when opening
  useEffect(() => {
    markVisited(20);
  }, [activeUnitId, courseId, markVisited]);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2000);
  }

  function handleMarkCompleted() {
    markCompleted();
    showNotice("Занятие пройдено!");
  }

  function handleGoNext() {
    if (!nextUnitId) return;
    // Mark current as completed, then navigate
    markCompleted();
    router.push(`/learn/${nextUnitId}`);
  }

  const isLast = !nextUnitId;
  const allDone = completedUnits === totalUnits && totalUnits > 0;

  return (
    <aside className={className ?? "space-y-4"}>
      <section className="skillhub-panel rounded-[1.75rem] p-4">
        <h3 className="text-sm font-semibold text-black">Ваш прогресс</h3>

        {/* Course progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Прогресс курса</span>
            <span className="font-medium text-black">{courseProgressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-black/8">
            <div
              className="skillhub-progress h-2 rounded-full transition-all duration-300"
              style={{ width: `${courseProgressPercent}%` }}
            />
          </div>
          <p className="text-xs text-[var(--muted)]">
            {completedUnits} из {totalUnits} занятий пройдено
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-4 space-y-2">
          {completed ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-emerald-700">Занятие пройдено</span>
              <button
                type="button"
                onClick={() => { setPercent(0); showNotice("Прогресс сброшен"); }}
                className="ml-auto text-xs text-emerald-600 hover:underline"
              >
                Сбросить
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleMarkCompleted}
              className="skillhub-button-primary w-full rounded-2xl px-3 py-2.5 text-sm font-medium"
            >
              Отметить как пройденное
            </button>
          )}

          {isLast && allDone ? (
            <div className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2.5 text-center text-sm font-medium text-black">
              Курс завершён!
            </div>
          ) : nextUnitId ? (
            <button
              type="button"
              onClick={handleGoNext}
              className="skillhub-button-outline w-full rounded-2xl px-3 py-2.5 text-sm font-medium"
            >
              {completed ? "Следующее занятие →" : "Завершить и продолжить →"}
            </button>
          ) : null}
        </div>

        {notice && (
          <p className="skillhub-chip mt-2 rounded-xl px-2.5 py-1.5 text-center text-xs">
            {notice}
          </p>
        )}
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
