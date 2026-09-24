// 店舗の説明文の分析（純関数）。貼り付けた説明文を、文字数(/750)・関連キーワード含有からスコア化する。
export interface DescAnalysis {
  length: number;
  max: number;
  coverage: number; // 0..100（文字量の充実度）
  keywordHits: number;
  keywordTotal: number;
  keywordScore: number; // 0..100
  score: number; // 0..100（このサブの得点）
}

export const DESC_MAX = 750;

/** キーワード文字列（カンマ/読点/空白区切り）→ 配列。 */
export function parseKeywords(s: string | undefined | null): string[] {
  return String(s || "")
    .split(/[,、\s]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 10);
}

export function analyzeDescription(text: string, keywordsInput?: string): DescAnalysis {
  const t = String(text || "").trim();
  const length = t.length;
  const kws = parseKeywords(keywordsInput);
  const keywordTotal = kws.length;
  const keywordHits = kws.filter((k) => t.includes(k)).length;

  if (length === 0) {
    return { length: 0, max: DESC_MAX, coverage: 0, keywordHits: 0, keywordTotal, keywordScore: 0, score: 0 };
  }
  // 文字量：300字で十分・500字以上で満点の目安（750上限）。
  const coverage = Math.min(100, Math.round((length / 500) * 100));
  const keywordScore = keywordTotal > 0 ? Math.round((keywordHits / keywordTotal) * 100) : 0;
  const score = keywordTotal > 0 ? Math.round(coverage * 0.7 + keywordScore * 0.3) : coverage;
  return { length, max: DESC_MAX, coverage, keywordHits, keywordTotal, keywordScore, score };
}
