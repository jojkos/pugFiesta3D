# Disc Golf POC — design

A proof-of-concept disc-golf minigame reusing `pugFiesta3D`'s pug character and
the UFO (as the disc). The single goal of this POC is to prove that **throwing a
disc feels good**. It is the third pivot/minigame concept alongside the original
pug-chasing arcade game and the shelved [ufobal](https://cs.wikipedia.org/wiki/Ufobal)
handball pivot. The longer-term vision is a single app containing several
minigames that share graphics and characters, but the multi-game container is
**out of scope** here — this spec covers only the standalone throwing POC.

## Goal & success criteria

One playable hole: stand at the tee, drag back to aim and charge power, release,
steer the disc mid-flight to curve it around an obstacle, watch it land, walk the
pug to where it landed, throw again, and hole out in the basket — with a throw
counter and par.

The POC succeeds if the **throw → steer → land → walk → throw** loop feels
satisfying and the predicted-arc preview makes aiming legible. Disc variety,
multiple holes, AI, and the multi-game menu are explicitly out of scope.

## Locked decisions (from brainstorming)

- **Input:** drag-back slingshot. Pull *length* → power, pull *angle* → aim
  heading (disc flies opposite the pull). After release, a horizontal **steer**
  input bends the disc mid-flight (arcade, forgiving, mobile-friendly).
- **Curve model:** mid-flight steer (not curved-swipe detection, not a pre-throw
  slider). Steering applies capped, decaying lateral acceleration → hyzer/anhyzer arc.
- **Camera:** hybrid — behind-thrower while aiming, follow-disc in flight, high
  3/4 follow while walking.
- **Flight depth:** ballistic (gravity + drag) plus steer-driven curve. No
  per-disc speed/glide/turn/fade numbers.
- **Scope:** standalone single hole, isolated from `App.tsx`.
- **Theme:** the UFO mesh is the disc; the existing pug is the thrower.

## Isolation strategy

Built as a standalone scene; `App.tsx` is untouched. `main.tsx` checks for a
`?game=discgolf` query param and mounts `<DiscGolfPOC/>` instead of `<App/>`. All
new code lives under `src/discgolf/`. This keeps the monolithic App and its
menu/audio/leaderboard machinery out of the way and makes it trivial to later
fold the scene into the multi-game container as one entry.

## Physics: manual kinematics, not Rapier (for now)

The POC uses a **manual kinematic flight integrator**, not Rapier, even though
`@react-three/rapier` is already a dependency.

Reasons:
- The **predicted-arc preview is the aiming UI.** Drawing the dotted "where will
  it land" line requires forward-simulating the throw deterministically — trivial
  with a side-effect-free `stepFlying` loop, awkward with Rapier (needs a parallel
  throwaway sim).
- Direct reuse of the shelved `src/game/disc.ts` flight model.
- Matches the rest of the codebase (`PrototypeScene.tsx` is all manual kinematics).
- The arcade steer is a custom lateral-force model anyway — not something a rigid
  body gives for free.

**When to adopt Rapier (documented trigger):** when obstacle *interaction* becomes
a core mechanic in the harder levels — tree deflections, disc skip/roll after
landing, basket-chain catches, sloped/complex terrain. The POC's single tree uses
a cheap analytic cylinder-overlap check instead.

## Reused assets

- **Disc = UFO mesh**, **thrower = existing pug** (`CharacterModels.tsx`,
  `PLAYER_MODEL_URL`).
- **Flight model** ported from the shelved `disc.ts` (`stepFlying`: gravity,
  drag, spin, ground settle) — adapted: drop catch-cones and goal-mouth, add
  lateral steer and basket detection.
- **Grass/ground + blob-shadow aesthetic** and the `dampAlpha` frame-rate-
  independent smoothing helper from `PrototypeScene.tsx`.

## Throw state machine

A single `useFrame` loop owns mutable refs (mirroring `PrototypeScene`'s pattern).
HUD-facing values (power while dragging, throw count, phase) are pushed to React
state through throttled `setState`, as `activePhrase` is today.

Phases:

- **`aiming`** — at the lie. Drag back = slingshot: pull length → power
  (clamped), pull angle → aim heading (disc flies opposite the pull). A dotted
  predicted-arc line and a power meter render. Camera sits behind the aim heading
  (over-the-shoulder). Release → `flying`.
- **`flying`** — ballistic flight; horizontal steer input (drag L/R on touch,
  A/D on desktop) applies capped, decaying lateral acceleration → the curve.
  Camera follows behind + above the disc.
- **`landed`** — disc settles to rest (loose). Brief beat, then → `walking`.
- **`walking`** — player walks the pug (existing move input) toward the disc;
  camera lifts to a high 3/4 follow. Reaching the disc (overlap radius) → back to
  `aiming` from the new lie.
- **`holed`** — disc reaches the basket; show a score card (strokes vs par) and a
  reset button.

## Flight & steer model

- Ballistic: `vy -= GRAVITY · dt`; horizontal drag decay (`Math.pow(1 - DRAG, dt)`);
  integrate position.
- Loft: a fixed launch angle, lightly scaled by power, for the POC.
- Steer: lateral acceleration `perp(heading) · steerInput · STEER_ACCEL`, capped
  per-throw (a steer budget) so the disc bends into a hyzer/anhyzer arc but can't
  U-turn. Steer authority decays over the flight so late corrections are weaker.
- Spin is cosmetic (faster spin at higher horizontal speed).
- Settles to `loose` on ground contact or out-of-bounds (position clamped into
  the field). No penalty stroke for OB in the POC.

## The hole (level 1 — easy)

A short, open fairway reachable in ~2–4 throws. Tee → one tree obstacle midway
(so arc/steer matters) → basket. **Par 3.** The tree is an analytic cylinder:
if the disc's flight passes within the trunk radius, it drops to `loose` there.

## Components / files (all new, under `src/discgolf/`)

- `DiscGolfPOC.tsx` — Canvas + `PerspectiveCamera` + lights + HUD; mounts the scene.
- `DiscGolfScene.tsx` — terrain, basket, tree obstacle, pug, disc; the `useFrame`
  game loop and throw state machine.
- `discFlight.ts` — pure flight model: `createDiscState`, `stepFlying(disc, dt,
  steer)`, ground settle, basket detection, tree-cylinder check. **Unit-tested.**
- `throwInput.ts` — pointer drag → `{ aimHeading, power, dragging }`; steer axis
  during flight. Pure helpers where possible.
- `cameraRig.ts` — hybrid camera: given phase + disc/player state, returns desired
  camera position/target; lerped via `dampAlpha`.
- `scoring.ts` — strokes/par helpers (`scoreLabel`, `relativeToPar`). **Unit-tested.**
- `Basket.tsx` — disc-golf basket mesh + catch test.
- `config.ts` — tuning constants: `THROW_MIN_SPEED`, `THROW_MAX_SPEED`,
  `THROW_LOFT`, `STEER_ACCEL`, `STEER_BUDGET`, `DISC_DRAG`, `DISC_GRAVITY`,
  `BASKET_RADIUS`, `PICKUP_RADIUS`, `PAR`, field bounds.
- `HUD.tsx` — power meter, throw/par counter, steer hint, hole-out card, reset.
- `main.tsx` — `?game=discgolf` mount switch (the only edit to existing code).

## Data flow

`DiscGolfScene` holds the authoritative game state in refs and advances it each
frame. `throwInput` translates pointer/keyboard events into intent (aim/power
while `aiming`, steer while `flying`). `cameraRig` is a pure function of phase +
positions. `HUD` is a dumb view over throttled React state mirrored from the refs.

## Error / edge handling

- Out-of-bounds: clamp into field, settle as `loose`, no penalty (POC).
- Disc into tree: drop to `loose` at the contact point.
- Rapid re-press / release without a drag: treat near-zero drag length as a
  no-throw (must exceed a minimum power threshold to release).
- Walking phase: if the player never reaches the disc, the hole simply doesn't
  advance — a reset button is always available.

## Testing

- **Unit (vitest, matching `scoring.test.ts` style):** `discFlight` integration
  (gravity/drag, steer accel + budget, ground settle, basket detection,
  tree-cylinder check) and `scoring` (strokes vs par labels).
- **Manual playtest:** `npm run dev` → open `?game=discgolf`. Validate throw feel,
  steer authority, camera transitions across all phases, and hole-out.

## Out of scope (named so we don't drift)

- Multi-game menu / container, and wiring into the existing menu.
- AI, opponents, wind.
- Multiple holes, course progression, disc variety / flight numbers.
- Rapier-based deflection, rolling, basket chains, complex terrain (deferred to
  harder levels — see the Rapier adoption trigger above).
- Audio for throw/steer/land/hole-out (re-add later if it feels dead).
- Penalty strokes, OB rules, putting nuance.
