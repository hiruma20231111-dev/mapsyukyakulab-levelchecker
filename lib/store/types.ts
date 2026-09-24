// レベルチェッカーのドメイン型。
import type { V3Answers, Rank } from "@/lib/domain/score";
import type { CategoryKey } from "@/content/diagnosis-v3";

/** リード（診断を発行した店舗＝追客対象）のステータス。発行直後は「訪問前」。 */
export type LeadStatus = "pre" | "considering" | "trial" | "won" | "lost";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  pre: "訪問前",
  considering: "検討",
  trial: "トライアル導入",
  won: "本契約",
  lost: "失注",
};

/** ステータス選択の並び順（UI用）。 */
export const STATUS_ORDER: LeadStatus[] = ["pre", "considering", "trial", "won", "lost"];

/** ステータスごとの色トークン（design/tokens に対応）。 */
export const STATUS_COLOR: Record<LeadStatus, string> = {
  pre: "#8a97a3",       // グレー：未着手
  considering: "#4285f4", // 青：検討中
  trial: "#f4b400",     // 黄：トライアル
  won: "#0f9d58",       // 緑：本契約
  lost: "#e0574a",      // 赤：失注
};

/** 営業メンバー。アカウントリンク（token）でログインする。 */
export interface SalesMember {
  id: string;
  name: string;
  /** アカウントリンクの秘密トークン。/s/<token> でログイン。 */
  token: string;
  role: "sales";
  active: boolean;
  createdAt: number;
}

export interface StatusChange {
  status: LeadStatus;
  ts: number;
}

/** リード（1店舗＝1診断＝1追客案件）。 */
export interface Lead {
  id: string;
  /** オーナー様向け公開結果ページの slug（/r/<slug>）。 */
  slug: string;
  /** 発行した営業メンバーの id。 */
  salesId: string;
  storeName: string;
  answers: V3Answers;
  query?: string;
  weights?: Partial<Record<CategoryKey, number>>;
  descText?: string;
  keywords?: string;
  /** 発行時点のスコア・ランクのスナップショット（一覧・集計用）。 */
  total: number;
  rank: Rank;
  status: LeadStatus;
  statusHistory: StatusChange[];
  createdAt: number;
  updatedAt: number;
}

/** アプリ全体の設定（管理者が編集）。 */
export interface AppSettings {
  /** 診断結果に表示する LINE 友だち追加URL。 */
  lineAddUrl: string;
  /** 全体の月間発行目標（営業別未設定時のデフォルト）。 */
  defaultMonthlyGoal: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  lineAddUrl: "",
  defaultMonthlyGoal: 20,
};

/** 公開結果ページの閲覧統計。 */
export interface LeadStats {
  views: number;
  lastTs: number;
}
