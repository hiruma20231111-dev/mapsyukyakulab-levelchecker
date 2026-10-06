"use client";
// 無料トライアルチラシのポップアップ（2ページを横スクロールで表示）。
// 診断を眠らせている間、お客様の結果ページ(/r)で「無料診断があったところ」に出す。

/** チラシのページ画像（public/flyer/）。 */
export const FLYER_PAGES = ["/flyer/trial-p1.png", "/flyer/trial-p2.png"];

export function FlyerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="flyer-modal" onClick={onClose}>
      <div className="flyer-modal-in" onClick={(e) => e.stopPropagation()}>
        <button className="flyer-x" onClick={onClose} aria-label="閉じる" type="button">✕</button>
        <div className="flyer-scroll">
          {FLYER_PAGES.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`無料トライアルチラシ ${i + 1}ページ目`} className="flyer-page" />
          ))}
        </div>
        <div className="flyer-hint">← 横にスクロールして2ページ見られます →</div>
      </div>
    </div>
  );
}
