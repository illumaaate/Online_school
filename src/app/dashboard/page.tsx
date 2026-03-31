import Link from "next/link";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requireUser();

  const [courses, enrollments, teachingLessons] = await Promise.all([
    db.course.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.enrollment.findMany({
      where: { userId: user.id },
      include: { course: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.lesson.findMany({
      where:
        user.role === Role.TEACHER ? { course: { teacherId: user.id } } : undefined,
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
  ]);

  return (
    <section className="space-y-6">
      <div className="skillhub-hero rounded-[2rem] p-7 md:p-9">
        <p className="skillhub-kicker text-xs font-semibold text-[var(--accent)]">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Личный кабинет</h1>
        <p className="mt-3 text-sm text-white/80">
          {user.name}, ваша роль в системе:{" "}
          <span className="font-semibold text-white">{user.role}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <h2 className="text-lg font-semibold text-black">Мои курсы</h2>
          <div className="mt-4 space-y-2">
            {enrollments.map((entry) => (
              <Link
                key={entry.id}
                href={`/courses/${entry.courseId}`}
                className="block rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 text-sm hover:border-[var(--accent)]"
              >
                {entry.course.title}
              </Link>
            ))}
            {!enrollments.length ? (
              <p className="text-sm text-[var(--muted)]">
                Вы еще не записаны на курсы.
              </p>
            ) : null}
          </div>
        </div>

        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <h2 className="text-lg font-semibold text-black">Доступные курсы</h2>
          <div className="mt-4 space-y-2">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="block rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 text-sm hover:border-[var(--accent)]"
              >
                {course.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {(user.role === Role.TEACHER || user.role === Role.ADMIN) && (
        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <h2 className="text-lg font-semibold text-black">
            Ближайшие занятия преподавателя
          </h2>
          <div className="mt-4 space-y-2">
            {teachingLessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/lesson/${lesson.id}`}
                className="block rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 text-sm hover:border-[var(--accent)]"
              >
                {lesson.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
