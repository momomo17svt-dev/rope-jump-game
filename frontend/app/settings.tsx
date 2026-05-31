import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, LayoutAnimation, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getLocalUser, updateUserName, updateAvatarUris } from '@/db/database';
import Purchases from '@/lib/purchasessafe';
import { useAd } from '@/context/AdContext';
import { API_BASE } from '@/lib/api';
import { makeAvatarThumb, cropCenterSquare } from '@/lib/avatar';
import removeBackground from '@/lib/bgremoversafe';
import { APP_ICON, CREDITS, CREDITS_INTRO } from '@/lib/credits';

const PRIVACY_URL = 'https://rope-jump-game.netlify.app/privacy';
const TERMS_URL = 'https://rope-jump-game.netlify.app/terms';
// App Store のレビュー（評価）作成画面を直接開く。id は App Store Connect のアプリID。
const REVIEW_URL = 'https://apps.apple.com/app/id6774147200?action=write-review';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const openURL = (url: string) => {
  Linking.openURL(url).catch(() => {});
};

export default function SettingsScreen() {
  const router = useRouter();
  const { adRemoved, markAdRemoved } = useAd();
  const [userName, setUserName] = useState('');
  const [standUri, setStandUri] = useState<string | null>(null);
  const [jumpUri, setJumpUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [permissionMsg, setPermissionMsg] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  // 背景削除の進行中フラグ（どちらの絵を処理中か）
  const [removingBg, setRemovingBg] = useState<'stand' | 'jump' | null>(null);
  // 設定画面はメニュー一覧（'menu'）と各詳細を同一画面内で切り替える。
  // 横画面固定アプリのため Modal は使わず条件レンダリングで実装している。
  const [page, setPage] = useState<'menu' | 'profile' | 'character' | 'purchase' | 'about'>('menu');

  const openSection = (key: 'profile' | 'character' | 'purchase' | 'about') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setErrorMsg('');
    setSuccessMsg('');
    setPermissionMsg('');
    setPage(key);
  };

  const backToMenu = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setErrorMsg('');
    setSuccessMsg('');
    setPage('menu');
  };

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

    // allowsEditing は使わない。iPhone では縦専用の UIImagePickerController クロップ画面が
    // 開いて横画面が一瞬縦に回ってしまうため。横対応の PHPicker で選び、正方形クロップは
    // 選択後に cropCenterSquare（expo-image-manipulator）でアプリ側から行う。
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const srcUri = await cropCenterSquare(asset.uri, asset.width, asset.height);
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

  // 選択中の画像から背景を削除する（オンデバイス処理）。
  // 結果は透過PNGとして avatars/ に保存し直し、元ファイルは削除する。
  const removeBg = async (type: 'stand' | 'jump') => {
    const uri = type === 'stand' ? standUri : jumpUri;
    if (!uri) return;
    // Expo Go ではネイティブモジュールが無いため null。製品版でのみ動作する。
    if (!removeBackground) {
      Alert.alert('利用できません', 'この機能は製品版アプリ（実機）でのみ利用できます。');
      return;
    }
    setRemovingBg(type);
    try {
      const resultUri = await removeBackground(uri);
      const dir = FileSystem.documentDirectory + 'avatars/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = dir + `${type}_nobg_${Date.now()}.png`;
      await FileSystem.copyAsync({ from: resultUri, to: dest });
      // 直前のファイルが自前ディレクトリのものなら削除して溜め込まない
      if (uri.startsWith(dir)) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
      if (type === 'stand') setStandUri(dest);
      else setJumpUri(dest);
    } catch {
      Alert.alert('エラー', '背景の削除に失敗しました。別の画像でお試しください。');
    } finally {
      setRemovingBg(null);
    }
  };

  const handlePurchaseRemoveAds = async () => {
    if (!Purchases) {
      Alert.alert('エラー', '現在この環境では購入できません');
      return;
    }
    setPurchasing(true);
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) {
        Alert.alert('エラー', '購入情報を取得できませんでした');
        return;
      }
      await Purchases.purchasePackage(pkg);
      await markAdRemoved();
      Alert.alert('完了', '広告が削除されました！');
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('エラー', '購入に失敗しました');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!Purchases) {
      Alert.alert('エラー', '現在この環境では復元できません');
      return;
    }
    setPurchasing(true);
    try {
      const info = await Purchases.restorePurchases();
      if (Object.keys(info.entitlements.active).length > 0) {
        await markAdRemoved();
        Alert.alert('復元完了', '広告が削除されました！');
      } else {
        Alert.alert('復元失敗', '購入履歴が見つかりませんでした');
      }
    } catch {
      Alert.alert('エラー', '復元に失敗しました');
    } finally {
      setPurchasing(false);
    }
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

      // 立ち絵アバターのサムネ（base64）を生成。ランキング表示用にローカル保存し、
      // サーバにも反映する。デフォルト絵（standUri=null）なら null。
      const thumb = await makeAvatarThumb(standUri);

      await updateUserName(trimmed);
      await updateAvatarUris(standUri, jumpUri, thumb);

      // ランキングのユーザー名とアバターを更新（last_played_at は変えない）
      if (user) {
        fetch(`${API_BASE}/api/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: user.device_id, user_name: trimmed, avatar: thumb }),
        }).catch(() => {});
      }

      setSuccessMsg('保存しました');
      setTimeout(() => {
        setSuccessMsg('');
        backToMenu();
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  const TITLES: Record<typeof page, string> = {
    menu: '設定',
    profile: 'プロフィール',
    character: 'キャラクター',
    purchase: '広告削除・課金',
    about: 'アプリについて',
  };

  const saveButton = (
    <TouchableOpacity
      style={[styles.saveButton, (saving || successMsg !== '') && styles.saveButtonDisabled]}
      onPress={saveAll}
      disabled={saving || successMsg !== ''}
    >
      <Text style={styles.saveButtonText}>
        {successMsg !== '' ? successMsg : saving ? '保存中...' : '保存する'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (page === 'menu' ? router.back() : backToMenu())}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'< 戻る'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{TITLES[page]}</Text>
      </View>

      {/* メニュー一覧（項目のみ表示） */}
      {page === 'menu' && (
        <View>
          <TouchableOpacity style={styles.menuCard} onPress={() => openSection('profile')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardLabel}>プロフィール</Text>
              <Text style={styles.menuCardSub}>{userName || 'ユーザー名'}</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => openSection('character')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardLabel}>キャラクター</Text>
              <Text style={styles.menuCardSub}>立ち絵・ジャンプ絵の変更</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => openSection('purchase')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardLabel}>広告削除・課金</Text>
              <Text style={styles.menuCardSub}>{adRemoved ? '広告削除済み' : '広告を削除する'}</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => openSection('about')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardLabel}>アプリについて</Text>
              <Text style={styles.menuCardSub}>v{APP_VERSION}</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* プロフィール（ユーザー名） */}
      {page === 'profile' && (
        <>
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
          {saveButton}
        </>
      )}

      {/* キャラクター（立ち・ジャンプ・背景除去ヒント） */}
      {page === 'character' && (
        <>
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
                {standUri && (
                  <TouchableOpacity
                    style={[styles.bgRemoveButton, removingBg === 'stand' && styles.saveButtonDisabled]}
                    onPress={() => removeBg('stand')}
                    disabled={removingBg !== null}
                  >
                    <Text style={styles.bgRemoveButtonText}>
                      {removingBg === 'stand' ? '処理中...' : '背景を削除'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.resetButton} onPress={() => resetAvatar('stand')}>
                  <Text style={styles.resetButtonText}>デフォルト</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

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
                {jumpUri && (
                  <TouchableOpacity
                    style={[styles.bgRemoveButton, removingBg === 'jump' && styles.saveButtonDisabled]}
                    onPress={() => removeBg('jump')}
                    disabled={removingBg !== null}
                  >
                    <Text style={styles.bgRemoveButtonText}>
                      {removingBg === 'jump' ? '処理中...' : '背景を削除'}
                    </Text>
                  </TouchableOpacity>
                )}
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
              <Text style={styles.hintHeaderText}>💡 うまく消えないときは（手動）</Text>
              <Text style={styles.hintChevron}>{showHint ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showHint && (
              <View style={styles.hintBody}>
                <Text style={styles.hintNote}>「背景を削除」でうまくいかない場合は、iOS 16以降の機能でアプリ外でも背景を除去できます。</Text>
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
          {saveButton}
        </>
      )}

      {/* 広告削除・課金 */}
      {page === 'purchase' && (
        <View style={styles.section}>
          {adRemoved ? (
            <View style={styles.adRemovedBadge}>
              <Text style={styles.adRemovedText}>広告削除済み</Text>
            </View>
          ) : (
            <View style={styles.purchaseBox}>
              <TouchableOpacity
                style={[styles.purchaseButton, purchasing && styles.saveButtonDisabled]}
                onPress={handlePurchaseRemoveAds}
                disabled={purchasing}
              >
                <Text style={styles.purchaseButtonText}>
                  {purchasing ? '処理中...' : '広告を削除する'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases} disabled={purchasing}>
                <Text style={styles.restoreButtonText}>購入を復元</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* アプリについて */}
      {page === 'about' && (
        <View style={styles.section}>
          <View style={styles.appHeader}>
            <Image source={APP_ICON} style={styles.appIcon} resizeMode="contain" />
            <Text style={styles.appName}>大縄跳びサバイバル</Text>
            <Text style={styles.appVersionSmall}>v{APP_VERSION}</Text>
          </View>

          <TouchableOpacity style={styles.linkRow} onPress={() => openURL(REVIEW_URL)}>
            <Text style={styles.linkLabel}>アプリを評価する</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => openURL(PRIVACY_URL)}>
            <Text style={styles.linkLabel}>プライバシーポリシー</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => openURL(TERMS_URL)}>
            <Text style={styles.linkLabel}>利用規約</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>

          {/* クレジット / 謝辞（内容は lib/credits.ts で編集） */}
          <View style={styles.creditsBox}>
            <Text style={styles.creditsHeading}>クレジット / 謝辞</Text>
            <Text style={styles.creditsIntro}>{CREDITS_INTRO}</Text>
            {CREDITS.map((c, i) => (
              <View key={i} style={styles.creditEntry}>
                <Text style={styles.creditRole}>{c.role}</Text>
                {c.url ? (
                  <TouchableOpacity onPress={() => openURL(c.url!)}>
                    <Text style={styles.creditNameLink}>{c.name} ↗</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.creditName}>{c.name}</Text>
                )}
                {c.works && c.works.length > 0 && (
                  <Text style={styles.creditWorks}>{c.works.join(' / ')}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
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
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#34345a',
  },
  menuCardLeft: {
    flex: 1,
  },
  menuCardLabel: {
    color: '#e0e0ff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  menuCardSub: {
    color: '#8888aa',
    fontSize: 13,
    marginTop: 4,
  },
  menuChevron: {
    color: '#666688',
    fontSize: 24,
    marginLeft: 12,
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
  bgRemoveButton: {
    backgroundColor: '#3aa37a',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  bgRemoveButtonText: {
    color: '#fff',
    fontSize: 14,
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
  purchaseBox: {
    gap: 10,
  },
  purchaseButton: {
    backgroundColor: '#e8a020',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#4a90d9',
    fontSize: 14,
  },
  adRemovedBadge: {
    backgroundColor: '#1e3a1e',
    borderWidth: 1,
    borderColor: '#4a9a4a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  adRemovedText: {
    color: '#6adf6a',
    fontSize: 15,
    fontWeight: 'bold',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  linkLabel: {
    color: '#e0e0ff',
    fontSize: 15,
  },
  linkChevron: {
    color: '#666688',
    fontSize: 20,
  },
  versionValue: {
    color: '#888899',
    fontSize: 15,
  },
  appHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 8,
  },
  appName: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appVersionSmall: {
    color: '#888899',
    fontSize: 13,
    marginTop: 2,
  },
  creditsBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  creditsHeading: {
    color: '#aaaacc',
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 8,
  },
  creditsIntro: {
    color: '#888899',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  creditEntry: {
    marginBottom: 12,
  },
  creditRole: {
    color: '#888899',
    fontSize: 12,
    marginBottom: 2,
  },
  creditName: {
    color: '#e0e0ff',
    fontSize: 15,
  },
  creditNameLink: {
    color: '#4a90d9',
    fontSize: 15,
    fontWeight: 'bold',
  },
  creditWorks: {
    color: '#aaaacc',
    fontSize: 12,
    marginTop: 2,
  },
});
