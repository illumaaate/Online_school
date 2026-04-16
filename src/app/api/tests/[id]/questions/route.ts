import { NextResponse } from "next/server";
import { Role, TestQuestionType } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: testId } = await params;

  const test = await db.test.findUnique({
    where: { id: testId },
    select: {
      createdById: true,
      unit: { select: { module: { select: { course: { select: { teacherId: true } } } } } },
      _count: { select: { questions: true } },
    },
  });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  if (user.role === Role.TEACHER) {
    const courseTeacherId = test.unit?.module.course.teacherId;
    if (test.createdById !== user.id && courseTeacherId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = (await request.json()) as {
    question: string;
    type?: "SINGLE" | "MULTI" | "OPEN";
    points?: number;
    correctText?: string;
    options?: Array<{ text: string; isCorrect?: boolean }>;
  };

  if (!body.question?.trim()) {
    return NextResponse.json({ error: "Question text is required" }, { status: 400 });
  }

  const question = await db.testQuestion.create({
    data: {
      testId,
      question: body.question.trim(),
      type: (body.type as TestQuestionType) ?? TestQuestionType.SINGLE,
      points: body.points ?? 1,
      correctText: body.correctText ?? null,
      position: test._count.questions,
      options: {
        create:
          body.options?.map((opt, i) => ({
            text: opt.text,
            isCorrect: opt.isCorrect ?? false,
            position: i,
          })) ?? [],
      },
    },
    include: { options: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json(question, { status: 201 });
}
