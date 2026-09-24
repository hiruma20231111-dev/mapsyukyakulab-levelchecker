"use client";
// 営業ダッシュボード：今月の発行数・トライアル実施率・目標進捗＋診断一覧（ステータス変更・共有・PDF）。
import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "@/design/icons";
import type { Lead, LeadStatus } from "@/lib/store/types";
import { STATUS_LABEL, STATUS_ORDER, STATUS_COLOR } from "@/lib/store/types";
import { countIssuedInMonth, trialRate } from "@/lib/domain/metrics";

export function SalesDashboard({
  salesName,
  initialLeads,
  monthGoal,
  ym,
}: {
  salesName: string;
  initialLeads: Lead[];
  monthGoal: number;
  ym: string;
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [qr, setQr] = useState<{ url: string; png: string; name: string } | null>(null);
  const [busy, setBusy] = useState<string>("");

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
          <div className="sd-card-lab">今月の診断発行数</div>
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

      <a className="sd-new" href="/new">
        <Icon name="spark" size={18} />新規診断を発行する
      </a>

      <div className="sd-list-h">診断一覧（{leads.length}件）</div>
      {leads.length === 0 ? (
        <div className="sd-empty">まだ診断がありません。<br />「新規診断を発行する」から始めましょう。</div>
      ) : (
        <div className="sd-list">
          {leads.map((l) => (
            <div className="sd-lead" key={l.id}>
              <div className="sd-lead-top">
                <div className="sd-lead-name">{l.storeName}</div>
                <span className="sd-score" title="発行時のスコア">{l.total}<small>点</small></span>
              </div>
              <div className="sd-lead-meta">
                <span className={`sd-rank r-${l.rank}`}>{l.rank}ランク</span>
                <span className="sd-date">{fmtDate(l.createdAt)} 発行</span>
              </div>

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
                <a className="sd-act" href={`/r/${l.slug}`} target="_blank" rel="noopener noreferrer">
                  <Icon name="search" size={14} />結果
                </a>
                <button className="sd-act" onClick={() => showQr(l.slug, l.storeName)} type="button">
                  <Icon name="link" size={14} />QR / URL
                </button>
                <a className="sd-act" href={`/r/${l.slug}/print`} target="_blank" rel="noopener noreferrer">
                  <Icon name="book" size={14} />PDF
                </a>
                <button className="sd-act sd-del" onClick={() => remove(l.id, l.storeName)} type="button">
                  <Icon name="slash" size={14} />削除
                </button>
              </div>
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
    </div>
  );
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
