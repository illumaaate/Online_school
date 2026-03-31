"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CourseStatus = "not-started" | "in-progress" | "completed";

export type CatalogCourse = {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  progressPercent?: number | null;
  enrollmentsCount?: number;
  modulesCount?: number;
  unitsCount?: number;
  testsCount?: number;
  level?: string;
  durationLabel?: string;
  updatedAt?: string | Date | null;
  isEnrolled?: boolean;
  tags?: string[];
};

type SortMode = "relevance" | "progress-desc" | "updated-desc" | "title-asc";

type Props = {
  courses: CatalogCourse[];
  title?: string;
  subtitle?: string;
};

function clampProgress(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value as number)));
}

function inferStatus(progress: number): CourseStatus {
  if (progress >= 100) return "completed";
  if (progress > 0) return "in-progress";
  return "not-started";
}

function formatUpdatedAt(value: CatalogCourse["updatedAt"]) {
  if (!value) return "Недавно обновлен";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Недавно обновлен";
  return `Обновлен ${new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(date)}`;
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function includesNormalized(text: string, query: string) {
  return normalize(text).includes(normalize(query));
}

function scoreCourse(course: CatalogCourse, query: string) {
  if (!query.trim()) return 0;
  const q = normalize(query);

  let score = 0;
  if (includesNormalized(course.title, q)) score += 10;
  if (includesNormalized(course.description, q)) score += 4;
  if (includesNormalized(course.teacherName, q)) score += 3;
  if (course.tags?.some((tag) => includesNormalized(tag, q))) score += 3;
  if (course.level && includesNormalized(course.level, q)) score += 2;

  return score;
}

const statusMeta: Record<CourseStatus, { label: string; chipClass: string }> = {
  "not-started": {
    label: "Не начат",
    chipClass:
      "border border-black/10 bg-[var(--surface-muted)] text-[var(--muted)]",
  },
  "in-progress": {
    label: "В процессе",
    chipClass: "skillhub-chip",
  },
  completed: {
    label: "Завершен",
    chipClass: "border border-black bg-black text-white",
  },
};

export default function CourseCatalog({
  courses,
  title = "Каталог курсов",
  subtitle = "Выберите курс, настройте фильтры и продолжайте обучение в удобном темпе.",
}: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CourseStatus>("all");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("relevance");

  const teacherOptions = useMemo(() => {
    const uniq = Array.from(
      new Set(courses.map((c) => c.teacherName).filter(Boolean)),
    );
    return uniq.sort((a, b) => a.localeCompare(b, "ru"));
  }, [courses]);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const course of courses) {
      for (const tag of course.tags ?? []) tags.add(tag);
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "ru"));
  }, [courses]);

  const prepared = useMemo(() => {
    return courses.map((course) => {
      const progress = clampProgress(course.progressPercent);
      const status = inferStatus(progress);
      const relevance = scoreCourse(course, query);
      return { ...course, progress, status, relevance };
    });
  }, [courses, query]);

  const filtered = useMemo(() => {
    let next = prepared.filter((course) => {
      if (query.trim()) {
        const directMatch =
          includesNormalized(course.title, query) ||
          includesNormalized(course.description, query) ||
          includesNormalized(course.teacherName, query) ||
          (course.level ? includesNormalized(course.level, query) : false) ||
          (course.tags ?? []).some((tag) => includesNormalized(tag, query));

        if (!directMatch) return false;
      }

      if (statusFilter !== "all" && course.status !== statusFilter) return false;
      if (teacherFilter !== "all" && course.teacherName !== teacherFilter) return false;
      if (tagFilter !== "all" && !(course.tags ?? []).includes(tagFilter)) return false;

      return true;
    });

    next = [...next].sort((a, b) => {
      switch (sortMode) {
        case "progress-desc":
          return b.progress - a.progress;
        case "updated-desc": {
          const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return db - da;
        }
        case "title-asc":
          return a.title.localeCompare(b.title, "ru");
        case "relevance":
        default: {
          if (!query.trim()) return b.progress - a.progress;
          if (b.relevance !== a.relevance) return b.relevance - a.relevance;
          return b.progress - a.progress;
        }
      }
    });

    return next;
  }, [prepared, query, statusFilter, teacherFilter, tagFilter, sortMode]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-black">{title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
      </div>

      <div className="skillhub-panel rounded-[1.75rem] p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, описанию, преподавателю..."
            className="md:col-span-2 xl:col-span-2 rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | CourseStatus)}
            className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm"
          >
            <option value="all">Все статусы</option>
            <option value="not-started">Не начат</option>
            <option value="in-progress">В процессе</option>
            <option value="completed">Завершен</option>
          </select>

          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm"
          >
            <option value="all">Все преподаватели</option>
            {teacherOptions.map((teacher) => (
              <option key={teacher} value={teacher}>
                {teacher}
              </option>
            ))}
          </select>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm"
          >
            <option value="relevance">Сначала релевантные</option>
            <option value="progress-desc">По прогрессу</option>
            <option value="updated-desc">По обновлению</option>
            <option value="title-asc">По алфавиту</option>
          </select>
        </div>

        {tagOptions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTagFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                tagFilter === "all"
                  ? "skillhub-chip"
                  : "border border-black/10 bg-white text-[var(--muted)] hover:border-[var(--accent)]"
              }`}
            >
              Все категории
            </button>
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  tagFilter === tag
                    ? "skillhub-chip"
                    : "border border-black/10 bg-white text-[var(--muted)] hover:border-[var(--accent)]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="skillhub-panel rounded-[1.75rem] p-10 text-center">
          <p className="text-base font-medium text-black">Ничего не найдено</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Попробуйте изменить запрос или сбросить фильтры.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
              setTeacherFilter("all");
              setTagFilter("all");
              setSortMode("relevance");
            }}
            className="skillhub-button-outline mt-4 rounded-2xl px-4 py-2 text-sm"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => {
            const meta = statusMeta[course.status];

            return (
              <article key={course.id} className="skillhub-panel rounded-[1.75rem] p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.chipClass}`}>
                    {meta.label}
                  </span>
                  {course.level ? (
                    <span className="rounded-full border border-black/10 bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                      {course.level}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-black">
                  {course.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">
                  {course.description}
                </p>

                <div className="mt-4 space-y-1 text-xs text-[var(--muted)]">
                  <p>Преподаватель: {course.teacherName}</p>
                  <p>
                    Модулей: {course.modulesCount ?? 0} · Занятий: {course.unitsCount ?? 0} · Тестов:{" "}
                    {course.testsCount ?? 0}
                  </p>
                  <p>Студентов: {course.enrollmentsCount ?? 0}</p>
                  <p>{formatUpdatedAt(course.updatedAt)}</p>
                  {course.durationLabel ? <p>Длительность: {course.durationLabel}</p> : null}
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>Прогресс</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/10">
                    <div
                      className="skillhub-progress h-1.5 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {!!course.tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {course.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-black/10 bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <Link
                  href={`/courses/${course.id}`}
                  className="skillhub-button-primary mt-5 inline-flex rounded-2xl px-4 py-2.5 text-sm font-medium"
                >
                  {course.progress > 0 ? "Продолжить обучение" : "Открыть курс"}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
