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

// 6カテゴリの全サブを満点に。
const full: V3Answers = {
  basic: { owner: 100, name: 100, nameEn: 100, address: 100, phone: 100, hours: 100, website: 100, https: 100 },
  content: { description: 100, descEn: 100, logo: 100, mainCat: 100, subCat: 100, attributes: 100 },
  photo: { count: 100, ownerPhotos: 100, fresh: 100 },
  review: { rating: 100, count: 100, reply: 100, latest: 100, qa: 100 },
  post: { count: 100, latest: 100 },
  citation: { nap: 100, media: 100, sns: 100 },
};

describe("scoreV3 — 満点", () => {
  const r = scoreV3(full);
  it("各カテゴリが配点満点・総合100・ランクS", () => {
    const pts = Object.fromEntries(r.categories.map((c) => [c.key, c.points]));
    expect(pts).toEqual({ basic: 25, content: 15, photo: 15, review: 15, post: 15, citation: 15 });
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

describe("scoreV3 — 未回答サブは平均から除外", () => {
  it("回答済みサブだけで比率を出す（content の説明文のみ満点→content満点）", () => {
    const r = scoreV3({ content: { description: 100 } });
    const content = r.categories.find((c) => c.key === "content")!;
    expect(content.points).toBe(15);
    expect(content.empty).toBe(false);
  });
});

describe("scoreV3 — 配点の上書き（管理画面用）", () => {
  it("weights でカテゴリ配点を変えられる", () => {
    const r = scoreV3(full, { basic: 40, content: 10 });
    const byKey = Object.fromEntries(r.categories.map((c) => [c.key, c]));
    expect(byKey.basic.max).toBe(40);
    expect(byKey.basic.points).toBe(40);
    expect(byKey.content.max).toBe(10);
    expect(byKey.content.points).toBe(10);
  });
});
