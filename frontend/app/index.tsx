// 【切り分け用・最小タイトル画面】
// initDB / getLocalUser / fetch / useAd / BannerAd / Crypto などを全て外し、
// 素の画面だけにしている。元の実装は git 履歴 (feb2267) に保存済み。
import { View, Text } from 'react-native';

export default function TitleScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
        ROUTER OK
      </Text>
    </View>
  );
}
