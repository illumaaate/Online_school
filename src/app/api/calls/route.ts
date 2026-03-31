import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function makeInviteToken() {
  return randomUUID().replaceAll("-", "");
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where =
    user.role === Role.STUDENT
      ? { studentId: user.id }
      : user.role === Role.TEACHER
        ? { teacherId: user.id }
        : undefined;

  const calls = await db.callSession.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(calls);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { studentId?: string; topic?: string; scheduledAt?: string };
  if (!body.studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

  const call = await db.callSession.create({
    data: {
      teacherId: user.id,
      studentId: body.studentId,
      topic: body.topic,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      inviteToken: makeInviteToken(),
      livekitRoomName: `call-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    },
  });

  return NextResponse.json(call, { status: 201 });
}
