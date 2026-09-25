// 診断項目定義（2026-09-25 ロジック刷新版）。純データ・Reactを import しない。
// 評価タイプは3種のみ：toggle（二値）/ stage5（5段階）/ numeric（数値→5段階に自動変換）。
// 5段階の意味は全項目共通（1=未対応 … 4=基準ライン … 5=良好）、換算は線形 0/25/50/75/100%。
// サイテーションは廃止。NAP一致度は基本情報へ移動。掲載媒体・SNS活用・英語ビジネス名は削除。

export type CategoryKey = "basic" | "content" | "photo" | "review" | "post";
export type EvalType = "toggle" | "stage5" | "numeric";

/** 5段階→配点割合（線形・譲歩なし）。基準ライン(4)は75%止まり、満点は5のみ。 */
export const STAGE_RATIO = [0, 0.25, 0.5, 0.75, 1] as const; // index = stage-1

/** 優先度算出の3軸影響度（各0〜3）。①順位 ②選ばれる力(CVR) ③信頼・整合性。 */
export interface AxisImpact {
  readonly rank: number;
  readonly cvr: number;
  readonly trust: number;
}

/** 段階の定義。numeric では min（この段階に入る下限・含む）で判定。stage5 は表示ラベルのみ。 */
export interface StageDef {
  readonly label: string;
  readonly min?: number;
}

