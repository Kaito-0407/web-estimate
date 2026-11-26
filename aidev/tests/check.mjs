// 公開前チェック：node tests/check.mjs （要 playwright）
// 1) 料金計算 2) CLAUDE.md生成 3) 画面（本番と同じCSP、PC・スマホのはみ出し・重なり、JSエラー、保存）
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODELS } from '../js/prices.js';
import { monthly, compareAll } from '../js/cost.js';
import { buildClaudeMd, lint } from '../js/claudemd.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.CHECK_OUT || path.join(ROOT, 'tests', 'out');
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => { console.log((cond ? 'OK  ' : 'NG  ') + msg); if (!cond) fails.push(msg); };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const M = (id) => MODELS.find((m) => m.id === id);

// ---- 1. 料金計算 ----
{
  const q = { inputTokens: 10000, outputTokens: 1000, cacheShare: 0, perDay: 100, days: 30, batch: false, usdJpy: 159.32 };
  const r = monthly(M('claude-opus-5-5'), q);
  ok(near(r.usd, 180) && near(r.jpy, 28677.6) && r.requests === 3000, `Opus 5.5 入力1万/出力1千×100回×30日 = $180・¥28,678（実際 $${r.usd}・¥${r.jpy}）`);
  ok(near(monthly(M('claude-opus-5-5'), { ...q, batch: true }).usd, 90), 'バッチで半額（$90）');
  const c = monthly(M('claude-sonnet-5-5'), { ...q, cacheShare: 50 });
  ok(near(c.usd, (5000 * 2 + 5000 * 0.1 + 1000 * 10) / 1e6 * 3000), `キャッシュ50%の計算（$${c.usd}）`);
  const h = monthly(M('claude-haiku-5-5'), { ...q, inputTokens: 120000 });
  ok(h.longTier && near(h.usd, (120000 * 0.5 + 1000 * 2.5) / 1e6 * 3000), `Haiku 5.5 は10万トークン超で長い料金（$${h.usd}）`);
  ok(!monthly(M('claude-haiku-5-5'), { ...q, inputTokens: 100000 }).longTier, 'Haiku 5.5 はちょうど10万トークンなら通常料金');
  const all = compareAll(q);
  ok(all.length === MODELS.length && all.every((x, i) => i === 0 || all[i - 1].usd <= x.usd), `全${all.length}モデルが安い順に並ぶ`);
  ok(MODELS.every((m) => m.in > 0 && m.out > 0 && m.cacheRead > 0 && m.cacheRead < m.in), '全モデルの単価が正で、キャッシュ読み込みが入力より安い');
  ok(monthly(M('claude-sonnet-5-5'), { inputTokens: 'abc', outputTokens: -5, perDay: 10, days: 30 }).usd === 0, '不正な入力でも0円で落ちない');
}

// ---- 2. CLAUDE.md 生成 ----
{
  const f = { name: '予約アプリ', stack: ['TypeScript'], cmdTest: 'npm test', rules: 'インデントは2スペース\n\n', donts: 'main に直接 push しない', verify: true };
  const md = buildClaudeMd(f);
  ok(md.startsWith('# 予約アプリ\n') && md.includes('## 技術スタック\n- TypeScript') && md.includes('- テスト: `npm test`'), '見出し・技術スタック・コマンドが出る');
  ok(md.includes('`npm test` を実行し、通ってから完了') && !md.includes('\n\n\n') && md.endsWith('\n') && !md.endsWith('\n\n'), '完了の条件が入り、余計な空行がない');
  ok(lint(f, md).length === 0, `具体的な入力では指摘なし（${lint(f, md).join('/') || 'なし'}）`);
  const vague = { ...f, rules: 'コードをきれいに書く' };
  ok(lint(vague, buildClaudeMd(vague)).some((t) => t.includes('「きれいに」')), '抽象的なルールを指摘する');
  const long = { ...f, rules: Array.from({ length: 210 }, (_, i) => `ルール${i}はタブ禁止`).join('\n') };
  ok(lint(long, buildClaudeMd(long)).some((t) => t.includes('200行未満')), '200行以上で警告する');
  ok(lint({ name: 'x' }, buildClaudeMd({ name: 'x' })).some((t) => t.includes('テストのコマンド')), 'テストのコマンドが空なら知らせる');
}

