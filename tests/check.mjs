// 公開前チェック：node tests/check.mjs （要 playwright）
// 1) 計算ロジック 2) 画面（PC・スマホのはみ出し、JSエラー、警告、保存） 3) 印刷（PDFが1〜2ページ）
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculate } from '../js/calc.js';
import { PRESETS, stateFromPreset } from '../js/presets.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.CHECK_OUT || path.join(ROOT, 'tests', 'out');
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => { console.log((cond ? 'OK  ' : 'NG  ') + msg); if (!cond) fails.push(msg); };
const near = (a, b) => Math.abs(a - b) < 1e-6;

// ---- 1. 計算 ----
{
  const r = calculate({ items: [{ name: 'x', qty: 1, hours: 200 }], dayRate: 50000, hoursPerDay: 8, sepRate: 0, parRate: 15, bufRate: 10, preDays: 0, taxRate: 10 });
  ok(near(r.A, 200) && near(r.B, 30) && near(r.C, 23) && near(r.totalHours, 253), `計算例 A200/B30/C23/合計253（実際 ${r.A}/${r.B}/${r.C}/${r.totalHours}）`);
  ok(r.subtotal === r.lines.reduce((s, l) => s + l.amount, 0) && r.tax === Math.floor(r.subtotal * 0.1) && r.total === r.subtotal + r.tax, `金額の合計と税（小計${r.subtotal} 税${r.tax} 合計${r.total}）`);
  const w0 = calculate({ items: [{ name: 'x', qty: 1, hours: 10 }], dayRate: 40000, hoursPerDay: 8, sepRate: 20, parRate: 0, bufRate: 10, preDays: 1 });
  ok(w0.warnings.some((w) => w.includes('並列稼働の調整費が0%')), 'B=0%で警告が出る');
  for (const k of Object.keys(PRESETS)) {
    const s = { ...stateFromPreset(k), dayRate: 50000, hoursPerDay: 8, taxRate: 10 };
    const r2 = calculate(s);
    ok(r2.totalHours > r2.A && r2.total > 0 && r2.warnings.length === 0, `ひな形「${PRESETS[k].label}」：推奨範囲で警告なし（合計${r2.totalHours.toFixed(1)}h）`);
  }
  {
    const m = stateFromPreset('maintenance'); const h = (n) => m.items.find((it) => it.name.startsWith(n)).hours;
    ok(h('IP制限') >= 4 && h('IP制限') <= 8 && h('.htaccess') === 4 && h('不要ファイル') === 4 && h('パッチ') === 8, '保守ひな形：最低単位（IP0.5〜1人日・.htaccess0.5・削除0.5・パッチ1人日）と一致');
    ok(m.items.some((it) => it.name.includes('全画面の確認')) && PRESETS.maintenance.note.includes('入力例'), '保守ひな形：DB更新に全画面確認を含み、入力例と明記');
    const rm = calculate({ ...m, dayRate: 50000, hoursPerDay: 8, taxRate: 10 });
    ok(near(rm.A, 36) && rm.subtotal === rm.lines.reduce((s, l) => s + l.amount, 0), `保守ひな形の検算：A36h（実際${rm.A}）、小計${rm.subtotal}`);
  }
  const wp = stateFromPreset('corporate_wp'); wp.items[1].hours = 12;
  ok(calculate({ ...wp, dayRate: 1, hoursPerDay: 8 }).warnings.some((w) => w.includes('24〜40時間')), 'WPテンプレ量産が16h未満で警告が出る');
}

// ---- 2/3. 画面と印刷 ----
// 本番（Cloudflare Pages の _headers）と同じ CSP をかけて確かめる
const CSP = fs.readFileSync(path.join(ROOT, '_headers'), 'utf-8').match(/Content-Security-Policy:\s*(.+)/)[1].trim();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Content-Security-Policy': CSP }); fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  for (const [name, vp] of [['PC', { width: 1280, height: 900 }], ['スマホ', { width: 375, height: 800 }]]) {
    for (const page_ of ['/', '/guide/buffer.html', '/guide/items.html']) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      await page.goto(base + page_); await page.waitForLoadState('networkidle');
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(over <= 0 && errs.length === 0, `${name} ${page_}：横はみ出し${over}px、JSエラー${errs.length}件 ${errs.join(' | ')}`);
      if (page_ === '/') await page.screenshot({ path: path.join(OUT, `${name === 'PC' ? 'pc' : 'sp'}.png`), fullPage: true });
      await ctx.close();
    }
  }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/'); await page.waitForLoadState('networkidle');
  ok(/¥[\d,]+/.test(await page.textContent('#sum')) && (await page.textContent('#warn')).includes('推奨範囲'), '初期表示：金額が出て、警告なし');
  const barW = await page.$$eval('#sum .bar i', (els) => els.map((e) => e.getBoundingClientRect().width));
  ok(barW.length === 5 && barW.every((w) => w > 0), `工数の内訳バーが描画される（CSP下で${barW.length}本、幅 ${barW.map((w) => Math.round(w)).join('/')}）`);
  page.once('dialog', (d) => d.accept());
  await page.selectOption('#f-preset', 'maintenance');
  const mOver = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok((await page.textContent('#sheet')).includes('パッチ適用') && (await page.textContent('#preset-note')).includes('全画面の確認') && mOver <= 0, `保守ひな形を選ぶと見積書と注記に反映（はみ出し${mOver}px）`);
  await page.screenshot({ path: path.join(OUT, 'maintenance.png'), fullPage: true });
  page.once('dialog', (d) => d.accept());
  await page.selectOption('#f-preset', 'corporate_wp');
  await page.fill('#f-parRate', '0');
  ok((await page.textContent('#warn')).includes('並列稼働の調整費が0%'), 'B=0%にすると画面に警告');
  await page.fill('#f-client', '株式会社テスト');
  await page.reload(); await page.waitForLoadState('networkidle');
  ok((await page.inputValue('#f-client')) === '株式会社テスト' && (await page.inputValue('#f-parRate')) === '0', '再読み込み後も入力が残る（ブラウザ内保存）');
  ok((await page.textContent('#sheet')).includes('株式会社テスト 御中'), '見積書に宛名が反映');
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', path: path.join(OUT, 'estimate.pdf'), preferCSSPageSize: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  ok(pages >= 1 && pages <= 2, `印刷用PDFが${pages}ページ`);
  await page.screenshot({ path: path.join(OUT, 'print.png'), fullPage: true });
  await ctx.close();
} finally { await browser.close(); server.close(); }
console.log(fails.length ? `\nNG ${fails.length}件` : '\nすべてOK');
process.exit(fails.length ? 1 : 0);
