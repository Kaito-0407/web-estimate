import { MODELS, PROVIDERS, FX } from './prices.js';
import { monthly, compareAll, fmtUsd, fmtJpy } from './cost.js';

const KEY = 'aidev-cost:v1';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const def = { model: 'claude-sonnet-5-5', inputTokens: 3000, outputTokens: 800, cacheShare: 0, perDay: 200, days: 30, batch: false, usdJpy: FX.usdJpy };
let q = def;
try { q = { ...def, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; } catch (_) { /* 保存できない環境でも動かす */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (_) { /* noop */ } };

function bind() {
  $('#f-model').innerHTML = Object.entries(PROVIDERS).map(([pk, p]) =>
    `<optgroup label="${esc(p.name)}">${MODELS.filter((m) => m.p === pk).map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</optgroup>`).join('');
  for (const k of ['model', 'inputTokens', 'outputTokens', 'cacheShare', 'perDay', 'days', 'usdJpy']) {
    const el = $(`#f-${k}`);
    el.value = q[k];
    el.addEventListener('input', () => { q[k] = el.type === 'number' ? el.valueAsNumber : el.value; save(); render(); });
  }
  const b = $('#f-batch');
  b.checked = !!q.batch;
  b.addEventListener('change', () => { q.batch = b.checked; save(); render(); });
  $('#fx-note').textContent = `初期値は1ドル＝${FX.usdJpy}円（${FX.date}、${FX.source}）。必要に応じて書き換えてください。`;
  $('#sources').innerHTML = Object.values(PROVIDERS).map((p) =>
    `<li>${esc(p.name)}：<a href="${esc(p.source)}" rel="noopener" target="_blank">公式の料金ページ</a>（${esc(p.checked)}確認${p.note ? '、' + esc(p.note) : ''}）</li>`).join('');
}

function render() {
  const m = MODELS.find((x) => x.id === q.model) || MODELS[0];
  const r = monthly(m, q);
  $('#result').innerHTML = `
    <p class="big">${fmtJpy(r.jpy)}<span>／月</span></p>
    <p class="sub">${fmtUsd(r.usd)}／月 ・ 1回あたり ${fmtUsd(r.perReqUsd)} ・ 月${r.requests.toLocaleString('ja-JP')}回</p>
    ${r.longTier ? '<p class="warn">入力が10万トークンを超えるため、Claude Haiku 5.5 は長いプロンプト向けの料金で計算しています。</p>' : ''}`;
  $('#compare tbody').innerHTML = compareAll(q).map((x) => `<tr class="${x.model.id === m.id ? 'sel' : ''}">
    <td>${esc(x.model.name)}</td><td class="num">${fmtJpy(x.jpy)}</td><td class="num">${fmtUsd(x.usd)}</td>
    <td class="num">$${x.model.in} / $${x.model.out}</td></tr>`).join('');
}

bind();
render();
