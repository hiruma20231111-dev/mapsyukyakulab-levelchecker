// V3 診断の項目定義（カンリー公式AIスコアを参考に6カテゴリへ細分化）。純データ・Reactを import しない。
// この定義が「営業モードの入力」と「採点基準×現状の照らし合わせ」の唯一の源になる。
// 配点（合計100・管理で調整可）：基本情報25/コンテンツ15/写真15/クチコミ15/投稿15/サイテーション15。

export type CategoryKey = "basic" | "content" | "photo" | "review" | "post" | "citation";

/** サブ項目の選択肢。score は 0〜100（サブ内の達成度）。 */
export interface DiagSubOption {
  readonly label: string;
  readonly score: number;
}

/** サブ項目（採点基準の1行＝入力1つ）。 */
export interface DiagSub {
  readonly key: string;
  readonly label: string;
  /** カテゴリ内での重み（既定1）。 */
  readonly weight?: number;
  /** 採点基準の説明（満点条件など）。詳細シートの「基準：」に使う。 */
  readonly criteria: string;
  /** 入力形式。既定は選択チップ。"text" は貼り付け式（説明文の自動分析）。 */
  readonly input?: "chips" | "text";
  /** 選択肢（chips のとき）。 */
  readonly options: readonly DiagSubOption[];
  /** サイテーションのようにAIが精査して採点案を出すサブか。 */
  readonly aiAssisted?: boolean;
}

/** カテゴリ。max が配点＝既定の重み。 */
export interface DiagCategory {
  readonly key: CategoryKey;
  readonly name: string;
  readonly max: number;
  readonly subs: readonly DiagSub[];
}

const YN = (yes = "あり", no = "なし"): readonly DiagSubOption[] => [
  { label: yes, score: 100 },
  { label: no, score: 0 },
];

