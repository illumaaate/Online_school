import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = (await request.json()) as { content?: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Submission content required" }, { status: 400 });
  }

  const submission = await db.homeworkSubmission.upsert({
    where: { homeworkId_studentId: { homeworkId: id, studentId: user.id } },
    create: { homeworkId: id, studentId: user.id, content: body.content.trim() },
    update: { content: body.content.trim() },
  });

  return NextResponse.json(submission);
}
