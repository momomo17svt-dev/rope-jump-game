import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getScoreHistory, getBestScore, ScoreRecord } from '@/db/database';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<ScoreRecord[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [rows, bestScore] = await Promise.all([getScoreHistory(), getBestScore()]);
      setHistory(rows);
      setBest(bestScore);
      setLoading(false);
    })();
  }, []);

  const renderItem = ({ item, index }: { item: ScoreRecord; index: number }) => {
    const isBest = item.score === best;
    return (
      <View style={[styles.row, isBest && styles.bestRow]}>
        <Text style={styles.rowIndex}>{index + 1}</Text>
        <Text style={[styles.rowScore, isBest && styles.bestScore]}>{item.score}</Text>
        {isBest && <Text style={styles.bestBadge}>BEST</Text>}
        <Text style={styles.rowDate}>{formatDate(item.played_at)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'< 戻る'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>プレイ履歴</Text>
        {!loading && (
          <Text style={styles.countText}>{history.length} 回</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#4a90d9" style={styles.loader} />
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>まだプレイ記録がありません</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
    gap: 12,
  },
  backButton: {
    marginRight: 4,
  },
  backText: {
    color: '#4a90d9',
    fontSize: 16,
  },
  title: {
    color: '#e0e0ff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  countText: {
    color: '#aaaacc',
    fontSize: 14,
  },
  loader: {
    marginTop: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#555577',
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
    gap: 12,
  },
  bestRow: {
    backgroundColor: '#1e2a1e',
    borderRadius: 6,
    paddingHorizontal: 8,
    borderBottomColor: '#2a4a2a',
  },
  rowIndex: {
    color: '#555577',
    fontSize: 13,
    width: 32,
    textAlign: 'right',
  },
  rowScore: {
    color: '#e0e0ff',
    fontSize: 22,
    fontWeight: 'bold',
    width: 70,
  },
  bestScore: {
    color: '#66dd66',
  },
  bestBadge: {
    color: '#66dd66',
    fontSize: 11,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#66dd66',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  rowDate: {
    color: '#aaaacc',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
});
