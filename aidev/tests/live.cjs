// 本番URLの確認：node tests/live.cjs （JSエラー・はみ出し・表の見切れ・計算表示・リンク）
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'https://aidev.k-web-lab.com';
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['PC', { width: 1470, height: 840 }], ['PC1024', { width: 1024, height: 768 }], ['SP', { width: 375, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp });
    for (const u of ['/', '/claude-md', '/guide/claude-api-pricing', '/guide/claude-md']) {
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      p.on('response', (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url()}`));
      const res = await p.goto(BASE + u, { waitUntil: 'networkidle' });
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const clipped = await p.$$eval('.table-wrap, pre', (ws) => ws.filter((w) => w.scrollWidth > w.clientWidth + 1).length);
      let extra = '';
      if (u === '/') extra = 'total ' + (await p.textContent('#result .big'));
      if (u === '/claude-md') extra = 'lines ' + (await p.textContent('#count'));
      if (res.status() !== 200 || errs.length || over > 0 || clipped) process.exitCode = 1;
      console.log(name, u, res.status(), 'errors', errs.length, errs.join('|'), 'overflow', over, 'clipped', clipped, extra, '|', await p.title());
      await p.close();
    }
    await ctx.close();
  }
  await b.close();
})();
