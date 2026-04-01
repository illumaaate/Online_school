import Link from "next/link";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateCallForm } from "@/features/calls/ui/CreateCallForm";

export default async function CallsPage() {
  const user = await requireUser();
  const [calls, students] = await Promise.all([
    db.callSession.findMany({
      where:
        user.role === Role.STUDENT
          ? { studentId: user.id }
          : user.role === Role.TEACHER
            ? { teacherId: user.id }
            : undefined,
      include: {
        teacher: { select: { name: true } },
        student: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    user.role === Role.ADMIN || user.role === Role.TEACHER
      ? db.user.findMany({
          where: { role: Role.STUDENT },
          select: { id: true, name: true, email: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Звонки</h1>
        <p className="text-zinc-600">Отдельные уроки-звонки по ссылке с общей доской teacher-student.</p>
      </div>

      {(user.role === Role.ADMIN || user.role === Role.TEACHER) && students.length ? <CreateCallForm students={students} /> : null}

      <div className="space-y-3">
        {calls.map((call) => (
          <article key={call.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="font-medium">{call.topic ?? "Без темы"}</p>
            <p className="text-sm text-zinc-600">
              Teacher: {call.teacher.name} | Student: {call.student.name}
            </p>
            <p className="text-xs text-zinc-500">Invite: /join/{call.inviteToken}</p>
            <Link href={`/calls/${call.id}`} className="skillhub-button-primary mt-2 inline-block rounded-xl px-3 py-2 text-sm font-medium">
              Открыть звонок
            </Link>
          </article>
        ))}
        {!calls.length ? <p className="text-sm text-zinc-600">Звонков пока нет.</p> : null}
      </div>
    </section>
  );
}
