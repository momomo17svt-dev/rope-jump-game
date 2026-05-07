import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

const PLAY_TRACKS = [
  require('../assets/sounds/play/062_BPM132.mp3'),
  require('../assets/sounds/play/204_BPM128.mp3'),
  require('../assets/sounds/play/251_BPM150.mp3'),
  require('../assets/sounds/play/279_BPM182.mp3'),
];

export function usePlayBGM() {
  const playBGMRef = useRef<Audio.Sound | null>(null);
  const wantsPlayBGMRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    return () => {
      playBGMRef.current?.unloadAsync();
      playBGMRef.current = null;
    };
  }, []);

  const start = () => {
    wantsPlayBGMRef.current = true;
    // 既に再生中／ロード中なら何もしない（同一セッションでトラックを継続させるため）
    if (playBGMRef.current || isLoadingRef.current) return;
    isLoadingRef.current = true;
    const track = PLAY_TRACKS[Math.floor(Math.random() * PLAY_TRACKS.length)];
    Audio.Sound.createAsync(track, { shouldPlay: false, isLooping: true, volume: 0.5 })
      .then(({ sound }) => {
        isLoadingRef.current = false;
        if (!wantsPlayBGMRef.current) {
          sound.unloadAsync();
          return;
        }
        playBGMRef.current = sound;
        sound.playAsync().catch(() => {});
      })
      .catch(() => {
        isLoadingRef.current = false;
      });
  };

  const stop = () => {
    wantsPlayBGMRef.current = false;
    const s = playBGMRef.current;
    playBGMRef.current = null;
    s?.stopAsync().then(() => s.unloadAsync()).catch(() => {});
  };

  return { start, stop };
}
