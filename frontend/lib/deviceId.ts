import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY = 'device_id';

// device_id を Keychain（SecureStore）に保存し、再インストール後も同じ ID を復元する。
// iOS の Keychain はアプリをアンインストールしても残るため、同じ端末で入れ直しても
// 同一 ID に戻り、ランキングへの二重登録（孤立データ）を防げる。
// iCloud Keychain がオンなら端末間でも共有される。
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) return existing;
  } catch {
    // SecureStore 不可（古い端末/権限など）の場合は新規生成にフォールバック
  }
  const id = Crypto.randomUUID();
  try {
    await SecureStore.setItemAsync(KEY, id);
  } catch {
    // 保存失敗時もこのセッションの ID として返す（次回は再生成され得る）
  }
  return id;
}

// 「データをリセット」時に呼ぶ。次回登録で新しい ID が発番され、別ユーザーとして開始する。
export async function clearDeviceId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // 失敗しても致命的ではない
  }
}
