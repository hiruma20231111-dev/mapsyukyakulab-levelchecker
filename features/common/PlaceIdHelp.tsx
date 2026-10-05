"use client";
// Place ID 入力欄のそばに置く「検索ツールへのリンク＋手順マニュアル」。
// 発行フォーム（IntakeForm）と営業ダッシュボード（SalesDashboard）の両方で使う。
import { Icon } from "@/design/icons";

/** Google 公式の Place ID ドキュメント（ページ内に Place ID Finder ツールが埋め込まれている）。 */
export const PLACE_ID_FINDER_URL =
  "https://developers.google.com/maps/documentation/places/web-service/place-id";

export function PlaceIdHelp() {
  return (
    <div className="pidhelp">
      <a className="pidhelp-link" href={PLACE_ID_FINDER_URL} target="_blank" rel="noopener noreferrer">
        <Icon name="search" size={14} />
        Place IDを検索（Googleの検索ツールを別タブで開く）
      </a>
      <ol className="pidhelp-steps">
        <li>上のボタンでGoogleのページを開き、「<b>Place ID Finder</b>」の地図まで少し下にスクロール</li>
        <li>地図上の検索窓に<b>店名や住所</b>を入れて候補を選ぶ</li>
        <li>ピンの吹き出しに出る <b>Place ID（例：ChIJ…）</b> をコピー</li>
        <li>この入力欄に貼り付けて保存／発行</li>
      </ol>
      <p className="pidhelp-note">※ Place IDを含むURLを貼ってもOK（自動で抜き出します）。</p>
    </div>
  );
}
