// 営業別の月間発行目標。管理者が都度変更できる。
import { getSession } from "@/lib/auth/session";
import { setGoal } from "@/lib/store/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  const { isAdmin } = await getSession();
  if (!isAdmin) return json({ error: "権限がありません。" }, 403);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエスト不正" }, 400);
  }
  const salesId = String(b?.salesId || "");
  const ym = String(b?.ym || "");
  const goal = Number(b?.goal);
  if (!salesId || !/^\d{4}-\d{2}$/.test(ym) || Number.isNaN(goal)) {
    return json({ error: "パラメータ不正" }, 400);
  }
  await setGoal(salesId, ym, Math.max(0, Math.round(goal)));
  return json({ ok: true });
}

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
