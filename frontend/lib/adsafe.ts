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
