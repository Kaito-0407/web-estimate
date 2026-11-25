// 見積もりの計算（画面から独立した純粋な関数。テストもこれを直接呼ぶ）
//
// 3層見積もり
//   A  直接費            = Σ(数量 × 1単位あたり工数)
//   別枠 統合テスト・修正 = A × 別枠率（推奨 20〜25%）
//   B  並列稼働の調整費   = A × 並列率（推奨 15〜20%）
//   C  リスク対応費       = (A + B) × バッファ率（推奨 10〜15%）
//   公開前の検証          = 日数 × 1日の時間
//   合計工数 = A + 別枠 + B + C + 公開前
//   金額 = 工数 × 時間単価（= 人日単価 ÷ 1日の時間）、税は合計に対して計算

export const RECOMMENDED = {
  sepRate: [20, 25],
  parRate: [15, 20],
  bufRate: [10, 15],
};

const floor = (n) => Math.floor(n + 1e-9);

export function calculate(state) {
  const hoursPerDay = Number(state.hoursPerDay) || 8;
  const hourly = (Number(state.dayRate) || 0) / hoursPerDay;
  const items = (state.items || []).map((it) => {
    const qty = Number(it.qty) || 0;
    const hours = Number(it.hours) || 0;
    const h = qty * hours;
    return { ...it, qty, hours, totalHours: h, amount: floor(h * hourly) };
  });
  const A = items.reduce((s, it) => s + it.totalHours, 0);
  const sep = A * (Number(state.sepRate) || 0) / 100;
  const B = A * (Number(state.parRate) || 0) / 100;
  const C = (A + B) * (Number(state.bufRate) || 0) / 100;
  const pre = (Number(state.preDays) || 0) * hoursPerDay;
  const totalHours = A + sep + B + C + pre;

  const lines = [
    ...items.map((it) => ({ label: it.name, qty: it.qty, unit: it.unit, hours: it.totalHours, amount: it.amount, kind: 'item' })),
    { label: '統合テスト・修正対応', hours: sep, amount: floor(sep * hourly), kind: 'sep' },
    { label: '進行・並行作業の調整費', hours: B, amount: floor(B * hourly), kind: 'par' },
    { label: 'リスク対応費', hours: C, amount: floor(C * hourly), kind: 'buf' },
    { label: '公開前の検証', hours: pre, amount: floor(pre * hourly), kind: 'pre' },
  ].filter((l) => l.kind === 'item' || l.hours > 0);

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const taxRate = Number(state.taxRate ?? 10);
  const tax = floor(subtotal * taxRate / 100);
  return {
    hourly, A, sep, B, C, pre, totalHours,
    lines, subtotal, taxRate, tax, total: subtotal + tax,
    days: totalHours / hoursPerDay,
    warnings: warnings(state, A),
  };
}

export function warnings(state, A) {
  const w = [];
  const [s0] = RECOMMENDED.sepRate, [p0] = RECOMMENDED.parRate, [b0] = RECOMMENDED.bufRate;
  if (A <= 0) w.push('工数が入力されていません。');
  if (Number(state.parRate) === 0) w.push('並列稼働の調整費が0%です。複数人・複数案件で同時に動くなら15〜20%を見込んでください。リスク対応費では代わりになりません。');
  else if (Number(state.parRate) < p0) w.push(`並列稼働の調整費が推奨（${RECOMMENDED.parRate.join('〜')}%）より低めです。`);
  if (Number(state.sepRate) < s0) w.push(`統合テスト・修正対応が推奨（${RECOMMENDED.sepRate.join('〜')}%）より低めです。実装に含めたつもりでも、統合と先方修正は別に発生します。`);
  if (Number(state.bufRate) < b0) w.push(`リスク対応費が推奨（${RECOMMENDED.bufRate.join('〜')}%）より低めです。`);
  for (const it of state.items || []) {
    if (it.warnBelow && Number(it.hours) < it.warnBelow.hours) w.push(`「${it.name}」が${it.hours}時間です。${it.warnBelow.message}`);
  }
  return w;
}

export const yen = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');
export const hrs = (n) => (Math.round(n * 10) / 10).toLocaleString('ja-JP') + 'h';
