import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export function useTopBGM() {
  const bgmRef = useRef<Audio.Sound | null>(null);
  const wantsToPlayRef = useRef(false);

  useEffect(() => {
    let bgm: Audio.Sound | null = null;
    let cancelled = false;

    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        ({ sound: bgm } = await Audio.Sound.createAsync(
          require('../assets/sounds/top/Mugen_Survival.mp3'),
          { shouldPlay: false, isLooping: true, volume: 0.4 }
        ));
        if (cancelled) {
          bgm.unloadAsync();
          return;
        }
        bgmRef.current = bgm;
        // start() がロード完了前に呼ばれていた場合はここで再生
        if (wantsToPlayRef.current) {
          bgm.playAsync().catch(() => {});
        }
      } catch {
        // BGMが読めなくても画面は動く
      }
    })();

    return () => {
      cancelled = true;
      bgm?.stopAsync().catch(() => {});
      bgm?.unloadAsync();
      bgmRef.current = null;
    };
  }, []);

  const start = () => {
    wantsToPlayRef.current = true;
    bgmRef.current?.playAsync().catch(() => {});
  };

  const stop = () => {
    wantsToPlayRef.current = false;
    bgmRef.current?.stopAsync().catch(() => {});
  };

  return { start, stop };
}
