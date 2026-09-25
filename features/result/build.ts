// 診断結果ビューの構築（純関数・Reactなし）。2026-09-25 ロジック刷新版。
// 採点エンジン＋定義＋コピー → 画面/PDF用データ。優先度は3軸（順位/CVR/信頼）×不足度で算出。
import { DIAG_CATEGORIES, stageOf, type CategoryKey } from "@/content/diagnosis-v3";
import { RESULT_COPY, verdictOf } from "@/content/result-copy";
import { scoreV3, type V3Answers, type Rank, type Axis3 } from "@/lib/domain/score";
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
  empty: boolean;
  impact: Axis3;
  /** 優先理由（主要な影響軸の説明）。 */
  reason: string;
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
  /** 優先的に取り組む項目（3軸×不足度の大きい順・最大3件）。 */
  priorities: CategoryView[];
}

const ICON: Record<CategoryKey, IconName> = {
  basic: "list",
  content: "book",
  photo: "camera",
  review: "chat",
  post: "mega",
};

/** 段階(1..5) → 判定。4以上=○、3=△、2以下=×。 */
function judgeOfStage(stage: number | null): Judge {
  if (stage == null) return "x";
  if (stage >= 4) return "o";
  if (stage === 3) return "t";
  return "x";
}

/** 主要な影響軸 → 優先理由テキスト。 */
function reasonOf(impact: Axis3): string {
  const entries: [string, number][] = [
    ["検索順位に効きます", impact.rank],
    ["来店・選ばれる力に効きます", impact.cvr],
    ["信頼・整合性に効きます", impact.trust],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/** AI検索での見え方（クチコミ＋コンテンツの充実度を目安に）。 */
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
    const catAns = answers[cat.key];

    const subs: SubView[] = cat.items.map((item) => {
      // 依存先 off は対象外表示
      if (item.dependsOnOff) {
        const dep = catAns?.[item.dependsOnOff];
        if (!(typeof dep === "number" && dep >= 1)) {
          return { label: item.label, criteria: item.criteria, current: "対象外", judge: "t" as Judge };
        }
      }
      // description（貼り付け）は文字数を値として扱う
      let raw = catAns?.[item.key];
      if (item.input === "paste") {
        const len = (opts?.descText || "").trim().length;
        raw = len;
      }
      const stage = stageOf(item, typeof raw === "number" ? raw : undefined);
      let current: string;
      if (stage == null) {
        current = "—";
      } else if (item.type === "toggle") {
        current = (typeof raw === "number" && raw >= 1) ? (item.toggle?.on ?? "あり") : (item.toggle?.off ?? "なし");
      } else if (item.type === "stage5") {
        current = item.stages?.[stage - 1]?.label ?? `段階${stage}`;
      } else {
        // numeric
        const val = typeof raw === "number" ? raw : 0;
        current = item.unit === "★" ? `★${val}` : `${val}${item.unit ?? ""}`;
      }
      return { label: item.label, criteria: item.criteria, current, judge: judgeOfStage(stage) };
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
      empty: s.empty,
      impact: s.impact,
      reason: reasonOf(s.impact),
      note: copy.note,
      comment: copy.comment,
      insight: copy.insight,
      firstStep: copy.firstStep,
      effect: copy.effect,
      subs,
    };
  });

  // 優先的に取り組む＝3軸×不足度（priority）の大きい順。未回答・余地なしは除外。
  const priorities = [...scored.categories]
    .filter((c) => !c.empty && c.priority > 0.01 && c.headroom > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((c) => categories.find((cv) => cv.key === c.key)!)
    .filter(Boolean);

  const review = byKey.get("review")!;
  const content = byKey.get("content")!;
  const aioRatio = (review.ratio + content.ratio) / 2;

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
