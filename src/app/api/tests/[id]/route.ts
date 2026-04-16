import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function canEditTest(userId: string, userRole: Role, testId: string) {
  const test = await db.test.findUnique({
    where: { id: testId },
    select: {
      createdById: true,
      unit: { select: { module: { select: { course: { select: { teacherId: true } } } } } },
    },
  });
  if (!test) return null;
  if (userRole === Role.ADMIN) return test;
  if (userRole === Role.TEACHER) {
    const courseTeacherId = test.unit?.module.course.teacherId;
    if (test.createdById === userId || courseTeacherId === userId) return test;
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canEditTest(user.id, user.role, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { title?: string; description?: string; isPublished?: boolean };

  const test = await db.test.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
    },
  });

  return NextResponse.json(test);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canEditTest(user.id, user.role, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.test.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
