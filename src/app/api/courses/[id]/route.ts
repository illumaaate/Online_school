import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      teacher: { select: { name: true } },
      lessons: { orderBy: { startsAt: "asc" } },
      homeworks: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { title?: string; description?: string };
  const course = await db.course.update({
    where: { id },
    data: { title: body.title, description: body.description },
  });
  return NextResponse.json(course);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const course = await db.course.findUnique({ where: { id }, select: { id: true } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.course.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
