/**
 * マップ集客ラボ v2 — デザイントークン（TS 版）
 * tokens.css と値を一致させること。JS からトークンを参照するとき用（シミュ表示・チャート等）。
 * direction v0.2 確定分。
 */

export const color = {
  ink: "#14202a",
  muted: "#5d7178",
  faint: "#8798a0",
  line: "#e5ebf1",
  bg: "#f4f7fa",
  surface: "#ffffff",
  panel: "#f6faf9",

  accent: "#0e9f8e",
  accentStrong: "#0b7d70",
  accentDeep: "#0b6e63",
  accentSoft: "#e7f6f3",
  navy: "#1e3a57",

  warn: "#dc9a34",
  danger: "#e0574a",

  // Google 4色
  gBlue: "#4285f4",
  gYellow: "#fbbc05",
  gGreen: "#34a853",
  gRed: "#ea4335",
} as const;

export const gradient = {
  teal: "linear-gradient(135deg,#12b39c,#0b7d70)",
  hero: "linear-gradient(155deg,#0d2a46 0%,#0e6f7e 58%,#13b8a0 128%)",
} as const;

export const shadow = {
  e1: "0 2px 12px rgba(18,50,79,.06)",
  e2: "0 14px 36px rgba(11,60,79,.16)",
} as const;

/** 4px base のスペーススケール */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const radius = { sm: 10, md: 13, card: 16, pill: 999 } as const;

export const font = {
  family: `"Hiragino Kaku Gothic ProN","Hiragino Sans","Segoe UI","Meiryo",system-ui,sans-serif`,
  mono: `"SFMono-Regular",Consolas,"Roboto Mono",ui-monospace,monospace`,
  size: { display: 28, h1: 22, h2: 16, body: 15, small: 13, micro: 11.5 },
  weight: { regular: 400, med: 500, bold: 800, black: 900 },
} as const;

export const motion = {
  fast: "160ms",
  base: "220ms",
  ease: "cubic-bezier(.2,.7,.2,1)",
} as const;

/**
 * 「集客の4つの力」= Google 4色の識別色マッピング。
 * 診断レバー（display / contact / visit / aio）と一対一。
 * ※ 色はカテゴリ識別のみ。強さは「バーの長さ＋強/中/弱」で示す（色に二重の意味を持たせない）。
 */
export const forceColor = {
  display: color.gBlue,  // 見つかる
  contact: color.gYellow, // 選ばれる
  visit: color.gGreen,   // 来店
  aio: color.gRed,       // AI検索
} as const;

export type LeverKey = keyof typeof forceColor;
