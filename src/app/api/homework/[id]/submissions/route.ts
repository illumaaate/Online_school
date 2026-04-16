import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.TEACHER && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const homework = await db.homework.findUnique({ where: { id } });
  if (!homework) return NextResponse.json({ error: "Homework not found" }, { status: 404 });

  const submissions = await db.homeworkSubmission.findMany({
    where: { homeworkId: id },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(submissions);
}
