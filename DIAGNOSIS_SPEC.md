# MEO診断ロジック仕様（2026-09-25 刷新版）

「マップ集客ラボ レベルチェッカー」の採点ロジック仕様。実装は `content/diagnosis-v3.ts`（定義）・`lib/domain/score.ts`（採点）・`features/result/build.ts`（結果ビュー）・`content/result-copy.ts`（コメント）。

## 共通ルール（2026-09-29 簡素化：25→11項目）

- **評価タイプは3種のみ**：`toggle`（あり/なし）/ `scale`（2〜5択のラベル選択）/ `numeric`（数値→段階に自動変換）
- **割合換算**：段階の位置に比例。段階1=0%、最終段階=100%。例）3択＝0%/50%/100%、5択＝0/25/50/75/100%（toggleは0%/100%）
- **配点（カテゴリ合計100）**：基本情報30 / コンテンツ20 / 写真15 / クチコミ20 / 投稿15
- **条件付き除外**：ウェブサイト=なし のとき HTTPS は評価対象外（二重減点しない）
- **サイテーション廃止**：NAP一致度→基本情報へ移動、掲載媒体・SNS活用・英語ビジネス名は削除

## 1. 項目一覧表

配点＝項目の重み（`weight`）に一致させ、カテゴリ `max` を配点合計に設定。全項目満点でカテゴリ点＝合計になる。営業が訪問前に1〜2分で埋められるよう、外から見て分かる項目のみに絞った。

| カテゴリ | 項目 | タイプ | 選択肢／しきい値 | 配点 |
|---|---|---|---|---|
| 基本情報(30) | オーナー登録 | toggle | 登録あり / 未登録 | 10 |
| | 基本情報の整備度（電話・住所・営業時間） | scale(3) | 未整備 / 一部整備 / しっかり整備 | 15 |
| | ウェブサイト | toggle | あり / なし | 5 |
| コンテンツ(20) | 説明文（文字数） | numeric(貼付) | 0 / 1〜249 / 250〜499 / 500〜649 / 650〜(上限750) | 12 |
| | カテゴリ・属性の設定 | scale(3) | 未設定 / 一部設定 / しっかり設定 | 8 |
| 写真(15) | 写真の枚数 | numeric | 0 / 1〜5 / 6〜19 / 20〜49 / 50〜 | 8 |
| | 写真の鮮度（最新） | scale(5) | なし / 1年〜 / 半年〜1年 / 1〜6ヶ月 / 1ヶ月以内 | 7 |
| クチコミ(20) | 評価点数 | numeric | <3.0 / 3.0〜3.4 / 3.5〜3.9 / 4.0〜4.4 / 4.5〜 | 8 |
| | クチコミ数 | numeric | 0〜5 / 6〜10 / 11〜30 / 31〜100 / 101〜 | 6 |
| | クチコミへの返信 | scale(3) | してない / たまに / しっかり | 6 |
| 投稿(15) | 投稿の数・頻度 | scale(5) | 投稿なし / ほとんど / 月数回 / 週1 / 週2以上 | 15 |

※2026-09-29に25→11項目へ簡素化。削除：NAP・HTTPS・UTM・店舗名・英語説明文・ロゴ・オーナー投稿枚数・最新クチコミ・Q&A（メイン/サブ/属性は「カテゴリ・属性の設定」へ統合、電話/住所/営業時間は「基本情報の整備度」へ統合）。しきい値（基準ライン）は暫定値で `stages[].min` の変更で差し替え可能。

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
