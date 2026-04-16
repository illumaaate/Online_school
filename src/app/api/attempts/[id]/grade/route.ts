import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type GradeEntry = {
  answerId: string;
  score: number;
  isCorrect: boolean;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.TEACHER && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const attempt = await db.testAttempt.findUnique({
    where: { id },
    include: { answers: true },
  });
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

  const body = (await request.json()) as { grades: GradeEntry[] };
  if (!body.grades?.length) return NextResponse.json({ error: "Missing grades" }, { status: 400 });

  for (const entry of body.grades) {
    await db.testAnswer.update({
      where: { id: entry.answerId },
      data: { score: entry.score, isCorrect: entry.isCorrect },
    });
  }

  const updatedAnswers = await db.testAnswer.findMany({ where: { attemptId: id } });
  const totalScore = updatedAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const stillNeedsReview = updatedAnswers.some((a) => a.isCorrect === null);

  const updated = await db.testAttempt.update({
    where: { id },
    data: { score: totalScore, requiresReview: stillNeedsReview },
  });

  return NextResponse.json(updated);
}
