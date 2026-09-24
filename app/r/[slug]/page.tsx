// お客様が受け取る診断結果ページ（キー不要で /r/<slug> を開ける）。
import { getLeadBySlug, recordView, getLineAddUrl } from "@/lib/store/store";
import { buildResultView } from "@/features/result";
import { ResultScreen } from "@/features/result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: { slug: string } }) {
  const lead = await getLeadBySlug(params.slug);
  if (!lead) {
    return (
      <main className="app">
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>診断が見つかりませんでした</p>
          <p style={{ fontSize: 13 }}>URLが正しくない可能性があります。担当者にお問い合わせください。</p>
        </div>
      </main>
    );
  }
  recordView(params.slug).catch(() => {});
  const lineUrl = await getLineAddUrl();
  const data = buildResultView(lead.storeName, lead.answers, {
    query: lead.query,
    weights: lead.weights,
    descText: lead.descText,
    keywords: lead.keywords,
  });
  return (
    <main className="app">
      <ResultScreen data={data} variant="owner" slug={lead.slug} lineUrl={lineUrl} />
    </main>
  );
}
