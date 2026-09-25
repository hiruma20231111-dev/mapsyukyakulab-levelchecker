# MEO診断ロジック仕様（2026-09-25 刷新版）

「マップ集客ラボ レベルチェッカー」の採点ロジック仕様。実装は `content/diagnosis-v3.ts`（定義）・`lib/domain/score.ts`（採点）・`features/result/build.ts`（結果ビュー）・`content/result-copy.ts`（コメント）。

## 共通ルール

- **評価タイプは3種のみ**：`toggle`（二値）/ `stage5`（5段階）/ `numeric`（数値→段階に自動変換）
- **5段階の意味（全項目共通）**：1=未対応 / 2=ほぼ手付かず / 3=基準に届かず(惜しい) / 4=基準ライン / 5=良好
- **点数換算（線形・譲歩なし）**：段階1→0% / 2→25% / 3→50% / 4→75% / 5→100%（基準ライン=75%止まり、満点は5のみ）
- **配点（カテゴリ合計100）**：基本情報30 / コンテンツ20 / 写真15 / クチコミ20 / 投稿15（2026-09-25 内訳調整）
- **条件付き除外**：ウェブサイト=なし のとき HTTPS は評価対象外（二重減点しない）
- **サイテーション廃止**：NAP一致度→基本情報へ移動、掲載媒体・SNS活用・英語ビジネス名は削除

## 1. 項目一覧表

配点＝項目の重み（`weight`）に一致させ、カテゴリ `max` を配点合計に設定。全項目満点でカテゴリ点＝合計になる。

| カテゴリ | 項目 | タイプ | しきい値（段階1→5） | 配点 |
|---|---|---|---|---|
| 基本情報(30) | オーナー登録 | toggle | なし=0 / あり=満点 | 10 |
| | 店舗名 | toggle | 実店舗表記と一致 | 1 |
| | NAP一致度 | toggle | 他媒体と店名/住所/電話が一致 | 3 |
| | 住所 | toggle | 正確 | 2 |
| | 電話番号 | toggle | 記載あり | 5 |
| | 営業時間 | toggle | 最新に更新 | 5 |
| | ウェブサイト | toggle | URL登録あり | 2 |
| | HTTPS対応 | toggle | HTTPS対応（サイト無し=対象外） | 1 |
| | UTMパラメータ | toggle | 計測用UTM設定（サイト無し=対象外） | 1 |
| コンテンツ(20) | 説明文（文字数） | numeric(貼付) | 0 / 1〜249 / 250〜499 / 500〜649 / 650〜(上限750) | 6 |
| | 説明文（英語） | toggle | 英語を含む | 3 |
| | ロゴ | toggle | 設定あり | 2 |
| | メインカテゴリ | toggle | 正確 | 2 |
| | サブカテゴリ | toggle | 設定あり | 4 |
| | 特徴・属性 | toggle | 設定あり | 3 |
| 写真(15) | 写真の枚数 | numeric | 0 / 1〜5 / 6〜19 / 20〜49 / 50〜 | 5 |
| | オーナー投稿枚数 | numeric | 0 / 1〜4 / 5〜9 / 10〜19 / 20〜 | 5 |
| | 最新写真 | stage5 | なし / 1年〜 / 半年〜1年 / 1〜6ヶ月 / 1ヶ月以内 | 5 |
| クチコミ(20) | 評価点数 | numeric | <3.0 / 3.0〜3.4 / 3.5〜3.9 / 4.0〜4.4 / 4.5〜 | 6 |
| | クチコミ数 | numeric | 0〜5 / 6〜10 / 11〜30 / 31〜100 / 101〜 | 5 |
| | 返信率（直近10件） | numeric | 0 / 1〜2 / 3〜5 / 6〜8 / 9〜10 件 | 5 |
| | 最新のクチコミ | stage5 | なし / 1年〜 / 半年〜1年 / 1〜6ヶ月 / 1ヶ月以内 | 2 |
| | Q&A対応 | toggle | 回答あり | 2 |
| 投稿(15) | 投稿数（累計） | numeric | 0〜10 / 11〜20 / 21〜50 / 51〜100 / 101〜 回 | 10 |
| | 最新の投稿 | stage5 | なし / 1年〜 / 半年〜1年 / 1〜6ヶ月 / 1ヶ月以内 | 5 |

