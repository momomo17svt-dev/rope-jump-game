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
