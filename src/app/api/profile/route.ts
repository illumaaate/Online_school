import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const full = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(full);
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const updates: { name?: string; passwordHash?: string } = {};

  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    updates.name = trimmed;
  }

  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: "Current password required" }, { status: 400 });
    }
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await verifyPassword(body.currentPassword, dbUser.passwordHash);
    if (!valid) return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });

    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }
    updates.passwordHash = await hashPassword(body.newPassword);
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: updates,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
