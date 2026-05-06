import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Line, G, Image as SvgImage } from 'react-native-svg';

const JUMP_HEIGHT = 50;
const JUMP_DURATION = 200;
const SAFE_JUMP_Y = 27;
const INITIAL_ROPE_PERIOD = 850;
const MIN_ROPE_PERIOD = 220;
const SPEED_INCREASE_RATIO = 0.93;
const SPEED_INCREASE_INTERVAL = 5;
const COUNTDOWN_STEP_MS = 800;
// バックグラウンド復帰や深刻なフレームスパイクで dt がここを超えたら、
// 縄の位相 0.5 跨ぎ判定が取りこぼされる恐れがあるので 1 フレームを破棄する。
const MAX_FRAME_DT = 100;

const PLAYER_IMG_STAND = require('../assets/figure_stand_front.png');
const PLAYER_IMG_JUMP = require('../assets/figure_jump.png');
const PLAYER_IMG_W = 80;
const PLAYER_IMG_H = 140;
// jump 画像は腕を広げているのでアスペクトが横長。
// 立ち画像と同じ縦長枠だと縦に余白ができて小さく見えるため、ジャンプ専用の広い枠を使う。
const PLAYER_IMG_JUMP_W = 168;
const PLAYER_IMG_JUMP_H = 140;

const SKIN = '#fcd9b4';
const HAIR = '#1a1a1a';
const EYE = '#1a1a1a';
const MOUTH = '#c42c2c';
const SHIRT = '#3a90c4';
const SHIRT_DARK = '#296580';
const PANTS = '#2a2a44';
const ROPE = '#dddd66';
const GROUND = '#444466';

type GameState = 'countdown' | 'playing' | 'gameover';

type CharacterProps = {
  cx: number;
  feetY: number;
  handX?: number;
  handY?: number;
};

