import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CallRoom } from "@/features/calls/ui/CallRoom";

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const call = await db.callSession.findUnique({ where: { id } });
  if (!call) return <p>Звонок не найден.</p>;
  if (call.teacherId !== user.id && call.studentId !== user.id && user.role !== "ADMIN") {
    return <p>Нет доступа.</p>;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h1 className="text-2xl font-semibold">{call.topic ?? "Звонок"}</h1>
        <p className="text-sm text-zinc-600">Статус: {call.status}</p>
      </div>
      <CallRoom callId={call.id} />
    </section>
  );
}
