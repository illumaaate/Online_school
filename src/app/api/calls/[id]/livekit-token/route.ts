import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { createLivekitToken, getLivekitWsUrl } from "@/lib/livekit";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const call = await db.callSession.findUnique({ where: { id } });
  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  if (user.id !== call.studentId && user.id !== call.teacherId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await createLivekitToken({
    room: call.livekitRoomName,
    identity: user.id,
    name: user.name,
  });

  await db.callSession.update({
    where: { id: call.id },
    data: { status: "ACTIVE", startedAt: call.startedAt ?? new Date() },
  });

  return NextResponse.json({
    token,
    wsUrl: getLivekitWsUrl(),
    roomName: call.livekitRoomName,
  });
}
