// App Tracking Transparency（ATT）の許可要求を安全にラップする。
// ・expo-tracking-transparency が無い環境（Expo Go 等）でもクラッシュしないよう
//   require は try/catch で遅延読み込みする。
// ・iOS 以外では何もしない。
// ・AdMob SDK は ATT のステータスを自動で参照して IDFA 利用可否を判断するため、
//   ここでは「許可を要求する」だけでよい（結果のハンドリングは不要）。
//
// 重要：ATT のプロンプトはアプリが前面で active のときしか表示されない。
// 起動直後（mount時＝まだ inactive/launching）に要求すると iOS が無言でプロンプトを
// 出さず、許可ダイアログが現れない（iPadOS 26 の審査で指摘された）。
// そのため AppState が active になるのを待ち、初回画面の提示が安定してから要求する。
import { Platform, AppState, AppStateStatus } from 'react-native';

let mod: any = null;
try {
  mod = require('expo-tracking-transparency');
} catch {}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// アプリが active になるまで待つ（既に active なら即解決）。
function waitUntilActive(): Promise<void> {
  return new Promise((resolve) => {
    if (AppState.currentState === 'active') {
      resolve();
      return;
    }
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        sub.remove();
        resolve();
      }
    });
  });
}

export async function requestTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios' || !mod?.requestTrackingPermissionsAsync) return;
  try {
    // 既に決定済み（granted/denied）なら何もしない。未決定のときだけ要求する。
    if (mod.getTrackingPermissionsAsync) {
      const current = await mod.getTrackingPermissionsAsync();
      if (current?.status && current.status !== 'undetermined') return;
    }
    // active を待ってから、さらに少し遅延して要求する（active直後の取りこぼし対策）。
    await waitUntilActive();
    await delay(600);
    await mod.requestTrackingPermissionsAsync();
  } catch {
    // 取得失敗はゲーム動作に影響させない（非パーソナライズ広告にフォールバック）。
  }
}
