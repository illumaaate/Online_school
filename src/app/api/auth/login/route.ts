import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession, verifyPassword } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      captchaToken?: string;
    };
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    if (!body.captchaToken || !(await verifyCaptcha(body.captchaToken))) {
      return NextResponse.json({ error: "Captcha verification failed" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: body.email } });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    await setSession(user.id, user.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to login", details: String(error) }, { status: 500 });
  }
}
