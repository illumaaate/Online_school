import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.TEACHER && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const submission = await db.homeworkSubmission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const body = (await request.json()) as { grade?: number; comment?: string };
  if (body.grade === undefined) {
    return NextResponse.json({ error: "Grade required" }, { status: 400 });
  }
  if (body.grade < 0 || body.grade > 100) {
    return NextResponse.json({ error: "Grade must be 0–100" }, { status: 400 });
  }

  const updated = await db.homeworkSubmission.update({
    where: { id },
    data: { grade: body.grade, comment: body.comment ?? null, status: "graded" },
  });

  return NextResponse.json(updated);
}
