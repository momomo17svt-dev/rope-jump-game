import '@/lib/installErrorHandler';
import { useEffect } from 'react';
import { Stack, useSegments } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { requestTrackingPermission } from '@/lib/tracking';
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
    // 横画面に明示ロックする。app.json の orientation だけだと Expo Go では
    // ネイティブのアラート/ピッカー表示時に縦へ回ってしまうため、起動時に
    // ScreenOrientation でロックして横を維持する（製品版は Info.plist で固定済み）。
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});

    // 広告（IDFA）利用のため App Tracking Transparency の許可を要求する。
    // ・RevenueCat の configure / 購入状態同期は AdProvider 側で実施。
    // ・AdMob は本番広告ID未設定時は描画されず、初回広告表示時に遅延初期化される。
    requestTrackingPermission();
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
