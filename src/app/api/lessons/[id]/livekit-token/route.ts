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
  const lesson = await db.lesson.findUnique({ where: { id } });

  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await createLivekitToken({
    room: lesson.roomName,
    identity: user.id,
    name: user.name,
  });

  return NextResponse.json({
    token,
    wsUrl: getLivekitWsUrl(),
    roomName: lesson.roomName,
  });
}
