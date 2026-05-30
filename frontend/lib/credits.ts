// クレジット / 謝辞のデータと、設定画面に表示するアイコン画像。
// ここを編集するだけで設定画面の表示が更新されるよう一元管理している（後から修正しやすい）。

// 設定画面に表示するアイコン画像。差し替えたい場合はこの require のパスを変える
// （または assets/icon.png を置き換える）だけでよい。
export const APP_ICON = require('../assets/icon.png');

export type CreditEntry = {
  // 役割（例: 音楽、効果音、イラスト など）
  role: string;
  // 提供者・作者名
  name: string;
  // クレジット先のURL（任意。あればタップでブラウザを開く）
  url?: string;
  // 使用した作品名など（任意）
  works?: string[];
};

// 謝辞を述べたい外部素材の一覧。項目を足したい時はこの配列に追加するだけ。
export const CREDITS: CreditEntry[] = [
  {
    role: '音楽（ゲーム中BGM）',
    name: 'BGMer',
    url: 'https://bgmer.net',
    works: ['真剣勝負', 'からあげ教室', 'グルーヴコースター', 'サイクルジョニー'],
  },
];

// 一覧の前に表示する感謝メッセージ（編集自由）
export const CREDITS_INTRO = '素敵な楽曲をお借りしています。ありがとうございます。';
