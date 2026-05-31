import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from '@/lib/adsafe';
import { ADMOB_IOS_BANNER_ID } from '@/lib/adsConfig';

// 開発時はテストID、本番は committed な本番ユニットID（env があれば優先）。
const BANNER_ID = __DEV__
  ? TestIds.BANNER
  : (process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || ADMOB_IOS_BANNER_ID);

/**
 * 下部に広告枠を「あらかじめ確保」する再利用コンポーネント。
 * - adRemoved（広告削除購入済み）なら枠ごと消す＝余白も出さない
 * - それ以外は常に予約高さの枠を確保し、広告が読めれば中に表示、
 *   読めない/未設定でも枠は維持してレイアウトのガタつきを防ぐ
 * - 広告は ANCHORED_ADAPTIVE_BANNER（画面幅に追従）でレスポンシブ
 */
export function BannerSlot({ adRemoved }: { adRemoved: boolean }) {
  const { height } = useWindowDimensions();

  if (adRemoved) return null;

  // 画面サイズに応じた予約高さ（アダプティブバナーの一般的な範囲 50〜90 にクランプ）
  const reservedHeight = Math.round(Math.min(90, Math.max(50, height * 0.12)));
  const canShowAd = !!BannerAd && BANNER_ID !== '';

  return (
    <View style={[styles.slot, { height: reservedHeight }]}>
      {canShowAd ? (
        <BannerAd unitId={BANNER_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15152a',
  },
});
