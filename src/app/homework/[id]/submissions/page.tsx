import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { HomeworkGradeClient } from "@/features/lesson/ui/HomeworkGradeClient";

export default async function HomeworkSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole([Role.TEACHER, Role.ADMIN]);

  const homework = await db.homework.findUnique({
    where: { id },
    include: {
      lesson: { select: { id: true, title: true } },
      submissions: {
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!homework) {
    return (
      <section className="skillhub-panel rounded-[1.75rem] p-8">
        <h1 className="text-xl font-semibold">Задание не найдено</h1>
      </section>
    );
  }

  const serialized = homework.submissions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  const pending = serialized.filter((s) => s.grade === null).length;
  const graded = serialized.length - pending;

  return (
    <section className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <Link href="/dashboard" className="hover:text-black hover:underline">
          Кабинет
        </Link>
        <span>›</span>
        <Link
          href={`/lesson/${homework.lessonId}`}
          className="hover:text-black hover:underline"
        >
          {homework.lesson.title}
        </Link>
        <span>›</span>
        <span className="font-medium text-black">{homework.title}</span>
      </nav>

      <div className="skillhub-hero rounded-[2rem] p-7">
        <p className="skillhub-kicker text-xs font-semibold">Домашние задания</p>
        <h1 className="mt-3 text-2xl font-semibold">{homework.title}</h1>
        <p className="mt-2 text-sm text-white/80">{homework.description}</p>
        <div className="mt-4 flex gap-4 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1">
            Решений: {homework.submissions.length}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            Проверено: {graded}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            Ожидают: {pending}
          </span>
        </div>
      </div>

      <HomeworkGradeClient submissions={serialized} />
    </section>
  );
}
