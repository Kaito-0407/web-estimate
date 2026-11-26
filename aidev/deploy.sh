#!/bin/bash
# Cloudflare Pages へ直接アップロードで公開する（GitHub連携が未設定のため）。
# 必要な環境変数: CLAUDFLARE_API_TOKEN（Pages:Edit 権限）
set -euo pipefail
cd "$(dirname "$0")"
node tests/check.mjs                      # チェックが通らなければ公開しない
DIST=$(mktemp -d)
cp -r index.html claude-md.html css js guide _headers robots.txt "$DIST"/
cp sitemap.xml "$DIST"/
# キャッシュ対策：ドメイン全体の Browser Cache TTL（4時間）で CSS/JS が古いまま残るので、
# 中身から作った版番号を URL に付ける（HTML は毎回再検証されるので、版が変われば新しい CSS/JS が読まれる）
VER=$(cat css/*.css js/*.js | sha1sum | cut -c1-10)
find "$DIST" -name '*.html' -exec sed -i -E "s#(href=\"[./]*css/style\.css)\"#\1?v=$VER\"#; s#(src=\"[./]*js/[a-z-]+\.js)\"#\1?v=$VER\"#" {} +
sed -i -E "s#from '\./([a-z-]+)\.js'#from './\1.js?v=$VER'#g" "$DIST"/js/*.js
echo "asset version: $VER"
cp ./*.txt "$DIST"/   # robots.txt と IndexNow のキーファイル
export CLOUDFLARE_API_TOKEN="${CLAUDFLARE_API_TOKEN:?}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/accounts | python3 -c 'import sys,json;print(json.load(sys.stdin)["result"][0]["id"])')}"
npx --yes wrangler@3 pages deploy "$DIST" --project-name aidev --branch main --commit-dirty=true
rm -rf "$DIST"
# IndexNow（Bing など）に更新を通知する。Google は非対応（Search Console のサイトマップで拾われる）
KEYFILE=$(ls | grep -E '^[0-9a-f]{32}\.txt$' | head -1)
if [ -n "$KEYFILE" ]; then
  URLS=$(python3 -c "import re;print(','.join('\"%s\"'%u for u in re.findall(r'<loc>(.*?)</loc>',open('sitemap.xml').read())))")
  curl -s -o /dev/null -w "IndexNow: %{http_code}\n" -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' \
    -d "{\"host\":\"aidev.k-web-lab.com\",\"key\":\"${KEYFILE%.txt}\",\"keyLocation\":\"https://aidev.k-web-lab.com/$KEYFILE\",\"urlList\":[$URLS]}"
fi
