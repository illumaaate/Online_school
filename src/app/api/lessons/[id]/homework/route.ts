import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const lesson = await db.lesson.findUnique({ where: { id } });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const body = (await request.json()) as { title?: string; description?: string; dueDate?: string };
  if (!body.title || !body.description) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const homework = await db.homework.create({
    data: {
      lessonId: lesson.id,
      courseId: lesson.courseId,
      authorId: user.id,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return NextResponse.json(homework, { status: 201 });
}
