"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  getCourseProgressPercent,
  getCompletedUnitsCount,
} from "@/features/courses/lib/progress";
import { useEffect, useState } from "react";

type CourseItem = {
  id: string;
  title: string;
  teacherName: string;
  unitIds: string[];
};

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function StudentCoursesProgress({ courses }: { courses: CourseItem[] }) {
  const mounted = useMounted();

  const enriched = useMemo(() => {
    if (!mounted) return courses.map((c) => ({ ...c, percent: 0, completed: 0 }));
    return courses.map((c) => ({
      ...c,
      percent: getCourseProgressPercent(c.id, c.unitIds),
      completed: getCompletedUnitsCount(c.id, c.unitIds),
    }));
  }, [courses, mounted]);

  if (!courses.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Вы ещё не записаны ни на один курс.{" "}
        <Link href="/courses" className="text-[var(--accent-strong)] underline">
          Перейти в каталог
        </Link>
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {enriched.map((course) => (
        <Link
          key={course.id}
          href={`/courses/${course.id}`}
          className="skillhub-panel-muted group block rounded-2xl border p-4 hover:border-[var(--accent)]"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-black group-hover:text-[var(--accent-strong)]">
              {course.title}
            </p>
            <span className="shrink-0 text-xs font-bold text-[var(--accent-strong)]">
              {course.percent}%
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{course.teacherName}</p>

          <div className="mt-3 h-1.5 w-full rounded-full bg-black/10">
            <div
              className="skillhub-progress h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${course.percent}%` }}
            />
          </div>

          <p className="mt-1.5 text-xs text-[var(--muted)]">
            {course.completed} / {course.unitIds.length} занятий пройдено
          </p>
        </Link>
      ))}
    </div>
  );
}
