// 本番URLの確認：node tests/live.cjs （JSエラー・はみ出し・計算表示・リンク）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['PC', { width: 1280, height: 900 }], ['SP', { width: 375, height: 800 }]]) {
    const p = await (await b.newContext({ viewport: vp })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto('https://estimate.k-web-lab.com/', { waitUntil: 'networkidle' });
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const total = await p.textContent('#sum .big');
    const bars = await p.$$eval('#sum .bar i', els => els.map(e => Math.round(e.getBoundingClientRect().width)));
    await p.click('a[href="guide/buffer"]'); await p.waitForLoadState('networkidle');
    if (errs.length || over > 0 || !total) process.exitCode = 1;
    console.log(name, 'errors', errs.length, errs.join('|'), 'overflow', over, 'total', total, 'bars', bars.join('/'), 'guide', p.url(), await p.title());
  }
  await b.close();
})();
