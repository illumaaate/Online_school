import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const room = await db.lessonRoom.findUnique({ where: { lessonId: id } });
  return NextResponse.json({ boardState: room?.boardState ?? null, updatedAt: room?.updatedAt ?? null });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { boardState?: unknown };

  const room = await db.lessonRoom.upsert({
    where: { lessonId: id },
    create: { lessonId: id, boardState: body.boardState as object },
    update: { boardState: body.boardState as object },
  });

  return NextResponse.json(room);
}
