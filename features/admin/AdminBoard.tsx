"use client";
// 管理者ボード：全体/営業別の進捗を可視化し、営業アカウント発行・月間目標・設定を管理する。
import { useMemo, useState } from "react";
import { Icon } from "@/design/icons";
import type { Lead, AppSettings } from "@/lib/store/types";
import { STATUS_LABEL, STATUS_ORDER, STATUS_COLOR } from "@/lib/store/types";
import {
  countIssuedInMonth,
  trialRate,
  wonRate,
  orderedBreakdown,
} from "@/lib/domain/metrics";
import { Donut, BarChart, type Segment, type BarRow } from "./Charts";

interface SalesWithLink {
  id: string;
  name: string;
  accountLink: string;
  active: boolean;
}

export function AdminBoard({
  initialSales,
  leads,
  settings: initialSettings,
  initialGoals,
  ym,
  origin,
}: {
  initialSales: SalesWithLink[];
  leads: Lead[];
  settings: AppSettings;
  initialGoals: Record<string, number>;
  ym: string;
  origin: string;
}) {
  const [sales, setSales] = useState<SalesWithLink[]>(initialSales);
  const [goals, setGoals] = useState<Record<string, number>>(initialGoals);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [newName, setNewName] = useState("");
  const [newLink, setNewLink] = useState<{ name: string; link: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const bySales = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const l of leads) {
      const arr = m.get(l.salesId) || [];
      arr.push(l);
      m.set(l.salesId, arr);
    }
    return m;
  }, [leads]);

  // 全体サマリ
  const total = leads.length;
  const monthTotal = countIssuedInMonth(leads, ym);
  const overallTrial = trialRate(leads);
  const overallWon = wonRate(leads);

  const donutSegments: Segment[] = orderedBreakdown(leads)
    .filter((b) => b.count > 0)
    .map((b) => ({ label: STATUS_LABEL[b.status], value: b.count, color: STATUS_COLOR[b.status] }));

  const barRows: BarRow[] = sales.map((s) => {
    const ls = bySales.get(s.id) || [];
    const bd = orderedBreakdown(ls);
    return {
      label: s.name,
      segments: bd.map((b) => ({ value: b.count, color: STATUS_COLOR[b.status], label: STATUS_LABEL[b.status] })),
    };
  });

  async function createSales() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok && data?.sales) {
      const s: SalesWithLink = { id: data.sales.id, name: data.sales.name, accountLink: data.sales.accountLink, active: true };
      setSales((prev) => [...prev, s]);
      setGoals((prev) => ({ ...prev, [s.id]: settings.defaultMonthlyGoal }));
      setNewName("");
      setNewLink({ name: s.name, link: origin + s.accountLink });
    }
  }

  async function saveGoal(salesId: string, goal: number) {
    setGoals((prev) => ({ ...prev, [salesId]: goal }));
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesId, ym, goal }),
    }).catch(() => {});
  }

  async function saveSettings() {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setSavedMsg("保存しました");
      setTimeout(() => setSavedMsg(""), 1800);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1600);
  }

  async function removeSales(id: string, name: string) {
    if (!confirm(`営業「${name}」を削除します。アカウントリンクは無効になります。よろしいですか？`)) return;
    setSales((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/sales?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="ad">
      <div className="ad-appbar">
        <div className="mk"><i className="b" /><i className="y" /><i className="g" /><i className="r" /></div>
        <div className="ad-brand">レベルチェッカー <span>管理ボード</span></div>
        <a className="ad-logout" href="/logout">ログアウト</a>
      </div>

      {/* 全体サマリ */}
      <div className="ad-kpis">
        <div className="ad-kpi"><div className="l">累計発行数</div><div className="n">{total}</div></div>
        <div className="ad-kpi"><div className="l">今月の発行数</div><div className="n">{monthTotal}</div></div>
        <div className="ad-kpi"><div className="l">トライアル実施率</div><div className="n tl">{overallTrial}<small>%</small></div></div>
        <div className="ad-kpi"><div className="l">本契約率</div><div className="n gr">{overallWon}<small>%</small></div></div>
      </div>

      {/* グラフ */}
      <div className="ad-charts">
        <div className="ad-panel">
          <div className="ad-panel-h">ステータス構成（全体）</div>
          {total > 0 ? <Donut segments={donutSegments} /> : <div className="ad-empty">データがありません</div>}
        </div>
        <div className="ad-panel">
          <div className="ad-panel-h">営業別の発行・進捗</div>
          {sales.length > 0 ? <BarChart rows={barRows} /> : <div className="ad-empty">営業がいません</div>}
          <div className="ad-barlegend">
            {STATUS_ORDER.map((s) => (
              <span className="ad-bl" key={s}><i style={{ background: STATUS_COLOR[s] }} />{STATUS_LABEL[s]}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 営業別テーブル */}
      <div className="ad-panel">
        <div className="ad-panel-h">営業メンバー（{sales.length}名）</div>
        <div className="ad-table">
          <div className="ad-tr ad-th">
            <span>営業</span><span>今月/目標</span><span>累計</span><span>トライアル率</span><span>本契約率</span><span>操作</span>
          </div>
          {sales.map((s) => {
            const ls = bySales.get(s.id) || [];
            const mc = countIssuedInMonth(ls, ym);
            return (
              <div className="ad-tr" key={s.id}>
                <span className="ad-td-name">{s.name}</span>
                <span className="ad-td-goal">
                  <b>{mc}</b> /
                  <input
                    className="ad-goal-in"
                    type="number"
                    min={0}
                    value={goals[s.id] ?? settings.defaultMonthlyGoal}
                    onChange={(e) => setGoals((p) => ({ ...p, [s.id]: Number(e.target.value) }))}
                    onBlur={(e) => saveGoal(s.id, Number(e.target.value))}
                  />
                </span>
                <span>{ls.length}</span>
                <span>{trialRate(ls)}%</span>
                <span className="ad-td-won">{wonRate(ls)}%</span>
                <span className="ad-td-ops">
                  <button className="ad-mini" onClick={() => copy(origin + s.accountLink, "l" + s.id)} title="アカウントリンクをコピー">
                    {copied === "l" + s.id ? "コピー済" : "リンク"}
                  </button>
                  <button className="ad-mini ad-del" onClick={() => removeSales(s.id, s.name)} title="削除">×</button>
                </span>
              </div>
            );
          })}
          {sales.length === 0 && <div className="ad-empty">まだ営業がいません。下から追加してください。</div>}
        </div>

        {/* 営業アカウント発行 */}
        <div className="ad-add">
          <input className="ad-add-in" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="営業メンバーの名前" />
          <button className="ad-add-btn" onClick={createSales}><Icon name="spark" size={15} />アカウントを発行</button>
        </div>
        {newLink && (
          <div className="ad-newlink">
            <div className="ad-newlink-h">「{newLink.name}」のアカウントリンクを発行しました</div>
            <div className="ad-newlink-url">{newLink.link}</div>
            <button className="ad-mini" onClick={() => copy(newLink.link, "new")}>{copied === "new" ? "コピー済" : "リンクをコピー"}</button>
            <p className="ad-newlink-note">このリンクを本人に共有してください。開くとその営業としてログインします。</p>
          </div>
        )}
      </div>

      {/* 設定 */}
      <div className="ad-panel">
        <div className="ad-panel-h">設定</div>
        <div className="ad-field">
          <label>LINE 友だち追加URL（診断結果の無料トライアルCTAに使用）</label>
          <input className="ad-add-in" value={settings.lineAddUrl} onChange={(e) => setSettings((s) => ({ ...s, lineAddUrl: e.target.value }))} placeholder="https://lin.ee/xxxxxxx" />
        </div>
        <div className="ad-field">
          <label>デフォルトの月間発行目標（営業別に未設定のとき適用）</label>
          <input className="ad-add-in" type="number" min={0} value={settings.defaultMonthlyGoal} onChange={(e) => setSettings((s) => ({ ...s, defaultMonthlyGoal: Number(e.target.value) }))} />
        </div>
        <button className="ad-add-btn" onClick={saveSettings}>設定を保存{savedMsg && <span style={{ marginLeft: 6 }}>✓ {savedMsg}</span>}</button>
      </div>
    </div>
  );
}
