// アプリ設定（LINE友だち追加URL・デフォルト月間目標）。管理者専用。
import { getSession } from "@/lib/auth/session";
import { getSettings, setSettings } from "@/lib/store/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET() {
  const { isAdmin } = await getSession();
  if (!isAdmin) return json({ error: "権限がありません。" }, 403);
  return json({ ok: true, settings: await getSettings() });
}

export async function POST(req: Request) {
  const { isAdmin } = await getSession();
  if (!isAdmin) return json({ error: "権限がありません。" }, 403);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエスト不正" }, 400);
  }
  const patch: { lineAddUrl?: string; defaultMonthlyGoal?: number } = {};
  if (typeof b?.lineAddUrl === "string") patch.lineAddUrl = b.lineAddUrl.trim();
  if (b?.defaultMonthlyGoal != null && !Number.isNaN(Number(b.defaultMonthlyGoal))) {
    patch.defaultMonthlyGoal = Math.max(0, Math.round(Number(b.defaultMonthlyGoal)));
  }
  const next = await setSettings(patch);
  return json({ ok: true, settings: next });
}

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
