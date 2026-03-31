import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LessonRoom } from "@/features/lesson/ui/LessonRoom";
import { HomeworkPanel } from "@/features/lesson/ui/HomeworkPanel";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const lesson = await db.lesson.findUnique({
    where: { id },
    include: {
      course: true,
      homeworks: { orderBy: { createdAt: "desc" } },
      unit: true,
    },
  });

  if (!lesson) return <p>Урок не найден.</p>;

  if (lesson.unit && lesson.unit.unitType !== "LIVE") {
    redirect(`/learn/${lesson.unit.id}`);
  }

  if (lesson.unit?.unitType === "LIVE") {
    const teacherId = lesson.course.teacherId;
    const studentId = user.role === Role.STUDENT ? user.id : null;
    if (studentId) {
      const call = await db.callSession.findFirst({
        where: { teacherId, studentId },
        orderBy: { createdAt: "desc" },
      });
      if (call) {
        redirect(`/calls/${call.id}`);
      }
    }
  }

  const canCreateHomework = user.role === Role.ADMIN || user.role === Role.TEACHER;

  return (
    <section className="space-y-5">
      <div className="skillhub-panel rounded-[1.75rem] p-5">
        <h1 className="text-2xl font-semibold text-black">{lesson.title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Курс: {lesson.course.title} | Старт:{" "}
          {new Date(lesson.startsAt).toLocaleString("ru-RU")}
        </p>
      </div>

      <LessonRoom lessonId={lesson.id} />
      <HomeworkPanel
        lessonId={lesson.id}
        homeworks={lesson.homeworks}
        canCreate={canCreateHomework}
      />
    </section>
  );
}
