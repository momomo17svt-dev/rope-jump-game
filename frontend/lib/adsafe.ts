let BannerAdRaw: any = null;
let BannerAdSizeRaw: any = { BANNER: 'BANNER' };
let TestIdsRaw: any = { BANNER: '', INTERSTITIAL: '' };
let useInterstitialAdRaw: any = null;
let mobileAdsRaw: any = null;

try {
  const m = require('react-native-google-mobile-ads');
  BannerAdRaw = m.BannerAd;
  BannerAdSizeRaw = m.BannerAdSize;
  TestIdsRaw = m.TestIds;
  useInterstitialAdRaw = m.useInterstitialAd;
  mobileAdsRaw = m.default;
} catch {}

export const BannerAd = BannerAdRaw;
export const BannerAdSize = BannerAdSizeRaw;
export const TestIds = TestIdsRaw;
export const mobileAds = mobileAdsRaw;

// Google Mobile Ads SDK を初期化する。広告を load する前に一度だけ呼ぶ必要がある
// （呼ばないとバナー/インタースティシャルが永遠に load されない）。
// ネイティブモジュールが無い環境（Expo Go 等）では mobileAds が null なので no-op。
export async function initializeAds(): Promise<void> {
  if (!mobileAdsRaw) return;
  try {
    await mobileAdsRaw().initialize();
  } catch {
    // 初期化失敗はゲーム動作に影響させない（広告が出ないだけ）。
  }
}

const stubInterstitial = () => ({
  isLoaded: false,
  load: () => {},
  show: () => {},
  addAdEventListener: () => () => {},
});
export const useInterstitialAd: (unitId: string) => {
  isLoaded: boolean;
  load: () => void;
  show: () => void;
  addAdEventListener: (...args: any[]) => () => void;
} = useInterstitialAdRaw ?? stubInterstitial;
