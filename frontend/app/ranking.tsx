import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getLocalUser } from '@/db/database';

type RankingEntry = {
  rank: number;
  user_name: string;
  score: number;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export default function RankingScreen() {
  const router = useRouter();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [myUserName, setMyUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [user, res] = await Promise.all([
        getLocalUser(),
        fetch(`${API_BASE}/api/rankings`),
      ]);
      if (!res.ok) throw new Error('fetch failed');
      const data: RankingEntry[] = await res.json();
      setMyUserName(user?.user_name ?? null);
      setRankings(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const renderItem = ({ item }: { item: RankingEntry }) => {
    const isMe = myUserName !== null && item.user_name === myUserName;
    const rankLabel =
      item.rank === 1 ? '1st' : item.rank === 2 ? '2nd' : item.rank === 3 ? '3rd' : String(item.rank);
    return (
      <View style={[styles.row, isMe && styles.myRow]}>
        <Text style={[styles.cell, styles.rankCell, item.rank <= 3 && styles.topRankText]}>
          {rankLabel}
        </Text>
        <Text style={[styles.cell, styles.nameCell, isMe && styles.myText]} numberOfLines={1}>
          {item.user_name}
        </Text>
        <Text style={[styles.cell, styles.scoreCell, isMe && styles.myText]}>
          {item.score}
        </Text>
      </View>
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

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.rankCell]}>順位</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchRankings}>
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
  nameCell: {
    flex: 1,
    paddingHorizontal: 8,
  },
  scoreCell: {
    width: 88,
    textAlign: 'right',
    paddingRight: 12,
  },
});
