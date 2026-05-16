# Pug Banger Fiesta — deploy setup

## Env vars (Vercel project settings → Environment Variables)

All variables are frontend-only and shipped in the browser bundle.

| Name | Notes |
|---|---|
| `VITE_SUPABASE_URL` | `https://xlwwkcpvnrpdptzgsxsu.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → `publishable` (anon) key. Safe to expose by design. |
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs key, called directly from the browser. See trade-off note below. |

### Why the ElevenLabs key lives on the client

ElevenLabs blocks Free / cheaper-tier traffic coming from datacenter IPs (Vercel functions, Cloudflare workers, etc.) with a `detected_unusual_activity` error. The only way to keep using the cheap plan is to let the user's residential browser IP call ElevenLabs directly, which means the key is visible in the JS bundle.

Mitigations:
- Keep the account on the cheapest plan so abuse caps quota damage.
- Rotate the key if you see suspicious usage in the ElevenLabs dashboard.
- If you ever upgrade to a paid plan that lifts the datacenter-IP block, move the call back to a Vercel function (see git history for `api/tts.ts`).

## Supabase setup

The `leaderboard` table already exists with columns `id uuid pk default gen_random_uuid()`, `player_name text`, `score int4`, `created_at timestamptz default now()`.

Enable RLS and add these policies in the Supabase dashboard (Authentication → Policies → New Policy on `leaderboard`):

```sql
-- Read everything
create policy "leaderboard read"
  on public.leaderboard for select
  to anon using (true);

-- Insert with light validation
create policy "leaderboard insert"
  on public.leaderboard for insert
  to anon
  with check (
    length(player_name) between 1 and 24
    and score between 0 and 9999
  );
```

## Local dev

```sh
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_ELEVENLABS_API_KEY
npm install
npm run dev
```