function Character({ cx, feetY, handX, handY }: CharacterProps) {
  const HEAD_R = 22;
  const HAIR_OVERHANG = 5;
  const NECK_GAP = 2;
  const TORSO_W = 36;
  const TORSO_H = 54;
  const LEG_LEN = 54;

  const hipY = feetY - LEG_LEN;
  const torsoTop = hipY - TORSO_H;
  const shoulderY = torsoTop + 6;
  const headBottomY = torsoTop - NECK_GAP;
  const headCy = headBottomY - HEAD_R;

  const hasOuterArm = handX !== undefined && handY !== undefined;
  const armSide = hasOuterArm ? (handX! > cx ? 1 : -1) : 0;

  return (
    <G>
      {/* Pants (legs) */}
      <Line x1={cx - 7} y1={hipY + 2} x2={cx - 7} y2={feetY} stroke={PANTS} strokeWidth={10} strokeLinecap="round" />
      <Line x1={cx + 7} y1={hipY + 2} x2={cx + 7} y2={feetY} stroke={PANTS} strokeWidth={10} strokeLinecap="round" />

      {/* Torso (blue shirt) */}
      <Path
        d={`M ${cx - TORSO_W / 2} ${torsoTop + 6}
            Q ${cx - TORSO_W / 2} ${torsoTop} ${cx - TORSO_W / 2 + 8} ${torsoTop}
            L ${cx + TORSO_W / 2 - 8} ${torsoTop}
            Q ${cx + TORSO_W / 2} ${torsoTop} ${cx + TORSO_W / 2} ${torsoTop + 6}
            L ${cx + TORSO_W / 2 + 2} ${hipY + 4}
            L ${cx - TORSO_W / 2 - 2} ${hipY + 4} Z`}
        fill={SHIRT}
      />

      {/* Collar V */}
      <Path
        d={`M ${cx - 9} ${torsoTop + 1} L ${cx} ${torsoTop + 9} L ${cx + 9} ${torsoTop + 1} L ${cx + 7} ${torsoTop} L ${cx} ${torsoTop + 5} L ${cx - 7} ${torsoTop} Z`}
        fill={SHIRT_DARK}
      />

      {/* Arms */}
      {hasOuterArm ? (
        <>
          {/* Outer arm extending to rope hand */}
          <Line
            x1={cx + armSide * (TORSO_W / 2 - 4)}
            y1={shoulderY}
            x2={handX}
            y2={handY}
            stroke={SHIRT}
            strokeWidth={10}
            strokeLinecap="round"
          />
          {/* Hand (skin) at rope endpoint */}
          <Circle cx={handX} cy={handY} r={5} fill={SKIN} />
          {/* Inner arm hanging at side */}
          <Line
            x1={cx - armSide * (TORSO_W / 2 - 4)}
            y1={shoulderY}
            x2={cx - armSide * (TORSO_W / 2 - 4)}
            y2={shoulderY + 32}
            stroke={SHIRT}
            strokeWidth={10}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Both arms at sides */}
          <Line x1={cx - TORSO_W / 2 + 4} y1={shoulderY} x2={cx - TORSO_W / 2 + 4} y2={shoulderY + 38} stroke={SHIRT} strokeWidth={10} strokeLinecap="round" />
          <Line x1={cx + TORSO_W / 2 - 4} y1={shoulderY} x2={cx + TORSO_W / 2 - 4} y2={shoulderY + 38} stroke={SHIRT} strokeWidth={10} strokeLinecap="round" />
        </>
      )}

      {/* Head (skin) */}
      <Circle cx={cx} cy={headCy} r={HEAD_R} fill={SKIN} />

      {/* Hair: covers top of head with bangs */}
      <Path
        d={`M ${cx - HEAD_R + 1} ${headCy + 1}
            Q ${cx - HEAD_R - 2} ${headCy - HEAD_R + 4} ${cx - HEAD_R + 6} ${headCy - HEAD_R - HAIR_OVERHANG}
            Q ${cx} ${headCy - HEAD_R - HAIR_OVERHANG - 4} ${cx + HEAD_R - 6} ${headCy - HEAD_R - HAIR_OVERHANG}
            Q ${cx + HEAD_R + 2} ${headCy - HEAD_R + 4} ${cx + HEAD_R - 1} ${headCy + 1}
            Q ${cx + HEAD_R - 4} ${headCy - 4} ${cx + 7} ${headCy - 3}
            Q ${cx} ${headCy - 9} ${cx - 7} ${headCy - 3}
            Q ${cx - HEAD_R + 4} ${headCy - 4} ${cx - HEAD_R + 1} ${headCy + 1} Z`}
        fill={HAIR}
      />

      {/* Closed smiling eyes (^ ^) */}
      <Path d={`M ${cx - 10} ${headCy + 3} Q ${cx - 6} ${headCy - 2} ${cx - 2} ${headCy + 3}`} stroke={EYE} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d={`M ${cx + 2} ${headCy + 3} Q ${cx + 6} ${headCy - 2} ${cx + 10} ${headCy + 3}`} stroke={EYE} strokeWidth={2.2} fill="none" strokeLinecap="round" />

      {/* Open smiling mouth */}
      <Path d={`M ${cx - 6} ${headCy + 9} Q ${cx} ${headCy + 16} ${cx + 6} ${headCy + 9} Q ${cx} ${headCy + 11} ${cx - 6} ${headCy + 9} Z`} fill={MOUTH} />

      {/* Cheek blush */}
      <Circle cx={cx - 14} cy={headCy + 8} r={3} fill="#ffb0a0" opacity={0.55} />
      <Circle cx={cx + 14} cy={headCy + 8} r={3} fill="#ffb0a0" opacity={0.55} />
    </G>
  );
}

