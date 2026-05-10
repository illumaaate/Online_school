import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  parentId: z.string().trim().min(1).nullable().optional(),
});

async function canEditModule(userId: string, userRole: Role, moduleId: string) {
  const mod = await db.courseModule.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      courseId: true,
      course: { select: { teacherId: true } },
    },
  });
  if (!mod) return null;
  if (userRole === Role.ADMIN) return mod;
  if (userRole === Role.TEACHER && mod.course.teacherId === userId) return mod;
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const editableModule = await canEditModule(user.id, user.role, id);
  if (!editableModule) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  let nextParentId: string | null | undefined = undefined;
  if (parsed.data.parentId !== undefined) {
    if (parsed.data.parentId === id) {
      return NextResponse.json(
        { error: "A module cannot be parent of itself" },
        { status: 400 },
      );
    }

    if (parsed.data.parentId === null) {
      nextParentId = null;
    } else {
      const parent = await db.courseModule.findUnique({
        where: { id: parsed.data.parentId },
        select: { id: true, courseId: true, parentId: true },
      });

      if (!parent || parent.courseId !== editableModule.courseId) {
        return NextResponse.json(
          { error: "Parent module not found in this course" },
          { status: 400 },
        );
      }

      const allModules = await db.courseModule.findMany({
        where: { courseId: editableModule.courseId },
        select: { id: true, parentId: true },
      });

      const parentMap = new Map(
        allModules.map((item) => [item.id, item.parentId]),
      );
      let cursor: string | null | undefined = parent.id;
      while (cursor) {
        if (cursor === id) {
          return NextResponse.json(
            { error: "Cycle detected: invalid parent assignment" },
            { status: 400 },
          );
        }
        cursor = parentMap.get(cursor) ?? null;
      }

      nextParentId = parent.id;
    }
  }

  const mod = await db.courseModule.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(nextParentId !== undefined && { parentId: nextParentId }),
    },
  });

  return NextResponse.json(mod);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canEditModule(user.id, user.role, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.courseModule.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
