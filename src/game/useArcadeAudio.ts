import { useCallback, useEffect, useMemo, useRef } from 'react';

type ToneShape = {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  endFrequency?: number;
  attack?: number;
  detune?: number;
  filter?: number;
};

type AudioBus = {
  context: AudioContext;
  master: GainNode;
  fxBus: GainNode;
  musicBus: GainNode;
  reverb: ConvolverNode;
};

type MusicTrack = 'menu' | 'ingame';

// Swap `ingame` between ingame.mp3 / ingame2.mp3 / ingame3.mp3 to A/B different
// in-game music takes without touching the rest of the audio plumbing.
const MUSIC_TRACK_URLS: Record<MusicTrack, string> = {
  menu: '/assets/audio/menu.mp3',
  ingame: '/assets/audio/ingame.mp3',
};

// Per-track loop volume. Background music sits well behind FX and voice — keep
// these low. Tune by ear.
const MUSIC_TRACK_GAIN: Record<MusicTrack, number> = {
  menu: 0.18,
  ingame: 0.16,
};

const MUSIC_FADE_DURATION = 0.6;

const SFX_URLS = {
  whistle: '/assets/audio/whistle.mp3',
} as const;

const SFX_GAIN: Record<keyof typeof SFX_URLS, number> = {
  whistle: 0.45,
};

function buildReverbImpulse(context: AudioContext, duration = 1.4) {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = context.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.4;
    }
  }
  return impulse;
}

