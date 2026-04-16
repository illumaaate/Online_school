import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { unlink } from "fs/promises";
import { join } from "path";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ unitId: string; attachmentId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== Role.ADMIN && user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { unitId, attachmentId } = await params;

  const attachment = await db.unitAttachment.findFirst({
    where: { id: attachmentId, unitId },
    include: { unit: { select: { module: { select: { course: { select: { teacherId: true } } } } } } },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === Role.TEACHER && attachment.unit.module.course.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.unitAttachment.delete({ where: { id: attachmentId } });

  // Delete the physical file if it's a local upload
  if (attachment.url.startsWith("/uploads/")) {
    const filePath = join(process.cwd(), "public", attachment.url);
    await unlink(filePath).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
