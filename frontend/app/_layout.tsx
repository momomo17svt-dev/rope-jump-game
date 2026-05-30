// 【切り分け用・最小レイアウト】
// AdProvider / BGM / ErrorBoundary / Purchases / installErrorHandler を全て外し、
// expo-router の素の Stack だけにしている。元の実装は git 履歴 (feb2267) に保存済み。
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="game" />
      <Stack.Screen name="result" />
      <Stack.Screen name="ranking" />
    </Stack>
  );
}
