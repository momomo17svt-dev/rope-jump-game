import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { initDB, getLocalUser, saveLocalUser, getBestScore, clearLocalData } from '@/db/database';
import { useAd } from '@/context/AdContext';
import { API_BASE } from '@/lib/api';
import { isNameAllowed } from '@/lib/nameFilter';
import { getOrCreateDeviceId, clearDeviceId } from '@/lib/deviceId';
import { BannerSlot } from '@/components/BannerSlot';

const TERMS_URL = 'https://rope-jump-game.netlify.app/terms';

export default function TitleScreen() {
  const router = useRouter();
  const { adRemoved } = useAd();
  const [showSetup, setShowSetup] = useState(false);
  const [userName, setUserName] = useState('');
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // UGC（公開アバター/名前）アプリのため、初回登録時に利用規約への同意を必須化する
  const [agreed, setAgreed] = useState(false);

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
    if (!isNameAllowed(trimmed)) {
      Alert.alert('エラー', '使用できない言葉が含まれています');
      return;
    }
    if (!agreed) {
      Alert.alert('確認', '利用規約への同意が必要です');
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
    // Keychain に保存済みの device_id を復元（再インストールでも同一ID＝重複登録を防ぐ）
    const deviceId = await getOrCreateDeviceId();
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

          {/* UGC対策：利用規約への同意（不適切な画像・名前の投稿禁止） */}
          <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed((v) => !v)} activeOpacity={0.7}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.agreeText}>
              <Text style={styles.agreeLink} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>
                利用規約
              </Text>
              に同意し、不適切な画像・名前を登録しません
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, !agreed && styles.primaryButtonDisabled]}
            onPress={handleSaveUser}
            disabled={!agreed}
          >
            <Text style={styles.buttonText}>決定</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>

        <Text style={styles.title}>大縄跳びサバイバル</Text>

        {bestScore !== null && (
          <Text style={styles.bestScore}>自己ベスト: {bestScore} 回</Text>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/game')}>
          <Text style={styles.buttonText}>TAP TO START</Text>
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/ranking')}>
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
                  // 次回登録で新しい ID を発番する（明示リセット＝別ユーザーとして開始）
                  await clearDeviceId();
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

      {/* 広告枠を下部にあらかじめ確保（adRemoved 購入済みなら枠ごと非表示） */}
      <BannerSlot adRemoved={adRemoved} />
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
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
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
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#7777aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#4a90d9',
    borderColor: '#4a90d9',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  agreeText: {
    flex: 1,
    color: '#aaaacc',
    fontSize: 13,
    lineHeight: 19,
  },
  agreeLink: {
    color: '#4a90d9',
    textDecorationLine: 'underline',
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
