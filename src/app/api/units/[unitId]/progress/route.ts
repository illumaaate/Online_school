import { NextResponse } from "next/server";
import { UnitProgressStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { unitId } = await params;

  const unit = await db.lessonUnit.findUnique({
    where: { id: unitId },
    select: { id: true, module: { select: { courseId: true } } },
  });
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const courseId = unit.module.courseId;

  const body = (await request.json()) as {
    status: "in_progress" | "completed";
    progressPercent: number;
  };

  const status: UnitProgressStatus =
    body.status === "completed"
      ? UnitProgressStatus.COMPLETED
      : UnitProgressStatus.IN_PROGRESS;

  const progressPercent = Math.max(0, Math.min(100, Math.round(body.progressPercent ?? 0)));

  const record = await db.unitProgress.upsert({
    where: { userId_unitId: { userId: user.id, unitId } },
    create: {
      userId: user.id,
      unitId,
      courseId,
      status,
      progressPercent,
      startedAt: new Date(),
      lastVisitedAt: new Date(),
      completedAt: status === UnitProgressStatus.COMPLETED ? new Date() : null,
    },
    update: {
      status,
      progressPercent,
      lastVisitedAt: new Date(),
      completedAt:
        status === UnitProgressStatus.COMPLETED ? new Date() : undefined,
    },
  });

  return NextResponse.json(record);
}
