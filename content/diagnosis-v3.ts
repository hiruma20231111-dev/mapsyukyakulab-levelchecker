// 診断項目定義（2026-09-29 簡素化版・全11項目）。純データ・Reactを import しない。
// 評価タイプは3種：toggle（あり/なし）/ scale（2〜5択のラベル選択）/ numeric（数値→段階に自動変換）。
// 割合換算は「段階の位置」に比例（0 … 1）。例：3択なら 0% / 50% / 100%、5択なら 0/25/50/75/100%。

export type CategoryKey = "basic" | "content" | "photo" | "review" | "post";
export type EvalType = "toggle" | "scale" | "numeric";

/** 優先度算出の3軸影響度（各0〜3）。①順位 ②選ばれる力(CVR) ③信頼・整合性。 */
export interface AxisImpact {
  readonly rank: number;
  readonly cvr: number;
  readonly trust: number;
}

/** 段階の定義。numeric では min（この段階に入る下限・含む）で判定。scale は表示ラベルのみ。 */
export interface StageDef {
  readonly label: string;
  readonly min?: number;
}

export interface DiagItem {
  readonly key: string;
  readonly label: string;
  readonly type: EvalType;
  readonly criteria: string;
  /** カテゴリ内の配点（この項目の持ち点）。 */
  readonly weight: number;
  readonly impact: AxisImpact;
  /** toggle の表示ラベル。 */
  readonly toggle?: { readonly on: string; readonly off: string };
  /** scale / numeric の段階定義（悪い→良いの順・2〜5個）。 */
  readonly stages?: readonly StageDef[];
  /** numeric の単位（枚 / 件 / ★ など）。 */
  readonly unit?: string;
  /** description のみ：貼り付けテキストの文字数を numeric 値として扱う。 */
  readonly input?: "paste";
}

export interface DiagCategory {
  readonly key: CategoryKey;
  readonly name: string;
  readonly max: number;
  readonly items: readonly DiagItem[];
}

const YN = (on = "あり", off = "なし") => ({ on, off });

