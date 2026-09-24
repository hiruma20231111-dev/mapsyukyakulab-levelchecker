// 満点比の5段階配色（内部基準）。UIに「5分割」の語は出さない。
// ratio 0..1 を 赤→橙→黄→ティール緑→ティール の5段階に写像する。純関数・Reactなし。

export type Tier = 1 | 2 | 3 | 4 | 5;

/** ratio(0..1) → 5段階（>=0.8:5 / >=0.6:4 / >=0.4:3 / >=0.2:2 / else:1）。 */
export function tierOf(ratio: number): Tier {
  const r = Number.isFinite(ratio) ? ratio : 0;
  if (r >= 0.8) return 5;
  if (r >= 0.6) return 4;
  if (r >= 0.4) return 3;
  if (r >= 0.2) return 2;
  return 1;
}

export const TIER_COLOR: Record<Tier, string> = {
  5: "#0e9f8e", // ティール（高）
  4: "#3fa985", // ティール緑
  3: "#dc9a34", // 黄（琥珀）
  2: "#e07d3c", // 橙
  1: "#e0574a", // 赤（低）
};

/** ratio(0..1) → 配色。 */
export function tierColor(ratio: number): string {
  return TIER_COLOR[tierOf(ratio)];
}
