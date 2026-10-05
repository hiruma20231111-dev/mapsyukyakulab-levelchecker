// クチコミ収集POP関連のドメインロジック。
// 店舗の Google Place ID から「クチコミ投稿リンク」を作り、POP の青枠へ合成する座標を定義する。

/** POP 対応言語。 */
export type PopLang = "ja" | "en";
export const POP_LANGS: PopLang[] = ["ja", "en"];
export function isPopLang(v: string): v is PopLang {
  return (POP_LANGS as string[]).includes(v);
}

/**
 * Place ID を正規化する。
 * - 前後空白を除去。
 * - Place ID を含む URL（…placeid=XXX / …place_id=XXX）を貼られた場合は ID だけ抜き出す。
 * - 妥当な形式でなければ null。
 */
export function normalizePlaceId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let v = String(raw).trim();
  if (!v) return null;
  // URL で貼られたときは placeid / place_id パラメータを拾う
  const m = v.match(/place_?id=([^&\s]+)/i);
  if (m) v = decodeURIComponent(m[1]);
  // Google の Place ID は英数と -_ で構成される（先頭は ChIJ/GhIJ/Eic... など）。長さで軽く弾く。
  if (!/^[A-Za-z0-9_-]{15,256}$/.test(v)) return null;
  return v;
}

/** Place ID から Google クチコミ投稿リンクを作る（スキャンすると星評価＋投稿画面が開く）。 */
export function writeReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/**
 * POP テンプレの青枠にQRを合成するための配置。言語ごとにデザイン（サイズ・枠位置）が異なる。
 * 座標は「左上原点・下向き y」（pt）。pdf-lib は左下原点なので描画時に変換する。
 * デザインPDFの青枠を実測した値：
 *  - ja：A3（842.25×1190.25pt）
 *  - en：A4（595.5×842.25pt）
 */
export interface PopPlacement {
  /** 青枠の中心 X（pt, 左上原点）。 */
  cx: number;
  /** 青枠の中心 Y（pt, 左上原点）。 */
  cyTop: number;
  /** 合成する QR の一辺（pt）。 */
  qrSize: number;
}

export const POP_PLACEMENT: Record<PopLang, PopPlacement> = {
  ja: { cx: 421.0, cyTop: 722.2, qrSize: 300 },
  en: { cx: 301.4, cyTop: 528.0, qrSize: 215 },
};

/** 枠内の説明文（「ここにQRコードを…」/「Please place the QR code here」）を隠す白地の余白（pt）。 */
export const POP_QR_BG_PAD = 26;
