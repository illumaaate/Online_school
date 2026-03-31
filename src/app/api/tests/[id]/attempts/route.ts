import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const test = await db.test.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const existingOpen = await db.testAttempt.findFirst({
    where: { testId: id, studentId: user.id, submittedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (existingOpen) return NextResponse.json(existingOpen);

  const attempt = await db.testAttempt.create({
    data: { testId: id, studentId: user.id },
  });
  return NextResponse.json(attempt, { status: 201 });
}
