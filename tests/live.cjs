// 本番URLの確認：node tests/live.cjs （JSエラー・はみ出し・計算表示・リンク）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['PC', { width: 1470, height: 840 }], ['PC1024', { width: 1024, height: 768 }], ['SP', { width: 375, height: 800 }]]) {
    const p = await (await b.newContext({ viewport: vp })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto('https://estimate.k-web-lab.com/', { waitUntil: 'networkidle' });
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const total = await p.textContent('#sum .big');
    const bars = await p.$$eval('#sum .bar i', els => els.map(e => Math.round(e.getBoundingClientRect().width)));
    // 計算結果の欄が、どのスクロール位置でも入力欄・プレビューに重ならない
    const maxY = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); const hits = [];
    for (let y = 0; y <= maxY; y += 100) { await p.evaluate(v => scrollTo(0, v), y);
      if (await p.evaluate(() => { const r = document.querySelector('.result').getBoundingClientRect();
        return ['.inputs', '.preview'].some(sel => { const o = document.querySelector(sel).getBoundingClientRect();
          return Math.min(r.right, o.right) - Math.max(r.left, o.left) > 1 && Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top) > 1; }); })) hits.push(y); }
    if (hits.length) { errs.push('重なり ' + hits.join(',')); }
    await p.evaluate(() => scrollTo(0, 0));
    await p.click('a[href="guide/buffer"]'); await p.waitForLoadState('networkidle');
    if (errs.length || over > 0 || !total) process.exitCode = 1;
    console.log(name, 'errors', errs.length, errs.join('|'), 'overflow', over, 'total', total, 'bars', bars.join('/'), 'guide', p.url(), await p.title());
  }
  await b.close();
})();
