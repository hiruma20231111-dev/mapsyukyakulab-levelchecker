"use client";
// 印刷ページ用：画面上の「印刷/PDF保存」ボタン。読み込み直後に自動で印刷ダイアログも開く。
import { useEffect } from "react";

export function AutoPrint({ auto = true }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [auto]);
  return (
    <div className="pr-toolbar">
      <button type="button" className="pr-print-btn" onClick={() => window.print()}>
        印刷 / PDFで保存
      </button>
      <span className="pr-hint">印刷ダイアログで「PDFに保存」を選ぶとPDF化できます。</span>
    </div>
  );
}
