// 営業アカウントリンク：/s/<token> を開くと、その営業としてログイン（Cookie設定）し
// ダッシュボードへ遷移する。リンクを持っていればログインできる（＝アカウントリンク方式）。
import { NextResponse } from "next/server";
import { getSalesByToken } from "@/lib/store/store";
import { SALES_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token || "";
  const sales = await getSalesByToken(token);
  const base = new URL(req.url);
  if (!sales || !sales.active) {
    return NextResponse.redirect(new URL("/?e=link", base.origin));
  }
  const res = NextResponse.redirect(new URL("/dashboard", base.origin));
  res.cookies.set(SALES_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1年
  });
  return res;
}
