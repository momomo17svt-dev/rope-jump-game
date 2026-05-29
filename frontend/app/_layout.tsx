import '@/lib/installErrorHandler';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useSegments } from 'expo-router';
import Purchases from '@/lib/purchasessafe';
import { AdProvider } from '@/context/AdContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTopBGM } from '@/hooks/useTopBGM';
import { usePlayBGM } from '@/hooks/usePlayBGM';

const NO_BGM_SEGMENTS = new Set(['game', 'result']);
const PLAY_BGM_SEGMENTS = new Set(['game', 'result']);

function BGMController() {
  const { start, stop } = useTopBGM();
  const segments = useSegments();
  const current = segments[0] ?? '';

  useEffect(() => {
    if (NO_BGM_SEGMENTS.has(current)) {
      stop();
    } else {
      start();
    }
  }, [current]);

  return null;
}

function PlayBGMController() {
  const { start, stop } = usePlayBGM();
  const segments = useSegments();
  const current = segments[0] ?? '';

  useEffect(() => {
    if (PLAY_BGM_SEGMENTS.has(current)) {
      start();
    } else {
      stop();
    }
  }, [current]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    // AdMob は本番広告IDが未設定（広告は描画されない）ため起動時に初期化しない。
    // ネイティブ広告SDKは初回広告表示時に遅延初期化される。
    if (Platform.OS === 'ios' && Purchases) {
      const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
      // RevenueCat の iOS 公開キーは "appl_" で始まる。不正な値で configure すると
      // ネイティブ例外で起動クラッシュするため、形式が正しい場合のみ初期化する。
      if (key.startsWith('appl_')) {
        try {
          Purchases.configure({ apiKey: key });
        } catch {}
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <AdProvider>
        <BGMController />
        <PlayBGMController />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="game" />
          <Stack.Screen name="result" />
          <Stack.Screen name="ranking" />
        </Stack>
      </AdProvider>
    </ErrorBoundary>
  );
}
