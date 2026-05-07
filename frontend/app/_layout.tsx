import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import Purchases from '@/lib/purchasessafe';
import { AdProvider } from '@/context/AdContext';

export default function RootLayout() {
  useEffect(() => {
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
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="game" />
        <Stack.Screen name="result" />
        <Stack.Screen name="ranking" />
      </Stack>
    </AdProvider>
  );
}
