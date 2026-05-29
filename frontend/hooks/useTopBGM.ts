import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

export function useTopBGM() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const wantsToPlayRef = useRef(false);

  useEffect(() => {
    let player: AudioPlayer | null = null;

    try {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      player = createAudioPlayer(require('../assets/sounds/top/Mugen_Survival.mp3'));
      player.loop = true;
      player.volume = 0.4;
      playerRef.current = player;
      // start() がプレイヤー生成前に呼ばれていた場合はここで再生
      if (wantsToPlayRef.current) {
        player.play();
      }
    } catch {
      // BGMが読めなくても画面は動く
    }

    return () => {
      try {
        player?.remove();
      } catch {}
      playerRef.current = null;
    };
  }, []);

  const start = () => {
    wantsToPlayRef.current = true;
    try {
      playerRef.current?.play();
    } catch {}
  };

  const stop = () => {
    wantsToPlayRef.current = false;
    try {
      playerRef.current?.pause();
    } catch {}
  };

  return { start, stop };
}
