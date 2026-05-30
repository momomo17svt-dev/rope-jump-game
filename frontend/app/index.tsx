// 【切り分け用・indexのロジックのみ版】
// import 群（expo-crypto / db / adsafe / useAd）と起動時 useEffect（fetch・initDB・
// getLocalUser・getBestScore）はそのまま実行し、描画だけ最小にしている。
// これでクラッシュ → import か useEffect が原因。INDEX-A OK 表示 → 描画(TextInput等)が原因。
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { initDB, getLocalUser, saveLocalUser, getBestScore, clearLocalData } from '@/db/database';
import { BannerAd, BannerAdSize, TestIds } from '@/lib/adsafe';
import { useAd } from '@/context/AdContext';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

const BANNER_ID = __DEV__
  ? TestIds.BANNER
  : (process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID ?? '');

export default function TitleScreen() {
  const router = useRouter();
  const { adRemoved } = useAd();
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/health`).catch(() => {});
    (async () => {
      await initDB();
      const user = await getLocalUser();
      if (user) {
        const score = await getBestScore();
        setBestScore(score);
      }
      setReady(true);
    })();
  }, []);

  // 参照を残してツリーシェイクで import が消えないようにする（切り分け用）
  void Crypto.randomUUID;
  void saveLocalUser;
  void clearLocalData;
  void BannerAd;
  void BannerAdSize;
  void BANNER_ID;
  void adRemoved;
  void router;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>INDEX-A OK {ready ? '(ready)' : ''} best={String(bestScore)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
});
