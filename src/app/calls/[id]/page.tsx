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

  return <CallRoom callId={call.id} topic={call.topic ?? "Звонок"} />;
}
