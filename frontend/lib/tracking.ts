// App Tracking Transparency（ATT）の許可要求を安全にラップする。
// ・expo-tracking-transparency が無い環境（Expo Go 等）でもクラッシュしないよう
//   require は try/catch で遅延読み込みする。
// ・iOS 以外では何もしない。
// ・AdMob SDK は ATT のステータスを自動で参照して IDFA 利用可否を判断するため、
//   ここでは「許可を要求する」だけでよい（結果のハンドリングは不要）。
import { Platform } from 'react-native';

let mod: any = null;
try {
  mod = require('expo-tracking-transparency');
} catch {}

export async function requestTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios' || !mod?.requestTrackingPermissionsAsync) return;
  try {
    // 既に決定済みなら OS 側で即返るため毎回呼んでも二重プロンプトにはならない。
    await mod.requestTrackingPermissionsAsync();
  } catch {
    // 取得失敗はゲーム動作に影響させない（非パーソナライズ広告にフォールバック）。
  }
}
