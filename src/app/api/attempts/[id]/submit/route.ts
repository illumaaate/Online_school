import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type SubmittedAnswer = {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { answers?: SubmittedAnswer[] };

  const attempt = await db.testAttempt.findUnique({
    where: { id },
    include: {
      test: { include: { questions: { include: { options: true } } } },
    },
  });
  if (!attempt || attempt.studentId !== user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (!body.answers?.length) return NextResponse.json({ error: "Missing answers" }, { status: 400 });

  await db.testAnswer.deleteMany({ where: { attemptId: attempt.id } });

  let totalScore = 0;
  let maxScore = 0;
  let requiresReview = false;

  for (const question of attempt.test.questions) {
    maxScore += question.points;
    const submitted = body.answers.find((answer) => answer.questionId === question.id);
    if (!submitted) continue;

    let isCorrect: boolean | null = null;
    let answerScore = 0;

    if (question.type === "OPEN") {
      requiresReview = true;
      if (question.correctText && submitted.textAnswer) {
        isCorrect = question.correctText.trim().toLowerCase() === submitted.textAnswer.trim().toLowerCase();
        answerScore = isCorrect ? question.points : 0;
      } else {
        isCorrect = null;
      }
    } else {
      const correctOptionIds = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort();
      const selected = [...(submitted.selectedOptionIds ?? [])].sort();
      isCorrect = JSON.stringify(correctOptionIds) === JSON.stringify(selected);
      answerScore = isCorrect ? question.points : 0;
    }

    totalScore += answerScore;

    await db.testAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        authorId: user.id,
        selectedOptionIds: submitted.selectedOptionIds ?? [],
        textAnswer: submitted.textAnswer,
        isCorrect,
        score: isCorrect === null ? null : answerScore,
      },
    });
  }

  const updated = await db.testAttempt.update({
    where: { id: attempt.id },
    data: {
      submittedAt: new Date(),
      score: totalScore,
      maxScore,
      requiresReview,
    },
  });

  return NextResponse.json(updated);
}
