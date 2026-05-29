import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

export function useGameSounds() {
  const jumpRef = useRef<AudioPlayer | null>(null);
  const gameoverRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    let jump: AudioPlayer | null = null;
    let gameover: AudioPlayer | null = null;

    try {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      jump = createAudioPlayer(require('../assets/sounds/jump.wav'));
      jumpRef.current = jump;
      gameover = createAudioPlayer(require('../assets/sounds/gameover.wav'));
      gameoverRef.current = gameover;
    } catch {
      // 音源が読めなくてもゲームは動く
    }

    return () => {
      try {
        jump?.remove();
      } catch {}
      try {
        gameover?.remove();
      } catch {}
      jumpRef.current = null;
      gameoverRef.current = null;
    };
  }, []);

  const playJump = () => {
    const p = jumpRef.current;
    if (!p) return;
    try {
      p.seekTo(0);
      p.play();
    } catch {}
  };

  const playGameover = () => {
    const p = gameoverRef.current;
    if (!p) return;
    try {
      p.seekTo(0);
      p.play();
    } catch {}
  };

  return { playJump, playGameover };
}
