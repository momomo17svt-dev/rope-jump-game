import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export function useGameSounds() {
  const jumpRef = useRef<Audio.Sound | null>(null);
  const gameoverRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let jump: Audio.Sound | null = null;
    let gameover: Audio.Sound | null = null;

    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        ({ sound: jump } = await Audio.Sound.createAsync(
          require('../assets/sounds/jump.wav'),
          { shouldPlay: false }
        ));
        jumpRef.current = jump;

        ({ sound: gameover } = await Audio.Sound.createAsync(
          require('../assets/sounds/gameover.wav'),
          { shouldPlay: false }
        ));
        gameoverRef.current = gameover;
      } catch {
        // 音源が読めなくてもゲームは動く
      }
    })();

    return () => {
      jump?.unloadAsync();
      gameover?.unloadAsync();
    };
  }, []);

  const playJump = () => {
    const s = jumpRef.current;
    if (!s) return;
    s.setPositionAsync(0).then(() => s.playAsync()).catch(() => {});
  };

  const playGameover = () => {
    const s = gameoverRef.current;
    if (!s) return;
    s.setPositionAsync(0).then(() => s.playAsync()).catch(() => {});
  };

  return { playJump, playGameover };
}
