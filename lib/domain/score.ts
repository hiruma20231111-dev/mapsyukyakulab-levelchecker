// 採点エンジン（純関数・Reactなし・テスト対象）。2026-09-25 ロジック刷新版。
// 入力＝各項目の生値（toggle:0/1・stage5:1〜5・numeric:実数）。
// 段階(1..5)→線形換算(0/25/50/75/100%)→カテゴリ内の加重平均×配点。総合＝カテゴリ点の合計。
// 依存項目（website→https）は依存先が off のとき評価対象外（二重減点しない）。
import {
  DIAG_CATEGORIES,
  DEFAULT_WEIGHTS,
  TOTAL_MAX,
  AXIS_WEIGHTS,
  stageOf,
  ratioOfStage,
  type CategoryKey,
} from "@/content/diagnosis-v3";
import { tierOf, tierColor, type Tier } from "./tier";

/** 項目キー → 生値。未回答は null/undefined。 */
export type CategoryAnswers = Record<string, number | null | undefined>;
export type V3Answers = Partial<Record<CategoryKey, CategoryAnswers>>;

export type Rank = "S" | "A" | "B" | "C" | "D";

export interface Axis3 { rank: number; cvr: number; trust: number }

export interface CategoryResult {
  key: CategoryKey;
  name: string;
  max: number;
  points: number;
  ratio: number;
  tier: Tier;
  color: string;
  headroom: number;
  empty: boolean;
  /** カテゴリの3軸影響度（回答項目の加重平均・0..3）。 */
  impact: Axis3;
  /** 3軸を AXIS_WEIGHTS で合成した影響度（0..3）。 */
  impactScore: number;
  /** 優先度＝不足度(1-ratio)×影響度。大きいほど優先。 */
  priority: number;
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

interface CatCalc {
  ratio: number | null; // 0..1、回答無しは null
  impact: Axis3;
}

/** カテゴリの達成度と影響度を計算。依存 off の項目は除外。未回答項目は集計から除外。 */
function calcCategory(catKey: CategoryKey, answers: CategoryAnswers | undefined): CatCalc {
  const cat = DIAG_CATEGORIES.find((c) => c.key === catKey);
  const zero: Axis3 = { rank: 0, cvr: 0, trust: 0 };
  if (!cat) return { ratio: null, impact: zero };

  let wSum = 0;
  let acc = 0;
  let iw = 0;
  const imp: Axis3 = { rank: 0, cvr: 0, trust: 0 };

  for (const item of cat.items) {
    // 依存先が off なら評価対象外（例：website=なし のとき https）。
    if (item.dependsOnOff) {
      const dep = answers?.[item.dependsOnOff];
      if (!(typeof dep === "number" && dep >= 1)) continue;
    }
    const v = answers?.[item.key];
    const stage = stageOf(item, typeof v === "number" ? v : undefined);
    if (stage == null) continue; // 未回答は集計から除外

    const w = item.weight ?? 1;
    acc += ratioOfStage(stage) * w;
    wSum += w;

    // 影響度は「回答項目」の加重平均（不足の有無に関わらずカテゴリの重要度を表す）。
    imp.rank += item.impact.rank * w;
    imp.cvr += item.impact.cvr * w;
    imp.trust += item.impact.trust * w;
    iw += w;
  }

  const impact: Axis3 = iw > 0
    ? { rank: imp.rank / iw, cvr: imp.cvr / iw, trust: imp.trust / iw }
    : zero;
  return { ratio: wSum === 0 ? null : acc / wSum, impact };
}

function combineImpact(a: Axis3): number {
  return a.rank * AXIS_WEIGHTS.rank + a.cvr * AXIS_WEIGHTS.cvr + a.trust * AXIS_WEIGHTS.trust;
}

/** 採点。weights で配点を上書き可能（管理画面用）。 */
export function scoreV3(answers: V3Answers, weights?: Partial<Record<CategoryKey, number>>): V3Result {
  const categories: CategoryResult[] = DIAG_CATEGORIES.map((cat) => {
    const max = weights?.[cat.key] ?? DEFAULT_WEIGHTS[cat.key] ?? cat.max;
    const c = calcCategory(cat.key, answers[cat.key]);
    const ratio = c.ratio ?? 0;
    const points = Math.round(ratio * max);
    const impactScore = combineImpact(c.impact);
    // 未回答カテゴリは優先度対象外（priority=0）。回答済みは不足度×影響度。
    const priority = c.ratio == null ? 0 : (1 - ratio) * impactScore;
    return {
      key: cat.key,
      name: cat.name,
      max,
      points,
      ratio,
      tier: tierOf(ratio),
      color: tierColor(ratio),
      headroom: max - points,
      empty: c.ratio == null,
      impact: c.impact,
      impactScore,
      priority,
    };
  });
  const total = categories.reduce((a, c) => a + c.points, 0);
  const max = categories.reduce((a, c) => a + c.max, 0) || TOTAL_MAX;
  return { categories, total, max, rank: rankOf(total), headroom: max - total };
}
