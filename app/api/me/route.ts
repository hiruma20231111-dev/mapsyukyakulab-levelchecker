// 営業本人による自分のプロフィール設定（LINE友だち追加URLなど）。
import { getSession } from "@/lib/auth/session";
import { updateSales } from "@/lib/store/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET() {
  const { sales } = await getSession();
  if (!sales) return json({ error: "ログインが必要です。" }, 401);
  return json({ ok: true, name: sales.name, lineUrl: sales.lineUrl || "" });
}

export async function PATCH(req: Request) {
  const { sales } = await getSession();
  if (!sales) return json({ error: "ログインが必要です。" }, 401);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエスト不正" }, 400);
  }
  const patch: { lineUrl?: string } = {};
  if (typeof b?.lineUrl === "string") patch.lineUrl = b.lineUrl.trim();
  const next = await updateSales(sales.id, patch);
  if (!next) return json({ error: "更新に失敗しました。" }, 500);
  return json({ ok: true, lineUrl: next.lineUrl || "" });
}

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
