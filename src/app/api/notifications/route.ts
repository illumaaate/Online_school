import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export type NotificationItem = {
  id: string;
  type: "hw_pending" | "test_needs_review" | "hw_graded" | "test_result";
  title: string;
  subtitle: string;
  href: string;
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items: NotificationItem[] = [];

  if (user.role === Role.TEACHER || user.role === Role.ADMIN) {
    const pendingSubmissions = await db.homeworkSubmission.findMany({
      where: {
        grade: null,
        status: "submitted",
        homework: { author: { id: user.id } },
      },
      include: {
        homework: { select: { id: true, title: true } },
        student: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    for (const sub of pendingSubmissions) {
      items.push({
        id: `hw-sub-${sub.id}`,
        type: "hw_pending",
        title: `ДЗ: ${sub.homework.title}`,
        subtitle: `Решение от ${sub.student.name} ожидает оценки`,
        href: `/homework/${sub.homeworkId}/submissions`,
      });
    }

    const reviewAttempts = await db.testAttempt.findMany({
      where: {
        requiresReview: true,
        submittedAt: { not: null },
        answers: { some: { isCorrect: null } },
        test: {
          OR: [
            { course: { teacherId: user.id } },
            { unit: { module: { course: { teacherId: user.id } } } },
          ],
        },
      },
      include: {
        test: { select: { id: true, title: true } },
        student: { select: { name: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 20,
    });

    for (const attempt of reviewAttempts) {
      items.push({
        id: `test-attempt-${attempt.id}`,
        type: "test_needs_review",
        title: `Тест: ${attempt.test.title}`,
        subtitle: `Ответ ${attempt.student.name} требует проверки`,
        href: `/tests/${attempt.testId}/review`,
      });
    }
  } else {
    const gradedSubmissions = await db.homeworkSubmission.findMany({
      where: { studentId: user.id, grade: { not: null } },
      include: {
        homework: { select: { title: true, lessonId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    for (const sub of gradedSubmissions) {
      items.push({
        id: `hw-graded-${sub.id}`,
        type: "hw_graded",
        title: `ДЗ проверено: ${sub.homework.title}`,
        subtitle: `Оценка: ${sub.grade}/100`,
        href: `/lesson/${sub.homework.lessonId}`,
      });
    }

    const completedAttempts = await db.testAttempt.findMany({
      where: { studentId: user.id, submittedAt: { not: null } },
      include: { test: { select: { id: true, title: true } } },
      orderBy: { submittedAt: "desc" },
      take: 20,
    });

    for (const attempt of completedAttempts) {
      items.push({
        id: `test-result-${attempt.id}`,
        type: "test_result",
        title: `Тест: ${attempt.test.title}`,
        subtitle: attempt.requiresReview
          ? `Результат: ${attempt.score ?? 0}/${attempt.maxScore ?? 0} (есть открытые ответы)`
          : `Результат: ${attempt.score ?? 0}/${attempt.maxScore ?? 0}`,
        href: `/tests/${attempt.testId}`,
      });
    }
  }

  return NextResponse.json(items);
}
