import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function JoinByTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const user = await requireUser();
  const { token } = await params;
  const call = await db.callSession.findUnique({ where: { inviteToken: token } });
  if (!call) return <p>Ссылка недействительна.</p>;
  if (call.studentId !== user.id && call.teacherId !== user.id && user.role !== "ADMIN") {
    return <p>Нет доступа к этой ссылке.</p>;
  }
  redirect(`/calls/${call.id}`);
}
