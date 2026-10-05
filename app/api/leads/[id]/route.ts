// 個別リードの更新（ステータス変更）・削除。自分が発行したリードのみ操作可。
import { getSession } from "@/lib/auth/session";
import { getLead, updateLeadStatus, deleteLead, setLeadPlaceId } from "@/lib/store/store";
import { STATUS_ORDER, type LeadStatus } from "@/lib/store/types";
import { normalizePlaceId } from "@/lib/domain/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { sales, isAdmin } = await getSession();
  const lead = await getLead(params.id);
  if (!lead) return json({ error: "対象が見つかりません。" }, 404);
  if (!isAdmin && (!sales || lead.salesId !== sales.id)) return json({ error: "権限がありません。" }, 403);

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエスト不正" }, 400);
  }
  let next = lead;

  // Place ID の設定/更新（空文字でクリア）。
  if (typeof b?.placeId === "string") {
    const raw = b.placeId.trim();
    if (raw === "") {
      next = (await setLeadPlaceId(params.id, "")) ?? next;
    } else {
      const norm = normalizePlaceId(raw);
      if (!norm) return json({ error: "Place IDの形式が正しくありません。" }, 400);
      next = (await setLeadPlaceId(params.id, norm)) ?? next;
    }
  }

  // ステータス変更。
  if (b?.status !== undefined) {
    const status = String(b.status || "") as LeadStatus;
    if (!STATUS_ORDER.includes(status)) return json({ error: "不正なステータスです。" }, 400);
    next = (await updateLeadStatus(params.id, status)) ?? next;
  }

  return json({ ok: true, lead: next });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { sales, isAdmin } = await getSession();
  const lead = await getLead(params.id);
  if (!lead) return json({ ok: true });
  if (!isAdmin && (!sales || lead.salesId !== sales.id)) return json({ error: "権限がありません。" }, 403);
  await deleteLead(params.id);
  return json({ ok: true });
}

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
