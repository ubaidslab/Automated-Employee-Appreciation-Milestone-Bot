import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createSessionCookieValue, verifyAdminKey } from "@/lib/auth/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const key = typeof (body as Record<string, unknown>)?.key === "string" ? (body as Record<string, string>).key : "";

  if (!verifyAdminKey(key)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const cookieValue = await createSessionCookieValue();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_SESSION_COOKIE);
  return res;
}
