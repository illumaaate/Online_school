import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId") ?? undefined;
  const unitId = searchParams.get("unitId") ?? undefined;
  const lessonId = searchParams.get("lessonId") ?? undefined;

  const tests = await db.test.findMany({
    where: { courseId, unitId, lessonId },
    include: { questions: { include: { options: true }, orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tests);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    courseId?: string;
    lessonId?: string;
    unitId?: string;
    isPublished?: boolean;
    questions?: Array<{
      question: string;
      type?: "SINGLE" | "MULTI" | "OPEN";
      points?: number;
      correctText?: string;
      options?: Array<{ text: string; isCorrect?: boolean }>;
    }>;
  };

  if (!body.title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  const test = await db.test.create({
    data: {
      title: body.title,
      description: body.description,
      courseId: body.courseId,
      lessonId: body.lessonId,
      unitId: body.unitId,
      createdById: user.id,
      isPublished: body.isPublished ?? false,
      questions: {
        create:
          body.questions?.map((question, index) => ({
            question: question.question,
            type: question.type ?? "SINGLE",
            points: question.points ?? 1,
            correctText: question.correctText,
            position: index,
            options: {
              create:
                question.options?.map((option, optionIndex) => ({
                  text: option.text,
                  isCorrect: option.isCorrect ?? false,
                  position: optionIndex,
                })) ?? [],
            },
          })) ?? [],
      },
    },
    include: { questions: { include: { options: true }, orderBy: { position: "asc" } } },
  });

  return NextResponse.json(test, { status: 201 });
}
