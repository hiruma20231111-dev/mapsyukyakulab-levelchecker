"use client";
// 営業モード：店舗のGBP状況を入力 → 診断を発行 → 公開URL/QRを表示。
// 入力タイプは toggle（あり/なし）/ scale（2〜5択）/ numeric（数値→段階自動変換）/ paste（説明文の文字数）。
import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Icon, type IconName } from "@/design/icons";
import { PlaceIdHelp } from "@/features/common/PlaceIdHelp";
import { DIAGNOSIS_ENABLED } from "@/lib/config";
import { DIAG_CATEGORIES, stageOf, ratioOf, type CategoryKey, type DiagItem } from "@/content/diagnosis-v3";
import { scoreV3, type V3Answers } from "@/lib/domain/score";

const CAT_ICON: Record<CategoryKey, IconName> = {
  basic: "list",
  content: "book",
  photo: "camera",
  review: "chat",
  post: "mega",
};

const DESC_MAX = 750;
type Answers = V3Answers;

/** 編集モードの初期値（既存リードを訪問後に追記/編集するとき）。 */
export interface IntakeInitial {
  id: string;
  storeName: string;
  placeId: string;
  descText: string;
  answers: V3Answers;
}

export function IntakeForm({ salesName, initial }: { salesName: string; initial?: IntakeInitial }) {
  const editing = !!initial;
  const [storeName, setStoreName] = useState(initial?.storeName ?? "");
  const [placeId, setPlaceId] = useState(initial?.placeId ?? "");
  const [descText, setDescText] = useState(initial?.descText ?? "");
  const [answers, setAnswers] = useState<Answers>(initial?.answers ?? {});
  const [step, setStep] = useState<"input" | "issuing" | "issued">("input");
  const [issued, setIssued] = useState<{ slug: string; url: string } | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const scored = useMemo(() => scoreV3(answers), [answers]);

  function setVal(cat: CategoryKey, key: string, value: number) {
    setAnswers((prev) => {
      const c = { ...(prev[cat] || {}) };
      if (c[key] === value) delete c[key];
      else c[key] = value;
      return { ...prev, [cat]: c };
    });
  }
  function setNumeric(cat: CategoryKey, key: string, raw: string) {
    setAnswers((prev) => {
      const c = { ...(prev[cat] || {}) };
      if (raw === "") delete c[key];
      else c[key] = Number(raw);
      return { ...prev, [cat]: c };
    });
  }
  function setDescription(text: string) {
    setDescText(text);
    setAnswers((prev) => {
      const c = { ...(prev.content || {}) };
      const len = text.trim().length;
      if (len === 0) delete c.description;
      else c.description = len;
      return { ...prev, content: c };
    });
  }

  const answeredCount = useMemo(
    () => Object.values(answers).reduce((n, c) => n + Object.keys(c || {}).length, 0),
    [answers],
  );
  // 店名があり、かつ「診断を1つ以上入力」または「Place ID入力済み」なら発行できる。
  // 診断を眠らせている間は Place ID 必須（クチコミPOP用）。
  const canIssue =
    storeName.trim().length > 0 &&
    (DIAGNOSIS_ENABLED ? answeredCount > 0 || placeId.trim().length > 0 : placeId.trim().length > 0);

  async function issue() {
    if (!canIssue) return;
    setStep("issuing");
    setError("");
    try {
      const body = JSON.stringify({ storeName, answers, placeId, descText });
      let slug: string;
      if (editing && initial) {
        const res = await fetch(`/api/leads/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const data = await res.json();
        if (!res.ok || !data?.lead?.slug) throw new Error(data?.error || "更新に失敗しました。");
        slug = data.lead.slug;
      } else {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const data = await res.json();
        if (!res.ok || !data?.slug) throw new Error(data?.error || "発行に失敗しました。");
        slug = data.slug;
      }
      const url = `${location.origin}/r/${slug}`;
      setIssued({ slug, url });
      const png = await QRCode.toDataURL(url, { width: 480, margin: 1 });
      setQr(png);
      setStep("issued");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "処理に失敗しました。");
      setStep("input");
    }
  }

  function reset() {
    setStoreName(""); setPlaceId(""); setDescText(""); setAnswers({});
    setIssued(null); setQr(""); setStep("input"); window.scrollTo(0, 0);
  }

  async function copyUrl() {
    if (!issued) return;
    try { await navigator.clipboard.writeText(issued.url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* noop */ }
  }

  // ---- 発行中 ----
  if (step === "issuing") {
    return (
      <div className="in-wrap">
        <div className="in-issue">
          <div className="in-orb"><div className="core"><Icon name="spark" size={26} /></div></div>
          <p className="in-prog-t">{DIAGNOSIS_ENABLED ? "診断を発行しています" : "発行しています"}</p>
          <p className="in-prog-s">お客様用のページとQRコードを生成中…</p>
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
          <p className="in-done-h">{editing ? "更新しました" : (DIAGNOSIS_ENABLED ? "診断を発行しました" : "発行しました")}</p>
          <p className="in-done-s">{storeName}{DIAGNOSIS_ENABLED ? `｜${scored.total}点・${scored.rank}ランク` : ""}</p>
          {qr && <div className="in-qr"><img src={qr} alt="診断結果QR" /></div>}
          <div className="in-urlpill">{issued.url}</div>
          <div className="in-share">
            <a className="btn" href={`/r/${issued.slug}`} target="_blank" rel="noopener noreferrer">結果を確認</a>
            <button className="btn ghost" onClick={copyUrl} aria-label="URLをコピー"><Icon name={copied ? "check" : "link"} size={18} /></button>
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
      <h1 className="in-h">
        {editing
          ? (DIAGNOSIS_ENABLED ? "診断を編集・追加" : "店舗情報を編集")
          : (DIAGNOSIS_ENABLED ? "新規診断を発行" : "クチコミPOPを発行")}
      </h1>
      <p className="in-hsub">
        {DIAGNOSIS_ENABLED
          ? (editing
              ? "訪問後の内容で更新できます。Place IDだけ先に発行した店舗は、ここで診断を追記してください。"
              : "お客様のGoogleビジネスプロフィールの状況を入力してください。診断かPlace IDのどちらかがあれば発行できます。")
          : "店舗名とGoogle Place IDを入力すると、クチコミ収集POP（日本語/英語）を発行できます。"}
      </p>

      <div className="in-field">
        <label>店舗名 <span style={{ color: "var(--g-red)" }}>*</span></label>
        <input className="in-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="例：○○○○店" />
      </div>
      <div className="in-field">
        <label>Google Place ID{DIAGNOSIS_ENABLED ? "（任意／クチコミPOP用）" : <span style={{ color: "var(--g-red)" }}> *</span>}</label>
        <input className="in-input" value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="例：ChIJ... （Place ID Finderで取得）" />
        <p className="in-fieldnote">このPlace IDから、店舗のクチコミ収集POP（日本語/英語）をPDFで発行できます。後からダッシュボードでも登録できます。</p>
        <PlaceIdHelp />
      </div>

      {DIAGNOSIS_ENABLED && DIAG_CATEGORIES.map((cat) => {
        const s = scored.categories.find((c) => c.key === cat.key)!;
        return (
          <div className="in-cat" key={cat.key}>
            <div className="in-cat-head">
              <div className="in-cat-ic"><Icon name={CAT_ICON[cat.key]} size={17} /></div>
              <div className="in-cat-name">{cat.name}</div>
              <div className="in-cat-pts">{s.empty ? "未入力" : `${s.points}/${s.max}`}</div>
            </div>
            {cat.items.map((item) => (
              <ItemInput
                key={item.key}
                item={item}
                value={answers[cat.key]?.[item.key]}
                descText={descText}
                onToggle={(v) => setVal(cat.key, item.key, v)}
                onStage={(v) => setVal(cat.key, item.key, v)}
                onNumeric={(raw) => setNumeric(cat.key, item.key, raw)}
                onDesc={setDescription}
              />
            ))}
          </div>
        );
      })}

      {error && <p style={{ color: "#a23b30", fontSize: 12.5, fontWeight: 700, textAlign: "center", margin: "10px 0" }}>{error}</p>}

      <div className="in-cta">
        <button className="btn" onClick={issue} disabled={!canIssue}>
          <Icon name="spark" size={18} />
          {editing ? "更新する" : "発行する"}
          {DIAGNOSIS_ENABLED ? (answeredCount > 0 ? `（現在 ${scored.total}点・${scored.rank}）` : "（Place IDのみ）") : ""}
        </button>
        <p className="note">
          {DIAGNOSIS_ENABLED
            ? (answeredCount > 0
                ? "発行後にお客様へURL/QRで共有できます。クチコミPOPはPlace IDを設定すると発行できます。"
                : "診断を入力せずPlace IDだけでも発行できます（クチコミPOP先行発行）。診断は後から追加できます。")
            : "発行後、ダッシュボードから店舗のクチコミ収集POP（日本語/英語）をPDFで発行できます。"}
        </p>
      </div>
    </div>
  );
}

function ItemInput({
  item, value, descText, onToggle, onStage, onNumeric, onDesc,
}: {
  item: DiagItem;
  value: number | null | undefined;
  descText: string;
  onToggle: (v: number) => void;
  onStage: (v: number) => void;
  onNumeric: (raw: string) => void;
  onDesc: (t: string) => void;
}) {
  if (item.input === "paste") {
    const len = descText.trim().length;
    const stage = stageOf(item, len);
    return (
      <div className="in-sub">
        <div className="in-sub-lbl">{item.label}</div>
        <textarea
          className="in-input"
          value={descText}
          onChange={(e) => onDesc(e.target.value)}
          placeholder="GBPの店舗説明文を貼り付け（キーワードを含む充実した説明ほど高評価）"
          maxLength={DESC_MAX + 200}
        />
        <div className="in-analysis">
          <span className={`in-tagm ${len >= 500 ? "ok" : len > 0 ? "warn" : ""}`}>{len}字 / 目安{DESC_MAX}字</span>
          {stage != null && <span className="in-tagm score">{item.stages?.[stage - 1]?.label}（{Math.round((ratioOf(item, len) ?? 0) * 100)}%）</span>}
        </div>
      </div>
    );
  }

  if (item.type === "toggle") {
    return (
      <div className="in-sub">
        <div className="in-sub-lbl">{item.label}</div>
        <div className="in-chips">
          <button type="button" className={`in-chip ${value === 1 ? "on" : ""}`} onClick={() => onToggle(1)}>{item.toggle?.on ?? "あり"}</button>
          <button type="button" className={`in-chip ${value === 0 ? "on off" : ""}`} onClick={() => onToggle(0)}>{item.toggle?.off ?? "なし"}</button>
        </div>
      </div>
    );
  }

  if (item.type === "scale") {
    return (
      <div className="in-sub">
        <div className="in-sub-lbl">{item.label}</div>
        <div className="in-chips">
          {item.stages?.map((st, i) => (
            <button key={i} type="button" className={`in-chip ${value === i + 1 ? "on" : ""}`} onClick={() => onStage(i + 1)}>{st.label}</button>
          ))}
        </div>
      </div>
    );
  }

  // numeric
  const stage = typeof value === "number" ? stageOf(item, value) : null;
  return (
    <div className="in-sub">
      <div className="in-sub-lbl">{item.label}</div>
      <div className="in-numrow">
        <input
          className="in-input in-num"
          type="number"
          inputMode="decimal"
          min={0}
          step={item.unit === "★" ? 0.1 : 1}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onNumeric(e.target.value)}
          placeholder="数値を入力"
        />
        <span className="in-unit">{item.unit}</span>
        {stage != null && (
          <span className="in-tagm score">{item.stages?.[stage - 1]?.label}（{Math.round((ratioOf(item, value) ?? 0) * 100)}%）</span>
        )}
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
