# Web制作の見積書メーカー

> このリポジトリの `aidev/` は別サイト（aidev.k-web-lab.com）です。運用は `aidev/自動更新手順.md`。公開はそれぞれの `deploy.sh` で別々に行います。

Web制作の見積書を、登録不要・ブラウザだけで作る無料ツール。
直接費（A）に「統合テスト・修正」「並列稼働の調整（B）」「リスク対応（C）」「公開前の検証」を自動で積み上げ、見積もりの抜けを防ぐ。
入力内容はブラウザの localStorage にだけ保存し、外部には送信しない。`_headers` の CSP で外部通信を禁止し、例外はアクセス数の計測（Cloudflare Web Analytics）だけ。

## 構成（ビルド不要の静的サイト）

- `index.html` … ツール本体
- `js/calc.js` … 計算（画面から独立。テストもここを直接呼ぶ）
- `js/presets.js` … ひな形（入力例）
- `js/app.js` … 画面
- `css/style.css` … 画面・見積書・印刷用
- `guide/` … 解説ページ
- `_headers` … Cloudflare Pages のセキュリティヘッダー
- `tests/check.mjs` … 公開前チェック（計算・PC/スマホのはみ出し・JSエラー・保存・印刷PDF。本番と同じCSPで実行）

## チェック

    node tests/check.mjs

## 公開

https://estimate.k-web-lab.com （Cloudflare Pages。GitHub連携は未設定のため直接アップロード）

    ./deploy.sh    # チェック → 合格したら公開（要 CLAUDFLARE_API_TOKEN）
