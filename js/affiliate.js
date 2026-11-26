// 会計ソフトの紹介（アフィリエイト）。もしもアフィリエイトの承認後に links を埋める。
// 空のあいだは何も表示しない。表示するときは必ず「PR」を明記する（景品表示法のステマ規制）。
// 例：{ name: 'freee会計', text: '見積書から請求・帳簿までまとめて管理するなら', href: 'https://af.moshimo.com/af/c/click?...', pixel: 'https://i.moshimo.com/af/i/impression?...' }
export const AFFILIATE = {
  heading: '見積書を作ったら、次は請求と帳簿づけ',
  links: [],
};

export function renderAffiliate(el) {
  if (!el || !AFFILIATE.links.length) { if (el) el.hidden = true; return; }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  el.hidden = false;
  el.innerHTML = `<p class="pr-label">PR（広告）</p><h3>${esc(AFFILIATE.heading)}</h3><ul>${AFFILIATE.links.map((l) =>
    `<li><a href="${esc(l.href)}" rel="sponsored noopener" target="_blank">${esc(l.name)}</a>：${esc(l.text)}${l.pixel ? `<img src="${esc(l.pixel)}" width="1" height="1" alt="" loading="lazy">` : ''}</li>`).join('')}</ul>`;
}
