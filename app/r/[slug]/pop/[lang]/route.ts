// クチコミ収集POPのPDFを返す（/r/<slug>/pop/<lang>）。
// 店舗の Place ID が設定済みのときだけ、青枠にQRを合成した塗り済みPDFをダウンロードさせる。
import { getLeadBySlug } from "@/lib/store/store";
import { buildReviewPop } from "@/lib/pop/buildReviewPop";
import { isPopLang, normalizePlaceId } from "@/lib/domain/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; lang: string } },
) {
  if (!isPopLang(params.lang)) {
    return html("対応していない言語です。", 404);
  }
  const lead = await getLeadBySlug(params.slug);
  if (!lead) {
    return html("診断が見つかりませんでした。URLをご確認ください。", 404);
  }
  const placeId = normalizePlaceId(lead.placeId);
  if (!placeId) {
    // Place ID 未設定（担当者が設定するとPOPが発行できる）。
    return html(
      "クチコミPOPは準備中です。担当者がGoogleのクチコミリンク（Place ID）を設定すると発行できます。",
      200,
    );
  }

  try {
    const pdf = await buildReviewPop(placeId, params.lang);
    const fname = `review-pop-${params.lang}.pdf`;
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fname}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return html("POPの生成に失敗しました。時間をおいて再度お試しください。", 500);
  }
}

function html(msg: string, status: number) {
  const body = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:420px;margin:60px auto;padding:0 20px;text-align:center;color:#2b3a46">
<p style="font-size:15px;font-weight:800">${msg}</p>
</div>`;
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
