import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const messages = await db.message.findMany({
    where: { lessonId: id },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { content?: string };

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const message = await db.message.create({
    data: { lessonId: id, userId: user.id, content: body.content.trim() },
  });

  return NextResponse.json(message, { status: 201 });
}
