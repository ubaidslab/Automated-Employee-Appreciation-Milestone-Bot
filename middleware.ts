import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionCookie } from "@/lib/auth/admin-auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname === "/api/admin/auth") {
    return NextResponse.next();
  }

  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isProtected) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await isValidSessionCookie(cookie)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
