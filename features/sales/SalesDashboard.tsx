"use client";
// 営業ダッシュボード：今月の発行数・トライアル実施率・目標進捗＋診断一覧（ステータス変更・共有・PDF）。
import { useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "@/design/icons";
import { PlaceIdHelp } from "@/features/common/PlaceIdHelp";
import { mapsPlaceUrl } from "@/lib/domain/review";
import { DIAGNOSIS_ENABLED } from "@/lib/config";
import type { Lead, LeadStatus } from "@/lib/store/types";
import { STATUS_LABEL, STATUS_ORDER, STATUS_COLOR } from "@/lib/store/types";
import { countIssuedInMonth, trialRate } from "@/lib/domain/metrics";

/** 訪問後に営業が回答するGoogleフォーム。 */
const VISIT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSffZz5ZNT6XBM65T9tjJIM5b3ki5x7U56HHSgYPPgqiGCi5bg/viewform";

/** 診断（回答）が1つでも入っているか。Place IDのみ先行発行した店舗は false。 */
function hasDiagnosis(l: Lead): boolean {
  const a = l.answers || {};
  return Object.values(a).some((c) => c && Object.values(c).some((v) => typeof v === "number"));
}

export function SalesDashboard({
  salesName,
  initialLeads,
  monthGoal,
  ym,
  initialLineUrl,
}: {
  salesName: string;
  initialLeads: Lead[];
  monthGoal: number;
  ym: string;
  initialLineUrl: string;
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [qr, setQr] = useState<{ url: string; png: string; name: string } | null>(null);
  const [busy, setBusy] = useState<string>("");
  const [lineUrl, setLineUrl] = useState(initialLineUrl);
  const [lineSaved, setLineSaved] = useState("");
  const [popFor, setPopFor] = useState<string>("");
  const [pidDraft, setPidDraft] = useState<Record<string, string>>({});
  const [pidMsg, setPidMsg] = useState<string>("");
  const [copiedAddr, setCopiedAddr] = useState<string>("");

  async function copyAddr(l: Lead) {
    if (!l.address) return;
    try {
      await navigator.clipboard.writeText(l.address);
      setCopiedAddr(l.id);
      setTimeout(() => setCopiedAddr(""), 1600);
    } catch { /* noop */ }
  }
  // iframeモーダル（結果確認 / 診断PDF / クチコミPOP をタブを増やさずその場で表示）
  const [frame, setFrame] = useState<{ title: string; src: string; kind: "result" | "print" | "pop" } | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  async function savePlaceId(id: string) {
    const value = (pidDraft[id] ?? "").trim();
    setBusy(id);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "保存に失敗しました。");
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, placeId: data.lead?.placeId } : l)));
      setPidMsg(id);
      setTimeout(() => setPidMsg(""), 1600);
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setBusy("");
    }
  }

  async function saveLine() {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineUrl }),
    });
    if (res.ok) { setLineSaved("保存しました"); setTimeout(() => setLineSaved(""), 1800); }
  }

  const monthCount = useMemo(() => countIssuedInMonth(leads, ym), [leads, ym]);
  const rate = useMemo(() => trialRate(leads), [leads]);
  const goalPct = monthGoal > 0 ? Math.min(100, Math.round((monthCount / monthGoal) * 100)) : 0;

  async function changeStatus(id: string, status: LeadStatus) {
    setBusy(id);
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLeads(prev); // 失敗したら戻す
    } finally {
      setBusy("");
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`「${name}」の診断を削除します。よろしいですか？`)) return;
    const prev = leads;
    setLeads((ls) => ls.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setLeads(prev);
    }
  }

  async function showQr(slug: string, name: string) {
    const url = `${location.origin}/r/${slug}`;
    const png = await QRCode.toDataURL(url, { width: 520, margin: 1 });
    setQr({ url, png, name });
  }

  return (
    <div className="sd">
      <div className="sd-appbar">
        <div className="mk"><i className="b" /><i className="y" /><i className="g" /><i className="r" /></div>
        <div className="sd-brand">レベルチェッカー</div>
        <div className="sd-role">{salesName}</div>
        <a className="sd-logout" href="/logout">ログアウト</a>
      </div>

      <div className="sd-metrics">
        <div className="sd-card sd-card-main">
          <div className="sd-card-lab">{DIAGNOSIS_ENABLED ? "今月の診断発行数" : "今月の発行数"}</div>
          <div className="sd-card-num">{monthCount}<small>件 / 目標 {monthGoal}件</small></div>
          <div className="sd-goal"><span style={{ width: `${goalPct}%` }} /></div>
          <div className="sd-goal-pct">{goalPct}% 達成</div>
        </div>
        <div className="sd-card">
          <div className="sd-card-lab">トライアル実施率</div>
          <div className="sd-card-num sd-teal">{rate}<small>%</small></div>
          <div className="sd-card-sub">全{leads.length}件のうち導入＋本契約</div>
        </div>
      </div>

      <div className="sd-line">
        <div className="sd-line-lab"><Icon name="chat" size={14} />あなたのLINE友だち追加URL</div>
        <div className="sd-line-row">
          <input className="sd-line-in" value={lineUrl} onChange={(e) => setLineUrl(e.target.value)} placeholder="https://lin.ee/xxxxxxx" />
          <button className="sd-line-btn" onClick={saveLine}>保存</button>
        </div>
        <div className="sd-line-note">
          {lineSaved ? <span className="sd-line-ok">✓ {lineSaved}</span> : (DIAGNOSIS_ENABLED ? "発行した診断結果に、このLINEの「無料トライアル申込」ボタンとPDFのQRが表示されます。" : "発行したお客様ページに、このLINEの「無料トライアル申込」ボタンが表示されます。")}
        </div>
      </div>

      <a className="sd-new" href="/new">
        <Icon name="spark" size={18} />{DIAGNOSIS_ENABLED ? "新規診断を発行する" : "新規発行（クチコミPOP）"}
      </a>

      <div className="sd-list-h">{DIAGNOSIS_ENABLED ? "診断一覧" : "発行一覧"}（{leads.length}件）</div>
      {leads.length === 0 ? (
        <div className="sd-empty">まだ発行がありません。<br />「{DIAGNOSIS_ENABLED ? "新規診断を発行する" : "新規発行"}」から始めましょう。</div>
      ) : (
        <div className="sd-list">
          {leads.map((l) => (
            <div className="sd-lead" key={l.id}>
              <div className="sd-lead-top">
                <div className="sd-lead-name">
                  {l.storeName}
                  <a className="sd-visit" href={VISIT_FORM_URL} target="_blank" rel="noopener noreferrer">訪問後に回答</a>
                </div>
                {DIAGNOSIS_ENABLED && (hasDiagnosis(l)
                  ? <span className="sd-score" title="発行時のスコア">{l.total}<small>点</small></span>
                  : <span className="sd-undiag">未診断</span>)}
              </div>
              <div className="sd-lead-meta">
                {DIAGNOSIS_ENABLED && (hasDiagnosis(l)
                  ? <span className={`sd-rank r-${l.rank}`}>{l.rank}ランク</span>
                  : <span className="sd-undiag-chip">Place IDのみ発行</span>)}
                <span className="sd-date">{fmtDate(l.createdAt)} 発行</span>
              </div>

              {(l.placeId || l.address) && (
                <div className="sd-info2">
                  {l.placeId && (
                    <a className="sd-chipbtn" href={mapsPlaceUrl(l.placeId, l.address || l.storeName)} target="_blank" rel="noopener noreferrer">
                      <Icon name="pin" size={13} />Googleマップ
                    </a>
                  )}
                  {l.address && (
                    <button className="sd-chipbtn" type="button" onClick={() => copyAddr(l)}>
                      <Icon name={copiedAddr === l.id ? "check" : "link"} size={13} />
                      {copiedAddr === l.id ? "コピーしました" : "住所をコピー"}
                    </button>
                  )}
                  {l.address && <span className="sd-addr" title={l.address}>{l.address}</span>}
                </div>
              )}

              <div className="sd-status-row">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    className={`sd-st ${l.status === s ? "on" : ""}`}
                    style={l.status === s ? { background: STATUS_COLOR[s], borderColor: STATUS_COLOR[s], color: "#fff" } : undefined}
                    onClick={() => changeStatus(l.id, s)}
                    disabled={busy === l.id}
                    type="button"
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              <div className="sd-actions">
                <button className="sd-act" onClick={() => setFrame({ title: l.storeName, src: `/r/${l.slug}`, kind: "result" })} type="button">
                  <Icon name="search" size={15} />{DIAGNOSIS_ENABLED ? "結果" : "お客様ページ"}
                </button>
                <button className="sd-act" onClick={() => showQr(l.slug, l.storeName)} type="button">
                  <Icon name="link" size={15} />QR / URL
                </button>
                {DIAGNOSIS_ENABLED && (
                  <button className="sd-act" onClick={() => setFrame({ title: `${l.storeName}｜診断PDF`, src: `/r/${l.slug}/print?embed=1`, kind: "print" })} type="button">
                    <Icon name="book" size={15} />PDF
                  </button>
                )}
                <button
                  className={`sd-act ${l.placeId ? "sd-act-on" : ""}`}
                  onClick={() => {
                    setPopFor(popFor === l.id ? "" : l.id);
                    setPidDraft((d) => (l.id in d ? d : { ...d, [l.id]: l.placeId ?? "" }));
                  }}
                  type="button"
                >
                  <Icon name="chat" size={15} />クチコミPOP
                </button>
              </div>
              <div className="sd-actions2">
                <a className="sd-act sd-act-sub" href={`/new?edit=${l.id}`}>
                  <Icon name="list" size={13} />{DIAGNOSIS_ENABLED ? (hasDiagnosis(l) ? "編集" : "診断追加") : "編集"}
                </a>
                <button className="sd-act sd-act-sub sd-del" onClick={() => remove(l.id, l.storeName)} type="button">
                  <Icon name="slash" size={13} />削除
                </button>
              </div>

              {popFor === l.id && (
                <div className="sd-pop">
                  <div className="sd-pop-lab">Google Place ID（クチコミPOPのQRに使用）</div>
                  <div className="sd-pop-row">
                    <input
                      className="sd-line-in"
                      value={pidDraft[l.id] ?? ""}
                      onChange={(e) => setPidDraft((d) => ({ ...d, [l.id]: e.target.value }))}
                      placeholder="ChIJ...（Place ID Finderで取得）"
                    />
                    <button className="sd-line-btn" onClick={() => savePlaceId(l.id)} disabled={busy === l.id}>保存</button>
                  </div>
                  <PlaceIdHelp />
                  <div className="sd-pop-note">
                    {pidMsg === l.id
                      ? <span className="sd-line-ok">✓ 保存しました</span>
                      : (l.placeId ? "設定済み。下のボタンでPOP（日英）をPDF発行できます。結果画面にも表示されます。" : "Place IDを設定すると、クチコミ収集POP（日本語/英語）をPDFで発行できます。")}
                  </div>
                  {l.placeId && (
                    <div className="sd-pop-dls">
                      <button className="sd-act" onClick={() => setFrame({ title: `${l.storeName}｜クチコミPOP 日本語`, src: `/r/${l.slug}/pop/ja/preview`, kind: "pop" })} type="button"><Icon name="book" size={14} />POP 日本語</button>
                      <button className="sd-act" onClick={() => setFrame({ title: `${l.storeName}｜クチコミPOP English`, src: `/r/${l.slug}/pop/en/preview`, kind: "pop" })} type="button"><Icon name="book" size={14} />POP English</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {qr && (
        <div className="sd-modal" onClick={() => setQr(null)}>
          <div className="sd-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-h">{qr.name}</div>
            <img className="sd-qr" src={qr.png} alt="診断QR" />
            <div className="sd-urlpill">{qr.url}</div>
            <div className="sd-modal-btns">
              <button className="btn" onClick={() => { navigator.clipboard?.writeText(qr.url); }}>URLをコピー</button>
              <button className="btn ghost" onClick={() => setQr(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {frame && (
        <div className="sd-fmodal" onClick={() => setFrame(null)}>
          <div className="sd-fmodal-in" onClick={(e) => e.stopPropagation()}>
            <div className="sd-fmodal-head">
              <span className="sd-fmodal-title">{frame.title}</span>
              <button className="sd-fmodal-x" onClick={() => setFrame(null)} aria-label="閉じる" type="button">✕</button>
            </div>
            <iframe ref={frameRef} className="sd-fmodal-frame" src={frame.src} title={frame.title} />
            <div className="sd-fmodal-foot">
              {frame.kind === "print" && (
                <button className="btn" type="button" onClick={() => frameRef.current?.contentWindow?.print()}>
                  <Icon name="book" size={16} />印刷 / PDFで保存
                </button>
              )}
              <a className="btn ghost" href={frame.src.replace("?embed=1", "")} target="_blank" rel="noopener noreferrer">新しいタブで開く</a>
              <button className="btn ghost" type="button" onClick={() => setFrame(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
