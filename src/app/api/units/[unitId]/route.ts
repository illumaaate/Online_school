import { NextResponse } from "next/server";
import { Role, UnitType } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  unitType: z.nativeEnum(UnitType).optional(),
});

async function canEditUnit(userId: string, userRole: Role, unitId: string) {
  const unit = await db.lessonUnit.findUnique({
    where: { id: unitId },
    select: { module: { select: { course: { select: { teacherId: true } } } } },
  });
  if (!unit) return null;
  if (userRole === Role.ADMIN) return unit;
  if (userRole === Role.TEACHER && unit.module.course.teacherId === userId) return unit;
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { unitId } = await params;
  if (!(await canEditUnit(user.id, user.role, unitId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const unit = await db.lessonUnit.update({
    where: { id: unitId },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.unitType !== undefined && { unitType: parsed.data.unitType }),
    },
  });

  return NextResponse.json(unit);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ unitId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { unitId } = await params;
  if (!(await canEditUnit(user.id, user.role, unitId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.lessonUnit.delete({ where: { id: unitId } });
  return new NextResponse(null, { status: 204 });
}
