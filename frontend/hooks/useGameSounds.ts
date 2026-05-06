import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

const PLAY_TRACKS = [
  require('../assets/sounds/play/062_BPM132.mp3'),
  require('../assets/sounds/play/204_BPM128.mp3'),
  require('../assets/sounds/play/251_BPM150.mp3'),
  require('../assets/sounds/play/279_BPM182.mp3'),
];

export function useGameSounds() {
  const jumpRef = useRef<Audio.Sound | null>(null);
  const gameoverRef = useRef<Audio.Sound | null>(null);
  const playBGMRef = useRef<Audio.Sound | null>(null);
  const wantsPlayBGMRef = useRef(false);

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
      playBGMRef.current?.unloadAsync();
      playBGMRef.current = null;
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

  const startPlayBGM = () => {
    wantsPlayBGMRef.current = true;
    const track = PLAY_TRACKS[Math.floor(Math.random() * PLAY_TRACKS.length)];
    Audio.Sound.createAsync(track, { shouldPlay: false, isLooping: true, volume: 0.5 })
      .then(({ sound }) => {
        // ロード完了前に stopPlayBGM が呼ばれていた場合は即破棄
        if (!wantsPlayBGMRef.current) {
          sound.unloadAsync();
          return;
        }
        playBGMRef.current = sound;
        sound.playAsync().catch(() => {});
      })
      .catch(() => {});
  };

  const stopPlayBGM = () => {
    wantsPlayBGMRef.current = false;
    playBGMRef.current?.stopAsync().catch(() => {});
  };

  return { playJump, playGameover, startPlayBGM, stopPlayBGM };
}
