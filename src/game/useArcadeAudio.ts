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

const MUSIC_PROGRESSION: number[][] = [
  [196, 246.94, 293.66, 246.94],
  [220, 277.18, 329.63, 277.18],
  [174.61, 220, 261.63, 220],
  [196, 261.63, 329.63, 246.94],
];

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
  const musicTimerRef = useRef<number | null>(null);
  const barRef = useRef(0);
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
    const bus = busRef.current;
    if (bus) {
      bus.master.gain.value = muted ? 0 : 0.9;
    }
  }, [muted]);

  const ensureBus = useCallback(async (): Promise<AudioBus | null> => {
    if (typeof globalThis.window === 'undefined') {
      return null;
    }

    if (!busRef.current) {
      const AudioCtor =
        globalThis.AudioContext ||
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) {
        return null;
      }

      const context = new AudioCtor();
      const master = context.createGain();
      master.gain.value = mutedRef.current ? 0 : 0.9;
      master.connect(context.destination);

      const fxBus = context.createGain();
      fxBus.gain.value = 0.85;
      fxBus.connect(master);

      const musicBus = context.createGain();
      musicBus.gain.value = 0.32;
      musicBus.connect(master);

      const reverb = context.createConvolver();
      reverb.buffer = buildReverbImpulse(context);
      const reverbGain = context.createGain();
      reverbGain.gain.value = 0.18;
      reverb.connect(reverbGain);
      reverbGain.connect(master);

      busRef.current = { context, master, fxBus, musicBus, reverb };
    }

    if (busRef.current.context.state === 'suspended') {
      await busRef.current.context.resume();
    }

    return busRef.current;
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

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

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

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.008);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

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

  const playRoundStart = useCallback(() => {
    void playTone({
      frequency: 392,
      endFrequency: 523.25,
      duration: 0.18,
      gain: 0.05,
      type: 'triangle',
    });
    globalThis.setTimeout(() => {
      void playTone({
        frequency: 587.33,
        endFrequency: 783.99,
        duration: 0.22,
        gain: 0.05,
        type: 'sine',
      });
    }, 110);
    globalThis.setTimeout(() => {
      void playTone(
        {
          frequency: 783.99,
          duration: 0.32,
          gain: 0.04,
          type: 'triangle',
          attack: 0.02,
        },
        'fx',
        0.45,
      );
    }, 240);
  }, [playTone]);

  const playRoundEnd = useCallback(() => {
    void playTone({
      frequency: 523.25,
      endFrequency: 261.63,
      duration: 0.6,
      gain: 0.05,
      type: 'sine',
      attack: 0.02,
    });
    globalThis.setTimeout(() => {
      void playTone({
        frequency: 392,
        endFrequency: 196,
        duration: 0.7,
        gain: 0.04,
        type: 'triangle',
        attack: 0.03,
      });
    }, 90);
  }, [playTone]);

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

  const playStreakPing = useCallback(
    (level: number) => {
      const base = 660 + Math.min(level, 8) * 80;
      void playTone(
        {
          frequency: base,
          endFrequency: base * 1.4,
          duration: 0.16,
          gain: 0.03,
          type: 'sine',
          attack: 0.005,
        },
        'fx',
        0.35,
      );
      void playTone(
        {
          frequency: base * 1.5,
          duration: 0.12,
          gain: 0.018,
          type: 'triangle',
          attack: 0.005,
        },
        'fx',
        0.35,
      );
    },
    [playTone],
  );

  const stopMusic = useCallback(() => {
    if (musicTimerRef.current !== null) {
      globalThis.clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
    barRef.current = 0;
  }, []);

  const setRoundLoopActive = useCallback(
    (active: boolean) => {
      stopMusic();

      if (!active || typeof globalThis.window === 'undefined') {
        return;
      }

      const playBar = () => {
        const progression =
          MUSIC_PROGRESSION[barRef.current % MUSIC_PROGRESSION.length];
        progression.forEach((frequency, step) => {
          globalThis.setTimeout(() => {
            void playTone(
              {
                frequency,
                duration: 0.34,
                gain: step === 0 ? 0.022 : 0.014,
                type: step % 2 === 0 ? 'triangle' : 'sine',
                attack: 0.04,
                detune: step === 3 ? -8 : 4,
              },
              'music',
              0.4,
            );

            if (step % 2 === 0) {
              void playTone(
                {
                  frequency: frequency / 2,
                  duration: 0.4,
                  gain: 0.012,
                  type: 'sine',
                  attack: 0.05,
                },
                'music',
                0,
              );
            }
          }, step * 200);
        });
        barRef.current += 1;
      };

      playBar();
      musicTimerRef.current = globalThis.setInterval(playBar, 880);
    },
    [playTone, stopMusic],
  );

  const guard = useCallback(
    (action: () => void) => {
      if (!mutedRef.current) {
        action();
      }
    },
    [],
  );

  return useMemo(
    () => ({
      playDash: () => guard(playDash),
      playTag: () => guard(playTag),
      playRoundStart: () => guard(playRoundStart),
      playRoundEnd: () => guard(playRoundEnd),
      playCountdownTick: () => guard(playCountdownTick),
      playStreakPing: (level: number) => guard(() => playStreakPing(level)),
      setRoundLoopActive,
    }),
    [
      guard,
      playDash,
      playTag,
      playRoundStart,
      playRoundEnd,
      playCountdownTick,
      playStreakPing,
      setRoundLoopActive,
    ],
  );
}
