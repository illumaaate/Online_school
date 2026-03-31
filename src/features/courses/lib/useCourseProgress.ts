"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCompletedUnitsCount,
  getCourseProgress,
  getCourseProgressPercent,
  getUnitProgress,
  isUnitCompleted,
  markUnitCompleted,
  markUnitVisited,
  upsertUnitProgress,
  type CourseProgressState,
  type UnitProgressRecord,
} from "./progress";

type UseCourseProgressResult = {
  state: CourseProgressState | null;
  progressPercent: number;
  completedUnits: number;
  totalUnits: number;
  refresh: () => void;
  isCompleted: (unitId: string) => boolean;
  markVisited: (
    unitId: string,
    suggestedPercent?: number,
  ) => UnitProgressRecord | null;
  markCompleted: (unitId: string) => UnitProgressRecord | null;
  setUnitPercent: (
    unitId: string,
    progressPercent: number,
  ) => UnitProgressRecord | null;
};

type UseUnitProgressResult = {
  unit: UnitProgressRecord | null;
  progressPercent: number;
  completed: boolean;
  refresh: () => void;
  markVisited: (suggestedPercent?: number) => UnitProgressRecord | null;
  markCompleted: () => UnitProgressRecord | null;
  setPercent: (progressPercent: number) => UnitProgressRecord | null;
};

function normalizeUnitIds(unitIds: string[]) {
  return Array.from(new Set(unitIds.filter(Boolean)));
}

const STORAGE_MATCH = "skillhub:course-progress";

export function useCourseProgress(
  courseId: string,
  unitIds: string[] = [],
): UseCourseProgressResult {
  const [, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!courseId) return;
      if (!event.key || event.key.includes(STORAGE_MATCH)) {
        refresh();
      }
    };

    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [courseId, refresh]);

  const stableUnitIds = useMemo(() => normalizeUnitIds(unitIds), [unitIds]);
  const state = courseId ? getCourseProgress(courseId) : null;
  const progressPercent = courseId
    ? getCourseProgressPercent(courseId, stableUnitIds)
    : 0;
  const completedUnits = courseId
    ? getCompletedUnitsCount(courseId, stableUnitIds)
    : 0;

  const totalUnits = stableUnitIds.length;

  const isCompleted = useCallback(
    (unitId: string) => {
      if (!courseId || !unitId) return false;
      return isUnitCompleted(courseId, unitId);
    },
    [courseId],
  );

  const markVisited = useCallback(
    (unitId: string, suggestedPercent = 10) => {
      if (!courseId || !unitId) return null;
      const result = markUnitVisited(courseId, unitId, suggestedPercent);
      refresh();
      return result;
    },
    [courseId, refresh],
  );

  const markCompletedForUnit = useCallback(
    (unitId: string) => {
      if (!courseId || !unitId) return null;
      const result = markUnitCompleted(courseId, unitId);
      refresh();
      return result;
    },
    [courseId, refresh],
  );

  const setUnitPercent = useCallback(
    (unitId: string, progress: number) => {
      if (!courseId || !unitId) return null;

      const normalized = Math.max(0, Math.min(100, Math.round(progress)));
      const result = upsertUnitProgress(courseId, unitId, {
        status: normalized >= 100 ? "completed" : "in_progress",
        progressPercent: normalized,
      });

      refresh();
      return result;
    },
    [courseId, refresh],
  );

  return {
    state,
    progressPercent,
    completedUnits,
    totalUnits,
    refresh,
    isCompleted,
    markVisited,
    markCompleted: markCompletedForUnit,
    setUnitPercent,
  };
}

export function useUnitProgress(
  courseId: string,
  unitId: string,
): UseUnitProgressResult {
  const [, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!courseId || !unitId) return;
      if (!event.key || event.key.includes(STORAGE_MATCH)) {
        refresh();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [courseId, unitId, refresh]);

  const unit = !courseId || !unitId ? null : getUnitProgress(courseId, unitId);

  const progressPercent = unit?.progressPercent ?? 0;
  const completed = unit?.status === "completed";

  const markVisited = useCallback(
    (suggestedPercent = 10) => {
      if (!courseId || !unitId) return null;
      const result = markUnitVisited(courseId, unitId, suggestedPercent);
      refresh();
      return result;
    },
    [courseId, unitId, refresh],
  );

  const markCompletedForCurrent = useCallback(() => {
    if (!courseId || !unitId) return null;
    const result = markUnitCompleted(courseId, unitId);
    refresh();
    return result;
  }, [courseId, unitId, refresh]);

  const setPercent = useCallback(
    (progress: number) => {
      if (!courseId || !unitId) return null;

      const normalized = Math.max(0, Math.min(100, Math.round(progress)));
      const result = upsertUnitProgress(courseId, unitId, {
        status: normalized >= 100 ? "completed" : "in_progress",
        progressPercent: normalized,
      });

      refresh();
      return result;
    },
    [courseId, unitId, refresh],
  );

  return {
    unit,
    progressPercent,
    completed,
    refresh,
    markVisited,
    markCompleted: markCompletedForCurrent,
    setPercent,
  };
}
