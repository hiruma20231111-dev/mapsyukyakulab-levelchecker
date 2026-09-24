// リード（診断）の発行・一覧。営業がログインしていること（アカウントリンク）が前提。
import { getSession } from "@/lib/auth/session";
import { createLead, listLeadsBySales } from "@/lib/store/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  const { sales } = await getSession();
  if (!sales) return json({ error: "ログインが必要です。" }, 401);

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエスト不正" }, 400);
  }
  const storeName = String(b?.storeName || "").trim();
  if (!storeName) return json({ error: "店舗名を入力してください。" }, 400);
  const answers = b?.answers && typeof b.answers === "object" ? b.answers : {};

  const lead = await createLead({
    salesId: sales.id,
    storeName,
    answers,
    query: typeof b?.query === "string" ? b.query : undefined,
    weights: b?.weights && typeof b.weights === "object" ? b.weights : undefined,
    descText: typeof b?.descText === "string" ? b.descText : undefined,
    keywords: typeof b?.keywords === "string" ? b.keywords : undefined,
  });

  return json({ ok: true, id: lead.id, slug: lead.slug, total: lead.total, rank: lead.rank });
}

export async function GET() {
  const { sales } = await getSession();
  if (!sales) return json({ error: "ログインが必要です。" }, 401);
  const leads = await listLeadsBySales(sales.id);
  return json({ ok: true, leads });
}

function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
}
