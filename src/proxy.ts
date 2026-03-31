import { NextRequest, NextResponse } from "next/server";

const privatePrefixes = [
  "/dashboard",
  "/courses",
  "/lesson",
  "/calls",
  "/learn",
  "/tests",
  "/join",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPrivate = privatePrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isPrivate) return NextResponse.next();

  const session = request.cookies.get("school_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/lesson/:path*",
    "/calls/:path*",
    "/learn/:path*",
    "/tests/:path*",
    "/join/:path*",
  ],
};