export default function GameScreen() {
  const router = useRouter();
  const { width: W, height: H } = useWindowDimensions();

  const groundY = H * 0.85;
  const swingY = H * 0.50;
  const ropeRadius = groundY - swingY;
  const leftSwingerHandX = 80;
  const rightSwingerHandX = W - 80;
  const leftSwingerBodyX = leftSwingerHandX + 40;
  const rightSwingerBodyX = rightSwingerHandX - 40;
  const playerX = W / 2;

  const [gameState, setGameState] = useState<GameState>('countdown');
  const [countdownLabel, setCountdownLabel] = useState<string>('3');
  const [score, setScore] = useState(0);
  const [, forceTick] = useState(0);

  const ropePhaseRef = useRef(0);
  const ropePeriodRef = useRef(INITIAL_ROPE_PERIOD);
  const playerJumpYRef = useRef(0);
  const jumpStartRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (gameState !== 'countdown') return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const idx = Math.floor(elapsed / COUNTDOWN_STEP_MS);
      if (idx === 0) setCountdownLabel('3');
      else if (idx === 1) setCountdownLabel('2');
      else if (idx === 2) setCountdownLabel('1');
      else if (idx === 3) setCountdownLabel('GO!');
      else {
        clearInterval(interval);
        setGameState('playing');
      }
    }, 50);
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    lastFrameRef.current = Date.now();

    const loop = () => {
      const now = Date.now();
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      if (dt > MAX_FRAME_DT) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const prevPhase = ropePhaseRef.current;
      const newPhase = (prevPhase + dt / ropePeriodRef.current) % 1;
      ropePhaseRef.current = newPhase;

      if (jumpStartRef.current !== null) {
        const jumpElapsed = now - jumpStartRef.current;
        if (jumpElapsed >= JUMP_DURATION) {
          playerJumpYRef.current = 0;
          jumpStartRef.current = null;
        } else {
          const progress = jumpElapsed / JUMP_DURATION;
          playerJumpYRef.current = JUMP_HEIGHT * Math.sin(progress * Math.PI);
        }
      }

      const crossedBottom = prevPhase < 0.5 && newPhase >= 0.5;
      if (crossedBottom) {
        if (playerJumpYRef.current < SAFE_JUMP_Y) {
          handleGameOver();
          return;
        }
        scoreRef.current += 1;
        setScore(scoreRef.current);
        if (scoreRef.current % SPEED_INCREASE_INTERVAL === 0) {
          ropePeriodRef.current =
            MIN_ROPE_PERIOD +
            (ropePeriodRef.current - MIN_ROPE_PERIOD) * SPEED_INCREASE_RATIO;
        }
      }

      forceTick((n) => (n + 1) % 1000000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState]);

  const handleGameOver = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setGameState('gameover');
    router.replace({ pathname: '/result', params: { score: String(scoreRef.current) } });
  };

  const handleTap = () => {
    if (gameState !== 'playing') return;
    if (jumpStartRef.current !== null) return;
    jumpStartRef.current = Date.now();
    forceTick((n) => (n + 1) % 1000000);
  };

  // Quadratic Bezier control point: to make the actual curve midpoint reach
  // groundY at phase=0.5, control point Y must be at (2 * desiredMidY - swingY).
  // So we use 2 * ropeRadius for control offset.
  const ropeCtrlY = swingY + -Math.cos(ropePhaseRef.current * 2 * Math.PI) * (ropeRadius * 2);
  const ropePath = `M ${leftSwingerHandX} ${swingY} Q ${W / 2} ${ropeCtrlY} ${rightSwingerHandX} ${swingY}`;
  const playerFeetY = groundY - playerJumpYRef.current;

  return (
    <Pressable style={styles.container} onPressIn={handleTap}>
      <Svg width={W} height={H}>
        {/* Ground line */}
        <Line x1={0} y1={groundY + 4} x2={W} y2={groundY + 4} stroke={GROUND} strokeWidth={3} />

        {/* Rope first so swingers' bodies cover any portion of the curve that
            dips through them when rope is at the bottom of the swing */}
        <Path d={ropePath} stroke={ROPE} strokeWidth={5} fill="none" strokeLinecap="round" />

        {/* Left swinger (feet on ground, hand at rope endpoint) */}
        <Character cx={leftSwingerBodyX} feetY={groundY} handX={leftSwingerHandX} handY={swingY} />

        {/* Right swinger */}
        <Character cx={rightSwingerBodyX} feetY={groundY} handX={rightSwingerHandX} handY={swingY} />

        {/* Player — both poses always mounted (so the GPU upload happens up-front),
            visibility toggled by opacity for zero-latency swap on tap */}
        <SvgImage
          href={PLAYER_IMG_STAND}
          x={playerX - PLAYER_IMG_W / 2}
          y={playerFeetY - PLAYER_IMG_H}
          width={PLAYER_IMG_W}
          height={PLAYER_IMG_H}
          preserveAspectRatio="xMidYMax meet"
          opacity={jumpStartRef.current !== null ? 0 : 1}
        />
        <SvgImage
          href={PLAYER_IMG_JUMP}
          x={playerX - PLAYER_IMG_JUMP_W / 2}
          y={playerFeetY - PLAYER_IMG_JUMP_H}
          width={PLAYER_IMG_JUMP_W}
          height={PLAYER_IMG_JUMP_H}
          preserveAspectRatio="xMidYMax meet"
          opacity={jumpStartRef.current !== null ? 1 : 0}
        />
      </Svg>

      <View style={styles.scoreContainer} pointerEvents="none">
        <Text style={styles.scoreText}>{score}</Text>
      </View>

      {gameState === 'countdown' && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <Text style={styles.countdownText}>{countdownLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scoreContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scoreText: {
    color: '#e0e0ff',
    fontSize: 56,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
  },
  countdownText: {
    color: '#ffdd66',
    fontSize: 120,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowRadius: 8,
  },
});
