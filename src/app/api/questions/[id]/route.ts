import { NextResponse } from "next/server";
import { Role, TestQuestionType } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function canEditQuestion(userId: string, userRole: Role, questionId: string) {
  const question = await db.testQuestion.findUnique({
    where: { id: questionId },
    select: {
      test: {
        select: {
          createdById: true,
          unit: { select: { module: { select: { course: { select: { teacherId: true } } } } } },
        },
      },
    },
  });
  if (!question) return null;
  if (userRole === Role.ADMIN) return question;
  if (userRole === Role.TEACHER) {
    const { createdById, unit } = question.test;
    if (createdById === userId || unit?.module.course.teacherId === userId) return question;
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canEditQuestion(user.id, user.role, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    question?: string;
    type?: "SINGLE" | "MULTI" | "OPEN";
    points?: number;
    correctText?: string;
    options?: Array<{ text: string; isCorrect?: boolean }>;
  };

  // Replace options if provided
  if (body.options !== undefined) {
    await db.testOption.deleteMany({ where: { questionId: id } });
    await db.testOption.createMany({
      data: body.options.map((opt, i) => ({
        questionId: id,
        text: opt.text,
        isCorrect: opt.isCorrect ?? false,
        position: i,
      })),
    });
  }

  const question = await db.testQuestion.update({
    where: { id },
    data: {
      ...(body.question !== undefined && { question: body.question }),
      ...(body.type !== undefined && { type: body.type as TestQuestionType }),
      ...(body.points !== undefined && { points: body.points }),
      ...(body.correctText !== undefined && { correctText: body.correctText }),
    },
    include: { options: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json(question);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canEditQuestion(user.id, user.role, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.testQuestion.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
