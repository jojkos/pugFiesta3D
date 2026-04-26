import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import { CAMERA_POSITION, ROUND_DURATION } from './game/config';
import { screenInputToWorld, clampInput } from './game/input';
import { Overlay } from './game/Overlay';
import { PrototypeScene } from './game/PrototypeScene';
import { pickRandomTagPhrase } from './game/tagPhrases';
import { TouchControls } from './game/TouchControls';
import { useArcadeAudio } from './game/useArcadeAudio';
import { useFunnySpeech } from './game/useFunnySpeech';
import type { AnalogInput, GameMode, KeyboardState } from './game/types';

function App() {
  const [isMuted, setIsMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const {
    playDash,
    playTag,
    playRoundStart,
    playRoundEnd,
    playCountdownTick,
    playStreakPing,
    setRoundLoopActive,
  } = useArcadeAudio(isMuted);
  const speakPhrase = useFunnySpeech(isMuted);
  const [mode, setMode] = useState<GameMode>('menu');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window === 'undefined') {
      return 0;
    }

    return Number(window.localStorage.getItem('pug-fiesta-best-score') ?? 0) || 0;
  });
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const timeLeftRef = useRef(ROUND_DURATION);
  const [roundId, setRoundId] = useState(0);
  const [dashNonce, setDashNonce] = useState(0);
  const [tagBurst, setTagBurst] = useState(0);
  const [tagPhrase, setTagPhrase] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const lastTagAtRef = useRef(0);
  const [joystick, setJoystick] = useState<AnalogInput>({ x: 0, y: 0 });
  const [keys, setKeys] = useState<KeyboardState>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        key === ' ' ||
        key === 'arrowup' ||
        key === 'arrowdown' ||
        key === 'arrowleft' ||
        key === 'arrowright'
      ) {
        event.preventDefault();
      }

      if (event.repeat) {
        return;
      }

      if (key === 'w' || key === 'arrowup') {
        setKeys((current) => ({ ...current, up: true }));
      }
      if (key === 's' || key === 'arrowdown') {
        setKeys((current) => ({ ...current, down: true }));
      }
      if (key === 'a' || key === 'arrowleft') {
        setKeys((current) => ({ ...current, left: true }));
      }
      if (key === 'd' || key === 'arrowright') {
        setKeys((current) => ({ ...current, right: true }));
      }
      if (key === ' ' || key === 'enter') {
        if (mode === 'playing' && !paused && countdown === null) {
          setDashNonce((value) => value + 1);
        }
      }
      if (key === 'escape' && mode === 'playing' && countdown === null) {
        setPaused((value) => !value);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') {
        setKeys((current) => ({ ...current, up: false }));
      }
      if (key === 's' || key === 'arrowdown') {
        setKeys((current) => ({ ...current, down: false }));
      }
      if (key === 'a' || key === 'arrowleft') {
        setKeys((current) => ({ ...current, left: false }));
      }
      if (key === 'd' || key === 'arrowright') {
        setKeys((current) => ({ ...current, right: false }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [countdown, mode, paused]);

  useEffect(() => {
    if (tagBurst === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTagBurst(0);
      setTagPhrase('');
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [tagBurst]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    setRoundLoopActive(mode === 'playing' && !paused && countdown === null);

    return () => {
      setRoundLoopActive(false);
    };
  }, [countdown, mode, paused, setRoundLoopActive]);

  useEffect(() => {
    if (countdown === null) {
      return;
    }

    playCountdownTick();

    const timeoutId = window.setTimeout(() => {
      setCountdown((current) => {
        if (current === null) {
          return null;
        }

        return current <= 1 ? null : current - 1;
      });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [countdown, playCountdownTick]);

  const playRoundEndRef = useRef(playRoundEnd);
  useEffect(() => {
    playRoundEndRef.current = playRoundEnd;
  }, [playRoundEnd]);

  useEffect(() => {
    if (mode !== 'playing' || paused || countdown !== null) {
      return;
    }

    const startedAt =
      performance.now() - (ROUND_DURATION - timeLeftRef.current) * 1000;
    let frameId = 0;

    const tick = () => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      const remaining = Math.max(0, ROUND_DURATION - elapsedSeconds);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        playRoundEndRef.current();
        setMode('gameOver');
        return;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [countdown, mode, paused, roundId]);

  const keyboardX = Number(keys.right) - Number(keys.left);
  const keyboardY = Number(keys.up) - Number(keys.down);
  const moveInput = clampInput({
    x: keyboardX + joystick.x,
    y: keyboardY + joystick.y,
  });
  const worldMoveInput = screenInputToWorld(moveInput);

  const startRound = () => {
    requestImmersiveMode();
    playRoundStart();
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setTimeLeft(ROUND_DURATION);
    setJoystick({ x: 0, y: 0 });
    setDashNonce(0);
    setTagBurst(0);
    setTagPhrase('');
    setCountdown(3);
    setPaused(false);
    setRoundId((value) => value + 1);
    setMode('playing');
  };

  return (
    <div className="app-shell">
      <RotateGate />
      <div className="scene-shell">
        <Canvas dpr={[1, 1.75]} shadows>
          <color attach="background" args={['#fde6d0']} />
          <fog attach="fog" args={['#ffe9d3', 22, 38]} />
          <OrthographicCamera
            makeDefault
            position={CAMERA_POSITION.toArray()}
            zoom={52}
          />
          <hemisphereLight args={['#ffe9c8', '#7fa860', 0.7]} />
          <ambientLight intensity={0.85} />
          <directionalLight
            castShadow
            intensity={1.6}
            position={[10, 16, 8]}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-14}
            shadow-camera-right={14}
            shadow-camera-top={14}
            shadow-camera-bottom={-14}
            shadow-camera-near={0.1}
            shadow-camera-far={40}
          />
          <PrototypeScene
            dashNonce={dashNonce}
            isPlaying={mode === 'playing' && !paused && countdown === null}
            moveInput={worldMoveInput}
            onDashStart={playDash}
            onTag={() => {
              const phrase = pickRandomTagPhrase();
              const now = performance.now();
              const nextStreak =
                now - lastTagAtRef.current < 3200 ? streak + 1 : 1;
              lastTagAtRef.current = now;
              playTag();
              if (nextStreak >= 2) {
                playStreakPing(nextStreak);
              }
              speakPhrase(phrase);
              setScore((value) => {
                const nextScore = value + 1;
                if (nextScore > bestScore) {
                  setBestScore(nextScore);
                  window.localStorage.setItem(
                    'pug-fiesta-best-score',
                    String(nextScore),
                  );
                }
                return nextScore;
              });
              setStreak(nextStreak);
              setMaxStreak((value) => Math.max(value, nextStreak));
              setTagPhrase(phrase);
              setTagBurst(Date.now());
            }}
            roundId={roundId}
          />
        </Canvas>

        <Overlay
          bestScore={bestScore}
          countdown={countdown}
          isMuted={isMuted}
          maxStreak={maxStreak}
          mode={mode}
          onStartRound={startRound}
          onToggleMute={() => setIsMuted((value) => !value)}
          onTogglePause={() => setPaused((value) => !value)}
          paused={paused}
          score={score}
          streak={streak}
          tagBurst={tagBurst}
          tagPhrase={tagPhrase}
          timeLeft={timeLeft}
        />

        <TouchControls
          disabled={mode !== 'playing' || paused || countdown !== null}
          onDash={() => {
            if (!paused) {
              setDashNonce((value) => value + 1);
            }
          }}
          onMove={setJoystick}
        />
      </div>
    </div>
  );
}

function RotateGate() {
  const [shouldRotate, setShouldRotate] = useState(() => isPortraitMobile());

  useEffect(() => {
    const update = () => setShouldRotate(isPortraitMobile());
    update();
    globalThis.addEventListener('resize', update);
    globalThis.addEventListener('orientationchange', update);
    return () => {
      globalThis.removeEventListener('resize', update);
      globalThis.removeEventListener('orientationchange', update);
    };
  }, []);

  if (!shouldRotate) {
    return null;
  }

  return (
    <div className="rotate-gate">
      <div className="rotate-gate-card">
        <div className="rotate-gate-icon">📱</div>
        <h2>Rotate your device</h2>
        <p>Pug Fiesta plays best in landscape. Turn your phone sideways to start chasing.</p>
      </div>
    </div>
  );
}

function requestImmersiveMode() {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    root.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  const orientation = (
    globalThis.screen as Screen & {
      orientation?: { lock?: (orientation: string) => Promise<void> };
    }
  ).orientation;
  if (orientation?.lock) {
    orientation.lock('landscape').catch(() => {});
  }
}

function isPortraitMobile() {
  if (globalThis.window === undefined) {
    return false;
  }
  const isCoarse = globalThis.matchMedia('(pointer: coarse)').matches;
  const isPortrait = globalThis.innerHeight > globalThis.innerWidth;
  const isSmall = Math.min(globalThis.innerWidth, globalThis.innerHeight) < 820;
  return isCoarse && isPortrait && isSmall;
}

export default App;
