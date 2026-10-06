// クチコミPOPの完成プレビュー（/r/<slug>/pop/<lang>/preview）。
// テンプレPNGにQRを重ねて「完成形」を見せ、確認してから「PDFで保存」できる。
import QRCode from "qrcode";
import { getLeadBySlug } from "@/lib/store/store";
import {
  isPopLang,
  normalizePlaceId,
  writeReviewUrl,
  popPreviewGeometry,
  type PopLang,
} from "@/lib/domain/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LANG_LABEL: Record<PopLang, string> = { ja: "日本語", en: "English" };

export default async function PopPreviewPage({ params }: { params: { slug: string; lang: string } }) {
  if (!isPopLang(params.lang)) return <Msg text="対応していない言語です。" />;
  const lang = params.lang;
  const lead = await getLeadBySlug(params.slug);
  if (!lead) return <Msg text="診断が見つかりませんでした。URLをご確認ください。" />;
  const placeId = normalizePlaceId(lead.placeId);
  if (!placeId) return <Msg text="クチコミPOPは準備中です。担当者がPlace IDを設定すると発行できます。" />;

  const qr = await QRCode.toDataURL(writeReviewUrl(placeId), { margin: 1, width: 600 });
  const g = popPreviewGeometry(lang);

  return (
    <main className="app" style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 40px" }}>
      <h1 style={{ fontSize: 17, fontWeight: 900, textAlign: "center", color: "#2b3a46", margin: "6px 0 2px" }}>
        クチコミPOP プレビュー（{LANG_LABEL[lang]}）
      </h1>
      <p style={{ fontSize: 12.5, textAlign: "center", color: "#8a97a3", margin: "0 0 14px" }}>{lead.storeName}</p>

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${g.pageW} / ${g.pageH}`,
          border: "1px solid #e3e9ef",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 6px 24px rgba(20,40,60,.1)",
        }}
      >
        {/* テンプレ（完成デザイン） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/pop/review-pop-${lang}.png`}
          alt="クチコミPOPデザイン"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        />
        {/* 枠内の説明文を隠す白地 */}
        <div
          style={{
            position: "absolute",
            left: `${g.bg.left}%`,
            top: `${g.bg.top}%`,
            width: `${g.bg.w}%`,
            height: `${g.bg.h}%`,
            background: "#fff",
          }}
        />
        {/* クチコミ投稿QR */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt="クチコミ投稿QR"
          style={{
            position: "absolute",
            left: `${g.qr.left}%`,
            top: `${g.qr.top}%`,
            width: `${g.qr.w}%`,
            height: `${g.qr.h}%`,
          }}
        />
      </div>

      <a
        href={`/r/${params.slug}/pop/${lang}`}
        className="btn"
        style={{ display: "flex", justifyContent: "center", marginTop: 16 }}
      >
        このPOPをPDFで保存
      </a>
      <p style={{ fontSize: 11.5, textAlign: "center", color: "#8a97a3", marginTop: 10 }}>
        印刷してお店のレジ横やテーブルに置けます。QRを読み取るとGoogleクチコミの投稿画面が開きます。
      </p>
    </main>
  );
}

function Msg({ text }: { text: string }) {
  return (
    <main className="app">
      <div style={{ padding: "48px 20px", textAlign: "center", color: "#8a97a3" }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: "#2b3a46" }}>{text}</p>
      </div>
    </main>
  );
}
