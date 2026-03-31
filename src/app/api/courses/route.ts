import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const courses = await db.course.findMany({
    include: { teacher: { select: { name: true } }, _count: { select: { lessons: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { title?: string; description?: string };
  if (!body.title || !body.description) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const course = await db.course.create({
    data: {
      title: body.title,
      description: body.description,
      teacherId: user.id,
    },
  });

  return NextResponse.json(course, { status: 201 });
}
