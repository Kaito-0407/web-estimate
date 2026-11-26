import { calculate, yen, hrs, RECOMMENDED } from './calc.js';
import { PRESETS, stateFromPreset } from './presets.js';
import { renderAffiliate } from './affiliate.js';

const KEY = 'web-estimate:v1';
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaults() {
  return stateFromPreset('corporate_wp', {
    client: '', subject: 'Webサイト制作', issuer: '', invoiceNo: '',
    date: today(), validDays: 30, dayRate: 50000, hoursPerDay: 8, taxRate: 10, showHours: false,
  });
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.items)) return { ...defaults(), ...s };
  } catch (_) { /* 保存できない環境でも動かす */ }
  return defaults();
}

let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* noop */ }
}

// ---- 入力欄 ----
const fields = ['client', 'subject', 'issuer', 'invoiceNo', 'date', 'validDays', 'dayRate', 'hoursPerDay', 'sepRate', 'parRate', 'bufRate', 'preDays'];

function bindFields() {
  for (const f of fields) {
    const el = $(`#f-${f}`);
    el.value = state[f] ?? '';
    el.addEventListener('input', () => { state[f] = el.type === 'number' ? el.valueAsNumber : el.value; save(); render(); });
  }
  const sh = $('#f-showHours');
  sh.checked = !!state.showHours;
  sh.addEventListener('change', () => { state.showHours = sh.checked; save(); render(); });

  const ps = $('#f-preset');
  ps.innerHTML = Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join('');
  ps.value = state.preset in PRESETS ? state.preset : 'corporate_wp';
  ps.addEventListener('change', () => {
    if (!confirmReplace()) { ps.value = state.preset; return; }
    state = stateFromPreset(ps.value, state);
    for (const f of ['sepRate', 'parRate', 'bufRate', 'preDays']) $(`#f-${f}`).value = state[f];
    save(); renderItems(); render();
  });
  for (const [f, key] of [['sepRate', 'sepRate'], ['parRate', 'parRate'], ['bufRate', 'bufRate']]) {
    $(`#hint-${f}`).textContent = `推奨 ${RECOMMENDED[key].join('〜')}%`;
  }
  $('#add-item').addEventListener('click', () => {
    state.items.push({ name: '', qty: 1, unit: '式', hours: 0 });
    save(); renderItems(); render();
    const rows = document.querySelectorAll('#items tbody tr');
    rows[rows.length - 1]?.querySelector('input')?.focus();
  });
  $('#print').addEventListener('click', () => window.print());
  $('#reset').addEventListener('click', () => {
    if (!window.confirm('入力内容をすべて消して、初期状態に戻しますか？')) return;
    state = defaults(); save(); location.reload();
  });
}

function confirmReplace() {
  return state.items.every((it) => !it.name) || window.confirm('作業項目をひな形の内容に置き換えます。よろしいですか？');
}

function renderItems() {
  const tb = $('#items tbody');
  tb.innerHTML = state.items.map((it, i) => `
    <tr data-i="${i}">
      <td><input aria-label="項目名" data-k="name" value="${esc(it.name)}" placeholder="作業項目"></td>
      <td><input aria-label="数量" data-k="qty" type="number" min="0" step="any" value="${esc(it.qty)}"></td>
      <td><input aria-label="単位" data-k="unit" value="${esc(it.unit)}" class="unit"></td>
      <td><input aria-label="1単位あたりの工数（時間）" data-k="hours" type="number" min="0" step="any" value="${esc(it.hours)}"></td>
      <td class="num" data-out="h"></td>
      <td><button type="button" class="icon" aria-label="この行を削除" data-del="${i}">×</button></td>
    </tr>`).join('');
  tb.querySelectorAll('input').forEach((el) => el.addEventListener('input', () => {
    const i = Number(el.closest('tr').dataset.i);
    const k = el.dataset.k;
    state.items[i][k] = el.type === 'number' ? el.valueAsNumber : el.value;
    save(); render();
  }));
  tb.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    state.items.splice(Number(b.dataset.del), 1); save(); renderItems(); render();
  }));
  $('#preset-note').textContent = PRESETS[state.preset]?.note || '';
}

