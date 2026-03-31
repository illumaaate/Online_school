export type UnitProgressStatus = "in_progress" | "completed";

export type UnitProgressRecord = {
  status: UnitProgressStatus;
  progressPercent: number;
  lastVisitedAt: string;
  completedAt?: string;
};

export type CourseProgressState = {
  updatedAt: string;
  units: Record<string, UnitProgressRecord>;
};

type ProgressStorage = Record<string, CourseProgressState>;

const STORAGE_KEY = "skillhub:course-progress:v1";

function isBrowser() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeParseStorage(raw: string | null): ProgressStorage {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ProgressStorage;
  } catch {
    return {};
  }
}

function readStorage(): ProgressStorage {
  if (!isBrowser()) return {};
  return safeParseStorage(window.localStorage.getItem(STORAGE_KEY));
}

function writeStorage(data: ProgressStorage) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function ensureCourseState(storage: ProgressStorage, courseId: string): CourseProgressState {
  const existing = storage[courseId];
  if (existing) return existing;

  const created: CourseProgressState = {
    updatedAt: new Date().toISOString(),
    units: {},
  };
  storage[courseId] = created;
  return created;
}

export function getCourseProgress(courseId: string): CourseProgressState | null {
  if (!courseId) return null;
  const storage = readStorage();
  return storage[courseId] ?? null;
}

export function getUnitProgress(courseId: string, unitId: string): UnitProgressRecord | null {
  const course = getCourseProgress(courseId);
  if (!course) return null;
  return course.units[unitId] ?? null;
}

export function upsertUnitProgress(
  courseId: string,
  unitId: string,
  patch: Partial<UnitProgressRecord>,
): UnitProgressRecord | null {
  if (!courseId || !unitId) return null;

  const now = new Date().toISOString();
  const storage = readStorage();
  const course = ensureCourseState(storage, courseId);

  const current = course.units[unitId];
  const nextStatus: UnitProgressStatus =
    patch.status ??
    current?.status ??
    (patch.progressPercent === 100 ? "completed" : "in_progress");

  const nextPercent = clampPercent(
    patch.progressPercent ??
      current?.progressPercent ??
      (nextStatus === "completed" ? 100 : 0),
  );

  const next: UnitProgressRecord = {
    status: nextStatus,
    progressPercent: nextPercent,
    lastVisitedAt: patch.lastVisitedAt ?? now,
    completedAt:
      nextStatus === "completed"
        ? patch.completedAt ?? current?.completedAt ?? now
        : undefined,
  };

  if (next.status === "completed") {
    next.progressPercent = 100;
  }

  course.units[unitId] = next;
  course.updatedAt = now;
  writeStorage(storage);

  return next;
}

export function markUnitVisited(courseId: string, unitId: string, suggestedPercent = 10) {
  const existing = getUnitProgress(courseId, unitId);
  const nextPercent = Math.max(
    existing?.progressPercent ?? 0,
    clampPercent(suggestedPercent),
  );

  return upsertUnitProgress(courseId, unitId, {
    status: existing?.status ?? "in_progress",
    progressPercent: nextPercent,
  });
}

export function markUnitCompleted(courseId: string, unitId: string) {
  return upsertUnitProgress(courseId, unitId, {
    status: "completed",
    progressPercent: 100,
  });
}

export function isUnitCompleted(courseId: string, unitId: string) {
  return getUnitProgress(courseId, unitId)?.status === "completed";
}

export function getCourseProgressPercent(courseId: string, unitIds: string[]): number {
  if (!unitIds.length) return 0;
  const course = getCourseProgress(courseId);
  if (!course) return 0;

  const sum = unitIds.reduce((acc, unitId) => {
    const unit = course.units[unitId];
    return acc + (unit ? clampPercent(unit.progressPercent) : 0);
  }, 0);

  return clampPercent(sum / unitIds.length);
}

export function getCompletedUnitsCount(courseId: string, unitIds: string[]): number {
  const course = getCourseProgress(courseId);
  if (!course) return 0;

  return unitIds.reduce((count, unitId) => {
    const unit = course.units[unitId];
    return count + (unit?.status === "completed" ? 1 : 0);
  }, 0);
}

export function resetCourseProgress(courseId: string) {
  if (!courseId) return;
  const storage = readStorage();
  delete storage[courseId];
  writeStorage(storage);
}

export function clearAllCourseProgress() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
