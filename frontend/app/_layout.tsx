import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useSegments } from 'expo-router';
import Purchases from '@/lib/purchasessafe';
import { mobileAds } from '@/lib/adsafe';
import { AdProvider } from '@/context/AdContext';
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
    if (mobileAds) {
      try {
        mobileAds().initialize().catch(() => {});
      } catch {}
    }
    
    if (Platform.OS === 'ios' && Purchases) {
      const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
      if (key && key !== 'your_revenuecat_ios_key_here') {
        try {
          Purchases.configure({ apiKey: key });
        } catch {}
      }
    }
  }, []);

  return (
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
  );
}
