import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { initDB, getAdRemoved, setAdRemoved as dbSetAdRemoved } from '@/db/database';
import Purchases from '@/lib/purchasessafe';

type AdContextType = {
  adRemoved: boolean;
  markAdRemoved: () => Promise<void>;
};

const AdContext = createContext<AdContextType>({ adRemoved: false, markAdRemoved: async () => {} });

// RevenueCat の購入状態を確認し、有効な entitlement があれば true を返す。
// configure 済みでない / SDK 不在 / 通信失敗時は null（＝判定不能なのでローカル値を維持）。
async function checkPurchasedFromRevenueCat(): Promise<boolean | null> {
  if (Platform.OS !== 'ios' || !Purchases) return null;
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
  // iOS 公開キーは "appl_" で始まる。不正値で configure するとネイティブ例外で
  // 起動クラッシュするため、形式が正しい場合のみ初期化する。
  if (!key.startsWith('appl_')) return null;
  try {
    Purchases.configure({ apiKey: key });
    const info = await Purchases.getCustomerInfo();
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return null;
  }
}

export function AdProvider({ children }: { children: ReactNode }) {
  const [adRemoved, setAdRemoved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        const removed = await getAdRemoved();
        setAdRemoved(removed);

        // 起動時に購入状態を RevenueCat から自動同期する。
        // （再インストールやデータリセットでローカルの ad_removed が消えても、
        //  Apple ID に紐づく購入権利から自動的に広告削除を復元する）
        const purchased = await checkPurchasedFromRevenueCat();
        if (purchased === true && !removed) {
          await dbSetAdRemoved(true);
          setAdRemoved(true);
        }
      } catch (e) {
        // DB初期化に失敗しても起動を止めない（広告非削除の既定で続行）
        console.log('[AdContext] init failed', e);
      }
    })();
  }, []);

  const markAdRemoved = async () => {
    await dbSetAdRemoved(true);
    setAdRemoved(true);
  };

  return (
    <AdContext.Provider value={{ adRemoved, markAdRemoved }}>
      {children}
    </AdContext.Provider>
  );
}

export const useAd = () => useContext(AdContext);
