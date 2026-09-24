// 印刷/PDF用の診断レポートページ（/r/<slug>/print）。開くと印刷ダイアログが自動で開く。
import { getLeadBySlug } from "@/lib/store/store";
import { buildResultView } from "@/features/result";
import { PrintReport } from "@/features/result/PrintReport";
import { AutoPrint } from "@/features/result/AutoPrint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default async function PrintPage({ params }: { params: { slug: string } }) {
  const lead = await getLeadBySlug(params.slug);
  if (!lead) {
    return (
      <main className="app">
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ fontSize: 15, fontWeight: 800 }}>診断が見つかりませんでした</p>
        </div>
      </main>
    );
  }
  const data = buildResultView(lead.storeName, lead.answers, {
    query: lead.query,
    weights: lead.weights,
    descText: lead.descText,
    keywords: lead.keywords,
  });
  return (
    <main className="app">
      <AutoPrint />
      <PrintReport data={data} dateStr={formatDate(lead.createdAt)} />
    </main>
  );
}
