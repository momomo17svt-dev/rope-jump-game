import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getLocalUser, getBlockedNames, addBlockedName, removeBlockedName } from '@/db/database';
import { API_BASE } from '@/lib/api';

type Period = 'all' | 'weekly';

type RankingEntry = {
  rank: number;
  user_name: string;
  score: number;
  avatar?: string | null;
};

// カスタムアバター未設定（avatar が無い）プレイヤーに使うデフォルトの立ち絵
const DEFAULT_AVATAR = require('../assets/figure_stand_front.png');

export default function RankingScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('all');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [myUserName, setMyUserName] = useState<string | null>(null);
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [blockedNames, setBlockedNames] = useState<string[]>([]);
  // 通報/非表示の操作対象（選択中のエントリー）。横画面で Modal は使えないため
  // 画面内オーバーレイ（条件レンダリング）でアクションシートを表示する。
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);
  const [reporting, setReporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRankings = useCallback(async (p: Period) => {
    setLoading(true);
    setError(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const url = p === 'weekly'
        ? `${API_BASE}/api/rankings?period=weekly`
        : `${API_BASE}/api/rankings`;
      const [user, blocked, res] = await Promise.all([
        getLocalUser(),
        getBlockedNames(),
        fetch(url, { signal: controller.signal }),
      ]);
      if (!res.ok) throw new Error('fetch failed');
      const data: RankingEntry[] = await res.json();
      setMyUserName(user?.user_name ?? null);
      setMyDeviceId(user?.device_id ?? null);
      setBlockedNames(blocked);
      setRankings(data);
    } catch {
      setError(true);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  // 通報：サーバに記録し、以後ローカルでも非表示にする
  const handleReport = async (entry: RankingEntry) => {
    setReporting(true);
    try {
      await fetch(`${API_BASE}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_device_id: myDeviceId ?? '',
          reported_user_name: entry.user_name,
          reason: '不適切なアバター画像または名前',
        }),
      }).catch(() => {});
      await addBlockedName(entry.user_name);
      setBlockedNames((prev) => [...prev, entry.user_name]);
    } finally {
      setReporting(false);
      setSelectedEntry(null);
    }
  };

  // 非表示（ブロック）：行は残したまま中身を伏せる（順位はずらさない）
  const handleBlock = async (entry: RankingEntry) => {
    await addBlockedName(entry.user_name);
    setBlockedNames((prev) => [...prev, entry.user_name]);
    setSelectedEntry(null);
  };

  // 解除（復元）：伏せ表示を元に戻す
  const handleUnblock = async (entry: RankingEntry) => {
    await removeBlockedName(entry.user_name);
    setBlockedNames((prev) => prev.filter((n) => n !== entry.user_name));
    setSelectedEntry(null);
  };

  useEffect(() => {
    fetchRankings(period);
  }, [fetchRankings, period]);

  const renderItem = ({ item }: { item: RankingEntry }) => {
    const isMe = myUserName !== null && item.user_name === myUserName;
    const isBlocked = blockedNames.includes(item.user_name);
    const rankLabel =
      item.rank === 1 ? '1st' : item.rank === 2 ? '2nd' : item.rank === 3 ? '3rd' : String(item.rank);
    return (
      <TouchableOpacity
        style={[styles.row, isMe && styles.myRow]}
        activeOpacity={isMe ? 1 : 0.6}
        // 自分以外をタップ → 通報/非表示メニュー。伏せた行をタップ → 解除メニュー。
        onPress={() => { if (!isMe) setSelectedEntry(item); }}
        disabled={isMe}
      >
        <Text style={[styles.cell, styles.rankCell, item.rank <= 3 && styles.topRankText]}>
          {rankLabel}
        </Text>
        {/* ブロック/通報した相手はアバター・名前を伏せる（順位・スコアは残す） */}
        <Image
          style={styles.avatar}
          source={!isBlocked && item.avatar ? { uri: `data:image/png;base64,${item.avatar}` } : DEFAULT_AVATAR}
        />
        <Text
          style={[styles.cell, styles.nameCell, isMe && styles.myText, isBlocked && styles.blockedName]}
          numberOfLines={1}
        >
          {isBlocked ? '非表示のユーザー' : item.user_name}
        </Text>
        <Text style={[styles.cell, styles.scoreCell, isMe && styles.myText]}>
          {item.score}
        </Text>
        {!isMe && <Text style={styles.moreIcon}>{isBlocked ? '↺' : '⋯'}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ランキング</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, period === 'all' && styles.tabActive]}
          onPress={() => setPeriod('all')}
        >
          <Text style={[styles.tabText, period === 'all' && styles.tabTextActive]}>全体</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, period === 'weekly' && styles.tabActive]}
          onPress={() => setPeriod('weekly')}
        >
          <Text style={[styles.tabText, period === 'weekly' && styles.tabTextActive]}>週間</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.rankCell]}>順位</Text>
        <View style={styles.avatarSpacer} />
        <Text style={[styles.headerCell, styles.nameCell]}>プレイヤー</Text>
        <Text style={[styles.headerCell, styles.scoreCell]}>スコア</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color="#4a90d9" size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>データを取得できませんでした</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchRankings(period)}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      ) : rankings.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>まだランキングデータがありません</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={rankings}
          keyExtractor={(item) => String(item.rank)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 通報・非表示のアクションシート（横画面のため Modal ではなく画面内オーバーレイ） */}
      {selectedEntry && (
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayBackdrop}
            activeOpacity={1}
            onPress={() => { if (!reporting) setSelectedEntry(null); }}
          />
          <View style={styles.actionCard}>
            {blockedNames.includes(selectedEntry.user_name) ? (
              <>
                {/* 伏せ表示中の相手 → 解除メニュー */}
                <Text style={styles.actionTitle}>非表示中のユーザー</Text>
                <Text style={styles.actionDesc}>このユーザーの表示を元に戻しますか？</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.blockButton]}
                  onPress={() => handleUnblock(selectedEntry)}
                >
                  <Text style={styles.blockButtonText}>表示を元に戻す（ブロック解除）</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* 通常の相手 → 通報/非表示メニュー */}
                <Text style={styles.actionTitle} numberOfLines={1}>{selectedEntry.user_name}</Text>
                <Text style={styles.actionDesc}>不適切なアバター画像や名前ですか？</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.reportButton, reporting && styles.actionDisabled]}
                  onPress={() => handleReport(selectedEntry)}
                  disabled={reporting}
                >
                  <Text style={styles.reportButtonText}>{reporting ? '送信中...' : '通報する'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.blockButton]}
                  onPress={() => handleBlock(selectedEntry)}
                  disabled={reporting}
                >
                  <Text style={styles.blockButtonText}>非表示にする（ブロック）</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.actionCancel}
              onPress={() => setSelectedEntry(null)}
              disabled={reporting}
            >
              <Text style={styles.actionCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#e0e0ff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4a4a6e',
  },
  tabActive: {
    backgroundColor: '#4a90d9',
    borderColor: '#4a90d9',
  },
  tabText: {
    color: '#aaaacc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a6e',
    paddingBottom: 6,
    marginBottom: 4,
  },
  headerCell: {
    color: '#aaaacc',
    fontSize: 13,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    color: '#cc6666',
    fontSize: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
    alignItems: 'center',
  },
  myRow: {
    backgroundColor: '#2a3a5e',
    borderRadius: 4,
    borderBottomColor: '#3a4a7e',
  },
  cell: {
    color: '#e0e0ff',
    fontSize: 15,
  },
  myText: {
    color: '#ffdd66',
    fontWeight: 'bold',
  },
  topRankText: {
    color: '#ffaa44',
    fontWeight: 'bold',
  },
  rankCell: {
    width: 52,
    textAlign: 'center',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#2a2a4e',
    resizeMode: 'cover',
  },
  avatarSpacer: {
    width: 38, // avatar(30) + marginRight(8)
  },
  nameCell: {
    flex: 1,
    paddingHorizontal: 8,
  },
  blockedName: {
    color: '#777799',
    fontStyle: 'italic',
  },
  scoreCell: {
    width: 88,
    textAlign: 'right',
    paddingRight: 12,
  },
  moreIcon: {
    color: '#666688',
    fontSize: 20,
    width: 24,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  actionCard: {
    width: '70%',
    maxWidth: 420,
    backgroundColor: '#23233e',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  actionTitle: {
    color: '#e0e0ff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionDesc: {
    color: '#aaaacc',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  reportButton: {
    backgroundColor: '#c0453b',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  blockButton: {
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#555577',
  },
  blockButtonText: {
    color: '#e0e0ff',
    fontSize: 15,
  },
  actionCancel: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionCancelText: {
    color: '#8888aa',
    fontSize: 14,
  },
});
