// 管理ボード用の軽量チャート（依存なしの手作りSVG）。円グラフ・横棒グラフ。

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** ドーナツ（円）グラフ＋凡例。 */
export function Donut({ segments, size = 168, thickness = 26 }: { segments: Segment[]; size?: number; thickness?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="ad-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ad-donut">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef3f6" strokeWidth={thickness} />
          {total > 0 &&
            segments.map((seg, i) => {
              if (seg.value <= 0) return null;
              const len = (seg.value / total) * c;
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += len;
              return el;
            })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="ad-donut-num">{total}</text>
        <text x="50%" y="60%" textAnchor="middle" className="ad-donut-lab">件</text>
      </svg>
      <div className="ad-legend">
        {segments.map((seg, i) => (
          <div className="ad-leg" key={i}>
            <span className="ad-leg-dot" style={{ background: seg.color }} />
            <span className="ad-leg-lab">{seg.label}</span>
            <span className="ad-leg-val">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BarRow {
  label: string;
  /** 積み上げ or 単一の値。segments で色分け表示。 */
  segments: { value: number; color: string; label: string }[];
}

/** 横棒グラフ（営業別など）。各行は複数セグメントの積み上げ。 */
export function BarChart({ rows, unit = "件" }: { rows: BarRow[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.segments.reduce((s, x) => s + x.value, 0)));
  return (
    <div className="ad-bars">
      {rows.map((r, i) => {
        const total = r.segments.reduce((s, x) => s + x.value, 0);
        return (
          <div className="ad-bar-row" key={i}>
            <div className="ad-bar-lab">{r.label}</div>
            <div className="ad-bar-track">
              {r.segments.map((seg, j) =>
                seg.value > 0 ? (
                  <span
                    key={j}
                    className="ad-bar-seg"
                    style={{ width: `${(seg.value / max) * 100}%`, background: seg.color }}
                    title={`${seg.label}: ${seg.value}`}
                  />
                ) : null,
              )}
            </div>
            <div className="ad-bar-val">{total}{unit}</div>
          </div>
        );
      })}
    </div>
  );
}
