#!/usr/bin/env python3
"""ガイド記事の末尾に、関連する筆者の note 記事へのリンクを入れる（公開前に deploy.sh から実行）。

- note の公開API（作者の記事一覧）から取得し、タイトルが KEYWORDS に合う記事だけを載せる
- 各ガイドの <!-- note-links --> と <!-- /note-links --> の間を書き換える（無ければ </article> の直前に入れる）
- 取得に失敗したときは何も変えずに終わる（公開は止めない）
使い方: python3 tools/note_links.py guide/*.html
"""
import html, json, re, sys, urllib.request

CREATOR = 'mtgc_kaito0407'
KEYWORDS = ['見積', 'ディレクション', '工数', '案件', 'タダ働き']  # 見積書メーカーの読者に関係する記事だけ
MAX = 3
START, END = '<!-- note-links -->', '<!-- /note-links -->'


def fetch():
    out, page = [], 1
    while page <= 10:
        url = f'https://note.com/api/v2/creators/{CREATOR}/contents?kind=note&page={page}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (site-build)'})
        d = json.load(urllib.request.urlopen(req, timeout=20))['data']
        out += d['contents']
        if d.get('isLastPage', True):
            break
        page += 1
    return out


def block(notes):
    items = ''.join(
        f'<li><a href="{html.escape(n["noteUrl"])}" rel="noopener" target="_blank">{html.escape(n["name"])}</a>'
        f'{"（有料・" + str(n["price"]) + "円）" if n.get("price") else ""}</li>'
        for n in notes)
    return (f'{START}<section class="note-links"><h2>筆者のnote（実務の記録）</h2>'
            f'<p class="note">このサイトの作者がnoteに書いている、実際の案件での記録です。</p><ul>{items}</ul></section>{END}')


def main(paths):
    try:
        notes = [n for n in fetch() if any(k.lower() in n['name'].lower() for k in KEYWORDS)][:MAX]
    except Exception as e:  # noqa: BLE001
        print(f'note-links: 取得できなかったので変更なし（{e}）')
        return
    if not notes:
        print('note-links: 該当する記事なし')
        return
    b = block(notes)
    for p in paths:
        t = open(p, encoding='utf-8').read()
        if START in t:
            t = re.sub(re.escape(START) + '.*?' + re.escape(END), lambda _: b, t, flags=re.S)
        else:
            t = t.replace('</article>', b + '\n</article>', 1)
        open(p, 'w', encoding='utf-8').write(t)
    print(f'note-links: {len(notes)}件を{len(paths)}ページに反映')


if __name__ == '__main__':
    main(sys.argv[1:])
