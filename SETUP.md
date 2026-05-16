# Pug Fiesta — deploy setup

## Frontend env vars (Vercel project settings → Environment Variables)

| Name | Scope | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | All | `https://xlwwkcpvnrpdptzgsxsu.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | All | Supabase → Project Settings → API → `publishable` (anon) key. Safe to expose. |
| `VITE_TTS_PROXY_URL` | Optional | Override the `/api/tts` URL. Leave unset in production. |

## Server-only env vars (Vercel project settings → Environment Variables, NOT in committed `.env`)

| Name | Notes |
|---|---|
| `ELEVENLABS_API_KEY` | The real ElevenLabs key. Lives only on the server. **Rotate the old key that was in `.env` — it has been exposed.** |
| `TTS_ALLOWED_ORIGINS` | Optional, comma-separated. e.g. `https://pug-fiesta.vercel.app,http://localhost:5173`. If empty, `*` is used. |

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
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

For local TTS during dev you have two options:
1. Run `vercel dev` so `/api/tts` is served locally — needs `ELEVENLABS_API_KEY` in your local env.
2. Set `VITE_TTS_PROXY_URL=https://your-app.vercel.app/api/tts` in `.env` to use the deployed proxy.
