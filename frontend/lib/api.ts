// バックエンド API のベース URL。
//
// EXPO_PUBLIC_API_BASE_URL（frontend/.env か Codemagic の環境変数）から取得するが、
// .env は .gitignore 対象で Codemagic のビルドに含まれないため、未設定時は本番URLへ
// フォールバックする。空文字のままだと fetch('/path') が相対URLになり、React Native の
// fetch が「TypeError: Invalid URL」を“同期throw”して起動時にアプリを落とすため、
// 必ず絶対URLになるようにしている（これが起動クラッシュの根本原因だった）。
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://rope-jump-game.onrender.com';
