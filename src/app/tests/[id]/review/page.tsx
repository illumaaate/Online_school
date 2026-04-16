import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { TestReviewClient } from "@/features/tests/ui/TestReviewClient";

export default async function TestReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole([Role.TEACHER, Role.ADMIN]);

  const test = await db.test.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!test) {
    return (
      <section className="skillhub-panel rounded-[1.75rem] p-8">
        <h1 className="text-xl font-semibold">Тест не найден</h1>
      </section>
    );
  }

  const attempts = await db.testAttempt.findMany({
    where: { testId: id, submittedAt: { not: null } },
    include: {
      student: { select: { id: true, name: true, email: true } },
      answers: {
        include: {
          question: {
            select: { id: true, question: true, type: true, points: true },
          },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const serialized = attempts.map((a) => ({
    ...a,
    submittedAt: a.submittedAt?.toISOString() ?? null,
    answers: a.answers.map((ans) => ({
      ...ans,
      createdAt: ans.createdAt.toISOString(),
    })),
  }));

  return (
    <section className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <Link href="/dashboard" className="hover:text-black hover:underline">
          Кабинет
        </Link>
        <span>›</span>
        <span className="font-medium text-black">Проверка теста: {test.title}</span>
      </nav>

      <div className="skillhub-hero rounded-[2rem] p-7">
        <p className="skillhub-kicker text-xs font-semibold">Проверка ответов</p>
        <h1 className="mt-3 text-2xl font-semibold">{test.title}</h1>
        <p className="mt-2 text-sm text-white/80">
          Попыток: {attempts.length} &nbsp;·&nbsp; Требуют проверки:{" "}
          {attempts.filter((a) => a.requiresReview).length}
        </p>
      </div>

      <TestReviewClient testId={id} initialAttempts={serialized} />
    </section>
  );
}
