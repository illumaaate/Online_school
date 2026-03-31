import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const createLessonSchema = z.object({
  courseId: z.string().trim().min(1, "courseId is required"),
  title: z
    .string()
    .trim()
    .min(2, "Title is too short")
    .max(160, "Title is too long"),
  startsAt: z.string().trim().min(1, "startsAt is required"),
  durationMins: z.number().int().min(15).max(480).optional(),
});

function parseStartsAt(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildRoomName(courseId: string) {
  return `lesson-${courseId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawBody = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createLessonSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const startsAtDate = parseStartsAt(parsed.data.startsAt);
  if (!startsAtDate) {
    return NextResponse.json(
      { error: "Invalid startsAt value" },
      { status: 400 },
    );
  }

  const course = await db.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, teacherId: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (user.role === Role.TEACHER && course.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const lesson = await db.lesson.create({
      data: {
        courseId: course.id,
        title: parsed.data.title,
        startsAt: startsAtDate,
        durationMins: parsed.data.durationMins ?? 60,
        roomName: buildRoomName(course.id),
      },
    });

    await db.lessonRoom.create({
      data: { lessonId: lesson.id },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 },
    );
  }
}
