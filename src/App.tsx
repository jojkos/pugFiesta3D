import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import { CAMERA_POSITION, ROUND_DURATION } from './game/config';
import { screenInputToWorld, clampInput } from './game/input';
import { Overlay } from './game/Overlay';
import { PrototypeScene } from './game/PrototypeScene';
import { TouchControls } from './game/TouchControls';
import { useArcadeAudio } from './game/useArcadeAudio';
import {
  defaultVoiceForLang,
  getVoicesForLang,
  isVoiceInLang,
  playVoiceSample,
  useFunnySpeech,
} from './game/useFunnySpeech';
import {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  getStrings,
  pickRandomTagPhrase,
  type Lang,
} from './game/i18n';
import { useLeaderboard } from './game/useLeaderboard';
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
    setRoundLoopActive,
  } = useArcadeAudio(isMuted);
  const [lang, setLang] = useState<Lang>(() => {
    if (globalThis.window === undefined) return DEFAULT_LANG;
    const stored = globalThis.localStorage.getItem('pug-banger-fiesta-lang');
    if (stored && (SUPPORTED_LANGS as string[]).includes(stored)) {
      return stored as Lang;
    }
    return DEFAULT_LANG;
  });
  const strings = getStrings(lang);
  const [voiceId, setVoiceId] = useState(() => {
    const fallback = defaultVoiceForLang(lang);
    if (globalThis.window === undefined) return fallback;
    const stored = globalThis.localStorage.getItem('pug-banger-fiesta-voice-id');
    if (stored && isVoiceInLang(stored, lang)) return stored;
    return fallback;
  });
  const speakPhrase = useFunnySpeech(isMuted, voiceId, lang);
  const [mode, setMode] = useState<GameMode>('menu');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window === 'undefined') {
      return 0;
    }

    return Number(window.localStorage.getItem('pug-banger-fiesta-best-score') ?? 0) || 0;
  });
  const [jerseyColor, setJerseyColor] = useState(() => {
    if (typeof window === 'undefined') {
      return '#7cc7ff';
    }
    return window.localStorage.getItem('pug-banger-fiesta-jersey-color') ?? '#7cc7ff';
  });
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const timeLeftRef = useRef(ROUND_DURATION);
  const [roundId, setRoundId] = useState(0);
  const [dashNonce, setDashNonce] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [joystick, setJoystick] = useState<AnalogInput>({ x: 0, y: 0 });
  const [submittedEntryId, setSubmittedEntryId] = useState<string | null>(null);
  const {
    entries: leaderboardEntries,
    loading: leaderboardLoading,
    error: leaderboardError,
    submit: submitLeaderboard,
    refresh: refreshLeaderboard,
  } = useLeaderboard(10);
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

  const playCountdownTickRef = useRef(playCountdownTick);
  useEffect(() => {
    playCountdownTickRef.current = playCountdownTick;
  }, [playCountdownTick]);

  useEffect(() => {
    if (mode !== 'playing' || paused || countdown !== null) {
      return;
    }

    const startedAt =
      performance.now() - (ROUND_DURATION - timeLeftRef.current) * 1000;
    let frameId = 0;
    let lastDisplayedSecond = Math.ceil(timeLeftRef.current);

    const tick = () => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      const remaining = Math.max(0, ROUND_DURATION - elapsedSeconds);
      timeLeftRef.current = remaining;

      const nextDisplayedSecond = Math.ceil(remaining);
      if (nextDisplayedSecond !== lastDisplayedSecond) {
        lastDisplayedSecond = nextDisplayedSecond;
        setTimeLeft(remaining);
        if (nextDisplayedSecond >= 1 && nextDisplayedSecond <= 5) {
          playCountdownTickRef.current();
        }
      }

      if (remaining <= 0) {
        playRoundEndRef.current();
        setSubmittedEntryId(null);
        setMode('gameOver');
        void refreshLeaderboard();
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
    setTimeLeft(ROUND_DURATION);
    setJoystick({ x: 0, y: 0 });
    setDashNonce(0);
    setCountdown(3);
    setPaused(false);
    setRoundId((value) => value + 1);
    setMode('playing');
  };

  return (
    <div className="app-shell">
      <RotateGate strings={strings} />
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
            jerseyColor={jerseyColor}
            moveInput={worldMoveInput}
            onDashStart={playDash}
            onTag={(chainSize) => {
              const multiPhrase = strings.multiTagPhrases[chainSize];
              const phrase = multiPhrase ?? pickRandomTagPhrase(lang);
              playTag();
              speakPhrase(phrase);
              setScore((value) => {
                const nextScore = value + 1;
                if (nextScore > bestScore) {
                  setBestScore(nextScore);
                  window.localStorage.setItem(
                    'pug-banger-fiesta-best-score',
                    String(nextScore),
                  );
                }
                return nextScore;
              });
            }}
            roundId={roundId}
          />
        </Canvas>

        <Overlay
          bestScore={bestScore}
          countdown={countdown}
          isMuted={isMuted}
          jerseyColor={jerseyColor}
          mode={mode}
          onJerseyColorChange={(color) => {
            setJerseyColor(color);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('pug-banger-fiesta-jersey-color', color);
            }
          }}
          onStartRound={startRound}
          onToggleMute={() => setIsMuted((value) => !value)}
          onTogglePause={() => setPaused((value) => !value)}
          onQuitToMenu={() => {
            setPaused(false);
            setCountdown(null);
            setMode('menu');
          }}
          onVoiceChange={(next) => {
            setVoiceId(next);
            if (globalThis.window !== undefined) {
              globalThis.localStorage.setItem('pug-banger-fiesta-voice-id', next);
            }
            playVoiceSample(next, isMuted, strings.tagPhrases[0], lang);
          }}
          voiceId={voiceId}
          lang={lang}
          onLangChange={(next) => {
            setLang(next);
            if (globalThis.window !== undefined) {
              globalThis.localStorage.setItem('pug-banger-fiesta-lang', next);
            }
            if (!isVoiceInLang(voiceId, next)) {
              const nextVoice = defaultVoiceForLang(next);
              setVoiceId(nextVoice);
              if (globalThis.window !== undefined) {
                globalThis.localStorage.setItem(
                  'pug-banger-fiesta-voice-id',
                  nextVoice,
                );
              }
            }
          }}
          strings={strings}
          voiceCharacters={getVoicesForLang(lang)}
          paused={paused}
          score={score}
          timeLeft={timeLeft}
          leaderboardEntries={leaderboardEntries}
          leaderboardLoading={leaderboardLoading}
          leaderboardError={leaderboardError}
          highlightedEntryId={submittedEntryId}
          onSubmitScore={async (name) => {
            if (score <= 0) return;
            const entry = await submitLeaderboard({ name, score });
            if (entry) setSubmittedEntryId(entry.id);
          }}
        />

        <TouchControls
          dashLabel={strings.controls.dash}
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

function RotateGate({
  strings,
}: Readonly<{ strings: ReturnType<typeof getStrings> }>) {
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
        <h2>{strings.rotate.title}</h2>
        <p>{strings.rotate.body}</p>
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