export function useArcadeAudio(muted: boolean) {
  const busRef = useRef<AudioBus | null>(null);
  const scheduledTimeoutsRef = useRef<Set<number>>(new Set());
  const mutedRef = useRef(muted);
  // Single buffer cache keyed by URL — covers both music loops and SFX one-shots.
  const audioBufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const audioBufferLoading = useRef<Map<string, Promise<AudioBuffer | null>>>(
    new Map(),
  );
  const activeMusicRef = useRef<{
    track: MusicTrack;
    source: AudioBufferSourceNode;
    gain: GainNode;
  } | null>(null);
  // A looping silent HTMLAudioElement kept alive after the first gesture so
  // iOS Safari keeps the page's audio session in the "playback" category.
  // Without it, Web Audio output runs in the "ambient" category and gets
  // muted whenever the user has the physical silent switch flipped on.
  const silentPrimerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
    const bus = busRef.current;
    if (bus) {
      bus.master.gain.value = muted ? 0 : 0.9;
    }
  }, [muted]);

  const createBus = useCallback((): AudioBus | null => {
    if (typeof globalThis.window === 'undefined') return null;
    if (busRef.current) return busRef.current;

    const AudioCtor =
      globalThis.AudioContext ||
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return null;

    const context = new AudioCtor();
    const master = context.createGain();
    master.gain.value = mutedRef.current ? 0 : 0.9;
    master.connect(context.destination);

    const fxBus = context.createGain();
    fxBus.gain.value = 0.85;
    fxBus.connect(master);

    const musicBus = context.createGain();
    musicBus.gain.value = 0.95;
    musicBus.connect(master);

    const reverb = context.createConvolver();
    reverb.buffer = buildReverbImpulse(context);
    const reverbGain = context.createGain();
    reverbGain.gain.value = 0.18;
    reverb.connect(reverbGain);
    reverbGain.connect(master);

    busRef.current = { context, master, fxBus, musicBus, reverb };
    return busRef.current;
  }, []);

  // Synchronous resume — call directly inside a user-gesture handler (e.g. the
  // Start button onClick) so iOS Safari counts it as a real user-activated
  // resume. Awaiting an ensureBus() chain instead loses the gesture and the
  // first round plays silently on iOS.
  const resumeAudio = useCallback(() => {
    const bus = createBus();
    if (bus && bus.context.state === 'suspended') {
      // Returning a promise we don't await is fine; the resume itself happens
      // synchronously inside the gesture.
      void bus.context.resume();
    }
    // Re-kick the silent primer if iOS paused it while the tab was hidden.
    // Called from a real gesture, so play() is allowed.
    const primer = silentPrimerRef.current;
    if (primer && primer.paused) {
      const promise = primer.play();
      if (promise !== undefined) {
        promise.catch(() => {});
      }
    }
  }, [createBus]);

  const suspendAudio = useCallback(() => {
    const bus = busRef.current;
    if (bus && bus.context.state === 'running') {
      void bus.context.suspend();
    }
  }, []);

  const ensureBus = useCallback(async (): Promise<AudioBus | null> => {
    const bus = createBus();
    if (!bus) return null;
    if (bus.context.state === 'suspended') {
      await bus.context.resume();
    }
    return bus;
  }, [createBus]);

  const trackTimeout = useCallback((handler: () => void, ms: number) => {
    const id = globalThis.setTimeout(() => {
      scheduledTimeoutsRef.current.delete(id);
      handler();
    }, ms);
    scheduledTimeoutsRef.current.add(id);
    return id;
  }, []);

  const playTone = useCallback(
    async (
      shape: ToneShape,
      destination: 'fx' | 'music' = 'fx',
      reverbAmount = 0,
    ) => {
      const bus = await ensureBus();
      if (!bus) {
        return;
      }
      const {
        frequency,
        duration,
        type,
        gain,
        endFrequency,
        attack = 0.012,
        detune = 0,
        filter = 2400,
      } = shape;

      const oscillator = bus.context.createOscillator();
      const filterNode = bus.context.createBiquadFilter();
      const gainNode = bus.context.createGain();
      const now = bus.context.currentTime;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.detune.setValueAtTime(detune, now);
      if (endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(
          endFrequency,
          now + duration,
        );
      }

      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(filter, now);
      filterNode.Q.value = 0.7;

      // Linear ramps in/out — `exponentialRampToValueAtTime(0, ...)` is
      // illegal, and ramping to 0.0001 then back down to 0.0001 produces
      // audible Safari clicks and occasional NaN gain nodes.
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(gain, now + attack);
      gainNode.gain.setValueAtTime(gain, now + duration * 0.6);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(destination === 'music' ? bus.musicBus : bus.fxBus);

      if (reverbAmount > 0) {
        const sendGain = bus.context.createGain();
        sendGain.gain.value = reverbAmount;
        gainNode.connect(sendGain);
        sendGain.connect(bus.reverb);
      }

      oscillator.start(now);
      oscillator.stop(now + duration);
    },
    [ensureBus],
  );

  const playNoise = useCallback(
    async (params: {
      duration: number;
      gain: number;
      filterFrequency: number;
      filterType?: BiquadFilterType;
      Q?: number;
    }) => {
      const bus = await ensureBus();
      if (!bus) {
        return;
      }

      const {
        duration,
        gain,
        filterFrequency,
        filterType = 'bandpass',
        Q = 1.4,
      } = params;
      const sampleCount = Math.ceil(bus.context.sampleRate * duration);
      const buffer = bus.context.createBuffer(
        1,
        sampleCount,
        bus.context.sampleRate,
      );
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < sampleCount; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
      }

      const source = bus.context.createBufferSource();
      const filter = bus.context.createBiquadFilter();
      const gainNode = bus.context.createGain();
      const now = bus.context.currentTime;

      source.buffer = buffer;
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFrequency, now);
      filter.Q.value = Q;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(gain, now + 0.008);
      gainNode.gain.setValueAtTime(gain, now + duration * 0.6);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(bus.fxBus);
      source.start(now);
      source.stop(now + duration);
    },
    [ensureBus],
  );

  const playDash = useCallback(() => {
    void playTone({
      frequency: 220,
      endFrequency: 110,
      duration: 0.2,
      gain: 0.06,
      type: 'triangle',
    });
    void playTone({
      frequency: 480,
      endFrequency: 200,
      duration: 0.13,
      gain: 0.025,
      type: 'sawtooth',
      attack: 0.005,
      filter: 1800,
    });
    void playNoise({
      duration: 0.09,
      gain: 0.018,
      filterFrequency: 1400,
      Q: 0.7,
    });
  }, [playNoise, playTone]);

  const playTag = useCallback(() => {
    const baseFreqs = [523.25, 659.25, 783.99];
    baseFreqs.forEach((frequency, index) => {
      void playTone(
        {
          frequency,
          endFrequency: frequency * 1.3,
          duration: 0.22 - index * 0.03,
          gain: 0.045 - index * 0.008,
          type: index === 0 ? 'square' : 'triangle',
          attack: 0.006 + index * 0.004,
        },
        'fx',
        0.32,
      );
    });
    void playNoise({
      duration: 0.06,
      gain: 0.012,
      filterFrequency: 3200,
      Q: 0.6,
    });
  }, [playNoise, playTone]);

  const playCheer = useCallback(() => {
    // Crowd "aaahh" — three parallel band-passed noise layers tuned to vocal
    // formants (F1≈800, F2≈1200, F3≈2400) to fake a human "ah" timbre. Stacking
    // them gives the noise an open-vowel character instead of plain hiss.
    const formants: Array<{ freq: number; Q: number; gain: number }> = [
      { freq: 780, Q: 6, gain: 0.055 },
      { freq: 1180, Q: 8, gain: 0.04 },
      { freq: 2450, Q: 5, gain: 0.025 },
    ];
    formants.forEach(({ freq, Q, gain }) => {
      void playNoise({
        duration: 1.3,
        gain,
        filterFrequency: freq,
        filterType: 'bandpass',
        Q,
      });
    });
    // Diffuse low-mid bed for body — wide bandpass sweeping across the cheer.
    void playNoise({
      duration: 1.3,
      gain: 0.05,
      filterFrequency: 600,
      filterType: 'bandpass',
      Q: 0.9,
    });

    // Clap stream — many short transients with randomized timing, gain, and
    // filter to simulate an uncoordinated crowd. Density (~30 over 1.3s) is
    // what reads as "many people clapping" instead of one clapper.
    const clapCount = 32;
    for (let i = 0; i < clapCount; i += 1) {
      const baseOffset = (i / clapCount) * 1200;
      const jitter = (Math.random() - 0.5) * 90;
      const offsetMs = Math.max(0, baseOffset + jitter);
      const density = i < 8 ? 1.25 : 1; // front-load slightly for impact
      trackTimeout(() => {
        void playNoise({
          duration: 0.018 + Math.random() * 0.012,
          gain: (0.035 + Math.random() * 0.04) * density,
          filterFrequency: 2200 + Math.random() * 1600,
          filterType: 'highpass',
          Q: 0.5 + Math.random() * 0.6,
        });
      }, offsetMs);
    }

    // Bright triumphant whistle/fanfare — rising triangle with a brief
    // second-octave tail.
    void playTone(
      {
        frequency: 880,
        endFrequency: 1568,
        duration: 0.55,
        gain: 0.045,
        type: 'triangle',
        attack: 0.03,
      },
      'fx',
      0.5,
    );
    trackTimeout(() => {
      void playTone(
        {
          frequency: 1318.5,
          endFrequency: 1760,
          duration: 0.4,
          gain: 0.035,
          type: 'triangle',
          attack: 0.02,
        },
        'fx',
        0.5,
      );
    }, 180);
  }, [playNoise, playTone, trackTimeout]);

  const playCountdownTick = useCallback(() => {
    void playTone({
      frequency: 880,
      duration: 0.07,
      gain: 0.04,
      type: 'square',
      attack: 0.002,
      filter: 3000,
    });
  }, [playTone]);

  const loadAudioBuffer = useCallback(
    async (url: string): Promise<AudioBuffer | null> => {
      const cached = audioBufferCache.current.get(url);
      if (cached) return cached;
      const pending = audioBufferLoading.current.get(url);
      if (pending) return pending;

      const bus = await ensureBus();
      if (!bus) return null;

      const promise = (async () => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await bus.context.decodeAudioData(arrayBuffer);
          audioBufferCache.current.set(url, audioBuffer);
          return audioBuffer;
        } catch {
          return null;
        } finally {
          audioBufferLoading.current.delete(url);
        }
      })();

      audioBufferLoading.current.set(url, promise);
      return promise;
    },
    [ensureBus],
  );

  const stopActiveMusic = useCallback((fade = MUSIC_FADE_DURATION) => {
    const active = activeMusicRef.current;
    if (!active) return;
    activeMusicRef.current = null;
    const ctx = active.gain.context;
    const now = ctx.currentTime;
    try {
      active.gain.gain.cancelScheduledValues(now);
      active.gain.gain.setValueAtTime(active.gain.gain.value, now);
      active.gain.gain.linearRampToValueAtTime(0, now + fade);
      active.source.stop(now + fade + 0.02);
    } catch {
      try {
        active.source.stop();
      } catch {
        // Already stopped.
      }
    }
  }, []);

  const playSample = useCallback(
    async (url: string, gain = 0.5) => {
      const bus = await ensureBus();
      if (!bus) return;
      const buffer = await loadAudioBuffer(url);
      if (!buffer) return;
      const source = bus.context.createBufferSource();
      source.buffer = buffer;
      const gainNode = bus.context.createGain();
      gainNode.gain.value = gain;
      source.connect(gainNode);
      gainNode.connect(bus.fxBus);
      source.start(bus.context.currentTime);
    },
    [ensureBus, loadAudioBuffer],
  );

  const playWhistle = useCallback(() => {
    void playSample(SFX_URLS.whistle, SFX_GAIN.whistle);
  }, [playSample]);

  const playMusicTrack = useCallback(
    async (track: MusicTrack | null) => {
      if (track === null) {
        stopActiveMusic();
        return;
      }
      if (activeMusicRef.current?.track === track) {
        return;
      }

      const bus = await ensureBus();
      if (!bus) return;
      const buffer = await loadAudioBuffer(MUSIC_TRACK_URLS[track]);
      // Bail if mute flipped while we were decoding, or another track took over.
      if (!buffer) return;
      if (activeMusicRef.current?.track === track) return;

      stopActiveMusic();

      const source = bus.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const trackGain = bus.context.createGain();
      const targetGain = MUSIC_TRACK_GAIN[track];
      const now = bus.context.currentTime;
      trackGain.gain.setValueAtTime(0, now);
      trackGain.gain.linearRampToValueAtTime(targetGain, now + MUSIC_FADE_DURATION);

      source.connect(trackGain);
      trackGain.connect(bus.musicBus);
      source.start(now);

      activeMusicRef.current = { track, source, gain: trackGain };
    },
    [ensureBus, loadAudioBuffer, stopActiveMusic],
  );

  // Synchronously resume the AudioContext and clear any "ghost" source that
  // was scheduled against the suspended context. Browsers (especially iOS
  // Safari) hold scheduled sources in limbo until resume() — they can either
  // stay silent or blast suddenly when the context finally runs. Caller is
  // responsible for kicking off the desired track AFTER calling this.
  const unlockAudio = useCallback(() => {
    const bus = createBus();
    if (!bus) return;
    if (bus.context.state === 'suspended') {
      // Synchronous resume() so iOS counts this as gesture-activated.
      void bus.context.resume();
    }
    // Start (and keep alive) a looping silent HTMLAudioElement so iOS Safari
    // promotes the audio session from "ambient" to "playback". Without this,
    // Web Audio output is silent whenever the user's physical silent switch
    // is on. The 2-byte data-URL WAV trick stopped working around iOS 17 —
    // a real (~0.5s) silent file played in a loop is the reliable fix.
    if (!silentPrimerRef.current) {
      try {
        const primer = new Audio('/assets/audio/silent.wav');
        primer.loop = true;
        primer.volume = 0;
        primer.preload = 'auto';
        // iOS only accepts this gesture-coupled play() — if it rejects we
        // silently drop the reference and try again on the next gesture.
        const promise = primer.play();
        if (promise !== undefined) {
          promise.catch(() => {
            silentPrimerRef.current = null;
          });
        }
        silentPrimerRef.current = primer;
      } catch {
        // Best-effort — Web Audio still works on devices not affected by the
        // ambient-category bug (desktop, Android, iPad without silent switch).
      }
    }
    if (activeMusicRef.current) {
      stopActiveMusic(0);
    }
  }, [createBus, stopActiveMusic]);

  const setMusicPlaybackRate = useCallback((rate: number) => {
    const active = activeMusicRef.current;
    if (!active) return;
    const param = active.source.playbackRate;
    const ctx = active.source.context;
    const now = ctx.currentTime;
    try {
      param.cancelScheduledValues(now);
      // Short exponential glide so per-frame rate calls don't click.
      param.setTargetAtTime(rate, now, 0.08);
    } catch {
      try {
        param.value = rate;
      } catch {
        // Ignore — node may have been stopped.
      }
    }
  }, []);

  const stopMusic = useCallback(() => {
    stopActiveMusic();
    scheduledTimeoutsRef.current.forEach((id) => globalThis.clearTimeout(id));
    scheduledTimeoutsRef.current.clear();
  }, [stopActiveMusic]);

  // Stop music + close the AudioContext on unmount so we don't leak across
  // HMR reloads (Chrome throttles after ~6 live contexts).
  useEffect(() => {
    return () => {
      stopMusic();
      const bus = busRef.current;
      if (bus) {
        void bus.context.close().catch(() => {});
        busRef.current = null;
      }
      const primer = silentPrimerRef.current;
      if (primer) {
        primer.pause();
        primer.src = '';
        silentPrimerRef.current = null;
      }
    };
  }, [stopMusic]);

  const guard = useCallback((action: () => void | Promise<void>) => {
    if (mutedRef.current) return;
    try {
      const result = action();
      if (result instanceof Promise) {
        result.catch(() => {});
      }
    } catch {
      // Swallow — audio failures should never crash gameplay.
    }
  }, []);

  // Fetch + decode the round-critical buffers ahead of time so the whistle
  // fires sample-accurately on the "1" fade and the ingame music doesn't
  // stutter on round start. Idempotent — loadAudioBuffer caches by URL.
  const preloadAudio = useCallback(() => {
    void loadAudioBuffer(SFX_URLS.whistle);
    void loadAudioBuffer(MUSIC_TRACK_URLS.ingame);
  }, [loadAudioBuffer]);

  return useMemo(
    () => ({
      playDash: () => guard(playDash),
      playTag: () => guard(playTag),
      playCheer: () => guard(playCheer),
      playWhistle: () => guard(playWhistle),
      playCountdownTick: () => guard(playCountdownTick),
      playMusicTrack: (track: MusicTrack | null) => {
        // Master gain handles mute, so let music start anyway — it'll be
        // inaudible while muted but switch tracks correctly when unmuted.
        void playMusicTrack(track);
      },
      setMusicPlaybackRate,
      resumeAudio,
      suspendAudio,
      unlockAudio,
      preloadAudio,
    }),
    [
      guard,
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
    ],
  );
}
