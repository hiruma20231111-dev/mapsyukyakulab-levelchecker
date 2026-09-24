// 診断結果ビューの構築（純関数・Reactなし）。採点エンジン＋定義＋コピー → 画面用データ。
import { DIAG_CATEGORIES, type CategoryKey } from "@/content/diagnosis-v3";
import { RESULT_COPY, verdictOf } from "@/content/result-copy";
import { scoreV3, type V3Answers, type Rank } from "@/lib/domain/score";
import { analyzeDescription } from "@/lib/domain/description";
import type { IconName } from "@/design/icons";

export type Judge = "o" | "t" | "x";

export interface SubView {
  label: string;
  criteria: string;
  current: string;
  judge: Judge;
}

export interface CategoryView {
  key: CategoryKey;
  name: string;
  icon: IconName;
  points: number;
  max: number;
  ratio: number;
  color: string;
  headroom: number;
  note: string;
  comment: string;
  insight: string;
  firstStep: string;
  effect: string;
  subs: SubView[];
}

export interface ResultView {
  storeName: string;
  total: number;
  max: number;
  rank: Rank;
  verdict: string;
  aio: { query: string; ratio: number; status: string };
  categories: CategoryView[];
  /** 優先的に取り組む項目（伸びしろの大きい順・最大3件）。 */
  priorities: CategoryView[];
}

const ICON: Record<CategoryKey, IconName> = {
  basic: "list",
  content: "book",
  photo: "camera",
  review: "chat",
  post: "mega",
  citation: "link",
};

/** サブスコア(0..100) → 判定。 */
function judgeOf(score: number | null | undefined): Judge {
  if (typeof score !== "number") return "x";
  if (score >= 80) return "o";
  if (score >= 40) return "t";
  return "x";
}

/** スコアに一致する選択肢ラベル（現状）。無ければ「—」。 */
function labelOf(catKey: CategoryKey, subKey: string, score: number | null | undefined): string {
  if (typeof score !== "number") return "—";
  const cat = DIAG_CATEGORIES.find((c) => c.key === catKey);
  const sub = cat?.subs.find((s) => s.key === subKey);
  const opt = sub?.options.find((o) => o.score === score);
  return opt?.label ?? `${score}`;
}

/** AI検索での見え方（クチコミ＋サイテーションの充実度を目安に）。 */
function aioStatus(ratio: number): string {
  if (ratio >= 0.8) return "選ばれやすい";
  if (ratio >= 0.5) return "あと一歩";
  return "これから育てる";
}

export function buildResultView(
  storeName: string,
  answers: V3Answers,
  opts?: { query?: string; weights?: Partial<Record<CategoryKey, number>>; descText?: string; keywords?: string },
): ResultView {
  const scored = scoreV3(answers, opts?.weights);
  const byKey = new Map(scored.categories.map((c) => [c.key, c]));

  const categories: CategoryView[] = DIAG_CATEGORIES.map((cat) => {
    const s = byKey.get(cat.key)!;
    const copy = RESULT_COPY[cat.key];
    const subs: SubView[] = cat.subs.map((sub) => {
      const v = answers[cat.key]?.[sub.key];
      let current: string;
      if (sub.input === "text") {
        // 説明文サブ：貼り付けたテキストから「文字数・キーワード」を現状として示す。
        const a = analyzeDescription(opts?.descText || "", opts?.keywords);
        current = a.length === 0 ? "未設定" : `${a.length}字${a.keywordTotal ? `・キーワード${a.keywordHits}/${a.keywordTotal}` : ""}`;
      } else {
        current = labelOf(cat.key, sub.key, v);
      }
      return { label: sub.label, criteria: sub.criteria, current, judge: judgeOf(v) };
    });
    return {
      key: cat.key,
      name: cat.name,
      icon: ICON[cat.key],
      points: s.points,
      max: s.max,
      ratio: s.ratio,
      color: s.color,
      headroom: s.headroom,
      note: copy.note,
      comment: copy.comment,
      insight: copy.insight,
      firstStep: copy.firstStep,
      effect: copy.effect,
      subs,
    };
  });

  // 優先的に取り組む＝伸びしろ（headroom）の大きい順。余地が無いものは除外。
  const priorities = [...categories]
    .filter((c) => c.headroom > 0)
    .sort((a, b) => b.headroom - a.headroom)
    .slice(0, 3);

  const review = byKey.get("review")!;
  const citation = byKey.get("citation")!;
  const aioRatio = (review.ratio + citation.ratio) / 2;

  return {
    storeName,
    total: scored.total,
    max: scored.max,
    rank: scored.rank,
    verdict: verdictOf(scored.rank),
    aio: { query: opts?.query ?? "近くのお店 おすすめ", ratio: aioRatio, status: aioStatus(aioRatio) },
    categories,
    priorities,
  };
}
