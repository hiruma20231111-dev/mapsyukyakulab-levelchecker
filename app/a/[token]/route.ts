// 管理者リンク：/a/<ADMIN_TOKEN> を開くと管理者としてログインし、管理ボードへ遷移する。
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token || "";
  const at = adminToken();
  const base = new URL(req.url);
  if (!at || token !== at) {
    return NextResponse.redirect(new URL("/?e=admin", base.origin));
  }
  const res = NextResponse.redirect(new URL("/admin", base.origin));
  res.cookies.set(ADMIN_COOKIE, at, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
