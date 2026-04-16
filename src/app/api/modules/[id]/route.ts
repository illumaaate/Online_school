import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
});

async function canEditModule(userId: string, userRole: Role, moduleId: string) {
  const mod = await db.courseModule.findUnique({
    where: { id: moduleId },
    select: { id: true, course: { select: { teacherId: true } } },
  });
  if (!mod) return null;
  if (userRole === Role.ADMIN) return mod;
  if (userRole === Role.TEACHER && mod.course.teacherId === userId) return mod;
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canEditModule(user.id, user.role, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const mod = await db.courseModule.update({
    where: { id },
    data: { title: parsed.data.title },
  });

  return NextResponse.json(mod);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canEditModule(user.id, user.role, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.courseModule.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