// ---- 結果 ----
function render() {
  const r = calculate(state);
  document.querySelectorAll('#items tbody tr').forEach((tr, i) => {
    const it = state.items[i];
    tr.querySelector('[data-out="h"]').textContent = hrs((Number(it.qty) || 0) * (Number(it.hours) || 0));
  });
  $('#sum').innerHTML = `
    <div class="layers">
      ${layer('A 直接費', r.A, 'a')}
      ${layer('統合テスト・修正', r.sep, 'sep')}
      ${layer('B 並列稼働の調整', r.B, 'b')}
      ${layer('C リスク対応', r.C, 'c')}
      ${layer('公開前の検証', r.pre, 'pre')}
    </div>
    <div class="bar" role="img" aria-label="工数の内訳">${barSeg(r.A, r, 'a')}${barSeg(r.sep, r, 'sep')}${barSeg(r.B, r, 'b')}${barSeg(r.C, r, 'c')}${barSeg(r.pre, r, 'pre')}</div>
    <dl class="totals">
      <div><dt>合計工数</dt><dd>${hrs(r.totalHours)}（${(Math.round(r.days * 10) / 10).toLocaleString('ja-JP')}人日）</dd></div>
      <div><dt>Aだけで見積もった場合</dt><dd>${hrs(r.A)}（差 ${hrs(r.totalHours - r.A)}）</dd></div>
      <div><dt>見積金額（税込）</dt><dd class="big">${yen(r.total)}</dd></div>
    </dl>`;
  document.querySelectorAll('#sum .bar i[data-w]').forEach((i) => { i.style.width = i.dataset.w + '%'; });
  $('#warn').innerHTML = r.warnings.length
    ? `<ul>${r.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`
    : '<p class="ok">推奨範囲で見積もれています。</p>';
  renderSheet(r);
}
const layer = (label, h, cls) => `<div class="layer ${cls}"><span>${label}</span><b>${hrs(h)}</b></div>`;
// 幅は style 属性ではなく CSSOM で入れる（CSP で inline style を許可しないため）
const barSeg = (h, r, cls) => r.totalHours > 0 && h > 0 ? `<i class="${cls}" data-w="${(h / r.totalHours * 100).toFixed(2)}"></i>` : '';

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + (Number(n) || 0));
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
const jpDate = (iso) => addDays(iso, 0);

function renderSheet(r) {
  const showH = !!state.showHours;
  $('#sheet').innerHTML = `
    <header class="sheet-head">
      <h2>御見積書</h2>
      <div class="meta"><div>見積日：${esc(jpDate(state.date))}</div><div>有効期限：${esc(addDays(state.date, state.validDays))}</div></div>
    </header>
    <div class="parties">
      <div class="client"><p class="to">${esc(state.client || '（宛名）')} 御中</p><p>件名：${esc(state.subject)}</p><p>下記のとおり御見積申し上げます。</p></div>
      <div class="issuer"><p>${esc(state.issuer || '（発行者）')}</p>${state.invoiceNo ? `<p>登録番号：${esc(state.invoiceNo)}</p>` : ''}</div>
    </div>
    <p class="grand">御見積金額（税込）<b>${yen(r.total)}</b></p>
    <table class="lines">
      <thead><tr><th>項目</th><th class="num">数量</th>${showH ? '<th class="num">工数</th>' : ''}<th class="num">金額</th></tr></thead>
      <tbody>${r.lines.map((l) => `<tr><td>${esc(l.label || '（未入力）')}</td><td class="num">${l.kind === 'item' ? `${esc(l.qty)}${esc(l.unit)}` : '1式'}</td>${showH ? `<td class="num">${hrs(l.hours)}</td>` : ''}<td class="num">${yen(l.amount)}</td></tr>`).join('')}</tbody>
      <tfoot>
        <tr><td colspan="${showH ? 3 : 2}">小計（税抜）</td><td class="num">${yen(r.subtotal)}</td></tr>
        <tr><td colspan="${showH ? 3 : 2}">消費税（${r.taxRate}%対象 ${yen(r.subtotal)}）</td><td class="num">${yen(r.tax)}</td></tr>
        <tr class="total"><td colspan="${showH ? 3 : 2}">合計（税込）</td><td class="num">${yen(r.total)}</td></tr>
      </tfoot>
    </table>
    <p class="remarks">備考：金額は ${esc(Number(state.hoursPerDay) || 8)}時間を1人日として算出しています。仕様の追加・変更があった場合は、別途御見積いたします。</p>`;
}

bindFields();
renderItems();
render();
renderAffiliate(document.getElementById('affiliate'));
