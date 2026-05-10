import { db } from "@/lib/db";

export type CourseTreeTest = {
  id: string;
  title: string;
};

export type CourseTreeUnit = {
  id: string;
  title: string;
  unitType: string;
  moduleId: string;
  tests: CourseTreeTest[];
};

export type CourseTreeModule = {
  id: string;
  title: string;
  position: number;
  parentId: string | null;
  units: CourseTreeUnit[];
  children: CourseTreeModule[];
};

type FlatModuleRecord = {
  id: string;
  title: string;
  position: number;
  parentId?: string | null;
  units: Array<{
    id: string;
    title: string;
    unitType: string;
    moduleId: string;
    tests: Array<{ id: string; title: string }>;
  }>;
};

export function buildCourseModuleTree(
  records: FlatModuleRecord[],
): CourseTreeModule[] {
  const nodeMap = new Map<string, CourseTreeModule>();

  for (const record of records) {
    nodeMap.set(record.id, {
      id: record.id,
      title: record.title,
      position: record.position,
      parentId: record.parentId ?? null,
      units: record.units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        unitType: unit.unitType,
        moduleId: unit.moduleId,
        tests: unit.tests.map((test) => ({ id: test.id, title: test.title })),
      })),
      children: [],
    });
  }

  const roots: CourseTreeModule[] = [];

  for (const record of records) {
    const node = nodeMap.get(record.id);
    if (!node) continue;

    if (!record.parentId) {
      roots.push(node);
      continue;
    }

    const parent = nodeMap.get(record.parentId);
    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  return roots;
}

export function flattenModuleTree(
  modules: CourseTreeModule[],
): CourseTreeModule[] {
  const result: CourseTreeModule[] = [];

  const walk = (items: CourseTreeModule[]) => {
    for (const item of items) {
      result.push(item);
      if (item.children.length) walk(item.children);
    }
  };

  walk(modules);
  return result;
}

export function collectUnitsFromTree(
  modules: CourseTreeModule[],
): CourseTreeUnit[] {
  const units: CourseTreeUnit[] = [];

  const walk = (items: CourseTreeModule[]) => {
    for (const item of items) {
      units.push(...item.units);
      if (item.children.length) walk(item.children);
    }
  };

  walk(modules);
  return units;
}

export function countUnitsInTree(modules: CourseTreeModule[]): number {
  return collectUnitsFromTree(modules).length;
}

export async function getCourseModuleTree(
  courseId: string,
): Promise<CourseTreeModule[]> {
  const modules = await db.courseModule.findMany({
    where: { courseId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      units: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          tests: {
            select: { id: true, title: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  return buildCourseModuleTree(modules);
}
