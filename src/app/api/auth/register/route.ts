import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is too short")
    .max(80, "Name is too long"),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .max(255, "Email is too long")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  role: z.nativeEnum(Role).optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Public registration must never allow privileged roles.
    if (data.role && data.role !== Role.STUDENT) {
      return NextResponse.json(
        { error: "Only STUDENT role can be self-registered" },
        { status: 403 },
      );
    }

    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: Role.STUDENT,
      },
      select: { id: true, role: true },
    });

    await setSession(user.id, user.role);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email already used" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
