import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const createModuleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title is too short")
    .max(120, "Title is too long"),
  position: z.number().int().min(0).max(10_000).optional(),
});

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const modules = await db.courseModule.findMany({
    where: { courseId: id },
    include: { units: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(modules);
}

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

  const course = await db.course.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Admin can manage any course, teacher only own courses.
  if (user.role === Role.TEACHER && course.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawBody = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createModuleSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const courseModule = await db.courseModule.create({
    data: {
      courseId: course.id,
      title: parsed.data.title,
      position: parsed.data.position ?? 0,
    },
  });

  return NextResponse.json(courseModule, { status: 201 });
}
