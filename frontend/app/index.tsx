import { useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { initDB, getLocalUser, saveLocalUser, getBestScore, clearLocalData } from '@/db/database';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
import { useTopBGM } from '@/hooks/useTopBGM';

export default function TitleScreen() {
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(false);
  const [userName, setUserName] = useState('');
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { start: startBGM, stop: stopBGM } = useTopBGM();

  useFocusEffect(
    useCallback(() => {
      startBGM();
      return () => stopBGM();
    }, [])
  );

  useEffect(() => {
    fetch(`${API_BASE}/health`).catch(() => {});
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
    try {
      const res = await fetch(
        `${API_BASE}/api/check-username?name=${encodeURIComponent(trimmed)}&device_id=`
      );
      if (res.ok) {
        const { available } = await res.json();
        if (!available) {
          Alert.alert('エラー', 'このユーザー名はすでに使われています');
          return;
        }
      }
    } catch {
      // オフライン時はチェックをスキップして続行
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
      <TouchableOpacity style={styles.settingsButton} onPress={() => { stopBGM(); router.push('/settings'); }}>
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>

      <Text style={styles.title}>大縄跳びサバイバル</Text>

      {bestScore !== null && (
        <Text style={styles.bestScore}>自己ベスト: {bestScore} 回</Text>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={() => { stopBGM(); router.push('/game'); }}>
        <Text style={styles.buttonText}>TAP TO START</Text>
      </TouchableOpacity>

      <View style={styles.secondaryRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => { stopBGM(); router.push('/ranking'); }}>
          <Text style={styles.secondaryButtonText}>ランキング</Text>
        </TouchableOpacity>
        <Text style={styles.secondarySep}>|</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/history')}>
          <Text style={styles.secondaryButtonText}>履歴</Text>
        </TouchableOpacity>
      </View>

      {!showResetConfirm ? (
        <TouchableOpacity style={styles.resetButton} onPress={() => setShowResetConfirm(true)}>
          <Text style={styles.resetButtonText}>データをリセット</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.resetConfirm}>
          <Text style={styles.resetConfirmText}>プレイヤー名とスコア履歴を削除します</Text>
          <View style={styles.resetConfirmButtons}>
            <TouchableOpacity style={styles.resetCancelButton} onPress={() => setShowResetConfirm(false)}>
              <Text style={styles.resetCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetDestructiveButton}
              onPress={async () => {
                setShowResetConfirm(false);
                const user = await getLocalUser();
                if (user) {
                  fetch(`${API_BASE}/api/profile?device_id=${encodeURIComponent(user.device_id)}`, {
                    method: 'DELETE',
                  }).catch(() => {});
                }
                await clearLocalData();
                setBestScore(null);
                setShowSetup(true);
              }}
            >
              <Text style={styles.resetDestructiveText}>削除する</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#aaaacc',
    fontSize: 16,
  },
  secondarySep: {
    color: '#333355',
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
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  settingsIcon: {
    fontSize: 26,
    color: '#aaaacc',
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
  resetConfirm: {
    marginTop: 32,
    alignItems: 'center',
    gap: 12,
  },
  resetConfirmText: {
    color: '#aaaacc',
    fontSize: 13,
    textAlign: 'center',
  },
  resetConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resetCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555577',
  },
  resetCancelText: {
    color: '#aaaacc',
    fontSize: 14,
  },
  resetDestructiveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#8b1a1a',
  },
  resetDestructiveText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: 'bold',
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
