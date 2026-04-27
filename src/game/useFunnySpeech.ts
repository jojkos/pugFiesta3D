import { useCallback } from 'react';
import type { Lang } from './i18n';
import { DEFAULT_LANG } from './i18n';

export type VoiceCharacter = {
  id: string;
  label: string;
  voiceId: string;
};

export const VOICE_CHARACTERS: Record<Lang, VoiceCharacter[]> = {
  cs: [
    { id: 'george', label: '🎩 Frajer', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
    { id: 'lily', label: '💃 Mrcha', voiceId: 'pFZP5JQG7iQjIQuC4Bku' },
    { id: 'brian', label: '🎙️ Hlasatel', voiceId: 'nPczCjzI2devNBz1zQrb' },
    { id: 'bill', label: '🪖 Seržant', voiceId: 'pqHfZKP75CvOlQylNhV4' },
  ],
  en: [
    { id: 'george', label: '🎩 Posh Pug', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
    { id: 'lily', label: '💃 Sassy Pug', voiceId: 'pFZP5JQG7iQjIQuC4Bku' },
    { id: 'brian', label: '🎙️ Trailer Pug', voiceId: 'nPczCjzI2devNBz1zQrb' },
    { id: 'bill', label: '🪖 Drill Sgt', voiceId: 'pqHfZKP75CvOlQylNhV4' },
  ],
};

export function getVoicesForLang(lang: Lang): VoiceCharacter[] {
  return VOICE_CHARACTERS[lang];
}

export function defaultVoiceForLang(lang: Lang): string {
  return VOICE_CHARACTERS[lang][0].voiceId;
}

export function isVoiceInLang(voiceId: string, lang: Lang): boolean {
  return VOICE_CHARACTERS[lang].some((v) => v.voiceId === voiceId);
}

export const DEFAULT_VOICE_ID = defaultVoiceForLang(DEFAULT_LANG);

const ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_flash_v2_5';
const CACHE_NAME = 'pug-fiesta-voice-v1';

const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;

const memoryCache = new Map<string, ArrayBuffer>();
const inflight = new Map<string, Promise<ArrayBuffer | null>>();

function cacheUrl(voiceId: string, text: string) {
  return `https://pug-fiesta.local/voice/${voiceId}/${encodeURIComponent(text)}`;
}

async function fetchPhrase(
  voiceId: string,
  text: string,
): Promise<ArrayBuffer | null> {
  const key = `${voiceId}:${text}`;
  const cached = memoryCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending !== undefined) return pending;

  const promise = (async () => {
    if ('caches' in globalThis) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(cacheUrl(voiceId, text));
        if (hit) {
          const buf = await hit.arrayBuffer();
          memoryCache.set(key, buf);
          return buf;
        }
      } catch {
        // Cache API unavailable (e.g. http context); fall through to network.
      }
    }

    if (!apiKey) return null;

    const res = await fetch(
      `${ENDPOINT}/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({ text, model_id: MODEL_ID }),
      },
    );

    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    memoryCache.set(key, buf);

    if ('caches' in globalThis) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(
          cacheUrl(voiceId, text),
          new Response(buf.slice(0), {
            headers: { 'Content-Type': 'audio/mpeg' },
          }),
        );
      } catch {
        // Persistence is best-effort.
      }
    }

    return buf;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

function speakWithBrowser(text: string) {
  if (globalThis.window === undefined || !globalThis.speechSynthesis) return;
  globalThis.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.pitch = 1 + (Math.random() - 0.5) * 0.35;
  utterance.rate = 1.08;
  const voices = globalThis.speechSynthesis.getVoices();
  const voice =
    voices.find((item) => item.lang.startsWith('en')) ?? voices[0];
  if (voice) utterance.voice = voice;
  globalThis.speechSynthesis.speak(utterance);
}

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

async function playPhrase(voiceId: string, text: string, muted: boolean) {
  if (muted || globalThis.window === undefined) return;

  const buf = await fetchPhrase(voiceId, text).catch(() => null);
  if (!buf) {
    speakWithBrowser(text);
    return;
  }

  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentAudio?.pause();

  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
  currentUrl = url;
  const audio = new Audio(url);
  currentAudio = audio;
  audio.play().catch(() => speakWithBrowser(text));
}

export function playVoiceSample(
  voiceId: string,
  muted: boolean,
  phrase: string,
) {
  void playPhrase(voiceId, phrase, muted);
}

export function useFunnySpeech(muted: boolean, voiceId: string) {
  return useCallback(
    (text: string) => {
      void playPhrase(voiceId, text, muted);
    },
    [muted, voiceId],
  );
}
