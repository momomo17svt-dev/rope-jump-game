import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function RankingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ランキング</Text>
      <Text style={styles.placeholder}>オンラインランキング（Phase 3で実装）</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>戻る</Text>
      </TouchableOpacity>
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
  title: {
    color: '#e0e0ff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  placeholder: {
    color: '#888',
    fontSize: 16,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
