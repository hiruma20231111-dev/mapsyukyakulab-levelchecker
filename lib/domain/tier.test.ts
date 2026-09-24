import { describe, it, expect } from "vitest";
import { tierOf, tierColor, TIER_COLOR } from "./tier";

describe("tierOf — 5段階の境界", () => {
  it("境界値", () => {
    expect(tierOf(1)).toBe(5);
    expect(tierOf(0.8)).toBe(5);
    expect(tierOf(0.79)).toBe(4);
    expect(tierOf(0.6)).toBe(4);
    expect(tierOf(0.59)).toBe(3);
    expect(tierOf(0.4)).toBe(3);
    expect(tierOf(0.39)).toBe(2);
    expect(tierOf(0.2)).toBe(2);
    expect(tierOf(0.19)).toBe(1);
    expect(tierOf(0)).toBe(1);
  });
  it("不正値は最低段", () => {
    expect(tierOf(NaN)).toBe(1);
    expect(tierOf(-1)).toBe(1);
  });
});

describe("tierColor", () => {
  it("段階に対応する色", () => {
    expect(tierColor(0.9)).toBe(TIER_COLOR[5]);
    expect(tierColor(0.65)).toBe(TIER_COLOR[4]);
    expect(tierColor(0.45)).toBe(TIER_COLOR[3]);
    expect(tierColor(0.25)).toBe(TIER_COLOR[2]);
    expect(tierColor(0.1)).toBe(TIER_COLOR[1]);
  });
});