export const DIAG_CATEGORIES: readonly DiagCategory[] = [
  {
    key: "basic",
    name: "基本情報",
    max: 25,
    subs: [
      { key: "owner", label: "オーナー登録", weight: 2, criteria: "オーナー登録済み", options: YN("登録済み", "未登録") },
      { key: "name", label: "店舗名", weight: 0.5, criteria: "正式名称で正確", options: YN("正確", "不備あり") },
      { key: "nameEn", label: "英語ビジネス名", weight: 1, criteria: "設定あり", options: YN() },
      { key: "address", label: "住所", weight: 0.5, criteria: "正確に設定", options: YN("正確", "不備あり") },
      { key: "phone", label: "電話番号", weight: 1, criteria: "設定あり", options: YN() },
      { key: "hours", label: "営業時間", weight: 1, criteria: "最新で正確",
        options: [{ label: "最新", score: 100 }, { label: "一部古い", score: 50 }, { label: "未設定", score: 0 }] },
      { key: "website", label: "ウェブサイト", weight: 0.5, criteria: "設定あり", options: YN() },
      { key: "https", label: "HTTPS", weight: 0.5, criteria: "HTTPS対応", options: [{ label: "HTTPS", score: 100 }, { label: "HTTP", score: 0 }] },
    ],
  },
  {
    key: "content",
    name: "コンテンツ",
    max: 15,
    subs: [
      { key: "description", label: "店舗の説明文", weight: 2, criteria: "関連キーワードを含め、充実した説明文（〜750字）", input: "text", options: [] },
      { key: "descEn", label: "英語の説明文", weight: 1, criteria: "設定あり", options: YN() },
      { key: "logo", label: "ロゴ", weight: 0.8, criteria: "設定あり", options: YN() },
      { key: "mainCat", label: "メインカテゴリ", weight: 0.5, criteria: "正確に設定", options: YN("正確", "あいまい") },
      { key: "subCat", label: "サブカテゴリ", weight: 1.2, criteria: "十分に設定",
        options: [{ label: "十分", score: 100 }, { label: "一部", score: 50 }, { label: "なし", score: 0 }] },
      { key: "attributes", label: "店舗の特徴・属性", weight: 0.8, criteria: "十分に設定",
        options: [{ label: "十分", score: 100 }, { label: "一部", score: 50 }, { label: "なし", score: 0 }] },
    ],
  },
  {
    key: "photo",
    name: "写真",
    max: 15,
    subs: [
      { key: "count", label: "写真の枚数", criteria: "21枚以上",
        options: [{ label: "21枚以上", score: 100 }, { label: "6〜20枚", score: 55 }, { label: "5枚以下", score: 15 }] },
      { key: "ownerPhotos", label: "オーナー投稿の枚数", criteria: "十分にある",
        options: [{ label: "多い", score: 100 }, { label: "普通", score: 55 }, { label: "少ない", score: 15 }] },
      { key: "fresh", label: "最新写真のアップロード", criteria: "1ヶ月以内",
        options: [{ label: "1ヶ月以内", score: 100 }, { label: "3ヶ月以内", score: 55 }, { label: "半年より前", score: 15 }] },
    ],
  },
  {
    key: "review",
    name: "クチコミ",
    max: 15,
    subs: [
      { key: "rating", label: "評価点数", weight: 1.2, criteria: "★4.0以上",
        options: [{ label: "★4.5以上", score: 100 }, { label: "★4.0以上", score: 80 }, { label: "★3.5以上", score: 55 }, { label: "★3.5未満", score: 30 }] },
      { key: "count", label: "クチコミ数", criteria: "同業より多い",
        options: [{ label: "多い", score: 100 }, { label: "普通", score: 55 }, { label: "少ない", score: 20 }] },
      { key: "reply", label: "返信率", criteria: "ほぼ返信",
        options: [{ label: "ほぼ返信", score: 100 }, { label: "たまに", score: 50 }, { label: "ほぼしない", score: 0 }] },
      { key: "latest", label: "最新のクチコミ", weight: 0.6, criteria: "1ヶ月以内",
        options: [{ label: "1ヶ月以内", score: 100 }, { label: "3ヶ月以内", score: 55 }, { label: "半年より前", score: 15 }] },
      { key: "qa", label: "Q&A対応", weight: 0.6, criteria: "質問に対応済み",
        options: [{ label: "対応済み", score: 100 }, { label: "未対応", score: 0 }, { label: "質問なし", score: 50 }] },
    ],
  },
  {
    key: "post",
    name: "投稿",
    max: 15,
    subs: [
      { key: "count", label: "投稿数（頻度）", weight: 1.4, criteria: "週2回以上",
        options: [{ label: "週2回以上", score: 100 }, { label: "週1回", score: 60 }, { label: "月数回", score: 30 }, { label: "ほぼなし", score: 0 }] },
      { key: "latest", label: "最新投稿の日付", criteria: "1週間以内",
        options: [{ label: "1週間以内", score: 100 }, { label: "1ヶ月以内", score: 55 }, { label: "それ以前", score: 0 }] },
    ],
  },
  {
    key: "citation",
    name: "サイテーション",
    max: 15,
    subs: [
      { key: "nap", label: "情報の一致（NAP）", criteria: "全媒体で店名・住所・電話が一致", aiAssisted: true,
        options: [{ label: "全媒体で一致", score: 100 }, { label: "一部で相違あり", score: 50 }, { label: "相違が多い", score: 0 }] },
      { key: "media", label: "掲載媒体", criteria: "3媒体以上に掲載", aiAssisted: true,
        options: [{ label: "3媒体以上", score: 100 }, { label: "1〜2媒体", score: 55 }, { label: "なし", score: 0 }] },
      { key: "sns", label: "SNS活用", criteria: "更新を継続", aiAssisted: true,
        options: [{ label: "更新を継続", score: 100 }, { label: "開設のみ", score: 40 }, { label: "なし", score: 0 }] },
    ],
  },
] as const;

/** 既定の配点（重み）。管理画面で上書き可能にする際の初期値。 */
export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = {
  basic: 25, content: 15, photo: 15, review: 15, post: 15, citation: 15,
};

export const TOTAL_MAX = 100;
