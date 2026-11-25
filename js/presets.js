// ひな形（入力例）。工数はあくまで例で、案件に合わせて書き換える前提。
const WP_TEMPLATE_WARN = {
  hours: 16,
  message: '既存テンプレートを流用できない新規案件では、1件24〜40時間かかることがあります。',
};

export const PRESETS = {
  corporate_wp: {
    label: 'コーポレートサイト（WordPress）',
    note: 'WordPressは「初期設計1式＋量産×件数」に分けて見積もります。量産1件は実装12h＋テスト4hの例です。',
    items: [
      { name: '初期設計（テーマ設計・共通部品・カスタム投稿）', qty: 1, unit: '式', hours: 32 },
      { name: 'テンプレート量産（実装＋テスト）', qty: 6, unit: '件', hours: 16, warnBelow: WP_TEMPLATE_WARN },
      { name: 'お問い合わせフォーム', qty: 1, unit: '式', hours: 8 },
      { name: 'サーバー・ドメイン設定、公開作業', qty: 1, unit: '式', hours: 6 },
    ],
    sepRate: 20, parRate: 15, bufRate: 10, preDays: 1,
  },
  lp: {
    label: 'LP（1ページ）',
    note: '工数は入力例です。デザインデータの有無やアニメーションの量で大きく変わります。',
    items: [
      { name: '構成確認・ワイヤーフレーム', qty: 1, unit: '式', hours: 8 },
      { name: 'コーディング（PC・SP）', qty: 1, unit: '式', hours: 24 },
      { name: 'フォーム実装', qty: 1, unit: '式', hours: 6 },
      { name: '計測タグ設置・公開作業', qty: 1, unit: '式', hours: 4 },
    ],
    sepRate: 20, parRate: 15, bufRate: 10, preDays: 1,
  },
};

export function stateFromPreset(key, base = {}) {
  const p = PRESETS[key];
  return {
    ...base,
    preset: key,
    items: p.items.map((it) => ({ ...it })),
    sepRate: p.sepRate, parRate: p.parRate, bufRate: p.bufRate, preDays: p.preDays,
  };
}
