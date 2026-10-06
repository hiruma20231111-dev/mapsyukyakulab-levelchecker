"use client";
// 診断結果ページ（オーナー様が受け取る）。承認モックv6.1準拠。採点エンジンのビューに接続。
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/design/icons";
import type { CategoryView, ResultView } from "./build";

const ORB_CIRC = 640.88; // 2π*102（総合スコアオーブのリング）
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 読み込み時の紙吹雪バースト（派手演出）。reduced-motion では出さない。 */
function Confetti() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (prefersReduced()) return;
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.clientWidth || cv.offsetWidth;
    const H = cv.clientHeight || cv.offsetHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const cols = ["#4285f4", "#34a853", "#fbbc05", "#ea4335", "#06c755"];
    const parts = Array.from({ length: 130 }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * 90, y: H * 0.34 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 9, vy: Math.random() * -11 - 3,
      s: 4 + Math.random() * 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      c: cols[i % cols.length], life: 0, max: 70 + Math.random() * 40,
    }));
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        if (p.life > p.max) continue;
        alive = true; p.life++; p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(tick); }, 450);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="rs-confetti" aria-hidden />;
}

/** 達成度→デモ風ステータスラベル（実際の ratio から導出）。 */
function statusLabel(ratio: number): string {
  if (ratio >= 0.8) return "とても良いです";
  if (ratio >= 0.6) return "良い調子です";
  if (ratio >= 0.4) return "改善の余地あり";
  return "優先的に改善しましょう";
}

/** カード表示順（デモ準拠：基本情報→クチコミ→写真→投稿→コンテンツ）。 */
const CARD_ORDER: Record<string, number> = { basic: 0, review: 1, photo: 2, post: 3, content: 4 };

