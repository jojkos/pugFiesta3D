import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import {
  CAMERA_POSITION,
  GOAL_SHOUT_COOLDOWN,
  ROUND_DURATION,
  ROUND_INTRO_DELAY,
} from './game/config';
import { computeLatchPoints } from './game/scoring';
import { clampInput } from './game/input';
import { Overlay } from './game/Overlay';
import { PrototypeScene } from './game/PrototypeScene';
import { TouchControls } from './game/TouchControls';
import { useArcadeAudio } from './game/useArcadeAudio';
import {
  defaultVoiceForLang,
  getVoicesForLang,
  isVoiceInLang,
  playVoiceSample,
  preloadVoicePhrases,
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

// Flip to false to dormant the kid-friendly mode feature without removing code:
// disables the age gate, the toggle button, and forces adult strings everywhere.
const KID_MODE_ENABLED = false;

const KID_FRIENDLY_STORAGE_KEY = 'pug-banger-fiesta-kid-friendly';
const AGE_GATE_STORAGE_KEY = 'pug-banger-fiesta-age-gate-answered';

function App() {
  const [isMuted, setIsMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const {
    playDash,
    playTag,
    playCheer,
    playWhistle,
    playCountdownTick,
    playMusicTrack,
    setMusicPlaybackRate,
    resumeAudio,
    suspendAudio,
    unlockAudio,
    preloadAudio,
  } = useArcadeAudio(isMuted);
  const lastGoalShoutAtRef = useRef(0);
  const phraseNonceRef = useRef(0);
  const [activePhrase, setActivePhrase] = useState<{
    text: string;
    kind: 'tag' | 'multi' | 'goal';
    nonce: number;
  } | null>(null);
  const [lang, setLang] = useState<Lang>(() => {
    if (globalThis.window === undefined) return DEFAULT_LANG;
    const stored = globalThis.sessionStorage.getItem('pug-banger-fiesta-lang');
    if (stored && (SUPPORTED_LANGS as string[]).includes(stored)) {
      return stored as Lang;
    }
    const browser = globalThis.navigator?.language?.toLowerCase() ?? '';
    if (browser.startsWith('cs')) return 'cs';
    if (browser.startsWith('en')) return 'en';
    return DEFAULT_LANG;
  });

  const [isKidFriendly, setIsKidFriendly] = useState(() => {
    if (!KID_MODE_ENABLED) return false;
    if (globalThis.window === undefined) return true;
    const stored = globalThis.localStorage.getItem(KID_FRIENDLY_STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return true;
  });

  const [showAgeGate, setShowAgeGate] = useState(() => {
    if (!KID_MODE_ENABLED) return false;
    if (globalThis.window === undefined) return false;
    return globalThis.localStorage.getItem(AGE_GATE_STORAGE_KEY) !== 'true';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);
  const strings = getStrings(lang, isKidFriendly);
  const [voiceId, setVoiceId] = useState(() => {
    const fallback = defaultVoiceForLang(lang);
    if (globalThis.window === undefined) return fallback;
    const stored = globalThis.sessionStorage.getItem('pug-banger-fiesta-voice-id');
    if (stored && isVoiceInLang(stored, lang)) return stored;
    return fallback;
  });
  const speakPhrase = useFunnySpeech(isMuted, voiceId, lang);

  // Warm the phrase cache for the active voice/lang in the background.
  // Runs on initial menu mount and whenever the user picks a different
  // voice or language — by the time they hit Play the clips are ready.
  // No AudioContext needed: phrases play through HTMLAudioElement.
  useEffect(() => {
    void preloadVoicePhrases(voiceId, lang);
  }, [voiceId, lang]);

  const [mode, setMode] = useState<GameMode>('menu');
  const [score, setScore] = useState(0);
  // Default team: Psí děvky (white primary, blue accent).
  const [jerseyColor, setJerseyColor] = useState(() => {
    if (typeof window === 'undefined') {
      return '#ffffff';
    }
    return window.sessionStorage.getItem('pug-banger-fiesta-jersey-color') ?? '#ffffff';
  });
  const [jerseyAccentColor, setJerseyAccentColor] = useState(() => {
    if (typeof window === 'undefined') {
      return '#033e8f';
    }
    return (
      window.sessionStorage.getItem('pug-banger-fiesta-jersey-accent-color') ??
      '#033e8f'
    );
  });
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const timeLeftRef = useRef(ROUND_DURATION);
  const [roundId, setRoundId] = useState(0);
  const [dashNonce, setDashNonce] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [startingRound, setStartingRound] = useState(false);
  // After the final whistle, we freeze the scene + stop the music for a short
  // beat before showing the game-over menu — gives the moment room to breathe.
  const [roundEnding, setRoundEnding] = useState(false);
  const [joystick, setJoystick] = useState<AnalogInput>({ x: 0, y: 0 });
  const [cameraZoom, setCameraZoom] = useState(() => computeCameraZoom());

  useEffect(() => {
    const update = () => setCameraZoom(computeCameraZoom());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  const [submittedEntryId, setSubmittedEntryId] = useState<string | null>(null);
  const {
    entries: leaderboardEntries,
    loading: leaderboardLoading,
    error: leaderboardError,
    submit: submitLeaderboard,
    refresh: refreshLeaderboard,
  } = useLeaderboard();
  const [keys, setKeys] = useState<KeyboardState>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (
        mode === 'playing' &&
        (key === ' ' ||
          key === 'arrowup' ||
          key === 'arrowdown' ||
          key === 'arrowleft' ||
          key === 'arrowright')
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
        if (mode === 'playing' && !paused && countdown === null && !startingRound) {
          setDashNonce((value) => value + 1);
        }
      }
      if (key === 'escape' && mode === 'playing' && countdown === null && !startingRound) {
        setPaused((value) => !value);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
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
  }, [countdown, mode, paused, startingRound]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Mode-driven music selection:
  // - Menu / game-over: menu loop
  // - Playing (incl. countdown / paused): ingame loop
  // Browser autoplay policies require a user gesture before audio can start,
  // so the very first source we create may be silent — the gesture listener
  // below unlocks the context AND restarts the active source once the user
  // first interacts anywhere on the page.
  useEffect(() => {
    if (showAgeGate) {
      playMusicTrack(null);
    } else if (roundEnding) {
      // Cut music during the post-whistle silence beat — the moment lands
      // harder without an active loop running underneath it.
      playMusicTrack(null);
    } else if (mode === 'playing') {
      playMusicTrack('ingame');
    } else {
      playMusicTrack('menu');
    }
  }, [mode, roundEnding, showAgeGate, playMusicTrack]);

  // One-time audio unlock: on the FIRST user interaction anywhere on the page,
  // resume the suspended AudioContext and explicitly kick off the current
  // desired track.
  //
  // CRITICAL: we only listen for events that the HTML spec defines as
  // "activation triggering input events" — Chrome (incl. Android) silently
  // rejects `AudioContext.resume()` if it's called from any other event.
  // Notably `pointerdown` and `touchstart` are NOT activation events on touch
  // devices (only mouse pointerdown is). The events that ARE activation:
  //   click, mousedown, pointerup (non-mouse), touchend, keydown
  // We listen for the broad set so whichever fires first on whatever input
  // method works.
  const audioUnlockedRef = useRef(false);
  // Hold the desired track in a ref so the listener closure always sees the
  // latest value without needing to re-register on every mode change.
  const desiredMusicTrackRef = useRef<'menu' | 'ingame' | null>('menu');
  useEffect(() => {
    desiredMusicTrackRef.current = showAgeGate
      ? null
      : roundEnding
        ? null
        : mode === 'playing'
          ? 'ingame'
          : 'menu';
  }, [mode, roundEnding, showAgeGate]);
  useEffect(() => {
    if (audioUnlockedRef.current) {
      return;
    }
    const events: Array<keyof DocumentEventMap> = [
      'click',
      'pointerup',
      'touchend',
      'mousedown',
      'keydown',
    ];
    const tryUnlock = () => {
      if (audioUnlockedRef.current) {
        return;
      }
      audioUnlockedRef.current = true;
      unlockAudio();
      const desired = desiredMusicTrackRef.current;
      if (desired !== null) {
        playMusicTrack(desired);
      }
      events.forEach((event) => document.removeEventListener(event, tryUnlock));
    };
    events.forEach((event) => document.addEventListener(event, tryUnlock));
    return () => {
      events.forEach((event) => document.removeEventListener(event, tryUnlock));
    };
  }, [unlockAudio, playMusicTrack]);

  // Automatically pause the game and suspend audio when the tab is hidden,
  // app is closed, or focus is lost, and resume audio when re-activated.
  useEffect(() => {
    const handleSuspension = () => {
      // Pause the game automatically if we are currently playing
      if (
        mode === 'playing' &&
        !paused &&
        countdown === null &&
        !startingRound &&
        !roundEnding
      ) {
        setPaused(true);
      }
      // Suspend the AudioContext
      suspendAudio();
    };

    const handleResume = () => {
      // Automatically resume the AudioContext if it has been unlocked previously
      if (audioUnlockedRef.current) {
        resumeAudio();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleSuspension();
      } else {
        handleResume();
      }
    };

    const onBlur = () => {
      handleSuspension();
    };

    const onFocus = () => {
      handleResume();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [
    mode,
    paused,
    countdown,
    startingRound,
    roundEnding,
    resumeAudio,
    suspendAudio,
  ]);

  useEffect(() => {
    if (!startingRound) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStartingRound(false);
      setCountdown(3);
    }, ROUND_INTRO_DELAY * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [startingRound]);

  useEffect(() => {
    if (countdown === null) {
      return;
    }

    playCountdownTick();

    const timeoutId = window.setTimeout(() => {
      // Closure captures the countdown value this effect was scheduled with —
      // safe to fire the whistle here instead of inside the setState updater
      // (which Strict Mode would run twice in dev).
      if (countdown <= 1) {
        playWhistleRef.current();
      }
      setCountdown((current) => {
        if (current === null) {
          return null;
        }
        return current <= 1 ? null : current - 1;
      });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [countdown, playCountdownTick]);

  const playWhistleRef = useRef(playWhistle);
  useEffect(() => {
    playWhistleRef.current = playWhistle;
  }, [playWhistle]);

  const playCountdownTickRef = useRef(playCountdownTick);
  useEffect(() => {
    playCountdownTickRef.current = playCountdownTick;
  }, [playCountdownTick]);

  const setMusicPlaybackRateRef = useRef(setMusicPlaybackRate);
  useEffect(() => {
    setMusicPlaybackRateRef.current = setMusicPlaybackRate;
  }, [setMusicPlaybackRate]);

  const refreshLeaderboardRef = useRef(refreshLeaderboard);
  useEffect(() => {
    refreshLeaderboardRef.current = refreshLeaderboard;
  }, [refreshLeaderboard]);

  // Once the round ends, hold the frozen state for ROUND_END_HOLD_MS so the
  // whistle and the visual stillness can land — then flip to gameOver, which
  // brings up the menu (fading in via CSS).
  const ROUND_END_HOLD_MS = 1500;
  useEffect(() => {
    if (!roundEnding) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setRoundEnding(false);
      setMode('gameOver');
    }, ROUND_END_HOLD_MS);
    return () => window.clearTimeout(timeoutId);
  }, [roundEnding]);

  useEffect(() => {
    if (mode !== 'playing' || paused || countdown !== null || startingRound) {
      return;
    }

    // Music tempo ramps up in two stages over the final 10 seconds:
    //   - 10s → 5s remaining: rate climbs 1.0 → 1.25
    //   - 5s → 0s remaining:  rate climbs 1.25 → 1.5
    // playbackRate also pitches up, which is the classic arcade "time running
    // out" panic-music feel.
    const FINALE_STAGE_1_START = 10;
    const FINALE_STAGE_2_START = 5;
    const FINALE_STAGE_1_RATE = 1.25;
    const FINALE_STAGE_2_RATE = 1.5;

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

      let targetRate = 1;
      if (remaining < FINALE_STAGE_2_START) {
        const progress =
          (FINALE_STAGE_2_START - remaining) / FINALE_STAGE_2_START;
        targetRate =
          FINALE_STAGE_1_RATE +
          (FINALE_STAGE_2_RATE - FINALE_STAGE_1_RATE) * progress;
      } else if (remaining < FINALE_STAGE_1_START) {
        const progress =
          (FINALE_STAGE_1_START - remaining) /
          (FINALE_STAGE_1_START - FINALE_STAGE_2_START);
        targetRate = 1 + (FINALE_STAGE_1_RATE - 1) * progress;
      }
      setMusicPlaybackRateRef.current(targetRate);

      if (remaining <= 0) {
        playWhistleRef.current();
        setSubmittedEntryId(null);
        // Freeze the scene + stop the music; a separate effect transitions to
        // 'gameOver' after a short beat for breathing room before the menu.
        setRoundEnding(true);
        void refreshLeaderboardRef.current();
        return;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [countdown, mode, paused, roundId, startingRound]);

  const keyboardX = Number(keys.right) - Number(keys.left);
  const keyboardY = Number(keys.up) - Number(keys.down);
  const moveInput = clampInput({
    x: keyboardX + joystick.x,
    y: keyboardY + joystick.y,
  });
  // Screen Y (up = +1) maps to world -Z, since the camera looks down -Z.
  const worldMoveInput = { x: moveInput.x, y: -moveInput.y };

  const startRound = () => {
    // Resume the AudioContext synchronously inside the click handler so iOS
    // Safari treats it as a user-gesture activation. Awaiting elsewhere loses
    // the gesture and the first round goes silent.
    resumeAudio();
    // Fetch + decode the whistle and ingame music now that the AudioContext
    // is unlocked. Both ROUND_INTRO_DELAY (1s) and the countdown buy enough
    // time for the buffers to be ready before they're needed.
    preloadAudio();
    requestImmersiveMode();
    setScore(0);
    setTimeLeft(ROUND_DURATION);
    setJoystick({ x: 0, y: 0 });
    setDashNonce(0);
    setActivePhrase(null);
    setCountdown(null);
    setStartingRound(true);
    setRoundEnding(false);
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
          <fog attach="fog" args={['#a8d486', 60, 120]} />
          <OrthographicCamera
            makeDefault
            position={CAMERA_POSITION.toArray()}
            zoom={cameraZoom}
          />
          <hemisphereLight args={['#ffe9c8', '#7fa860', 0.7]} />
          <ambientLight intensity={0.85} />
          <directionalLight
            castShadow
            intensity={1.6}
            position={[10, 16, 8]}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-16}
            shadow-camera-right={16}
            shadow-camera-top={14}
            shadow-camera-bottom={-14}
            shadow-camera-near={0.1}
            shadow-camera-far={40}
          />
          <PrototypeScene
            dashNonce={dashNonce}
            isPlaying={
              mode === 'playing' &&
              !paused &&
              countdown === null &&
              !startingRound &&
              !roundEnding
            }
            jerseyColor={jerseyColor}
            jerseyAccentColor={jerseyAccentColor}
            moveInput={worldMoveInput}
            score={score}
            timeLeft={timeLeft}
            baseZoom={cameraZoom}
            introZoomOut={mode === 'playing' && (countdown !== null || startingRound)}
            activePhrase={activePhrase}
            onDashStart={playDash}
            onTag={(chainSize, inGoal) => {
              const points = computeLatchPoints(chainSize, inGoal);
              let phraseText: string;
              let phraseKind: 'tag' | 'multi' | 'goal';
              if (inGoal) {
                phraseText = strings.goalShout;
                phraseKind = 'goal';
                playCheer();
                const now = performance.now() / 1000;
                if (now - lastGoalShoutAtRef.current >= GOAL_SHOUT_COOLDOWN) {
                  speakPhrase(strings.goalShout);
                  lastGoalShoutAtRef.current = now;
                }
              } else {
                const multiPhrase = strings.multiTagPhrases[chainSize];
                phraseText = multiPhrase ?? pickRandomTagPhrase(lang, isKidFriendly);
                phraseKind = multiPhrase ? 'multi' : 'tag';
                playTag();
                speakPhrase(phraseText);
              }
              phraseNonceRef.current += 1;
              setActivePhrase({
                text: phraseText,
                kind: phraseKind,
                nonce: phraseNonceRef.current,
              });
              setScore((value) => value + points);
            }}
            roundId={roundId}
          />
        </Canvas>

        <Overlay
          countdown={countdown}
          isMuted={isMuted}
          jerseyColor={jerseyColor}
          jerseyAccentColor={jerseyAccentColor}
          mode={mode}
          onJerseyColorChange={(color) => {
            setJerseyColor(color);
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('pug-banger-fiesta-jersey-color', color);
            }
          }}
          onJerseyAccentColorChange={(color) => {
            setJerseyAccentColor(color);
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('pug-banger-fiesta-jersey-accent-color', color);
            }
          }}
          onStartRound={startRound}
          onToggleMute={() => setIsMuted((value) => !value)}
          onTogglePause={() => setPaused((value) => !value)}
          onQuitToMenu={() => {
            setPaused(false);
            setCountdown(null);
            setStartingRound(false);
            setRoundEnding(false);
            setMode('menu');
          }}
          onVoiceChange={(next) => {
            setVoiceId(next);
            if (globalThis.window !== undefined) {
              globalThis.sessionStorage.setItem('pug-banger-fiesta-voice-id', next);
            }
            playVoiceSample(next, isMuted, strings.tagPhrases[0], lang);
          }}
          voiceId={voiceId}
          lang={lang}
          onLangChange={(next) => {
            setLang(next);
            if (globalThis.window !== undefined) {
              globalThis.sessionStorage.setItem('pug-banger-fiesta-lang', next);
            }
            if (!isVoiceInLang(voiceId, next)) {
              const nextVoice = defaultVoiceForLang(next);
              setVoiceId(nextVoice);
              if (globalThis.window !== undefined) {
                globalThis.sessionStorage.setItem(
                  'pug-banger-fiesta-voice-id',
                  nextVoice,
                );
              }
            }
          }}
          strings={strings}
          voiceCharacters={getVoicesForLang(lang, isKidFriendly)}
          paused={paused}
          score={score}
          leaderboardEntries={leaderboardEntries}
          leaderboardLoading={leaderboardLoading}
          leaderboardError={leaderboardError}
          highlightedEntryId={submittedEntryId}
          onSubmitScore={async (name) => {
            if (score <= 0) return;
            const entry = await submitLeaderboard({ name, score });
            if (entry) setSubmittedEntryId(entry.id);
          }}
          kidModeEnabled={KID_MODE_ENABLED}
          isKidFriendly={isKidFriendly}
          onToggleKidFriendly={() => {
            setIsKidFriendly((prev) => {
              const next = !prev;
              if (globalThis.window !== undefined) {
                globalThis.localStorage.setItem(KID_FRIENDLY_STORAGE_KEY, String(next));
              }
              return next;
            });
          }}
          showAgeGate={showAgeGate}
          onAgeGateAnswer={(isOver15) => {
            setIsKidFriendly(!isOver15);
            if (globalThis.window !== undefined) {
              globalThis.localStorage.setItem(KID_FRIENDLY_STORAGE_KEY, String(!isOver15));
              globalThis.localStorage.setItem(AGE_GATE_STORAGE_KEY, 'true');
            }
            setShowAgeGate(false);
          }}
        />

        <TouchControls
          dashLabel={strings.controls.dash}
          disabled={mode !== 'playing' || paused || countdown !== null || startingRound}
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

function computeCameraZoom() {
  if (globalThis.window === undefined) return 64;
  const w = globalThis.window.innerWidth;
  const h = globalThis.window.innerHeight;
  // Field is ~19×10 in world units now. Tighter framing: PC ~70, phone ~46.
  const raw = Math.min(w, h * 2) / 17.5;
  return Math.max(42, Math.min(raw, 72));
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
