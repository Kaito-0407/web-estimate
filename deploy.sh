#!/bin/bash
# Cloudflare Pages へ直接アップロードで公開する（GitHub連携が未設定のため）。
# 必要な環境変数: CLAUDFLARE_API_TOKEN（Pages:Edit 権限）
set -euo pipefail
cd "$(dirname "$0")"
node tests/check.mjs                      # チェックが通らなければ公開しない
DIST=$(mktemp -d)
cp -r index.html css js guide _headers robots.txt "$DIST"/
cp sitemap.xml "$DIST"/
export CLOUDFLARE_API_TOKEN="${CLAUDFLARE_API_TOKEN:?}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/accounts | python3 -c 'import sys,json;print(json.load(sys.stdin)["result"][0]["id"])')}"
npx --yes wrangler@3 pages deploy "$DIST" --project-name web-estimate --branch master --commit-dirty=true
rm -rf "$DIST"
