import { useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { initDB, getLocalUser, saveLocalUser, getBestScore, clearLocalData } from '@/db/database';
import { useTopBGM } from '@/hooks/useTopBGM';

export default function TitleScreen() {
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(false);
  const [userName, setUserName] = useState('');
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const { start: startBGM, stop: stopBGM } = useTopBGM();

  useFocusEffect(
    useCallback(() => {
      startBGM();
      return () => stopBGM();
    }, [])
  );

  useEffect(() => {
    (async () => {
      await initDB();
      const user = await getLocalUser();
      if (!user) {
        setShowSetup(true);
      } else {
        const score = await getBestScore();
        setBestScore(score);
      }
      setReady(true);
    })();
  }, []);

  const handleSaveUser = async () => {
    const trimmed = userName.trim();
    if (trimmed.length < 1 || trimmed.length > 12) {
      Alert.alert('エラー', 'プレイヤー名は1〜12文字で入力してください');
      return;
    }
    const deviceId = Crypto.randomUUID();
    await saveLocalUser(deviceId, trimmed);
    const score = await getBestScore();
    setBestScore(score);
    setShowSetup(false);
  };

  if (!ready) {
    return <View style={styles.container} />;
  }

  if (showSetup) {
    return (
      <View style={styles.container}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>プレイヤー名を入力してください</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder="1〜12文字"
            placeholderTextColor="#888"
            maxLength={12}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveUser}>
            <Text style={styles.buttonText}>決定</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>大縄跳びサバイバル</Text>

      {bestScore !== null && (
        <Text style={styles.bestScore}>自己ベスト: {bestScore} 回</Text>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={() => { stopBGM(); router.push('/game'); }}>
        <Text style={styles.buttonText}>TAP TO START</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => { stopBGM(); router.push('/ranking'); }}>
        <Text style={styles.secondaryButtonText}>ランキングを見る</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => {
          Alert.alert('データをリセット', 'プレイヤー名とスコア履歴をすべて削除します。よろしいですか？', [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: 'リセット',
              style: 'destructive',
              onPress: async () => {
                await clearLocalData();
                setBestScore(null);
                setShowSetup(true);
              },
            },
          ]);
        }}
      >
        <Text style={styles.resetButtonText}>データをリセット</Text>
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e0e0ff',
    marginBottom: 16,
    letterSpacing: 2,
  },
  bestScore: {
    fontSize: 18,
    color: '#aaaacc',
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#aaaacc',
    fontSize: 16,
  },
  modalBox: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 32,
    width: 360,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#e0e0ff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resetButtonText: {
    color: '#555577',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#1a1a3e',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#4a90d9',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    width: '100%',
    marginBottom: 20,
    textAlign: 'center',
  },
});
