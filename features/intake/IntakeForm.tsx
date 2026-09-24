"use client";
// 営業モード：店舗のGBP状況を入力 → 診断を発行 → 公開URL/QRを表示。
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Icon, type IconName } from "@/design/icons";
import { DIAG_CATEGORIES, type CategoryKey } from "@/content/diagnosis-v3";
import { scoreV3, type V3Answers } from "@/lib/domain/score";
import { analyzeDescription, DESC_MAX } from "@/lib/domain/description";

const CAT_ICON: Record<CategoryKey, IconName> = {
  basic: "list",
  content: "book",
  photo: "camera",
  review: "chat",
  post: "mega",
  citation: "link",
};

type Answers = V3Answers;

export function IntakeForm({ salesName }: { salesName: string }) {
  const [storeName, setStoreName] = useState("");
  const [query, setQuery] = useState("");
  const [descText, setDescText] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState<"input" | "issuing" | "issued">("input");
  const [issued, setIssued] = useState<{ slug: string; url: string } | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const scored = useMemo(() => scoreV3(answers), [answers]);
  const desc = useMemo(() => analyzeDescription(descText, query), [descText, query]);

  function setSub(cat: CategoryKey, sub: string, score: number) {
    setAnswers((prev) => {
      const catObj = { ...(prev[cat] || {}) };
      if (catObj[sub] === score) delete catObj[sub];
      else catObj[sub] = score;
      return { ...prev, [cat]: catObj };
    });
  }

  // 説明文の分析スコアを content.description に反映
  useEffect(() => {
    setAnswers((prev) => {
      const content = { ...(prev.content || {}) };
      if (descText.trim()) content.description = desc.score;
      else delete content.description;
      return { ...prev, content };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descText, desc.score]);

  const answeredCount = useMemo(
    () => Object.values(answers).reduce((n, c) => n + Object.keys(c || {}).length, 0),
    [answers],
  );
  const canIssue = storeName.trim().length > 0 && answeredCount > 0;

  async function issue() {
    if (!canIssue) return;
    setStep("issuing");
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, answers, query, descText, keywords: query }),
      });
      const data = await res.json();
      if (!res.ok || !data?.slug) throw new Error(data?.error || "発行に失敗しました。");
      const url = `${location.origin}/r/${data.slug}`;
      setIssued({ slug: data.slug, url });
      const png = await QRCode.toDataURL(url, { width: 480, margin: 1 });
      setQr(png);
      setStep("issued");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "発行に失敗しました。");
      setStep("input");
    }
  }

  function reset() {
    setStoreName("");
    setQuery("");
    setDescText("");
    setAnswers({});
    setIssued(null);
    setQr("");
    setStep("input");
    window.scrollTo(0, 0);
  }

  async function copyUrl() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  }

  // ---- 発行中 ----
  if (step === "issuing") {
    return (
      <div className="in-wrap">
        <div className="in-issue">
          <div className="in-orb"><div className="core"><Icon name="spark" size={26} /></div></div>
          <p className="in-prog-t">診断を発行しています</p>
          <p className="in-prog-s">お客様用の結果ページとQRコードを生成中…</p>
        </div>
      </div>
    );
  }

  // ---- 発行完了 ----
  if (step === "issued" && issued) {
    return (
      <div className="in-wrap">
        <Appbar salesName={salesName} />
        <div className="in-issue">
          <div className="in-done-badge"><Icon name="check" size={30} /></div>
          <p className="in-done-h">診断を発行しました</p>
          <p className="in-done-s">{storeName}｜{scored.total}点・{scored.rank}ランク</p>
          {qr && (
            <div className="in-qr"><img src={qr} alt="診断結果QR" /></div>
          )}
          <div className="in-urlpill">{issued.url}</div>
          <div className="in-share">
            <a className="btn" href={`/r/${issued.slug}`} target="_blank" rel="noopener noreferrer">結果を確認</a>
            <button className="btn ghost" onClick={copyUrl} aria-label="URLをコピー">
              <Icon name={copied ? "check" : "link"} size={18} />
            </button>
          </div>
          <button className="in-backlink" onClick={reset}>続けて別の店舗を診断する</button>
          <a className="in-backlink" href="/dashboard">ダッシュボードへ戻る</a>
        </div>
      </div>
    );
  }

  // ---- 入力 ----
  return (
    <div className="in-wrap">
      <Appbar salesName={salesName} />
      <h1 className="in-h">新規診断を発行</h1>
      <p className="in-hsub">訪問前に、お客様のGoogleビジネスプロフィールの状況を入力してください。</p>

      <div className="in-field">
        <label>店舗名 <span style={{ color: "var(--g-red)" }}>*</span></label>
        <input className="in-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="例：darts&shot Bar PinkDolphin" />
      </div>
      <div className="in-field">
        <label>狙う検索キーワード（任意）</label>
        <input className="in-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="例：布施 バー, カラオケ, ダーツバー" />
      </div>

      {DIAG_CATEGORIES.map((cat) => {
        const s = scored.categories.find((c) => c.key === cat.key)!;
        return (
          <div className="in-cat" key={cat.key}>
            <div className="in-cat-head">
              <div className="in-cat-ic"><Icon name={CAT_ICON[cat.key]} size={17} /></div>
              <div className="in-cat-name">{cat.name}</div>
              <div className="in-cat-pts">{s.empty ? "未入力" : `${s.points}/${s.max}`}</div>
            </div>
            {cat.subs.map((sub) => (
              <div className="in-sub" key={sub.key}>
                <div className="in-sub-lbl">{sub.label}</div>
                {sub.input === "text" ? (
                  <>
                    <textarea
                      className="in-input"
                      value={descText}
                      onChange={(e) => setDescText(e.target.value)}
                      placeholder="GBPの店舗説明文を貼り付け（キーワードを含む充実した説明ほど高評価）"
                      maxLength={DESC_MAX + 200}
                    />
                    <div className="in-analysis">
                      <span className={`in-tagm ${desc.length >= 500 ? "ok" : desc.length > 0 ? "warn" : ""}`}>
                        {desc.length}字 / 目安{500}字
                      </span>
                      {desc.keywordTotal > 0 && (
                        <span className={`in-tagm ${desc.keywordHits === desc.keywordTotal ? "ok" : "warn"}`}>
                          KW {desc.keywordHits}/{desc.keywordTotal}
                        </span>
                      )}
                      {descText.trim() && <span className="in-tagm score">スコア {desc.score}</span>}
                    </div>
                  </>
                ) : (
                  <div className="in-chips">
                    {sub.options.map((opt) => {
                      const on = answers[cat.key]?.[sub.key] === opt.score;
                      return (
                        <button
                          key={opt.label}
                          className={`in-chip ${on ? "on" : ""}`}
                          onClick={() => setSub(cat.key, sub.key, opt.score)}
                          type="button"
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {error && (
        <p style={{ color: "#a23b30", fontSize: 12.5, fontWeight: 700, textAlign: "center", margin: "10px 0" }}>{error}</p>
      )}

      <div className="in-cta">
        <button className="btn" onClick={issue} disabled={!canIssue}>
          <Icon name="spark" size={18} />
          診断を発行する（現在 {scored.total}点・{scored.rank}）
        </button>
        <p className="note">発行後にお客様へURL/QRで共有できます。ステータスは後から変更できます。</p>
      </div>
    </div>
  );
}

function Appbar({ salesName }: { salesName: string }) {
  return (
    <div className="in-appbar">
      <a className="in-back" href="/dashboard" aria-label="戻る" style={{ fontSize: 18, fontWeight: 900, textDecoration: "none" }}>‹</a>
      <div className="mk"><i className="b" /><i className="y" /><i className="g" /><i className="r" /></div>
      <div className="name">レベルチェッカー</div>
      <div className="role">{salesName}</div>
    </div>
  );
}
