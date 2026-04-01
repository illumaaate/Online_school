import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof Error && (e.message === "aborted" || e.name === "AbortError")) ||
    (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "ECONNRESET")
  );
}

async function getCallForUser(callId: string, userId: string) {
  const call = await db.callSession.findUnique({ where: { id: callId } });
  if (!call) return null;
  if (call.studentId !== userId && call.teacherId !== userId) return "forbidden" as const;
  return call;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (request.signal.aborted) return new Response(null, { status: 499 });

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (request.signal.aborted) return new Response(null, { status: 499 });

    const { id } = await params;
    const call = await getCallForUser(id, user.id);
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
    if (call === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (request.signal.aborted) return new Response(null, { status: 499 });

    const messages = await db.callMessage.findMany({
      where: { callId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (request.signal.aborted) return new Response(null, { status: 499 });

    return NextResponse.json(messages);
  } catch (e) {
    if (isAbortError(e) || request.signal.aborted) return new Response(null, { status: 499 });
    throw e;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { content?: string };
  if (!body.content?.trim()) return NextResponse.json({ error: "Empty content" }, { status: 400 });

  const call = await getCallForUser(id, user.id);
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  if (call === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await db.callMessage.create({
    data: { callId: id, userId: user.id, content: body.content.trim() },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json(message, { status: 201 });
}
