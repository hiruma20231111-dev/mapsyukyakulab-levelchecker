/**
 * マップ集客ラボ v2 — アイコンセット（脱・絵文字）
 * 24pxグリッド / 線幅1.85 / round / 単色(currentColor)。
 * 使い方: <Icon name="search" size={22} className="..." />  色は color / CSS で制御。
 * direction v0.2 確定分。
 */
import type { SVGProps } from "react";

const PATHS: Record<string, string> = {
  // ナビ・ブランド
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16.5 16.5 21 21",
  chat: "M5 4h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
  book: "M12 5.5C10.4 4.4 8 3.8 5.5 3.8V17c2.5 0 4.9.6 6.5 1.7 1.6-1.1 4-1.7 6.5-1.7V3.8c-2.5 0-4.9.6-6.5 1.7zM12 5.5v13.2",
  pin: "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z",
  gear: "M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4ZM12 3v2.4M12 18.6V21M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2",
  // 診断・評価
  pulse: "M3 13h4l2-6 3.5 12L18 13h3",
  spark: "M11 3l1.6 4.6L17 9l-4.4 1.4L11 15l-1.6-4.6L5 9l4.4-1.4zM18 13.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z",
  check: "M5 12.5l4.5 4.5L19 7",
  slash: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM6.5 6.5l11 11",
  // GBP項目
  star: "M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z",
  camera: "M4 8h2.2l1.2-2h7.2l1.2 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 9.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6z",
  mega: "M4 10v4h3l9 5V5L7 10H4zM17 9a4 4 0 0 1 0 6",
  list: "M8 6h12M8 12h12M8 18h9M4 6h.01M4 12h.01M4 18h.01",
  calendar: "M5.7 5h12.6a2.2 2.2 0 0 1 2.2 2.2v11a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2v-11A2.2 2.2 0 0 1 5.7 5zM3.5 9.5h17M8 3.5v3.5M16 3.5v3.5",
  link: "M9 15l6-6M8.5 12l-1.8 1.8a3 3 0 0 0 4.2 4.2L12.7 16M15.5 12l1.8-1.8a3 3 0 0 0-4.2-4.2L11.3 8",
};

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number | string;
};

export function Icon({ name, size = 24, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** 診断レバー → アイコン名（結果表示・ガイド見出しで使用） */
export const leverIcon = {
  display: "search",
  contact: "star",
  visit: "calendar",
  aio: "spark",
} as const satisfies Record<string, IconName>;
