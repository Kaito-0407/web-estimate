// CLAUDE.md のひな形を作る（純粋な関数。テストもこれを呼ぶ）
// 公式の推奨（code.claude.com/docs/en/memory）：具体的に書く／見出しと箇条書きで整理／1ファイル200行未満が目安

export const LINE_TARGET = 200;

const lines = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);

export function buildClaudeMd(f) {
  const out = [];
  out.push(`# ${f.name?.trim() || 'プロジェクト名'}`, '');
  if (f.overview?.trim()) out.push(f.overview.trim(), '');
  const stack = [...(f.stack || []), ...lines(f.stackOther)];
  if (stack.length) out.push('## 技術スタック', ...stack.map((s) => `- ${s}`), '');
  const cmds = [['開発サーバー', f.cmdDev], ['ビルド', f.cmdBuild], ['テスト', f.cmdTest], ['Lint・整形', f.cmdLint]].filter(([, v]) => v?.trim());
  if (cmds.length) out.push('## コマンド', ...cmds.map(([k, v]) => `- ${k}: \`${v.trim()}\``), '');
  const dirs = lines(f.dirs);
  if (dirs.length) out.push('## ディレクトリ', ...dirs.map((d) => `- ${d}`), '');
  const rules = lines(f.rules);
  if (rules.length) out.push('## ルール', ...rules.map((r) => `- ${r}`), '');
  const nos = lines(f.donts);
  if (nos.length) out.push('## してはいけないこと', ...nos.map((r) => `- ${r}`), '');
  if (f.verify) out.push('## 完了の条件', `- 変更したら \`${f.cmdTest?.trim() || 'テスト'}\` を実行し、通ってから完了と報告する`, '');
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n') + '\n';
}

// 抽象的すぎる書き方の検出（公式の例：「きちんと整形する」より「2スペースでインデント」）
const VAGUE = ['きれいに', 'きちんと', '適切に', 'ちゃんと', 'いい感じに', 'なるべく', '整理して', '気をつけて'];
export function lint(f, md) {
  const tips = [];
  const n = md.split('\n').length;
  if (n >= LINE_TARGET) tips.push(`${n}行あります。公式の目安は1ファイル200行未満です。一部の場所だけで使う指示は .claude/rules/ に分けてください。`);
  for (const r of [...lines(f.rules), ...lines(f.donts)]) {
    const w = VAGUE.find((v) => r.includes(v));
    if (w) tips.push(`「${r}」は「${w}」が抽象的です。確かめられる形に（例：「2スペースでインデント」「コミット前に npm test を実行」）。`);
  }
  if (!f.cmdTest?.trim()) tips.push('テストのコマンドが空です。Claudeが自分で確認できるよう、書いておくのがおすすめです。');
  return tips;
}
