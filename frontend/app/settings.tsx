import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getLocalUser, updateUserName, updateAvatarUris } from '@/db/database';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export default function SettingsScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [standUri, setStandUri] = useState<string | null>(null);
  const [jumpUri, setJumpUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [permissionMsg, setPermissionMsg] = useState('');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getLocalUser();
      if (user) {
        setUserName(user.user_name);
        setStandUri(user.avatar_stand_uri);
        setJumpUri(user.avatar_jump_uri);
      }
    })();
  }, []);

  const pickImage = async (type: 'stand' | 'jump') => {
    setPermissionMsg('');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPermissionMsg('カメラロールへのアクセスを許可してください');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const srcUri = result.assets[0].uri;
    const dir = FileSystem.documentDirectory + 'avatars/';
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const prevUri = type === 'stand' ? standUri : jumpUri;
    if (prevUri?.startsWith(dir)) {
      await FileSystem.deleteAsync(prevUri, { idempotent: true });
    }

    const dest = dir + `${type}_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: srcUri, to: dest });

    if (type === 'stand') setStandUri(dest);
    else setJumpUri(dest);
  };

  const resetAvatar = (type: 'stand' | 'jump') => {
    if (type === 'stand') setStandUri(null);
    else setJumpUri(null);
  };

  const saveAll = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const trimmed = userName.trim();
    if (trimmed.length < 1 || trimmed.length > 12) {
      setErrorMsg('プレイヤー名は1〜12文字で入力してください');
      return;
    }
    setSaving(true);
    try {
      const user = await getLocalUser();

      // 名前が変わっている場合のみサーバーで重複チェック
      if (user && trimmed !== user.user_name) {
        try {
          const res = await fetch(
            `${API_BASE}/api/check-username?name=${encodeURIComponent(trimmed)}&device_id=${encodeURIComponent(user.device_id)}`
          );
          if (res.ok) {
            const { available } = await res.json();
            if (!available) {
              setErrorMsg('このユーザー名はすでに使われています');
              return;
            }
          }
        } catch {
          // オフライン時はチェックをスキップして保存を続行
        }
      }

      await updateUserName(trimmed);
      await updateAvatarUris(standUri, jumpUri);

      // ランキングのユーザー名のみ更新（last_played_at は変えない）
      if (user) {
        fetch(`${API_BASE}/api/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: user.device_id, user_name: trimmed }),
        }).catch(() => {});
      }

      setSuccessMsg('保存しました');
      setTimeout(() => router.back(), 800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'< 戻る'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>設定</Text>
      </View>

      {/* ユーザー名 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ユーザー名</Text>
        <TextInput
          style={styles.input}
          value={userName}
          onChangeText={(v) => { setUserName(v); setErrorMsg(''); }}
          placeholder="1〜12文字"
          placeholderTextColor="#888"
          maxLength={12}
        />
        {errorMsg !== '' && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>

      {/* 立ちアバター */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>キャラクター（立ち）</Text>
        <View style={styles.avatarRow}>
          <View style={styles.avatarBox}>
            {standUri ? (
              <Image source={{ uri: standUri }} style={styles.avatarPreview} />
            ) : (
              <Image source={require('../assets/figure_stand_front.png')} style={styles.avatarPreview} />
            )}
          </View>
          <View style={styles.avatarButtons}>
            <TouchableOpacity style={styles.pickButton} onPress={() => pickImage('stand')}>
              <Text style={styles.pickButtonText}>変更</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={() => resetAvatar('stand')}>
              <Text style={styles.resetButtonText}>デフォルト</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ジャンプアバター */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>キャラクター（ジャンプ）</Text>
        <View style={styles.avatarRow}>
          <View style={styles.avatarBox}>
            {jumpUri ? (
              <Image source={{ uri: jumpUri }} style={styles.avatarPreview} />
            ) : (
              <Image source={require('../assets/figure_jump.png')} style={styles.avatarPreview} />
            )}
          </View>
          <View style={styles.avatarButtons}>
            <TouchableOpacity style={styles.pickButton} onPress={() => pickImage('jump')}>
              <Text style={styles.pickButtonText}>変更</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={() => resetAvatar('jump')}>
              <Text style={styles.resetButtonText}>デフォルト</Text>
            </TouchableOpacity>
          </View>
        </View>
        {permissionMsg !== '' && <Text style={styles.errorText}>{permissionMsg}</Text>}
      </View>

      {/* 背景除去ヒント */}
      <View style={styles.hintBox}>
        <TouchableOpacity
          style={styles.hintHeader}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowHint(v => !v);
          }}
        >
          <Text style={styles.hintHeaderText}>💡 背景を消すには？</Text>
          <Text style={styles.hintChevron}>{showHint ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showHint && (
          <View style={styles.hintBody}>
            <Text style={styles.hintNote}>iOS 16以降の機能を使うと、アプリ外で背景を除去できます。</Text>
            <View style={styles.hintStep}>
              <Text style={styles.hintNum}>1</Text>
              <Text style={styles.hintText}>写真アプリで使いたい写真を開く</Text>
            </View>
            <View style={styles.hintStep}>
              <Text style={styles.hintNum}>2</Text>
              <Text style={styles.hintText}>人物部分を長押し →「被写体をコピー」を選択</Text>
            </View>
            <View style={styles.hintStep}>
              <Text style={styles.hintNum}>3</Text>
              <Text style={styles.hintText}>メモアプリを開いて長押し → 貼り付け</Text>
            </View>
            <View style={styles.hintStep}>
              <Text style={styles.hintNum}>4</Text>
              <Text style={styles.hintText}>貼り付けた画像を長押し →「写真に保存」</Text>
            </View>
            <View style={styles.hintStep}>
              <Text style={styles.hintNum}>5</Text>
              <Text style={styles.hintText}>ゲームに戻って「変更」から保存した画像を選択</Text>
            </View>
          </View>
        )}
      </View>

      {/* 保存 */}
      <TouchableOpacity
        style={[styles.saveButton, (saving || successMsg !== '') && styles.saveButtonDisabled]}
        onPress={saveAll}
        disabled={saving || successMsg !== ''}
      >
        <Text style={styles.saveButtonText}>
          {successMsg !== '' ? successMsg : saving ? '保存中...' : '保存する'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    color: '#4a90d9',
    fontSize: 16,
  },
  title: {
    color: '#e0e0ff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#aaaacc',
    fontSize: 14,
    marginBottom: 10,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#2a2a4e',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#4a90d9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    marginTop: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarBox: {
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4a90d9',
    backgroundColor: '#2a2a4e',
  },
  avatarPreview: {
    width: 90,
    height: 90,
    resizeMode: 'cover',
  },
  avatarButtons: {
    gap: 10,
  },
  pickButton: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555577',
  },
  resetButtonText: {
    color: '#aaaacc',
    fontSize: 14,
  },
  hintBox: {
    borderWidth: 1,
    borderColor: '#2a2a4e',
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  hintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1e1e3a',
  },
  hintHeaderText: {
    color: '#aaaacc',
    fontSize: 14,
  },
  hintChevron: {
    color: '#555577',
    fontSize: 12,
  },
  hintBody: {
    padding: 14,
    gap: 10,
  },
  hintNote: {
    color: '#7777aa',
    fontSize: 12,
    marginBottom: 4,
  },
  hintStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  hintNum: {
    color: '#4a90d9',
    fontSize: 13,
    fontWeight: 'bold',
    width: 18,
    textAlign: 'center',
    marginTop: 1,
  },
  hintText: {
    color: '#ccccee',
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#4a90d9',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
