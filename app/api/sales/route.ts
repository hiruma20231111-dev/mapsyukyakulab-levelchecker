// 営業アカウントの管理（管理者専用）。作成すると /s/<token> のアカウントリンクを返す。
import { getSession } from "@/lib/auth/session";
import { createSales, listSales, updateSales, deleteSales } from "@/lib/store/store";
import type { SalesMember } from "@/lib/store/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
function withLink(s: SalesMember) {
  return { ...s, accountLink: `/s/${s.token}` };
}

async function requireAdmin() {
  const { isAdmin } = await getSession();
  return isAdmin;
}

export async function GET() {
  if (!(await requireAdmin())) return json({ error: "権限がありません。" }, 403);
  const list = await listSales();
  return json({ ok: true, sales: list.map(withLink) });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return json({ error: "権限がありません。" }, 403);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエスト不正" }, 400);
  }
  const name = String(b?.name || "").trim();
  if (!name) return json({ error: "名前を入力してください。" }, 400);
  const s = await createSales(name);
  return json({ ok: true, sales: withLink(s) });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return json({ error: "権限がありません。" }, 403);
  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエスト不正" }, 400);
  }
  const id = String(b?.id || "");
  if (!id) return json({ error: "id が必要です。" }, 400);
  const patch: { name?: string; active?: boolean } = {};
  if (typeof b?.name === "string") patch.name = b.name.trim();
  if (typeof b?.active === "boolean") patch.active = b.active;
  const s = await updateSales(id, patch);
  if (!s) return json({ error: "対象が見つかりません。" }, 404);
  return json({ ok: true, sales: withLink(s) });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return json({ error: "権限がありません。" }, 403);
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return json({ error: "id が必要です。" }, 400);
  await deleteSales(id);
  return json({ ok: true });
}

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