// ---- 3. 画面 ----
const CSP = fs.readFileSync(path.join(ROOT, '_headers'), 'utf-8').match(/Content-Security-Policy:\s*(.+)/)[1].trim();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(ROOT, p);
  if (!path.extname(f) && fs.existsSync(f + '.html')) f += '.html'; // Cloudflare Pages と同じく拡張子なしで開く
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Content-Security-Policy': CSP }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise((r) => server.on('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const overlaps = async (p, a, others) => {
  const maxY = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); const hits = [];
  for (let y = 0; y <= maxY; y += 100) {
    await p.evaluate((v) => scrollTo(0, v), y);
    if (await p.evaluate(([a, others]) => { const r = document.querySelector(a).getBoundingClientRect();
      return others.some((s) => [...document.querySelectorAll(s)].some((el) => { const o = el.getBoundingClientRect();
        return Math.min(r.right, o.right) - Math.max(r.left, o.left) > 1 && Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top) > 1; })); }, [a, others])) hits.push(y);
  }
  await p.evaluate(() => scrollTo(0, 0)); return hits;
};
try {
  for (const [vn, vp] of [['PC', { width: 1470, height: 840 }], ['PC1024', { width: 1024, height: 768 }], ['SP', { width: 375, height: 800 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const pages = ['/', '/claude-md', '/guide/claude-api-pricing', '/guide/claude-md'];
    for (const u of pages) {
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      p.on('requestfailed', (r) => errs.push('読み込み失敗 ' + r.url()));
      p.on('response', (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url()}`));
      await p.goto(base + u, { waitUntil: 'networkidle' });
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const clipped = await p.$$eval('.table-wrap, pre', (ws) => ws.filter((w) => w.scrollWidth > w.clientWidth + 1).map((w) => w.querySelector('table')?.id || w.querySelector('th')?.textContent));
      ok(clipped.length === 0, `${vn} ${u}：表が見切れない（${clipped.join(',') || 'なし'}）`);
      ok(errs.length === 0 && over <= 0, `${vn} ${u}：エラーなし・横はみ出しなし（エラー${errs.length} ${errs.join('|')} はみ出し${over}px）`);
      if (u === '/') {
        const yen = await p.textContent('#result .big');
        ok(yen.includes('¥13,383'), `${vn} 初期値の月額 ¥13,383（表示 ${yen}）`);
        ok((await p.$$('#compare tbody tr')).length === MODELS.length && (await p.$$('#compare tr.sel')).length === 1, `${vn} 比較表に全モデル・選択中1行`);
        await p.selectOption('#f-model', 'claude-opus-5-5');
        await p.fill('#f-inputTokens', '10000'); await p.fill('#f-outputTokens', '1000'); await p.fill('#f-perDay', '100');
        ok((await p.textContent('#result .big')).includes('¥28,678'), `${vn} 入力すると再計算（Opus 5.5 → ¥28,678）`);
        await p.reload({ waitUntil: 'networkidle' });
        ok((await p.inputValue('#f-model')) === 'claude-opus-5-5' && (await p.textContent('#result .big')).includes('¥28,678'), `${vn} 再読み込み後も入力が残る`);
        const hits = await overlaps(p, '.result-panel', ['.panel:not(.result-panel)']);
        ok(hits.length === 0, `${vn} 結果欄が他の欄に重ならない（${hits.join(',') || 'なし'}）`);
        await p.screenshot({ path: path.join(OUT, `${vn}-index.png`), fullPage: true });
      }
      if (u === '/claude-md') {
        await p.fill('#f-name', 'テスト'); await p.check('input[value="Python"]'); await p.fill('#f-cmdTest', 'pytest'); await p.fill('#f-rules', 'きちんと書く');
        const md = await p.inputValue('#out');
        ok(md.startsWith('# テスト') && md.includes('- Python') && md.includes('`pytest` を実行'), `${vn} 入力がCLAUDE.mdに反映される`);
        ok((await p.textContent('#tips')).includes('「きちんと」'), `${vn} 抽象的なルールの指摘が出る`);
        const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
        ok(dl.suggestedFilename() === 'CLAUDE.md', `${vn} CLAUDE.md をダウンロードできる`);
        const hits = await overlaps(p, '.result-panel', ['.panel:not(.result-panel)']);
        ok(hits.length === 0, `${vn} 出力欄が入力欄に重ならない（${hits.join(',') || 'なし'}）`);
        await p.screenshot({ path: path.join(OUT, `${vn}-claude-md.png`), fullPage: true });
      }
      if (u.startsWith('/guide/')) {
        await p.screenshot({ path: path.join(OUT, `${vn}-guide-${u.split("/").pop()}.png`), fullPage: true });
        const links = await p.$$eval('a[href]', (as) => as.map((a) => a.href).filter((h) => h.startsWith(location.origin)));
        for (const l of new Set(links)) { const r = await ctx.request.get(l); ok(r.status() === 200, `${vn} ${u} 内部リンク ${l.replace(base, '')} が開ける`); }
      }
      await p.close();
    }
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
console.log(fails.length ? `\n失敗 ${fails.length}件` : '\nすべてOK');
process.exit(fails.length ? 1 : 0);
