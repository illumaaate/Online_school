import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== Role.STUDENT) {
    return NextResponse.json(
      { error: "Only students can enroll" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  const course = await db.course.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const existingEnrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: id,
      },
    },
  });

  if (existingEnrollment) {
    return NextResponse.json(existingEnrollment);
  }

  const enrollment = await db.enrollment.create({
    data: {
      userId: user.id,
      courseId: id,
    },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