export interface DiagItem {
  readonly key: string;
  readonly label: string;
  readonly type: EvalType;
  readonly criteria: string;
  /** カテゴリ内の重み（既定1）。 */
  readonly weight: number;
  /** 優先度用の3軸影響度。 */
  readonly impact: AxisImpact;
  /** toggle の表示ラベル。 */
  readonly toggle?: { readonly on: string; readonly off: string };
  /** stage5 / numeric の5段階定義（stage1..5）。 */
  readonly stages?: readonly [StageDef, StageDef, StageDef, StageDef, StageDef];
  /** numeric の単位（枚 / 件 / ★ など）。 */
  readonly unit?: string;
  /** このキーが off(0) のとき本項目は評価対象外（二重減点しない）。例：website→https。 */
  readonly dependsOnOff?: string;
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
      { key: "name", label: "店舗名", type: "toggle", criteria: "実店舗の表記と一致", weight: 1, impact: { rank: 2, cvr: 1, trust: 3 }, toggle: YN("一致", "不一致") },
      { key: "nameEn", label: "英語ビジネス名", type: "toggle", criteria: "英語ビジネス名の設定あり", weight: 3, impact: { rank: 1, cvr: 1, trust: 1 }, toggle: YN() },
      { key: "address", label: "住所", type: "toggle", criteria: "正確に登録", weight: 2, impact: { rank: 3, cvr: 2, trust: 3 }, toggle: YN("正確", "不備あり") },
      { key: "phone", label: "電話番号", type: "toggle", criteria: "記載あり", weight: 5, impact: { rank: 1, cvr: 2, trust: 2 }, toggle: YN() },
      { key: "hours", label: "営業時間", type: "toggle", criteria: "最新に更新", weight: 5, impact: { rank: 1, cvr: 3, trust: 2 }, toggle: YN("最新", "未更新") },
      { key: "website", label: "ウェブサイト", type: "toggle", criteria: "URL登録あり", weight: 2, impact: { rank: 2, cvr: 2, trust: 1 }, toggle: YN() },
      { key: "https", label: "HTTPS対応", type: "toggle", criteria: "サイトがHTTPS対応（サイト無しは対象外）", weight: 1, impact: { rank: 1, cvr: 1, trust: 1 }, toggle: YN("対応", "非対応"), dependsOnOff: "website" },
      { key: "utm", label: "UTMパラメータ", type: "toggle", criteria: "サイトURLに計測用UTMパラメータを設定（サイト無しは対象外）", weight: 1, impact: { rank: 0, cvr: 1, trust: 0 }, toggle: YN(), dependsOnOff: "website" },
    ],
  },
  {
    key: "content",
    name: "コンテンツ",
    max: 20,
    items: [
      { key: "description", label: "店舗の説明文（文字数）", type: "numeric", input: "paste", unit: "字", weight: 6, impact: { rank: 3, cvr: 2, trust: 1 },
        criteria: "上限750字に対する充実度（未設定＝0点）",
        stages: [
          { label: "未設定", min: 0 },
          { label: "1〜249字", min: 1 },
          { label: "250〜499字", min: 250 },
          { label: "500〜649字（基準）", min: 500 },
          { label: "650字以上", min: 650 },
        ] },
      { key: "descEn", label: "店舗の説明文（英語）", type: "toggle", criteria: "説明文に英語が含まれる", weight: 3, impact: { rank: 1, cvr: 1, trust: 0 }, toggle: YN("あり", "なし") },
      { key: "logo", label: "ロゴ", type: "toggle", criteria: "設定あり", weight: 2, impact: { rank: 0, cvr: 2, trust: 1 }, toggle: YN() },
      { key: "mainCat", label: "メインカテゴリ", type: "toggle", criteria: "正確に設定", weight: 2, impact: { rank: 3, cvr: 1, trust: 1 }, toggle: YN("正確", "不適切") },
      { key: "subCat", label: "サブカテゴリ", type: "toggle", criteria: "設定あり", weight: 4, impact: { rank: 2, cvr: 1, trust: 1 }, toggle: YN() },
      { key: "attributes", label: "店舗の特徴・属性", type: "toggle", criteria: "設定あり", weight: 3, impact: { rank: 1, cvr: 2, trust: 1 }, toggle: YN() },
    ],
  },
  {
    key: "photo",
    name: "写真",
    max: 15,
    items: [
      { key: "count", label: "写真の枚数（掲載中の合計）", type: "numeric", unit: "枚", weight: 1, impact: { rank: 1, cvr: 3, trust: 1 },
        criteria: "掲載中の写真の合計枚数",
        stages: [
          { label: "0枚", min: 0 },
          { label: "1〜5枚", min: 1 },
          { label: "6〜19枚", min: 6 },
          { label: "20〜49枚（基準）", min: 20 },
          { label: "50枚以上", min: 50 },
        ] },
      { key: "ownerPhotos", label: "オーナー投稿の写真枚数", type: "numeric", unit: "枚", weight: 1, impact: { rank: 1, cvr: 2, trust: 1 },
        criteria: "オーナーが投稿した写真の累計枚数",
        stages: [
          { label: "0枚", min: 0 },
          { label: "1〜4枚", min: 1 },
          { label: "5〜9枚", min: 5 },
          { label: "10〜19枚（基準）", min: 10 },
          { label: "20枚以上", min: 20 },
        ] },
      { key: "fresh", label: "最新写真のアップロード", type: "stage5", weight: 1, impact: { rank: 1, cvr: 2, trust: 1 },
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
      { key: "rating", label: "評価点数", type: "numeric", unit: "★", weight: 6, impact: { rank: 2, cvr: 3, trust: 3 },
        criteria: "Googleマップの星評価",
        stages: [
          { label: "3.0未満", min: 0 },
          { label: "3.0〜3.4", min: 3.0 },
          { label: "3.5〜3.9", min: 3.5 },
          { label: "4.0〜4.4（基準）", min: 4.0 },
          { label: "4.5以上", min: 4.5 },
        ] },
      { key: "count", label: "クチコミ数", type: "numeric", unit: "件", weight: 5, impact: { rank: 3, cvr: 2, trust: 2 },
        criteria: "クチコミの総数",
        stages: [
          { label: "0〜5件", min: 0 },
          { label: "6〜10件", min: 6 },
          { label: "11〜30件", min: 11 },
          { label: "31〜100件（基準）", min: 31 },
          { label: "101件以上", min: 101 },
        ] },
      { key: "reply", label: "返信率（直近10件）", type: "numeric", unit: "件", weight: 5, impact: { rank: 2, cvr: 2, trust: 3 },
        criteria: "直近10件のクチコミ中、返信した件数（クチコミ無し＝0）",
        stages: [
          { label: "0件", min: 0 },
          { label: "1〜2件", min: 1 },
          { label: "3〜5件", min: 3 },
          { label: "6〜8件（基準）", min: 6 },
          { label: "9〜10件", min: 9 },
        ] },
      { key: "latest", label: "最新のクチコミ", type: "stage5", weight: 2, impact: { rank: 2, cvr: 1, trust: 2 },
        criteria: "最後にクチコミが付いた時期",
        stages: [
          { label: "クチコミなし" },
          { label: "1年以上前" },
          { label: "半年〜1年前" },
          { label: "1〜6ヶ月前（基準）" },
          { label: "1ヶ月以内" },
        ] },
      { key: "qa", label: "Q&A対応", type: "toggle", criteria: "質問への回答あり", weight: 2, impact: { rank: 0, cvr: 1, trust: 1 }, toggle: YN("対応あり", "なし") },
    ],
  },
  {
    key: "post",
    name: "投稿",
    max: 15,
    items: [
      { key: "count", label: "投稿数（累計）", type: "numeric", unit: "回", weight: 10, impact: { rank: 2, cvr: 1, trust: 1 },
        criteria: "これまでの投稿数の累計（0回＝0点）",
        stages: [
          { label: "0〜10回", min: 0 },
          { label: "11〜20回", min: 11 },
          { label: "21〜50回", min: 21 },
          { label: "51〜100回", min: 51 },
          { label: "101回以上", min: 101 },
        ] },
      { key: "latest", label: "最新の投稿", type: "stage5", weight: 5, impact: { rank: 2, cvr: 1, trust: 2 },
        criteria: "最後に投稿した時期",
        stages: [
          { label: "投稿なし" },
          { label: "1年以上前" },
          { label: "半年〜1年前" },
          { label: "1〜6ヶ月前（基準）" },
          { label: "1ヶ月以内" },
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

/** 項目の入力値（answers に格納する生値）を段階(1..5)へ変換する。 */
export function stageOf(item: DiagItem, value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (item.type === "toggle") return value >= 1 ? 5 : 1; // on=満点扱い(5), off=0扱い(1)
  if (item.type === "stage5") {
    const s = Math.round(value);
    return Math.min(5, Math.max(1, s));
  }
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

/** 段階(1..5) → 配点割合(0..1)。 */
export function ratioOfStage(stage: number | null): number {
  if (stage == null) return 0;
  return STAGE_RATIO[Math.min(5, Math.max(1, stage)) - 1];
}
