import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { AUDIO_ENABLED } from '../lib/audioConfig';

export function useGameSounds() {
  const jumpRef = useRef<AudioPlayer | null>(null);
  const gameoverRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!AUDIO_ENABLED) return;
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

  // seekTo は非同期。位置を 0 に戻し「終わってから」play しないと、再生位置が末尾の
  // ままになって無音になることがあるため、seek 完了後に play する。
  const replay = (p: AudioPlayer | null) => {
    if (!p) return;
    try {
      const seeked = p.seekTo(0) as unknown as Promise<void> | undefined;
      if (seeked && typeof seeked.then === 'function') {
        seeked.then(() => { try { p.play(); } catch {} }).catch(() => {});
      } else {
        p.play();
      }
    } catch {}
  };

  const playJump = () => replay(jumpRef.current);
  const playGameover = () => replay(gameoverRef.current);

  return { playJump, playGameover };
}
