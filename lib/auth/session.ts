// セッション（Cookieベース）。
// 営業＝アカウントリンクの token を Cookie に保持し、毎回ストアで検証する。
// 管理者＝環境変数 ADMIN_TOKEN を Cookie に保持し、毎回照合する。
import { cookies } from "next/headers";
import { getSalesByToken } from "@/lib/store/store";
import type { SalesMember } from "@/lib/store/types";

export const SALES_COOKIE = "lc_tok";
export const ADMIN_COOKIE = "lc_admin";

export function adminToken(): string {
  return process.env.ADMIN_TOKEN || "";
}

export interface Session {
  sales: SalesMember | null;
  isAdmin: boolean;
}

/** 現在のセッションを取得（サーバー専用）。 */
export async function getSession(): Promise<Session> {
  const jar = cookies();
  const tok = jar.get(SALES_COOKIE)?.value || "";
  const adm = jar.get(ADMIN_COOKIE)?.value || "";
  const at = adminToken();
  const isAdmin = !!at && adm === at;
  let sales: SalesMember | null = null;
  if (tok) {
    const s = await getSalesByToken(tok);
    if (s && s.active) sales = s;
  }
  return { sales, isAdmin };
}
