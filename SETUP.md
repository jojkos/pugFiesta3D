# Pug Banger Fiesta — deploy setup

## Env vars (Vercel project settings → Environment Variables)

`VITE_`-prefixed vars are shipped in the browser bundle. The unprefixed ones are
**server-only** (used by the Vercel functions in `api/`) and must NEVER be given a
`VITE_` prefix or otherwise exposed to the client.

| Name | Exposure | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | `https://xlwwkcpvnrpdptzgsxsu.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | Supabase → Project Settings → API → `publishable` (anon) key. Read-only by design (RLS denies writes). |
| `VITE_ELEVENLABS_API_KEY` | browser | ElevenLabs key, called directly from the browser. See trade-off note below. |
| `SUPABASE_URL` | server | Same project URL as above, for `api/*` functions. |
| `SUPABASE_SECRET_KEY` | server (secret) | Supabase → Settings → API Keys → **Secret keys** (`sb_secret_…`). The modern replacement for the legacy `service_role` key; bypasses RLS — the only thing allowed to write the leaderboard. Keep secret. |
| `SCORE_SIGNING_SECRET` | server (secret) | Random string used to HMAC-sign session tokens. Generate with `openssl rand -hex 32`. |

### Why the ElevenLabs key lives on the client

ElevenLabs blocks Free / cheaper-tier traffic coming from datacenter IPs (Vercel functions, Cloudflare workers, etc.) with a `detected_unusual_activity` error. The only way to keep using the cheap plan is to let the user's residential browser IP call ElevenLabs directly, which means the key is visible in the JS bundle.

Mitigations:
- Keep the account on the cheapest plan so abuse caps quota damage.
- Rotate the key if you see suspicious usage in the ElevenLabs dashboard.
- If you ever upgrade to a paid plan that lifts the datacenter-IP block, move the call back to a Vercel function (see git history for `api/tts.ts`).

## Supabase setup

Score submission is gated by a trusted server endpoint (`api/submit-score.ts`),
not the browser. The flow:

1. Round starts → client calls `POST /api/session`, which creates a single-use
   `score_sessions` row and returns a signed token.
2. Round ends → client calls `POST /api/submit-score` with the token + score.
   The function verifies the HMAC signature, enforces a minimum elapsed time and
   expiry, consumes the session (single-use), re-checks the score against a
   plausible ceiling, and inserts using the **service-role** key.

The browser may only *read* the leaderboard; RLS denies all direct writes, so the
publishable key being in the bundle no longer matters.

The `leaderboard` table already exists with columns `id uuid pk default gen_random_uuid()`, `player_name text`, `score int4`, `created_at timestamptz default now()`.

Run this once in the Supabase SQL editor:

```sql
-- Single-use session tokens issued at game start.
create table if not exists public.score_sessions (
  nonce uuid primary key,
  issued_at timestamptz not null default now(),
  consumed_at timestamptz
);

-- Leaderboard: browser reads only.
alter table public.leaderboard enable row level security;
alter table public.score_sessions enable row level security;

-- Read everything (powers the leaderboard UI).
create policy "leaderboard read"
  on public.leaderboard for select
  to anon using (true);

-- NO anon insert/update/delete policy: the service-role key (used only by
-- api/submit-score.ts) bypasses RLS and is the sole writer.
-- score_sessions has NO anon policies at all — service-role only.
```

> If you previously had a `"leaderboard insert"` policy for `anon`, **drop it**
> (`drop policy "leaderboard insert" on public.leaderboard;`) — leaving it lets the
> browser keep writing directly and defeats the gate.

## Local dev

```sh
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_ELEVENLABS_API_KEY,
# plus the server-only SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SCORE_SIGNING_SECRET
npm install
npm run dev
```

`npm run dev` (plain Vite) does **not** execute the `api/` functions, so score
submission will fail with "No active game session". To exercise the full flow
locally, run the functions too:

```sh
npx vercel dev    # serves the SPA + /api on one port
```