/** 2×2カードグリッド（アイコン＋大きい数字＋横バー）＋長押しで詳細。Canva画像デザイン準拠。 */
function CategoryRow({ cat, onOpen }: { cat: CategoryView; onOpen: (c: CategoryView) => void }) {
  const [holding, setHolding] = useState(false);
  const [fired, setFired] = useState(false);
  const [barW, setBarW] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const reduce = prefersReduced();
    const target = Math.round(cat.ratio * 100);
    if (reduce) { setBarW(target); return; }
    const t = setTimeout(() => setBarW(target), 250);
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
      className={`rs-card${holding ? " holding" : ""}${fired ? " fired" : ""}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClick={(e) => { e.preventDefault(); if (!firedRef.current) onOpen(cat); }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${cat.name} ${cat.points}点。長押しで詳細`}
    >
      <span className="rs-card-top">
        <span className="rs-card-ic" style={{ background: cat.color + "22", color: cat.color }}>
          <Icon name={cat.icon} size={18} />
        </span>
        <span className="rs-card-name">{cat.name}</span>
      </span>
      <span className="rs-card-num" style={{ color: cat.color }}>{cat.points}<small>/{cat.max}</small></span>
      <span className="rs-card-bar"><i style={{ width: `${barW}%`, background: cat.color }} /></span>
      <span className="rs-card-foot">
        <span className="rs-card-status" style={{ color: cat.color }}>{statusLabel(cat.ratio)}</span>
        <span className="rs-card-chev">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>
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
              <span><span className="lab">ワンポイント💡 </span>{cat.insight}</span>
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
  popReady,
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
  /** owner: Place ID 設定済みなら、クチコミ収集POPのダウンロードを表示。 */
  popReady?: boolean;
}) {
  const [open, setOpen] = useState<CategoryView | null>(null);
  const [popFrame, setPopFrame] = useState<string | null>(null);
  const [num, setNum] = useState(0);
  const [orbOff, setOrbOff] = useState(ORB_CIRC);
  const [today, setToday] = useState("");
  useEffect(() => { setToday(new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })); }, []);

  useEffect(() => {
    const ratio = data.max > 0 ? data.total / data.max : 0;
    const orbTarget = ORB_CIRC * (1 - ratio);
    if (prefersReduced()) { setNum(data.total); setOrbOff(orbTarget); return; }
    let raf = 0; let start: number | null = null; const dur = 1400;
    const tick = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setNum(Math.round(data.total * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => { setOrbOff(orbTarget); raf = requestAnimationFrame(tick); }, 300);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [data.total, data.max]);

  return (
    <div className="result">
      <Confetti />
      <header className="rs-hero">
        <span className="rs-spk rs-spk1" aria-hidden><Icon name="spark" size={16} /></span>
        <span className="rs-spk rs-spk2" aria-hidden><Icon name="spark" size={11} /></span>
        <span className="rs-spk rs-spk3" aria-hidden><Icon name="spark" size={13} /></span>
        <div className="rs-topbar">
          <span className="rs-logo"><span className="rs-logo-pin"><Icon name="pin" size={15} /></span>マップ集客ラボ</span>
          <span className="rs-datechip"><Icon name="spark" size={11} />スコア更新日 {today}</span>
        </div>
        <div className="rs-herorow">
          <div className="rs-orb">
            <svg className="rs-orb-ring" viewBox="0 0 236 236" aria-hidden>
              <defs>
                <linearGradient id="rsScoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="var(--g-blue)" />
                  <stop offset="0.45" stopColor="var(--g-green)" />
                  <stop offset="0.78" stopColor="var(--g-yellow)" />
                  <stop offset="1" stopColor="var(--g-red)" />
                </linearGradient>
              </defs>
              <circle cx="118" cy="118" r="102" fill="none" stroke="#eef2f6" strokeWidth="18" />
              <circle
                className="rs-orb-arc" cx="118" cy="118" r="102" fill="none" stroke="url(#rsScoreGrad)"
                strokeWidth="18" strokeLinecap="round" strokeDasharray={ORB_CIRC} strokeDashoffset={orbOff}
              />
            </svg>
            <div className="oc"><span className="n">{num}</span><span className="d">/ {data.max} 点</span></div>
            <div className="rs-grade"><span className="gl">{data.rank}</span><span className="gt">RANK</span></div>
          </div>
          <div className="rs-herotxt">
            <div className="rs-store">{data.storeName}</div>
            <p className="rs-hl">改善でさらに<span className="rs-hl-sh">集客アップ</span>へ<span className="rs-hl-spk"><Icon name="spark" size={13} /></span></p>
            <p className="rs-verdict">{data.verdict}</p>
            <span className="rs-improve-chip">
              <Icon name="spark" size={14} />まだ伸ばせる、改善の余地があります
            </span>
          </div>
        </div>
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
          {[...data.categories]
            .sort((a, b) => (CARD_ORDER[a.key] ?? 99) - (CARD_ORDER[b.key] ?? 99))
            .map((c, i) => (
              <div className="rs-cw" key={c.key} style={{ animationDelay: prefersReduced() ? "0ms" : `${260 + i * 100}ms` }}>
                <CategoryRow cat={c} onOpen={setOpen} />
              </div>
            ))}
        </div>

        <section className="rs-power">
          <div className="rs-sec-label"><Icon name="spark" size={14} />集客力の評価</div>
          {data.power.map((p) => (
            <div className={`rs-pw rs-pw-${p.tone}`} key={p.key}>
              <div className="rs-pw-head">
                <span className="rs-pw-name">{p.name}</span>
                <span className="rs-pw-level">{p.level}</span>
              </div>
              <div className="rs-pw-bar"><span style={{ width: `${Math.round(p.ratio * 100)}%` }} /></div>
              <p className="rs-pw-desc">{p.desc}</p>
            </div>
          ))}
        </section>
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
          {slug && popReady ? (
            <div className="rs-pop">
              <div className="rs-pop-lab"><Icon name="chat" size={14} />クチコミ収集POP（印刷してお店に置けます）</div>
              <div className="rs-pop-btns">
                <button type="button" className="btn ghost" onClick={() => setPopFrame(`/r/${slug}/pop/ja/preview`)}>
                  <Icon name="book" size={15} />日本語版を見る
                </button>
                <button type="button" className="btn ghost" onClick={() => setPopFrame(`/r/${slug}/pop/en/preview`)}>
                  <Icon name="book" size={15} />English
                </button>
              </div>
            </div>
          ) : null}
          <p className="note">無料トライアルで、これらの改善を専門スタッフが一緒に進められます。</p>
        </div>
      )}

      <DetailSheet cat={open} onClose={() => setOpen(null)} />

      {popFrame && (
        <div className="rs-fmodal" onClick={() => setPopFrame(null)}>
          <div className="rs-fmodal-in" onClick={(e) => e.stopPropagation()}>
            <div className="rs-fmodal-head">
              <span className="rs-fmodal-title">クチコミ収集POP</span>
              <button className="rs-fmodal-x" onClick={() => setPopFrame(null)} aria-label="閉じる" type="button">✕</button>
            </div>
            <iframe className="rs-fmodal-frame" src={popFrame} title="クチコミ収集POP" />
            <div className="rs-fmodal-foot">
              <button className="btn ghost" type="button" onClick={() => setPopFrame(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
