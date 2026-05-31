// RevenueCat の iOS 公開APIキー（appl_ で始まる）。
// これはクライアントに埋め込む前提の「公開キー」であり秘密情報ではないので、
// リポジトリに直接置く（.env が CI ビルドに含まれず空になる事故を避けるため）。
// 環境変数 EXPO_PUBLIC_REVENUECAT_IOS_KEY が設定されていればそちらを優先する。
export const REVENUECAT_IOS_KEY = 'appl_gvDaaREBnYzBOVEYWdTZChnaWyG';
