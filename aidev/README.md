# aidev.k-web-lab.com（AI開発ツール箱）

- `/` 生成AI API料金計算機（日本円）… `js/prices.js`（単価・出典・為替）, `js/cost.js`（計算）, `js/app.js`（画面）
- `/claude-md` CLAUDE.md作成ツール … `js/claudemd.js`（生成・指摘）, `js/claudemd-app.js`（画面）
- `/guide/*` ガイド記事
- 確認：`node tests/check.mjs`（公開前）, `node tests/live.cjs`（本番）
- 公開：`./deploy.sh`（Cloudflare Pages 直接アップロード。要 CLAUDFLARE_API_TOKEN）
- 運用：`自動更新手順.md`, `ROADMAP.md`
