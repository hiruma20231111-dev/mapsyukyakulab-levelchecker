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

// 全項目を最高段階(5相当)に。toggle=1 / stage5=5 / numeric=段階5に入る値。
const full: V3Answers = {
  basic: { owner: 1, name: 1, nameEn: 1, address: 1, phone: 1, hours: 1, website: 1, https: 1, utm: 1 },
  content: { description: 700, descEn: 1, logo: 1, mainCat: 1, subCat: 1, attributes: 1 },
  photo: { count: 60, ownerPhotos: 25, fresh: 5 },
  review: { rating: 4.8, count: 150, reply: 10, latest: 5, qa: 1 },
  post: { count: 150, latest: 5 },
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

describe("線形換算（段階→割合）", () => {
  it("stage5項目を段階4に→75%（回答済み1項目のみ）", () => {
    const r = scoreV3({ post: { latest: 4 } });
    const post = r.categories.find((c) => c.key === "post")!;
    expect(post.ratio).toBeCloseTo(0.75, 5);
    expect(post.points).toBe(Math.round(0.75 * 15));
  });
  it("投稿数のしきい値：累計51回→段階4→75%", () => {
    const r = scoreV3({ post: { count: 51 } });
    const post = r.categories.find((c) => c.key === "post")!;
    expect(post.ratio).toBeCloseTo(0.75, 5);
  });
  it("numeric項目のしきい値：写真20枚→段階4→75%", () => {
    const r = scoreV3({ photo: { count: 20 } });
    const photo = r.categories.find((c) => c.key === "photo")!;
    expect(photo.ratio).toBeCloseTo(0.75, 5);
  });
  it("numeric項目：写真50枚→段階5→100%", () => {
    const r = scoreV3({ photo: { count: 50 } });
    const photo = r.categories.find((c) => c.key === "photo")!;
    expect(photo.ratio).toBeCloseTo(1, 5);
  });
});

describe("条件付き除外（website off → https 対象外）", () => {
  it("website=なし のとき https は評価対象外（二重減点しない）", () => {
    const r = scoreV3({ basic: { website: 0, https: 1 } });
    const basic = r.categories.find((c) => c.key === "basic")!;
    // website(0%)のみ集計。https(100%)が入れば ratio>0 になるはずだが除外されるため 0。
    expect(basic.ratio).toBe(0);
  });
});

describe("優先度（3軸×不足度）", () => {
  it("不足しているカテゴリは priority>0、満点カテゴリは priority≒0", () => {
    const r = scoreV3({ review: { rating: 2.5, count: 0, reply: 0, latest: 1, qa: 0 }, basic: full.basic });
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
