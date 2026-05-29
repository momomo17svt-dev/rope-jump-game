import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initDB, getAdRemoved, setAdRemoved as dbSetAdRemoved } from '@/db/database';

type AdContextType = {
  adRemoved: boolean;
  markAdRemoved: () => Promise<void>;
};

const AdContext = createContext<AdContextType>({ adRemoved: false, markAdRemoved: async () => {} });

export function AdProvider({ children }: { children: ReactNode }) {
  const [adRemoved, setAdRemoved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        const removed = await getAdRemoved();
        setAdRemoved(removed);
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
