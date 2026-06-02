// RevenueCat（課金）まわりの共通処理。
// configure はアプリで一度だけ呼ぶべきなので、ここで冪等化して
// AdContext（起動時の自動復元）・購入・復元のすべてがこの関数を経由するようにする。
import { Platform } from 'react-native';
import Purchases from '@/lib/purchasessafe';
import { REVENUECAT_IOS_KEY } from '@/lib/purchasesConfig';

let configured = false;

export function getRevenueCatKey(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || REVENUECAT_IOS_KEY;
}

// RevenueCat を一度だけ configure する。
// SDK 不在（Expo Go）／非iOS／キー形式不正の場合は false を返し、呼び出し側で安全に分岐する。
// 不正キーで configure するとネイティブ例外で起動クラッシュするため、appl_ 形式のみ初期化する。
export function ensurePurchasesConfigured(): boolean {
  if (!Purchases || Platform.OS !== 'ios') return false;
  const key = getRevenueCatKey();
  if (!key.startsWith('appl_')) return false;
  if (!configured) {
    Purchases.configure({ apiKey: key });
    configured = true;
  }
  return true;
}

// アクティブな entitlement が1つでもあれば購入済みとみなす。
// 本アプリの課金は「広告削除」のみのため、entitlement 名に依存せずこの判定で十分。
export function hasActiveEntitlement(info: any): boolean {
  return !!info && Object.keys(info?.entitlements?.active ?? {}).length > 0;
}
