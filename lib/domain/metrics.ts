// 集計ロジック（純関数）。営業ダッシュボード・管理ボードで共通利用。
import type { Lead, LeadStatus } from "@/lib/store/types";
import { STATUS_ORDER } from "@/lib/store/types";

export function monthKeyOf(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** その年月（yyyy-mm）に発行されたリード数。 */
export function countIssuedInMonth(leads: Lead[], ym: string): number {
  return leads.filter((l) => monthKeyOf(new Date(l.createdAt)) === ym).length;
}

/** ステータス別の件数。 */
export function statusBreakdown(leads: Lead[]): Record<LeadStatus, number> {
  const out = { pre: 0, considering: 0, trial: 0, won: 0, lost: 0 } as Record<LeadStatus, number>;
  for (const l of leads) out[l.status] = (out[l.status] || 0) + 1;
  return out;
}

/** トライアル実施率 =（トライアル導入＋本契約）÷ 発行数。0〜100の整数（%）。 */
export function trialRate(leads: Lead[]): number {
  if (leads.length === 0) return 0;
  const n = leads.filter((l) => l.status === "trial" || l.status === "won").length;
  return Math.round((n / leads.length) * 100);
}

/** 本契約率（CVR）= 本契約 ÷ 発行数。0〜100の整数（%）。 */
export function wonRate(leads: Lead[]): number {
  if (leads.length === 0) return 0;
  const n = leads.filter((l) => l.status === "won").length;
  return Math.round((n / leads.length) * 100);
}

/** 各ステータスの合計（順序付き）。グラフ用。 */
export function orderedBreakdown(leads: Lead[]): { status: LeadStatus; count: number }[] {
  const b = statusBreakdown(leads);
  return STATUS_ORDER.map((s) => ({ status: s, count: b[s] }));
}
