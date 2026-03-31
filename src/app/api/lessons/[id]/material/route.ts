import { NextResponse } from "next/server";
import { Prisma, Role, UnitType } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function ensureUnitForLesson(lessonId: string) {
  const existing = await db.lessonUnit.findFirst({ where: { lessonId } });
  if (existing) return existing;

  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return null;

  let firstModule = await db.courseModule.findFirst({
    where: { courseId: lesson.courseId },
    orderBy: { position: "asc" },
  });

  if (!firstModule) {
    firstModule = await db.courseModule.create({
      data: {
        courseId: lesson.courseId,
        title: "Основной модуль",
        position: 0,
      },
    });
  }

  return db.lessonUnit.create({
    data: {
      moduleId: firstModule.id,
      lessonId: lesson.id,
      title: lesson.title,
      unitType: UnitType.MATERIAL,
      position: 0,
    },
  });
}

function toPrismaJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const unit = await ensureUnitForLesson(id);
  if (!unit)
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const material = await db.lessonMaterial.findUnique({
    where: { unitId: unit.id },
  });
  return NextResponse.json({ unit, material });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    content?: string;
    contentJson?: unknown;
    videoUrl?: string;
    title?: string;
  };

  const unit = await ensureUnitForLesson(id);
  if (!unit)
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  if (body.title) {
    await db.lessonUnit.update({
      where: { id: unit.id },
      data: { title: body.title },
    });
  }

  const contentJson = toPrismaJson(body.contentJson);

  const material = await db.lessonMaterial.upsert({
    where: { unitId: unit.id },
    create: {
      unitId: unit.id,
      content: body.content,
      contentJson,
      videoUrl: body.videoUrl,
    },
    update: {
      content: body.content,
      contentJson,
      videoUrl: body.videoUrl,
    },
  });

  return NextResponse.json(material);
}
