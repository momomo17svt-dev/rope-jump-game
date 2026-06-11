// AdMob の本番広告ユニットID（iOS）。
// これらは秘密情報ではなく、ビルド時にアプリへ焼き込まれる公開値なので
// リポジトリに直接置く（.env が CI ビルドに含まれず空になる事故を避けるため）。
// 環境変数 EXPO_PUBLIC_ADMOB_IOS_* が設定されていればそちらを優先する。
//
// 本番 App ID（ca-app-pub-...~...）は app.json の react-native-google-mobile-ads
// プラグイン設定（iosAppId）側に置いている。
export const ADMOB_IOS_BANNER_ID = 'ca-app-pub-8414918706609681/8431843760';
export const ADMOB_IOS_INTERSTITIAL_ID = 'ca-app-pub-8414918706609681/8573040456';

const ADMOB_UNIT_ID_PATTERN = /^ca-app-pub-\d{16}\/\d+$/;

export function resolveAdMobUnitId(envValue: string | undefined, fallback: string): string {
  const candidate = envValue?.trim();
  return candidate && ADMOB_UNIT_ID_PATTERN.test(candidate) ? candidate : fallback;
}
