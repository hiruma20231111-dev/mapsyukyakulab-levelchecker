// ログアウト：Cookie を消して入口へ戻す。
import { NextResponse } from "next/server";
import { SALES_COOKIE, ADMIN_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const base = new URL(req.url);
  const res = NextResponse.redirect(new URL("/", base.origin));
  res.cookies.set(SALES_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
