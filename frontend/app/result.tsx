import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getBestScore, saveScore, getLocalUser } from '@/db/database';
import { useInterstitialAd, TestIds } from '@/lib/adsafe';
import { useAd } from '@/context/AdContext';
import { API_BASE } from '@/lib/api';

const INTERSTITIAL_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : (process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID ?? '');

async function postScoreToServer(deviceId: string, userName: string, score: number): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    await fetch(`${API_BASE}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, user_name: userName, score }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export default function ResultScreen() {
  const router = useRouter();
  const { adRemoved } = useAd();
  const { score: scoreParam } = useLocalSearchParams<{ score?: string }>();
  const score = Math.max(0, parseInt(scoreParam ?? '0', 10) || 0);

  const [prevBest, setPrevBest] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [ready, setReady] = useState(false);

  const { isLoaded, load, show, addAdEventListener } = useInterstitialAd(INTERSTITIAL_ID);

  useEffect(() => {
    if (!adRemoved && INTERSTITIAL_ID !== '') load();
  }, [adRemoved]);

  useEffect(() => {
    if (!adRemoved && isLoaded && ready && INTERSTITIAL_ID !== '') {
      show();
    }
  }, [isLoaded, ready, adRemoved]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [best, user] = await Promise.all([getBestScore(), getLocalUser()]);
      if (cancelled) return;

      const newRecord = score > 0 && (best === null || score > best);
      setPrevBest(best);
      setIsNewRecord(newRecord);

      if (score > 0) {
        await saveScore(score);
      }

      // スコアは常にサーバへ送信する。サーバ側 upsert は device_id ごとに
      // 最高スコアだけを保持し、同時に score_history へ1行追加する。
      // （以前は「全体100位以内に入る時だけ送信」していたが、それだと
      //  score_history が記録されず週間ランキングからスコアが欠落していた）
      if (score > 0 && user) {
        postScoreToServer(user.device_id, user.user_name, score).catch(() => {});
      }

      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [score]);

  if (!ready) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>今回のスコア</Text>
      <Text style={styles.score}>{score}</Text>

      {isNewRecord ? (
        <Text style={styles.newRecord}>NEW RECORD!</Text>
      ) : prevBest !== null ? (
        <Text style={styles.bestScore}>自己ベスト: {prevBest} 回</Text>
      ) : null}

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/game')}>
          <Text style={styles.buttonText}>もう一度遊ぶ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.secondaryButtonText}>タイトルへ戻る</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    color: '#aaaacc',
    fontSize: 16,
    marginBottom: 4,
  },
  score: {
    color: '#e0e0ff',
    fontSize: 80,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 2,
  },
  newRecord: {
    color: '#ffdd66',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textShadowColor: '#000',
    textShadowRadius: 6,
  },
  bestScore: {
    color: '#aaaacc',
    fontSize: 18,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  primaryButton: {
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
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a6e',
  },
  secondaryButtonText: {
    color: '#aaaacc',
    fontSize: 16,
  },
});
