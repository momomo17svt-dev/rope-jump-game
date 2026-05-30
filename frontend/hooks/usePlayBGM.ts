import { useEffect, useRef } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { AUDIO_ENABLED } from '../lib/audioConfig';

const PLAY_TRACKS = [
  require('../assets/sounds/play/062_BPM132.mp3'),
  require('../assets/sounds/play/204_BPM128.mp3'),
  require('../assets/sounds/play/251_BPM150.mp3'),
  require('../assets/sounds/play/279_BPM182.mp3'),
];

export function usePlayBGM() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const wantsPlayRef = useRef(false);

  useEffect(() => {
    return () => {
      try {
        playerRef.current?.remove();
      } catch {}
      playerRef.current = null;
    };
  }, []);

  const start = () => {
    if (!AUDIO_ENABLED) return;
    wantsPlayRef.current = true;
    // 既に再生中なら何もしない（同一セッションでトラックを継続させるため）
    if (playerRef.current) return;
    try {
      const track = PLAY_TRACKS[Math.floor(Math.random() * PLAY_TRACKS.length)];
      const player = createAudioPlayer(track);
      player.loop = true;
      player.volume = 0.5;
      playerRef.current = player;
      player.play();
    } catch {}
  };

  const stop = () => {
    wantsPlayRef.current = false;
    const p = playerRef.current;
    playerRef.current = null;
    try {
      p?.remove();
    } catch {}
  };

  return { start, stop };
}
