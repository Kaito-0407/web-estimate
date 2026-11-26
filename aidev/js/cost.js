// 料金計算（画面から独立。テストもこれを呼ぶ）
import { MODELS, PROVIDERS, FX } from './prices.js';

export function rates(model, inputTokens) {
  return model.long && inputTokens > model.long.over ? { ...model, ...model.long, longTier: true } : { ...model, longTier: false };
}

// q: { inputTokens, outputTokens, cacheShare(0-100), perDay, days, batch(bool), usdJpy }
export function monthly(model, q) {
  const inT = Math.max(0, Number(q.inputTokens) || 0);
  const outT = Math.max(0, Number(q.outputTokens) || 0);
  const share = Math.min(100, Math.max(0, Number(q.cacheShare) || 0)) / 100;
  const r = rates(model, inT);
  const perReq = (inT * (1 - share) * r.in + inT * share * r.cacheRead + outT * r.out) / 1e6;
  const factor = q.batch ? PROVIDERS[model.p].batch : 1;
  const n = (Number(q.perDay) || 0) * (Number(q.days) || 0);
  const usd = perReq * factor * n;
  return { usd, jpy: usd * (Number(q.usdJpy) || FX.usdJpy), perReqUsd: perReq * factor, requests: n, longTier: r.longTier };
}

export function compareAll(q) {
  return MODELS.map((m) => ({ model: m, ...monthly(m, q) })).sort((a, b) => a.usd - b.usd);
}

export const fmtUsd = (n) => '$' + (n < 1 ? n.toFixed(4) : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
export const fmtJpy = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');
