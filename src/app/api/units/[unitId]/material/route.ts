import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function toPrismaJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

async function getUnit(unitId: string) {
  return db.lessonUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      module: { select: { course: { select: { teacherId: true } } } },
      material: true,
    },
  });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ unitId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { unitId } = await params;
  const unit = await getUnit(unitId);
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(unit.material ?? null);
}

export async function PATCH(
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
    content?: string;
    contentJson?: unknown;
    videoUrl?: string;
  };

  const material = await db.lessonMaterial.upsert({
    where: { unitId },
    create: {
      unitId,
      content: body.content ?? null,
      contentJson: toPrismaJson(body.contentJson),
      videoUrl: body.videoUrl ?? null,
    },
    update: {
      content: body.content ?? null,
      contentJson: toPrismaJson(body.contentJson),
      videoUrl: body.videoUrl ?? null,
    },
  });

  return NextResponse.json(material);
}
