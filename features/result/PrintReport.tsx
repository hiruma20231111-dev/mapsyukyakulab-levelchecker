// 印刷/PDF用の診断レポート（A4・手渡し用）。ResultView から整形。サーバーで描画可。
import type { ResultView } from "./build";

const JUDGE_MARK: Record<string, string> = { o: "○", t: "△", x: "×" };

export function PrintReport({ data, dateStr }: { data: ResultView; dateStr: string }) {
  return (
    <div className="pr">
      <div className="pr-mast">
        <div className="pr-mk"><i className="b" /><i className="y" /><i className="g" /><i className="r" /></div>
        <div className="pr-brand">マップ集客ラボ レベルチェッカー<small>GoogleマップMEO 集客レベル診断</small></div>
        <div className="pr-date">診断日 {dateStr}</div>
      </div>

      <div className="pr-store">{data.storeName} 様</div>

      <div className="pr-score">
        <div className="pr-orb" style={{ ["--c" as string]: rankColor(data.rank) }}>
          <div className="pr-total">{data.total}<small>/ {data.max}</small></div>
          <div className="pr-rank">{data.rank}<span>RANK</span></div>
        </div>
        <div className="pr-verdict">
          <div className="pr-verdict-t">総合評価</div>
          <p>{data.verdict}</p>
        </div>
      </div>

      {data.priorities.length > 0 && (
        <div className="pr-sec">
          <div className="pr-sec-h">優先的に取り組むポイント</div>
          {data.priorities.map((c, i) => (
            <div className="pr-pri" key={c.key} style={{ borderLeftColor: c.color }}>
              <span className="pr-pri-no" style={{ background: c.color }}>{i + 1}</span>
              <div className="pr-pri-main">
                <div className="pr-pri-name">{c.name}<small>（{c.reason}／あと最大 +{c.headroom}pt）</small></div>
                <div className="pr-pri-step"><b>最初の一歩：</b>{c.firstStep}</div>
                <div className="pr-pri-effect">{c.effect}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pr-sec">
        <div className="pr-sec-h">項目別の診断結果</div>
        <div className="pr-cats">
          {data.categories.map((c) => (
            <div className="pr-cat" key={c.key}>
              <div className="pr-cat-head">
                <span className="pr-cat-name">{c.name}</span>
                <span className="pr-cat-pts">{c.points} / {c.max} pt</span>
              </div>
              <div className="pr-bar"><span style={{ width: `${Math.round(c.ratio * 100)}%`, background: c.color }} /></div>
              <ul className="pr-subs">
                {c.subs.map((s, idx) => (
                  <li key={idx} className={`j-${s.judge}`}>
                    <span className="pr-j">{JUDGE_MARK[s.judge]}</span>
                    <span className="pr-sub-lbl">{s.label}</span>
                    <span className="pr-sub-cur">{s.current}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="pr-foot">
        <div className="pr-cta-box">
          <b>次の一歩：MEO無料トライアル</b>
          <span>この診断結果をもとに、集客改善を専門スタッフが一緒に進めます。担当者またはLINEからお気軽にお問い合わせください。</span>
        </div>
        <div className="pr-foot-brand">マップ集客ラボ レベルチェッカー｜{dateStr}</div>
      </div>
    </div>
  );
}

function rankColor(rank: string): string {
  return rank === "S" || rank === "A" ? "#0e9f8e" : rank === "B" ? "#dc9a34" : "#e0574a";
}
