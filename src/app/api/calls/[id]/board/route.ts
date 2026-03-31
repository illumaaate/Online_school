import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function getCallForUser(callId: string, userId: string) {
  const call = await db.callSession.findUnique({ where: { id: callId } });
  if (!call) return null;
  if (call.studentId !== userId && call.teacherId !== userId) {
    return "forbidden" as const;
  }
  return call;
}

function toPrismaJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const call = await getCallForUser(id, user.id);

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }
  if (call === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const board = await db.boardDocument.findUnique({
    where: {
      teacherId_studentId: {
        teacherId: call.teacherId,
        studentId: call.studentId,
      },
    },
  });

  return NextResponse.json({
    boardState: board?.boardState ?? null,
    updatedAt: board?.updatedAt ?? null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { boardState?: unknown };

  const call = await getCallForUser(id, user.id);
  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }
  if (call === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const boardState = toPrismaJson(body.boardState);

  const board = await db.boardDocument.upsert({
    where: {
      teacherId_studentId: {
        teacherId: call.teacherId,
        studentId: call.studentId,
      },
    },
    create: {
      teacherId: call.teacherId,
      studentId: call.studentId,
      boardState,
    },
    update: {
      boardState,
    },
  });

  return NextResponse.json(board);
}
