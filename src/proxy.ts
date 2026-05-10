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

  // Normalize trailing slash without browser redirect to avoid proxy-induced loops.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const normalized = request.nextUrl.clone();
    normalized.pathname = pathname.slice(0, -1);
    return NextResponse.rewrite(normalized);
  }

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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
