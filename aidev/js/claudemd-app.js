import { buildClaudeMd, lint } from './claudemd.js';

const KEY = 'aidev-claudemd:v1';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TEXT = ['name', 'overview', 'stackOther', 'cmdDev', 'cmdBuild', 'cmdTest', 'cmdLint', 'dirs', 'rules', 'donts'];
let f = { verify: true, stack: [] };
try { f = { ...f, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; } catch (_) { /* noop */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch (_) { /* noop */ } };

function bind() {
  for (const k of TEXT) {
    const el = $(`#f-${k}`);
    el.value = f[k] || '';
    el.addEventListener('input', () => { f[k] = el.value; save(); render(); });
  }
  document.querySelectorAll('input[name="stack"]').forEach((c) => {
    c.checked = (f.stack || []).includes(c.value);
    c.addEventListener('change', () => {
      f.stack = [...document.querySelectorAll('input[name="stack"]:checked')].map((x) => x.value); save(); render();
    });
  });
  const v = $('#f-verify');
  v.checked = !!f.verify;
  v.addEventListener('change', () => { f.verify = v.checked; save(); render(); });
  $('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#out').value); $('#copy').textContent = 'コピーしました'; }
    catch (_) { $('#out').select(); $('#copy').textContent = '選択しました（Ctrl/Cmd+Cでコピー）'; }
    setTimeout(() => { $('#copy').textContent = 'コピー'; }, 2000);
  });
  $('#download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([$('#out').value], { type: 'text/markdown' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'CLAUDE.md' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
}

function render() {
  const md = buildClaudeMd(f);
  $('#out').value = md;
  $('#count').textContent = `${md.split('\n').length - 1}行`;
  const tips = lint(f, md);
  $('#tips').innerHTML = tips.length ? `<ul>${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="ok">公式の目安（短く・具体的に）に沿っています。</p>';
}

bind();
render();