※写真は前回のまま。しきい値（基準ライン=段階4）は暫定値。業種別データが揃い次第、`stages[].min` を変更するだけで差し替え可能。

## 2. 判定ロジック（疑似コード）

```
# 生値 → 段階(1..5)
stageOf(item, value):
    if value is None: return None            # 未回答
    if item.type == toggle: return 5 if value>=1 else 1
    if item.type == stage5: return clamp(round(value), 1, 5)
    if item.type == numeric:                  # 最大の min <= value を採用
        stage = 1
        for i, s in enumerate(item.stages):
            if value >= s.min: stage = i+1
        return stage

# 段階 → 割合
ratioOfStage(stage): return [0, .25, .5, .75, 1][stage-1]

# カテゴリ採点
calcCategory(cat, answers):
    wSum = 0; acc = 0
    for item in cat.items:
        if item.dependsOnOff and answers[item.dependsOnOff] is off:
            continue                          # 条件付き除外（例 website→https）
        stage = stageOf(item, answers[item.key])
        if stage is None: continue            # 未回答は集計から除外
        acc  += ratioOfStage(stage) * item.weight
        wSum += item.weight
    ratio = None if wSum==0 else acc / wSum    # 0..1
    points = round(ratio * cat.max)

# 総合
total = Σ points
rank  = S>=90 / A>=80 / B>=70 / C>=55 / D<55
```

## 3. 総合評価コメントのロジック（点数と矛盾させない）

ランクごとに固定文言を割り当て、低得点で「土台はできています」等を出さない（`content/result-copy.ts` verdictOf）。

| ランク | 総合点 | 文言の方向性 |
|---|---|---|
| S | 90〜 | 非常に高い。土台と運用が揃う。維持 |
| A | 80〜89 | 良好。弱点を補えば上位が狙える |
| B | 70〜79 | 基準ライン超え。あと少しで上位圏 |
| C | 55〜69 | 基礎はあるが不足が目立つ。優先項目から着手 |
| D | 〜54 | ほぼ手付かず。基本情報とクチコミから |

カテゴリ別コメントは、そのカテゴリの達成度（tier 1〜5）に応じた色・文言で表示。

## 4. 優先度の算出ロジック（配点の大きさではなく効果）

配点＝優先度、という誤りをやめ、**「不足度 × 影響度（3軸）」**で算出する。

```
AXIS_WEIGHTS = { rank:0.40, cvr:0.35, trust:0.25 }   # 合計1

# 各項目に3軸の影響度(0..3): rank=順位, cvr=選ばれる力, trust=信頼・整合性
categoryImpact(cat)  = Σ(item.impact ・重み) / Σ重み        # カテゴリの3軸平均
impactScore(cat)     = rank*0.40 + cvr*0.35 + trust*0.25    # 合成(0..3)
deficiency(cat)      = 1 - ratio                            # 不足度
priority(cat)        = deficiency * impactScore             # 大きいほど優先
```

- 「優先的に取り組む」は priority 降順の上位3カテゴリ（未回答・余地なしは除外）。
- 各カテゴリの主要影響軸を「検索順位に効きます／来店・選ばれる力に効きます／信頼・整合性に効きます」として理由表示。
- 3軸の影響度・AXIS_WEIGHTS は管理で調整可能な設計（`content/diagnosis-v3.ts`）。

## 出力（帳票）

既存のPDF帳票構成を維持：**総合評価 → 優先ポイント → 項目別診断結果**。優先ポイントには上記の優先理由（3軸）を併記。
