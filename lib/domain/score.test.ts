import { describe, it, expect } from "vitest";
import { scoreV3, rankOf, type V3Answers } from "./score";

describe("rankOf", () => {
  it("S/A/B/C/D の境界", () => {
    expect(rankOf(100)).toBe("S");
    expect(rankOf(90)).toBe("S");
    expect(rankOf(89)).toBe("A");
    expect(rankOf(80)).toBe("A");
    expect(rankOf(79)).toBe("B");
    expect(rankOf(70)).toBe("B");
    expect(rankOf(69)).toBe("C");
    expect(rankOf(55)).toBe("C");
    expect(rankOf(54)).toBe("D");
    expect(rankOf(0)).toBe("D");
  });
});

// 全項目を最高段階に。toggle=1 / scale=最終段階 / numeric=段階5に入る値。
const full: V3Answers = {
  basic: { owner: 1, info: 3, website: 1 },
  content: { description: 700, category: 3 },
  photo: { count: 60, fresh: 5 },
  review: { rating: 4.8, count: 150, reply: 3 },
  post: { activity: 5 },
};

describe("scoreV3 — 満点", () => {
  const r = scoreV3(full);
  it("各カテゴリが配点満点・総合100・ランクS", () => {
    const pts = Object.fromEntries(r.categories.map((c) => [c.key, c.points]));
    expect(pts).toEqual({ basic: 30, content: 20, photo: 15, review: 20, post: 15 });
    expect(r.total).toBe(100);
    expect(r.max).toBe(100);
    expect(r.rank).toBe("S");
    expect(r.categories.every((c) => c.tier === 5)).toBe(true);
  });
});

describe("scoreV3 — 全0/未回答", () => {
  it("総合0・ランクD・全カテゴリ empty", () => {
    const r = scoreV3({});
    expect(r.total).toBe(0);
    expect(r.rank).toBe("D");
    expect(r.categories.every((c) => c.empty)).toBe(true);
  });
});

describe("割合換算（段階の位置に比例）", () => {
  it("3択の真ん中（一部）→50%", () => {
    const r = scoreV3({ basic: { info: 2 } });
    const basic = r.categories.find((c) => c.key === "basic")!;
    expect(basic.ratio).toBeCloseTo(0.5, 5);
  });
  it("5択の段階4→75%（回答済み1項目のみ）", () => {
    const r = scoreV3({ photo: { fresh: 4 } });
    const photo = r.categories.find((c) => c.key === "photo")!;
    expect(photo.ratio).toBeCloseTo(0.75, 5);
  });
  it("numeric：写真20枚→段階4→75%", () => {
    const r = scoreV3({ photo: { count: 20 } });
    const photo = r.categories.find((c) => c.key === "photo")!;
    expect(photo.ratio).toBeCloseTo(0.75, 5);
  });
  it("numeric：写真50枚→段階5→100%", () => {
    const r = scoreV3({ photo: { count: 50 } });
    const photo = r.categories.find((c) => c.key === "photo")!;
    expect(photo.ratio).toBeCloseTo(1, 5);
  });
  it("toggle：あり=100% / なし=0%", () => {
    expect(scoreV3({ basic: { website: 1 } }).categories.find((c) => c.key === "basic")!.ratio).toBe(1);
    expect(scoreV3({ basic: { website: 0 } }).categories.find((c) => c.key === "basic")!.ratio).toBe(0);
  });
});

describe("優先度（3軸×不足度）", () => {
  it("不足カテゴリは priority>0、満点カテゴリは priority≒0", () => {
    const r = scoreV3({ review: { rating: 2.5, count: 0, reply: 1 }, basic: full.basic });
    const review = r.categories.find((c) => c.key === "review")!;
    const basic = r.categories.find((c) => c.key === "basic")!;
    expect(review.priority).toBeGreaterThan(0);
    expect(basic.priority).toBeCloseTo(0, 5);
  });
});

describe("配点の上書き（管理画面用）", () => {
  it("weights でカテゴリ配点を変えられる", () => {
    const r = scoreV3(full, { basic: 40, content: 10 });
    const byKey = Object.fromEntries(r.categories.map((c) => [c.key, c]));
    expect(byKey.basic.max).toBe(40);
    expect(byKey.basic.points).toBe(40);
    expect(byKey.content.max).toBe(10);
    expect(byKey.content.points).toBe(10);
  });
});
