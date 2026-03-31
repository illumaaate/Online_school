import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = await params;

  const call = await db.callSession.findUnique({
    where: { inviteToken: token },
    include: { teacher: { select: { id: true, name: true } }, student: { select: { id: true, name: true } } },
  });
  if (!call) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  if (user.id !== call.studentId && user.id !== call.teacherId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(call);
}
