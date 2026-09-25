"use client";
// 診断結果ページ（オーナー様が受け取る）。承認モックv6.1準拠。採点エンジンのビューに接続。
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/design/icons";
import type { CategoryView, ResultView } from "./build";

const CIRC = 150.8; // 2π*24
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** はみ出すリング型スコア＋長押しで詳細。 */
function CategoryRow({ cat, onOpen }: { cat: CategoryView; onOpen: (c: CategoryView) => void }) {
  const [holding, setHolding] = useState(false);
  const [fired, setFired] = useState(false);
  const [offset, setOffset] = useState(CIRC);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const reduce = prefersReduced();
    const target = CIRC * (1 - cat.ratio);
    if (reduce) { setOffset(target); return; }
    const t = setTimeout(() => setOffset(target), 250);
    return () => clearTimeout(t);
  }, [cat.ratio]);

  const start = useCallback(() => {
    firedRef.current = false;
    setHolding(true);
    timer.current = setTimeout(() => {
      firedRef.current = true;
      setHolding(false);
      setFired(true);
      setTimeout(() => setFired(false), 360);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([10, 30, 14]);
      onOpen(cat);
    }, 450);
  }, [cat, onOpen]);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setHolding(false);
  }, []);

  return (
    <button
      type="button"
      className={`rs-row${holding ? " holding" : ""}${fired ? " fired" : ""}`}
      style={{ borderLeftColor: cat.color }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClick={(e) => { e.preventDefault(); if (!firedRef.current) onOpen(cat); }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${cat.name} ${cat.points}点。長押しで詳細`}
    >
      <span className="rs-row-ic" style={{ background: cat.color + "22", color: cat.color }}>
        <Icon name={cat.icon} size={18} />
      </span>
      <span className="rs-row-mid">
        <span className="rs-row-name">{cat.name}</span>
        <span className="rs-row-note">{cat.note}</span>
      </span>
      <span className="rs-ring">
        <svg viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r="24" fill="none" stroke="#eef2f5" strokeWidth="6" />
          <circle
            className="prog" cx="32" cy="32" r="24" fill="none" stroke={cat.color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="rn" style={{ color: cat.color }}>
          {cat.points}<small>/{cat.max}</small>
        </span>
      </span>
      <span className="rs-holdbar" />
    </button>
  );
}

const JMARK: Record<string, string> = { o: "✓", t: "△", x: "✕" };

function DetailSheet({ cat, onClose }: { cat: CategoryView | null; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    if (!cat) { setShown(false); setBarW(0); return; }
    setShown(true);
    const reduce = prefersReduced();
    if (reduce) { setBarW(Math.round(cat.ratio * 100)); return; }
    const t = setTimeout(() => setBarW(Math.round(cat.ratio * 100)), 180);
    return () => clearTimeout(t);
  }, [cat]);

  return (
    <>
      <div className={`rs-mask${cat ? " open" : ""}`} onClick={onClose} />
      <div className={`rs-sheet${cat ? " open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!cat}>
        {cat && (
          <>
            <div className="rs-grip" />
            <div className="rs-sheet-head">
              <span className="rs-sheet-ic" style={{ background: cat.color + "22", color: cat.color }}>
                <Icon name={cat.icon} size={20} />
              </span>
              <span className="rs-sheet-name">{cat.name}</span>
              <span className="rs-sheet-score" style={{ color: cat.color }}>
                {cat.points}<small>/{cat.max}</small>
              </span>
            </div>
            <div className="rs-sheet-bar"><i style={{ width: `${barW}%`, background: cat.color }} /></div>
            <p className="rs-sheet-cmt">{cat.comment}</p>
            <div className="rs-crit">採点基準 × いまの状態</div>
            <div className="rs-subs">
              {cat.subs.map((s, i) => (
                <div
                  key={s.label}
                  className={`rs-sub r-${s.judge}${shown ? " in" : ""}`}
                  style={{ transitionDelay: prefersReduced() ? "0ms" : `${120 + i * 80}ms` }}
                >
                  <span className="j">{JMARK[s.judge]}</span>
                  <div>
                    <div className="sn">{s.label}</div>
                    <div className="sc">基準：{s.criteria} ／ 現状：<span className="now">{s.current}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rs-sheet-insight">
              <Icon name="spark" size={15} />
              <span><span className="lab">AIの気づき：</span>{cat.insight}</span>
            </div>
            <div>
              <span className="rs-sheet-improve">
                <Icon name="spark" size={13} />改善の余地 +{cat.headroom} pt
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function ResultScreen({
  data,
  variant = "owner",
  onBack,
  onIssue,
  slug,
  lineUrl,
}: {
  data: ResultView;
  /** owner=お客様が受け取る画面 / sales-preview=営業が発行前に確認する画面 */
  variant?: "owner" | "sales-preview";
  onBack?: () => void;
  onIssue?: () => void;
  /** owner: PDF印刷ページのリンクに使う slug。 */
  slug?: string;
  /** owner: LINE友だち追加（無料トライアル申込）URL。空なら非表示。 */
  lineUrl?: string;
}) {
  const [open, setOpen] = useState<CategoryView | null>(null);
  const [num, setNum] = useState(0);

  useEffect(() => {
    if (prefersReduced()) { setNum(data.total); return; }
    let raf = 0; let start: number | null = null; const dur = 1400;
    const tick = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setNum(Math.round(data.total * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(tick); }, 300);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [data.total]);

  return (
    <div className="result">
      <header className="rs-hero">
        <span className="rs-badge"><span className="mini" />AIがあなたのお店を読み解きました</span>
        <div className="rs-store">{data.storeName}</div>
        <div className="rs-orb">
          <div className="oc"><span className="n">{num}</span><span className="d">/ {data.max} 点</span></div>
          <div className="rs-grade"><span className="gl">{data.rank}</span><span className="gt">RANK</span></div>
        </div>
        <p className="rs-verdict">{data.verdict}</p>
        <span className="rs-improve-chip">
          <Icon name="spark" size={14} />まだ伸ばせる、改善の余地があります
        </span>
      </header>

      <div className="rs-body">
        {data.priorities.length > 0 && (
          <section className="rs-pri-sec">
            <div className="rs-sec-label"><Icon name="spark" size={14} />優先的に取り組む</div>
            {data.priorities.map((c, i) => (
              <div className="rs-pri" key={c.key} style={{ borderLeftColor: c.color }}>
                <span className="rs-pri-no" style={{ background: c.color }}>{i + 1}</span>
                <div className="rs-pri-main">
                  <div className="rs-pri-name">{c.name}<small>{c.reason}</small></div>
                  <div className="rs-pri-step"><b>最初の一歩：</b>{c.firstStep}</div>
                  <div className="rs-pri-effect"><Icon name="spark" size={12} />{c.effect}</div>
                </div>
                <span className="rs-pri-gain">+{c.headroom}<small>pt</small></span>
              </div>
            ))}
            <p className="rs-pri-note">※ これらの改善は、無料トライアルで専門スタッフが一緒に進められます。</p>
          </section>
        )}

        <div className="rs-hint"><Icon name="spark" size={14} />各項目を長押しすると、採点の内訳が見られます</div>
        <div className="rs-rows">
          {data.categories.map((c) => (
            <CategoryRow key={c.key} cat={c} onOpen={setOpen} />
          ))}
        </div>

        <div className="rs-aio">
          <span className="mini" />
          <span className="txt">
            <span className="t1">AI検索での見え方</span>
            <span className="t2">ChatGPTやGoogleのAIに「近くのおすすめのお店は？」と聞かれたときの選ばれやすさ</span>
          </span>
          <span className="stat">{data.aio.status}</span>
        </div>
      </div>

      {variant === "sales-preview" ? (
        <div className="rs-cta rs-cta-2">
          <button type="button" className="btn ghost" onClick={onBack}>戻って修正</button>
          <button type="button" className="btn" onClick={onIssue}>この内容で発行する</button>
        </div>
      ) : (
        <div className="rs-cta rs-cta-owner">
          {lineUrl ? (
            <a className="btn btn-line" href={lineUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="chat" size={18} />LINEで無料トライアルに申し込む
            </a>
          ) : null}
          {slug ? (
            <a className="btn ghost" href={`/r/${slug}/print`} target="_blank" rel="noopener noreferrer">
              <Icon name="book" size={16} />診断結果をPDFで保存・印刷
            </a>
          ) : null}
          <p className="note">無料トライアルで、これらの改善を専門スタッフが一緒に進められます。</p>
        </div>
      )}

      <DetailSheet cat={open} onClose={() => setOpen(null)} />
    </div>
  );
}
