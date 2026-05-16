export const config = {
  runtime: 'edge',
};

const ELEVENLABS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_flash_v2_5';
const ALLOWED_VOICE_IDS = new Set([
  'JBFqnCBsd6RMkjVDRZzb',
  'pFZP5JQG7iQjIQuC4Bku',
  'nPczCjzI2devNBz1zQrb',
  'pqHfZKP75CvOlQylNhV4',
]);
const ALLOWED_LANGS = new Set(['cs', 'en']);
const MAX_TEXT_LEN = 160;

const ALLOWED_ORIGINS = (process.env.TTS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))
      ? origin
      : ALLOWED_ORIGINS[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response('Server misconfigured', { status: 500, headers: cors });
  }

  let body: { voiceId?: string; text?: string; lang?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  const voiceId = String(body.voiceId ?? '');
  const text = String(body.text ?? '');
  const lang = String(body.lang ?? '');

  if (!ALLOWED_VOICE_IDS.has(voiceId)) {
    return new Response('Voice not allowed', { status: 400, headers: cors });
  }
  if (!text || text.length > MAX_TEXT_LEN) {
    return new Response('Bad text', { status: 400, headers: cors });
  }
  if (!ALLOWED_LANGS.has(lang)) {
    return new Response('Bad lang', { status: 400, headers: cors });
  }

  const upstream = await fetch(
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
        language_code: lang,
      }),
    },
  );

  if (!upstream.ok || !upstream.body) {
    const errorBody = await upstream.text().catch(() => '');
    console.error('[tts] upstream error', {
      status: upstream.status,
      statusText: upstream.statusText,
      body: errorBody.slice(0, 500),
      voiceId,
      lang,
    });
    return new Response(`Upstream ${upstream.status}: ${errorBody.slice(0, 200)}`, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'text/plain;charset=utf-8' },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
