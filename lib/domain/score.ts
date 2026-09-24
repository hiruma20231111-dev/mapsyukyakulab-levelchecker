// V3 採点エンジン（純関数・Reactなし・テスト対象）。
// 入力＝各サブ項目のスコア(0..100)。カテゴリ点＝サブの加重平均×配点。総合＝カテゴリ点の合計。
import { DIAG_CATEGORIES, DEFAULT_WEIGHTS, TOTAL_MAX, type CategoryKey } from "@/content/diagnosis-v3";
import { tierOf, tierColor, type Tier } from "./tier";

/** サブ項目キー → スコア(0..100)。未回答は null/undefined。 */
export type CategoryAnswers = Record<string, number | null | undefined>;
export type V3Answers = Partial<Record<CategoryKey, CategoryAnswers>>;

export type Rank = "S" | "A" | "B" | "C" | "D";

export interface CategoryResult {
  key: CategoryKey;
  name: string;
  max: number;
  /** カテゴリ得点（0..max、四捨五入）。 */
  points: number;
  /** 達成度（0..1）。 */
  ratio: number;
  tier: Tier;
  color: string;
  /** 改善の余地（max - points）。 */
  headroom: number;
  /** 回答済みサブが1つも無い場合 true。 */
  empty: boolean;
}

export interface V3Result {
  categories: CategoryResult[];
  total: number;
  max: number;
  rank: Rank;
  headroom: number;
}

/** 総合点 → ランク（S>=90 / A>=80 / B>=70 / C>=55 / D<55）。 */
export function rankOf(total: number): Rank {
  if (total >= 90) return "S";
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  return "D";
}

/** サブの加重平均（0..100）。回答が無ければ null。 */
function categoryRatio(catKey: CategoryKey, answers: CategoryAnswers | undefined): number | null {
  const cat = DIAG_CATEGORIES.find((c) => c.key === catKey);
  if (!cat) return null;
  let wSum = 0;
  let acc = 0;
  for (const sub of cat.subs) {
    const v = answers?.[sub.key];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const w = sub.weight ?? 1;
    acc += Math.max(0, Math.min(100, v)) * w;
    wSum += w;
  }
  if (wSum === 0) return null;
  return acc / wSum / 100; // 0..1
}

/**
 * V3採点。weights で配点を上書き可能（管理画面用）。
 * 未回答カテゴリは points=0・empty=true として扱う。
 */
export function scoreV3(answers: V3Answers, weights?: Partial<Record<CategoryKey, number>>): V3Result {
  const categories: CategoryResult[] = DIAG_CATEGORIES.map((cat) => {
    const max = weights?.[cat.key] ?? DEFAULT_WEIGHTS[cat.key] ?? cat.max;
    const r = categoryRatio(cat.key, answers[cat.key]);
    const ratio = r ?? 0;
    const points = Math.round(ratio * max);
    return {
      key: cat.key,
      name: cat.name,
      max,
      points,
      ratio,
      tier: tierOf(ratio),
      color: tierColor(ratio),
      headroom: max - points,
      empty: r == null,
    };
  });
  const total = categories.reduce((a, c) => a + c.points, 0);
  const max = categories.reduce((a, c) => a + c.max, 0) || TOTAL_MAX;
  return { categories, total, max, rank: rankOf(total), headroom: max - total };
}
