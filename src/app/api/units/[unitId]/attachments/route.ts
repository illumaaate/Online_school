import { NextResponse } from "next/server";
import { AttachmentType, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function getUnit(unitId: string) {
  return db.lessonUnit.findUnique({
    where: { id: unitId },
    select: { id: true, module: { select: { course: { select: { teacherId: true } } } } },
  });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ unitId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { unitId } = await params;
  const attachments = await db.unitAttachment.findMany({
    where: { unitId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(attachments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { unitId } = await params;
  const unit = await getUnit(unitId);
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === Role.TEACHER && unit.module.course.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    name: string;
    url: string;
    type: "FILE" | "IMAGE";
    size: number;
  };

  const attachment = await db.unitAttachment.create({
    data: {
      unitId,
      name: body.name,
      url: body.url,
      type: body.type as AttachmentType,
      size: body.size ?? 0,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}
