// プレイヤー名の不適切語フィルタ（UGC対策の一次フィルタ）。
// 完全網羅は不可能だが、明らかな不適切語をブロックする「フィルタの手段」を提供する。
// すり抜けた分はランキングの通報・ブロック機能で対処する設計。

// 小文字化・記号/空白除去した文字列に対して部分一致で判定する。
const BANNED_SUBSTRINGS = [
  // English profanity / slurs
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'nigger', 'faggot', 'rape', 'porn', 'sex',
  // 日本語（卑語・差別・暴力的表現の代表例）
  'しね', '死ね', 'ころす', '殺す', 'きえろ', 'ばか', 'あほ', 'うんこ', 'ちんこ', 'まんこ',
  'せっくす', 'ふぁっく', 'きちがい', 'ぶっころ',
];

// 比較用に正規化（小文字化・空白/記号除去）
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s!-/:-@[-`{-~、。・！？　]/g, '');
}

// 使用可能な名前なら true、不適切語を含むなら false
export function isNameAllowed(name: string): boolean {
  const n = normalize(name);
  if (n.length === 0) return false;
  return !BANNED_SUBSTRINGS.some((w) => n.includes(w));
}
