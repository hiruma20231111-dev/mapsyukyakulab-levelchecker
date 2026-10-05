// クチコミ収集POPのPDFを生成する。
// デザインPDF（content/pop/review-pop-<lang>.pdf）の青枠へ、店舗のクチコミ投稿QRを合成して返す。
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";
import {
  writeReviewUrl,
  POP_PLACEMENT,
  POP_QR_BG_PAD,
  type PopLang,
} from "@/lib/domain/review";

/** テンプレPDFのバイト列を読む。 */
function readTemplate(lang: PopLang): Buffer {
  const p = path.join(process.cwd(), "content", "pop", `review-pop-${lang}.pdf`);
  return fs.readFileSync(p);
}

/**
 * Place ID から、青枠にQRを合成した塗り済みPOPのPDFバイト列を作る。
 * 文字「ここにQRコードを貼ってください」はQR背景の白地で隠れる。
 */
export async function buildReviewPop(placeId: string, lang: PopLang): Promise<Uint8Array> {
  const url = writeReviewUrl(placeId);
  // 誤り訂正M・十分な解像度でQRをPNG生成。
  const qrPng = await QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 900,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const pdf = await PDFDocument.load(new Uint8Array(readTemplate(lang)));
  const page = pdf.getPages()[0];
  const H = page.getHeight();
  const qrImg = await pdf.embedPng(new Uint8Array(qrPng));

  // 言語ごとの青枠中心・QRサイズ（左上原点）を pdf-lib（左下原点・y上向き）へ変換。
  const { cx, cyTop, qrSize } = POP_PLACEMENT[lang];
  const bg = qrSize + POP_QR_BG_PAD;
  // 白地（枠内の説明文を隠す）
  page.drawRectangle({
    x: cx - bg / 2,
    y: H - cyTop - bg / 2,
    width: bg,
    height: bg,
    color: rgb(1, 1, 1),
  });
  // QR 本体
  page.drawImage(qrImg, {
    x: cx - qrSize / 2,
    y: H - cyTop - qrSize / 2,
    width: qrSize,
    height: qrSize,
  });

  return pdf.save();
}
