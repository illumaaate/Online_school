import { NextResponse } from "next/server";
import { Role, UnitType } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const createUnitSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title is too short")
    .max(120, "Title is too long"),
  description: z
    .string()
    .trim()
    .max(5000, "Description is too long")
    .optional(),
  unitType: z.nativeEnum(UnitType).optional(),
  position: z.number().int().min(0).max(10_000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const moduleRecord = await db.courseModule.findUnique({
    where: { id },
    select: {
      id: true,
      course: {
        select: {
          id: true,
          teacherId: true,
        },
      },
    },
  });

  if (!moduleRecord) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  if (user.role === Role.TEACHER && moduleRecord.course.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawBody = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createUnitSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const unit = await db.lessonUnit.create({
    data: {
      moduleId: moduleRecord.id,
      title: parsed.data.title,
      description: parsed.data.description,
      unitType: parsed.data.unitType ?? UnitType.MATERIAL,
      position: parsed.data.position ?? 0,
    },
  });

  return NextResponse.json(unit, { status: 201 });
}
