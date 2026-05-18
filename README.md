# Pug Banger Fiesta

A bite-sized low-poly arcade chase. You have 45 seconds, a stage full of pugs,
and one dash button. Time the pounce, stack combos, and hump your way up the
leaderboard.

Built with React + React Three Fiber + Rapier, with a Supabase-backed
leaderboard and optional ElevenLabs voice phrases.

## Run locally

```bash
npm install
npm run dev
```

Open the URL the dev server prints. WASD / arrows to move, space (or the
on-screen button on touch devices) to dash.

## Build

```bash
npm run build
npm run preview   # to test the production bundle locally
```

## Setup notes

See [`SETUP.md`](./SETUP.md) for the Supabase + ElevenLabs environment
variables. The game runs without them (the leaderboard goes quiet and the
funny voice falls back to the browser's speech synthesis).
