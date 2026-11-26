// 料金データ（USD / 100万トークン）。必ず公式ページで確認した値だけを入れ、確認日を更新する。
// cacheRead＝キャッシュ読み込み（キャッシュヒット）の単価。キャッシュ書き込みの割増は計算に含めない（画面に明記）。
export const FX = { usdJpy: 159.32, date: '2026-11-25', source: '欧州中央銀行の参照レート（Frankfurter経由）' };

export const PROVIDERS = {
  anthropic: { name: 'Anthropic（Claude）', source: 'https://platform.claude.com/docs/en/about-claude/pricing', checked: '2026-11-26', batch: 0.5 },
  openai: { name: 'OpenAI', source: 'https://platform.openai.com/docs/pricing', checked: '2026-11-26', batch: 0.5, note: '標準・短いコンテキストの料金' },
};

export const MODELS = [
  { id: 'claude-fable-5-2', name: 'Claude Fable 5.2', p: 'anthropic', in: 8, out: 40, cacheRead: 0.2 },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', p: 'anthropic', in: 4, out: 20, cacheRead: 0.2 },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', p: 'anthropic', in: 2, out: 10, cacheRead: 0.1 },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', p: 'anthropic', in: 0.1, out: 0.5, cacheRead: 0.01,
    long: { over: 100000, in: 0.5, out: 2.5, cacheRead: 0.05 } },
  { id: 'claude-opus-5', name: 'Claude Opus 5', p: 'anthropic', in: 5, out: 25, cacheRead: 0.5 },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', p: 'anthropic', in: 2, out: 10, cacheRead: 0.2 },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', p: 'anthropic', in: 3, out: 15, cacheRead: 0.3 },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', p: 'anthropic', in: 1, out: 5, cacheRead: 0.1 },
  { id: 'gpt-6.2-astra', name: 'GPT-6.2 Astra', p: 'openai', in: 8, out: 40, cacheRead: 0.4 },
  { id: 'gpt-6.2-sol', name: 'GPT-6.2 Sol', p: 'openai', in: 2, out: 10, cacheRead: 0.1 },
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', p: 'openai', in: 10, out: 50, cacheRead: 1 },
  { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', p: 'openai', in: 2, out: 10, cacheRead: 0.1 },
];