export const DIAG_CATEGORIES: readonly DiagCategory[] = [
  {
    key: "basic",
    name: "基本情報",
    max: 30,
    items: [
      { key: "owner", label: "オーナー登録", type: "toggle", criteria: "オーナー登録あり", weight: 10, impact: { rank: 3, cvr: 1, trust: 3 }, toggle: YN("登録あり", "未登録") },
      { key: "info", label: "基本情報の整備度", type: "scale", weight: 15, impact: { rank: 2, cvr: 3, trust: 3 },
        criteria: "電話・住所・営業時間が正確に整っているか",
        stages: [{ label: "未整備" }, { label: "一部整備" }, { label: "しっかり整備" }] },
      { key: "website", label: "ウェブサイト", type: "toggle", criteria: "URL登録あり", weight: 5, impact: { rank: 2, cvr: 2, trust: 1 }, toggle: YN() },
    ],
  },
  {
    key: "content",
    name: "コンテンツ",
    max: 20,
    items: [
      { key: "description", label: "店舗の説明文（文字数）", type: "numeric", input: "paste", unit: "字", weight: 15, impact: { rank: 3, cvr: 2, trust: 1 },
        criteria: "上限750字に対する充実度（未設定＝0点）",
        stages: [
          { label: "未設定", min: 0 },
          { label: "1〜249字", min: 1 },
          { label: "250〜499字", min: 250 },
          { label: "500〜649字（基準）", min: 500 },
          { label: "650字以上", min: 650 },
        ] },
      { key: "category", label: "カテゴリ・属性の設定", type: "scale", weight: 5, impact: { rank: 3, cvr: 1, trust: 1 },
        criteria: "メイン/サブカテゴリ・店舗の特徴（属性）の設定状況",
        stages: [{ label: "未設定" }, { label: "一部設定" }, { label: "しっかり設定" }] },
    ],
  },
  {
    key: "photo",
    name: "写真",
    max: 15,
    items: [
      { key: "count", label: "写真の枚数（掲載中の合計）", type: "numeric", unit: "枚", weight: 8, impact: { rank: 1, cvr: 3, trust: 1 },
        criteria: "掲載中の写真の合計枚数",
        stages: [
          { label: "0枚", min: 0 },
          { label: "1〜9枚", min: 1 },
          { label: "10〜29枚", min: 10 },
          { label: "30〜69枚（基準）", min: 30 },
          { label: "70枚以上", min: 70 },
        ] },
      { key: "fresh", label: "写真の鮮度（最新の投稿）", type: "scale", weight: 7, impact: { rank: 1, cvr: 2, trust: 1 },
        criteria: "最後に写真を投稿した時期",
        stages: [
          { label: "写真なし" },
          { label: "1年以上前" },
          { label: "半年〜1年前" },
          { label: "1〜6ヶ月前（基準）" },
          { label: "1ヶ月以内" },
        ] },
    ],
  },
  {
    key: "review",
    name: "クチコミ",
    max: 20,
    items: [
      { key: "rating", label: "評価点数", type: "numeric", unit: "★", weight: 8, impact: { rank: 2, cvr: 3, trust: 3 },
        criteria: "Googleマップの星評価",
        stages: [
          { label: "3.5未満", min: 0 },
          { label: "3.5〜3.9", min: 3.5 },
          { label: "4.0〜4.3", min: 4.0 },
          { label: "4.4〜4.6（基準）", min: 4.4 },
          { label: "4.7以上", min: 4.7 },
        ] },
      { key: "count", label: "クチコミ数", type: "numeric", unit: "件", weight: 6, impact: { rank: 3, cvr: 2, trust: 2 },
        criteria: "クチコミの総数",
        stages: [
          { label: "0〜10件", min: 0 },
          { label: "11〜30件", min: 11 },
          { label: "31〜70件", min: 31 },
          { label: "71〜150件（基準）", min: 71 },
          { label: "151件以上", min: 151 },
        ] },
      { key: "reply", label: "クチコミへの返信", type: "scale", weight: 6, impact: { rank: 2, cvr: 2, trust: 3 },
        criteria: "届いたクチコミに返信しているか",
        stages: [{ label: "してない" }, { label: "たまに" }, { label: "しっかり" }] },
    ],
  },
  {
    key: "post",
    name: "投稿",
    max: 15,
    items: [
      { key: "activity", label: "投稿の数・頻度", type: "scale", weight: 15, impact: { rank: 2, cvr: 1, trust: 1 },
        criteria: "最近の投稿の数・頻度",
        stages: [
          { label: "投稿なし" },
          { label: "ほとんどしていない" },
          { label: "月に数回" },
          { label: "週1ペース（基準）" },
          { label: "週2以上" },
        ] },
    ],
  },
] as const;

/** 既定の配点（カテゴリ合計100）。管理画面で上書き可能にする際の初期値。 */
export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  basic: 30, content: 20, photo: 15, review: 20, post: 15,
};

export const TOTAL_MAX = 100;

/** 優先度の3軸の重み（合計1）。順位をやや重視。管理で調整可能な設計。 */
export const AXIS_WEIGHTS = { rank: 0.4, cvr: 0.35, trust: 0.25 } as const;

/** 段階数（toggle=2、scale/numeric=stages長）。 */
function stageCount(item: DiagItem): number {
  if (item.type === "toggle") return 2;
  return item.stages?.length ?? 2;
}

/** 項目の入力値（生値）を段階(1..N)へ変換する。 */
export function stageOf(item: DiagItem, value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (item.type === "toggle") return value >= 1 ? 2 : 1;
  if (item.type === "scale") return Math.min(stageCount(item), Math.max(1, Math.round(value)));
  // numeric：min しきい値で段階判定（最大の min <= value）。
  const stages = item.stages;
  if (!stages) return null;
  let stage = 1;
  for (let i = 0; i < stages.length; i++) {
    const min = stages[i].min ?? (i === 0 ? -Infinity : 0);
    if (value >= min) stage = i + 1;
  }
  return stage;
}

/** 生値 → 配点割合(0..1)。段階の位置に比例（段階1=0%、最終段階=100%）。 */
export function ratioOf(item: DiagItem, value: number | null | undefined): number | null {
  const stage = stageOf(item, value);
  if (stage == null) return null;
  const n = stageCount(item);
  return n <= 1 ? 1 : (stage - 1) / (n - 1);
}
