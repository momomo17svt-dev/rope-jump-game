// AdMob は本番設定が未完了のため一時的に無効化している。
// （react-native-google-mobile-ads をアンインストールし、起動時クラッシュの
//  原因切り分けを行うための暫定対応。設定が整い次第ネイティブ再導入する。）

export const BannerAd: any = null;
export const BannerAdSize: any = { BANNER: 'BANNER' };
export const TestIds: any = { BANNER: '', INTERSTITIAL: '' };
export const mobileAds: any = null;

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
} = stubInterstitial;
