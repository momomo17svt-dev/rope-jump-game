// 起動クラッシュ切り分け用の最小エントリ。
// expo-router・SQLite・音声・各種Context を一切使わず、素の画面だけを表示する。
// これでもクラッシュするなら、原因はアプリのコードではなく
// 基盤（Expo SDK 54 × 新アーキ × iOS 26 × ビルド構成）にある。
import { registerRootComponent } from 'expo';
import { View, Text } from 'react-native';

function MinimalApp() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: 'bold' }}>
        MINIMAL OK
      </Text>
    </View>
  );
}

registerRootComponent(MinimalApp);
