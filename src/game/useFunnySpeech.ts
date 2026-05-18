import { useCallback } from 'react';
import type { Lang } from './i18n';
import { DEFAULT_LANG } from './i18n';
import { VOICE_CACHE_MANIFEST } from './voiceCacheManifest';

export type VoiceCharacter = {
  id: string;
  label: string;
  voiceId: string;
};

export const VOICE_CHARACTERS: Record<Lang, VoiceCharacter[]> = {
  cs: [
    { id: 'george', label: '🎩 Trhač', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
    { id: 'lily', label: '💃 Čubka', voiceId: 'pFZP5JQG7iQjIQuC4Bku' },
    { id: 'brian', label: '🎙️ Retrívr', voiceId: 'nPczCjzI2devNBz1zQrb' },
    { id: 'bill', label: '🪖 Doga', voiceId: 'pqHfZKP75CvOlQylNhV4' },
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

// WARNING: client-side ElevenLabs key. This is exposed in the JS bundle and
// can be scraped/abused. Acceptable trade-off because ElevenLabs blocks free
// tier traffic from datacenter IPs (Vercel functions), so the residential
// browser IP is needed. Rotate the key if abuse appears, and keep this on the
// cheapest plan.
const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_multilingual_v2';
const CACHE_NAME = 'pug-banger-fiesta-voice-v2';

const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;

const MEMORY_CACHE_MAX = 64;
const memoryCache = new Map<string, ArrayBuffer>();
const inflight = new Map<string, Promise<ArrayBuffer | null>>();

function memoryCacheSet(key: string, buf: ArrayBuffer) {
  // Simple LRU-ish cap: evict oldest insertion when full.
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, buf);
}

let cachedVoices: SpeechSynthesisVoice[] = [];
function loadBrowserVoices() {
  if (globalThis.window === undefined || !globalThis.speechSynthesis) return;
  cachedVoices = globalThis.speechSynthesis.getVoices();
}
if (globalThis.window !== undefined && globalThis.speechSynthesis) {
  loadBrowserVoices();
  // Chrome/Firefox return [] from getVoices() until this event fires.
  globalThis.speechSynthesis.addEventListener?.('voiceschanged', loadBrowserVoices);
}

function cacheUrl(voiceId: string, text: string) {
  return `https://pug-banger-fiesta.local/voice/${voiceId}/${encodeURIComponent(text)}`;
}

const LANG_CODE: Record<Lang, string> = {
  cs: 'cs',
  en: 'en',
};

const BROWSER_LANG: Record<Lang, string> = {
  cs: 'cs-CZ',
  en: 'en-US',
};

async function fetchPhrase(
  voiceId: string,
  text: string,
  lang: Lang,
): Promise<ArrayBuffer | null> {
  const key = `${voiceId}:${lang}:${text}`;
  const cached = memoryCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending !== undefined) return pending;

  const cacheUrlKey = `${cacheUrl(voiceId, text)}?lang=${lang}`;

  const promise = (async () => {
    // Pre-baked static asset (see scripts/generate-voice-cache.mjs). When a
    // phrase is in the manifest the runtime never hits ElevenLabs — the mp3
    // ships as a normal asset under public/assets/voice/.
    const staticRel = VOICE_CACHE_MANIFEST[key];
    if (staticRel) {
      try {
        const res = await fetch(`/assets/${staticRel}`);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          memoryCacheSet(key, buf);
          return buf;
        }
      } catch {
        // Fall through to CacheStorage / network.
      }
    }

    if ('caches' in globalThis) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(cacheUrlKey);
        if (hit) {
          const buf = await hit.arrayBuffer();
          memoryCacheSet(key, buf);
          return buf;
        }
      } catch {
        // Cache API unavailable (e.g. http context); fall through to network.
      }
    }

    if (!apiKey) return null;

    const res = await fetch(
      `${ELEVENLABS_ENDPOINT}/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          language_code: LANG_CODE[lang],
        }),
      },
    );

    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    memoryCacheSet(key, buf);

    if ('caches' in globalThis) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(
          cacheUrlKey,
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

function speakWithBrowser(text: string, lang: Lang) {
  if (globalThis.window === undefined || !globalThis.speechSynthesis) return;
  // Only cancel if something is actively speaking — slamming cancel() on every
  // call wedges the queue on Safari and produces silent gaps on Chrome.
  if (globalThis.speechSynthesis.speaking) {
    globalThis.speechSynthesis.cancel();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const targetLang = BROWSER_LANG[lang];
  const langPrefix = LANG_CODE[lang];
  utterance.lang = targetLang;
  utterance.pitch = 1 + (Math.random() - 0.5) * 0.35;
  utterance.rate = 1.08;
  // Use the cached voice list; getVoices() returns [] on first call in
  // Chrome/Firefox before `voiceschanged` fires.
  if (cachedVoices.length === 0) loadBrowserVoices();
  const voices = cachedVoices.length > 0
    ? cachedVoices
    : globalThis.speechSynthesis.getVoices();
  const voice =
    voices.find((item) => item.lang.toLowerCase().startsWith(langPrefix)) ??
    voices[0];
  if (voice) utterance.voice = voice;
  globalThis.speechSynthesis.speak(utterance);
}

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let playToken = 0;

async function playPhrase(
  voiceId: string,
  text: string,
  muted: boolean,
  lang: Lang,
) {
  if (muted || globalThis.window === undefined) return;

  // Each call gets a token. If a newer call comes in while we're fetching
  // or playing, we drop this one silently — otherwise we'd either double up
  // or fire the browser TTS fallback for a stale phrase when our audio is
  // paused by the next call (AbortError on .play()).
  const token = ++playToken;

  const buf = await fetchPhrase(voiceId, text, lang).catch(() => null);

  if (token !== playToken) return;

  if (!buf) {
    speakWithBrowser(text, lang);
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }

  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
  currentUrl = url;
  const audio = new Audio(url);
  currentAudio = audio;

  // Revoke the blob URL once playback finishes or errors — otherwise the
  // final phrase's blob is leaked for the lifetime of the page.
  const cleanup = () => {
    URL.revokeObjectURL(url);
    if (currentUrl === url) currentUrl = null;
  };
  audio.addEventListener('ended', cleanup, { once: true });
  audio.addEventListener('error', cleanup, { once: true });

  try {
    await audio.play();
  } catch (err) {
    // AbortError = we intentionally paused this audio to start a newer one.
    // Token mismatch = same idea: a newer call took over. Either way, do not
    // fall back to browser TTS — the newer call is handling it.
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    if (!aborted && token === playToken) {
      speakWithBrowser(text, lang);
    }
  }
}

export function playVoiceSample(
  voiceId: string,
  muted: boolean,
  phrase: string,
  lang: Lang,
) {
  void playPhrase(voiceId, phrase, muted, lang);
}

export function useFunnySpeech(muted: boolean, voiceId: string, lang: Lang) {
  return useCallback(
    (text: string) => {
      void playPhrase(voiceId, text, muted, lang);
    },
    [muted, voiceId, lang],
  );
}
