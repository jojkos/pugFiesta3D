import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { Group, Mesh } from 'three';
import { MathUtils, Vector2, Vector3 } from 'three';
import {
  CAMERA_POSITION,
  DASH_BUFFER,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  FIELD_HALF_X,
  FIELD_HALF_Z,
  HITSTOP_DURATION,
  LATCH_DURATION,
  LATCH_SNAP_DURATION,
  LATCH_SPLASH_RADIUS_MULT,
  MAX_SIMULTANEOUS_LATCHES,
  NPC_COUNT,
  NPC_FLEE_RADIUS,
  NPC_RESPAWN_DELAY,
  NPC_VARIANTS,
  PLAYER_MODEL_URL,
  PLAYER_SPEED,
  TAG_RADIUS,
} from './config';
import { PugCharacter, type CharacterAction } from './CharacterModels';
import {
  type CameraMirror,
  type ConfettiParticle,
  createConfettiPool,
  spawnConfetti,
} from './confetti';
import { Environment } from './Environment';
import { isNpcInGoalMouth } from './scoring';
import type { AnalogInput, NpcState } from './types';

type PlayerState = {
  x: number;
  z: number;
  velocityX: number;
  velocityZ: number;
  facingX: number;
  facingZ: number;
  dashTime: number;
  dashCooldown: number;
  latchTime: number;
  latchedNpcIds: number[];
  bob: number;
  dashRequestedAt: number;
};

type TagBurstState = {
  active: boolean;
  age: number;
  // Offset from the player at the moment of impact. The world position is
  // computed each frame as (player.x + offsetX, player.z + offsetZ) so the
  // ring follows the character if they slide forward during the latch.
  offsetX: number;
  offsetZ: number;
};

const BURST_COUNT = 6;
const HITSTOP_RAMP = 0.05;
const LATCH_FORWARD_OFFSET = 0.65;
const LATCH_SIDE_STEP = 0.5;

// Frame-rate-independent `lerp(current, target, alpha)`. The original alpha
// values were tuned at 60fps; `dampAlpha(alpha, delta)` returns the equivalent
// step for any frame interval so gameplay feels identical at 30/60/120/144 Hz.
function dampAlpha(alpha: number, delta: number) {
  return 1 - Math.pow(1 - alpha, delta * 60);
}

export function PrototypeScene({
  isPlaying,
  moveInput,
  dashNonce,
  onDashStart,
  onTag,
  roundId,
  jerseyColor,
  jerseyAccentColor,
  score,
  timeLeft,
  baseZoom,
  introZoomOut,
  activePhrase,
  confettiParticlesRef,
  confettiGroupsRef,
  cameraMirrorRef,
}: {
  isPlaying: boolean;
  moveInput: AnalogInput;
  dashNonce: number;
  onDashStart: () => void;
  onTag: (chainSize: number, inGoal: boolean) => void;
  roundId: number;
  jerseyColor: string;
  jerseyAccentColor: string;
  score: number;
  timeLeft: number;
  baseZoom: number;
  introZoomOut: boolean;
  activePhrase: {
    text: string;
    kind: 'tag' | 'multi' | 'goal';
    nonce: number;
  } | null;
  // Provided by the parent so the meshes can live in a separate canvas
  // that renders ABOVE the speech bubble overlay. Physics + spawning
  // stay here; only the JSX mounting moved.
  confettiParticlesRef: import('react').RefObject<ConfettiParticle[]>;
  confettiGroupsRef: import('react').RefObject<Array<Group | null>>;
  cameraMirrorRef: import('react').RefObject<CameraMirror>;
}) {
  const { camera } = useThree();
  const player = useRef<Group>(null);
  const playerShadow = useRef<Group>(null);
  const npcGroups = useRef<Array<Group | null>>([]);
  const npcShadows = useRef<Array<Group | null>>([]);
  const burstGroups = useRef<Array<Group | null>>([]);
  const burstRings = useRef<Array<Mesh | null>>([]);
  // Aliased so the existing physics tick still reads/writes via the same
  // identifiers — actual storage lives in the parent so the meshes can be
  // mounted in a separate canvas above the speech bubble.
  const confettiGroups = confettiGroupsRef;
  const confettiParticles = confettiParticlesRef;
  // Lazy-init the parent-owned particle pool if the parent didn't fill it.
  if (confettiParticles.current.length === 0) {
    confettiParticles.current = createConfettiPool();
  }
  const playerState = useRef<PlayerState>(createPlayerState());
  const npcStates = useRef<NpcState[]>(
    Array.from({ length: NPC_COUNT }, (_, index) =>
      createNpcState(index, roundId, 0, 0),
    ),
  );
  const npcActions = useRef<CharacterAction[]>(
    Array.from({ length: NPC_COUNT }, () => 'idle' as CharacterAction),
  );
  const playerAction = useRef<CharacterAction>('idle');
  const lastDashNonce = useRef(0);
  const facingVector = useRef(new Vector2(0, 1));
  const cameraFocus = useRef(new Vector3(0, 0, 0));
  const hitstopTime = useRef(0);
  const burstStates = useRef<TagBurstState[]>(
    Array.from({ length: BURST_COUNT }, () => ({
      active: false,
      age: 0,
      offsetX: 0,
      offsetZ: 0,
    })),
  );
  const scratchVec2 = useRef(new Vector2());
  const scratchDashDir = useRef(new Vector2());
  const scratchCameraFocus = useRef(new Vector3());
  const decor = useMemo(() => {
    const points: Array<{ x: number; z: number; scale: number }> = [];
    const outerX = FIELD_HALF_X + 1.4;
    const outerZ = FIELD_HALF_Z + 1.4;
    for (let i = 0; i < 18; i += 1) {
      const t = (i + 0.5) / 18;
      const side = i % 4;
      const jitter = ((i * 37) % 11) * 0.08 - 0.4;
      if (side === 0) {
        points.push({
          x: -FIELD_HALF_X + t * FIELD_HALF_X * 2,
          z: outerZ + jitter,
          scale: 0.82 + (i % 4) * 0.12,
        });
      } else if (side === 1) {
        points.push({
          x: -FIELD_HALF_X + t * FIELD_HALF_X * 2,
          z: -outerZ - jitter,
          scale: 0.82 + (i % 4) * 0.12,
        });
      } else if (side === 2) {
        points.push({
          x: outerX + jitter,
          z: -FIELD_HALF_Z + t * FIELD_HALF_Z * 2,
          scale: 0.82 + (i % 4) * 0.12,
        });
      } else {
        points.push({
          x: -outerX - jitter,
          z: -FIELD_HALF_Z + t * FIELD_HALF_Z * 2,
          scale: 0.82 + (i % 4) * 0.12,
        });
      }
    }
    return points;
  }, []);

  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    playerState.current = createPlayerState();
    npcStates.current = Array.from({ length: NPC_COUNT }, (_, index) =>
      createNpcState(index, roundId, 0, 0),
    );
    npcActions.current = Array.from(
      { length: NPC_COUNT },
      () => 'idle' as CharacterAction,
    );
    playerAction.current = 'idle';
    // Sync to the current dashNonce so we don't fire a phantom dash on round
    // start (if dashNonce is non-zero) nor miss the next press (if we reset
    // to 0 while dashNonce is already 0).
    lastDashNonce.current = dashNonce;
    facingVector.current.set(0, 1);
    cameraFocus.current.set(0, 0, 0);
    hitstopTime.current = 0;
    burstStates.current.forEach((burst) => {
      burst.active = false;
      burst.age = 0;
    });
    confettiParticles.current.forEach((p) => {
      p.active = false;
      p.age = 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  useFrame((state, rawDelta) => {
    const playerData = playerState.current;
    const npcData = npcStates.current;

    const now = state.clock.elapsedTime;

    if (dashNonce !== lastDashNonce.current && isPlaying) {
      lastDashNonce.current = dashNonce;
      // Ignore presses while the latch animation is playing — the player is
      // committed to it and shouldn't be able to dash again until it ends.
      // We still consume the nonce so the press doesn't queue up.
      if (playerData.latchTime <= 0) {
        playerData.dashRequestedAt = now;
      }
    }

    const canDash =
      playerData.dashCooldown <= 0 &&
      playerData.latchTime <= 0 &&
      hitstopTime.current <= 0;
    if (
      isPlaying &&
      canDash &&
      now - playerData.dashRequestedAt < DASH_BUFFER
    ) {
      const direction = scratchDashDir.current.set(moveInput.x, moveInput.y);
      if (direction.lengthSq() > 0.01) {
        direction.normalize();
        facingVector.current.copy(direction);
      }

      playerData.facingX = facingVector.current.x;
      playerData.facingZ = facingVector.current.y;
      playerData.dashTime = DASH_DURATION;
      playerData.dashCooldown = DASH_COOLDOWN;
      playerData.latchTime = 0;
      playerData.dashRequestedAt = -1000;
      onDashStart();
    }

    const hitstopActive = hitstopTime.current > 0;
    const delta = hitstopActive ? rawDelta * HITSTOP_RAMP : rawDelta;

    if (hitstopActive) {
      hitstopTime.current = Math.max(0, hitstopTime.current - rawDelta);
    }

    if (isPlaying && !hitstopActive) {
      const moveVector = scratchVec2.current.set(moveInput.x, moveInput.y);
      if (moveVector.lengthSq() > 1) {
        moveVector.normalize();
      }

      if (moveVector.lengthSq() > 0.01 && playerData.latchTime <= 0) {
        facingVector.current.copy(moveVector);
        playerData.facingX = facingVector.current.x;
        playerData.facingZ = facingVector.current.y;
      }

      const isLatching = playerData.latchTime > 0;
      const desiredVelocityX =
        playerData.dashTime > 0
          ? playerData.facingX * DASH_SPEED
          : isLatching
            ? 0
            : moveVector.x * PLAYER_SPEED;
      const desiredVelocityZ =
        playerData.dashTime > 0
          ? playerData.facingZ * DASH_SPEED
          : isLatching
            ? 0
            : moveVector.y * PLAYER_SPEED;
      const accelRaw = playerData.dashTime > 0 ? 0.36 : isLatching ? 0.5 : 0.18;
      const accel = dampAlpha(accelRaw, delta);

      playerData.velocityX = MathUtils.lerp(
        playerData.velocityX,
        desiredVelocityX,
        accel,
      );
      playerData.velocityZ = MathUtils.lerp(
        playerData.velocityZ,
        desiredVelocityZ,
        accel,
      );
      const clampedPlayer = clampToArena(
        playerData.x + playerData.velocityX * delta,
        playerData.z + playerData.velocityZ * delta,
      );
      playerData.x = clampedPlayer.x;
      playerData.z = clampedPlayer.z;
      playerData.dashTime = Math.max(0, playerData.dashTime - delta);
      playerData.dashCooldown = Math.max(0, playerData.dashCooldown - delta);
      playerData.latchTime = Math.max(0, playerData.latchTime - delta);

      if (playerData.latchTime <= 0 && playerData.latchedNpcIds.length > 0) {
        playerData.latchedNpcIds.forEach((id) => {
          npcData[id].isLatched = false;
          // Re-arm the respawn cooldown on unlatch so the NPC always cycles
          // through a fresh spawn — independent of how the latch/respawn
          // durations are tuned relative to each other.
          npcData[id].taggedCooldown = NPC_RESPAWN_DELAY;
        });
        playerData.latchedNpcIds = [];
      }

      npcData.forEach((npc, index) => {
        if (npc.isLatched) {
          // Don't tick the respawn cooldown while latched — it'll start the
          // moment the NPC unlatches.
          npc.latchAge += delta;

          const slot = Math.max(0, playerData.latchedNpcIds.indexOf(index));
          const sideOffset =
            slot === 0
              ? 0
              : (slot % 2 === 1 ? 1 : -1) * LATCH_SIDE_STEP * Math.ceil(slot / 2);
          const perpX = -playerData.facingZ;
          const perpZ = playerData.facingX;
          const targetX =
            playerData.x +
            playerData.facingX * LATCH_FORWARD_OFFSET +
            perpX * sideOffset;
          const targetZ =
            playerData.z +
            playerData.facingZ * LATCH_FORWARD_OFFSET +
            perpZ * sideOffset;
          const clampedLatch = clampToArena(targetX, targetZ);
          // Smoothstep from the pug's caught-position into its formation
          // slot — kills the visible teleport jerk at latch start.
          const t = Math.min(1, npc.latchAge / LATCH_SNAP_DURATION);
          const ease = t * t * (3 - 2 * t);
          npc.x = MathUtils.lerp(npc.latchOriginX, clampedLatch.x, ease);
          npc.z = MathUtils.lerp(npc.latchOriginZ, clampedLatch.z, ease);
          npc.dirX = playerData.facingX;
          npc.dirZ = playerData.facingZ;
          npcActions.current[index] = 'react';
          return;
        }

        if (npc.taggedCooldown > 0) {
          npc.taggedCooldown = Math.max(0, npc.taggedCooldown - delta);

          if (npc.taggedCooldown === 0) {
            // Mix in elapsed time AND the NPC index so simultaneous respawns
            // don't cluster at the same angle. Also feed in the player's
            // position so we can avoid spawning right on top of them.
            const respawnSeed =
              roundId + state.clock.elapsedTime + index * 7.31;
            npcStates.current[index] = createNpcState(
              index,
              respawnSeed,
              playerData.x,
              playerData.z,
            );
            npcActions.current[index] = 'idle';
          }
          return;
        }

        const distanceToPlayer = Math.hypot(
          npc.x - playerData.x,
          npc.z - playerData.z,
        );

        if (distanceToPlayer < NPC_FLEE_RADIUS) {
          const fleeX = npc.x - playerData.x;
          const fleeZ = npc.z - playerData.z;
          const fleeLength = Math.max(0.001, Math.hypot(fleeX, fleeZ));
          const easing = 1 - distanceToPlayer / NPC_FLEE_RADIUS;
          const turnAlpha = dampAlpha(0.18 + easing * 0.4, delta);
          npc.dirX = MathUtils.lerp(npc.dirX, fleeX / fleeLength, turnAlpha);
          npc.dirZ = MathUtils.lerp(npc.dirZ, fleeZ / fleeLength, turnAlpha);
          const fleeNorm = Math.max(0.001, Math.hypot(npc.dirX, npc.dirZ));
          npc.dirX /= fleeNorm;
          npc.dirZ /= fleeNorm;
          npc.fleeBoost = MathUtils.lerp(
            npc.fleeBoost,
            1.3 + easing * 0.6,
            dampAlpha(0.2, delta),
          );
        } else {
          npc.fleeBoost = MathUtils.lerp(npc.fleeBoost, 1, dampAlpha(0.05, delta));
          npc.wanderTime -= delta;
          if (npc.wanderTime <= 0) {
            const angle =
              state.clock.elapsedTime * (1.15 + index * 0.11) + index * 1.57;
            npc.dirX = Math.cos(angle);
            npc.dirZ = Math.sin(angle);
            npc.wanderTime = 0.9 + index * 0.16;
          }
        }

        const speed = npc.speed * npc.fleeBoost;
        const clampedNpc = clampToArena(
          npc.x + npc.dirX * speed * delta,
          npc.z + npc.dirZ * speed * delta,
        );
        npc.x = clampedNpc.x;
        npc.z = clampedNpc.z;

        npcActions.current[index] = speed > 1.5 ? 'run' : 'idle';

        if (
          playerData.latchedNpcIds.length === 0 &&
          playerData.dashTime > 0
        ) {
          const postMoveDistance = Math.hypot(
            npc.x - playerData.x,
            npc.z - playerData.z,
          );
          if (postMoveDistance < TAG_RADIUS) {
            // Latch this pug first…
            latchNpc(npc, index, playerData, npcActions.current);
            // …then splash-grab any other pugs within an expanded radius in
            // the same frame, up to MAX_SIMULTANEOUS_LATCHES. This replaces
            // the old "keep dashing through more pugs" chain mechanic with
            // a single clean grab — no slide, no NPC teleport snap.
            const splashRadius = TAG_RADIUS * LATCH_SPLASH_RADIUS_MULT;
            npcData.forEach((other, otherIndex) => {
              if (otherIndex === index) return;
              if (other.isLatched || other.taggedCooldown > 0) return;
              if (
                playerData.latchedNpcIds.length >= MAX_SIMULTANEOUS_LATCHES
              ) {
                return;
              }
              const d = Math.hypot(
                other.x - playerData.x,
                other.z - playerData.z,
              );
              if (d < splashRadius) {
                latchNpc(other, otherIndex, playerData, npcActions.current);
              }
            });

            const chainSize = playerData.latchedNpcIds.length;
            const inGoalMouth = isNpcInGoalMouth(npc.x, npc.z);
            if (inGoalMouth) {
              spawnConfetti(
                confettiParticles.current,
                playerData.x,
                playerData.z,
              );
            }
            // Defer parent setState out of the useFrame tick so it doesn't
            // synchronously re-render the Canvas tree mid-frame.
            queueMicrotask(() => onTag(chainSize, inGoalMouth));
            playerData.latchTime = LATCH_DURATION;
            // Stop the dash entirely — no forward slide through the latch
            // animation. Drop any buffered dash press too.
            playerData.dashTime = 0;
            playerData.velocityX = 0;
            playerData.velocityZ = 0;
            playerData.dashRequestedAt = -1000;
            hitstopTime.current = HITSTOP_DURATION;
            // Burst centered on the first latched pug.
            spawnBurst(
              burstStates.current,
              npc.x - playerData.x,
              npc.z - playerData.z,
            );
          }
        }
      });
    }

    playerData.bob += delta * (playerData.dashTime > 0 ? 22 : 8);
    npcData.forEach((npc) => {
      npc.bob += delta * 6.4;
    });

    const moveSpeed = Math.hypot(playerData.velocityX, playerData.velocityZ);
    if (playerData.latchTime > 0) {
      playerAction.current = 'latch';
    } else if (playerData.dashTime > 0) {
      playerAction.current = 'dash';
    } else if (moveSpeed > 1.2) {
      playerAction.current = 'run';
    } else {
      playerAction.current = 'idle';
    }

    cameraFocus.current.lerp(
      scratchCameraFocus.current.set(
        playerData.x * 0.32,
        0,
        playerData.z * 0.18,
      ),
      dampAlpha(0.08, rawDelta),
    );
    // Set position AND lookAt from the same already-smoothed focus value
    // so the camera pans purely instead of rotating (no lerp-lag between them).
    camera.position.set(
      CAMERA_POSITION.x + cameraFocus.current.x,
      CAMERA_POSITION.y,
      CAMERA_POSITION.z + cameraFocus.current.z,
    );
    camera.lookAt(cameraFocus.current.x, 0, cameraFocus.current.z);

    // Intro zoom: hold camera zoomed-out during the 3-2-1 countdown, then
    // smoothly zoom in to the responsive base zoom once the round starts.
    if ('zoom' in camera && typeof camera.zoom === 'number') {
      const targetZoom = introZoomOut ? baseZoom * 0.62 : baseZoom;
      const zoomAlpha = dampAlpha(introZoomOut ? 0.2 : 0.045, rawDelta);
      const eased = MathUtils.lerp(camera.zoom, targetZoom, zoomAlpha);
      if (Math.abs(eased - camera.zoom) > 0.001) {
        camera.zoom = eased;
        camera.updateProjectionMatrix();
      }
    }

    // Mirror live camera state to the confetti overlay canvas so its
    // camera stays in lock-step with this one (pan + zoom). Without this,
    // confetti would visibly drift away from the rest of the scene when
    // the camera moves.
    const mirror = cameraMirrorRef.current;
    if (mirror) {
      mirror.posX = camera.position.x;
      mirror.posY = camera.position.y;
      mirror.posZ = camera.position.z;
      mirror.focusX = cameraFocus.current.x;
      mirror.focusZ = cameraFocus.current.z;
      if ('zoom' in camera && typeof camera.zoom === 'number') {
        mirror.zoom = camera.zoom;
      }
    }

    if (player.current) {
      const dashProgress =
        playerData.dashTime > 0 ? 1 - playerData.dashTime / DASH_DURATION : 0;
      const dashLift =
        playerData.dashTime > 0 ? Math.sin(dashProgress * Math.PI) * 0.55 : 0;
      const latchLift =
        playerData.latchTime > 0
          ? Math.sin((playerData.latchTime / LATCH_DURATION) * Math.PI) * 0.12
          : 0;

      // Hump-thrust pulse during the latch hold: oscillate the player toward
      // the latched NPC in front of them at ~5 Hz with a small forward push.
      let thrustX = 0;
      let thrustZ = 0;
      let thrustBob = 0;
      let thrustSquash = 1;
      if (playerData.latchTime > 0) {
        const phase = (LATCH_DURATION - playerData.latchTime) * 30;
        const wave = Math.sin(phase);
        // half-wave thrust: only push forward, never away (max 0.18 toward NPC)
        const thrustAmt = Math.max(0, wave) * 0.18;
        thrustX = playerData.facingX * thrustAmt;
        thrustZ = playerData.facingZ * thrustAmt;
        // small vertical bob synced with thrusts
        thrustBob = Math.max(0, wave) * 0.06;
        // squish forward when thrusting in
        thrustSquash = 1 + Math.max(0, wave) * 0.09;
      }

      player.current.position.set(
        playerData.x + thrustX,
        0.02 + Math.sin(playerData.bob) * 0.015 + dashLift + latchLift + thrustBob,
        playerData.z + thrustZ,
      );
      player.current.rotation.y = MathUtils.lerp(
        player.current.rotation.y,
        Math.atan2(playerData.facingX, playerData.facingZ),
        dampAlpha(0.4, rawDelta),
      );
      player.current.rotation.z = 0;

      const squashScale =
        playerData.latchTime > 0
          ? thrustSquash
          : playerData.dashTime > 0
            ? 1.04
            : 1;
      player.current.scale.setScalar(squashScale);
    }

    if (playerShadow.current) {
      let shadowThrustX = 0;
      let shadowThrustZ = 0;
      if (playerData.latchTime > 0) {
        const phase = (LATCH_DURATION - playerData.latchTime) * 30;
        const thrustAmt = Math.max(0, Math.sin(phase)) * 0.18;
        shadowThrustX = playerData.facingX * thrustAmt;
        shadowThrustZ = playerData.facingZ * thrustAmt;
      }
      playerShadow.current.position.set(
        playerData.x + shadowThrustX,
        0.03,
        playerData.z + shadowThrustZ,
      );
      playerShadow.current.scale.setScalar(
        playerData.dashTime > 0 ? 1.18 : playerData.latchTime > 0 ? 0.9 : 1,
      );
    }

    npcData.forEach((npc, index) => {
      const group = npcGroups.current[index];
      const shadow = npcShadows.current[index];
      if (group) {
        const visible = npc.taggedCooldown <= 0 || npc.isLatched;
        group.visible = visible;
        group.position.set(
          npc.x,
          0.02 + Math.sin(npc.bob) * 0.012 + (npc.isLatched ? 0.05 : 0),
          npc.z,
        );
        const targetRotation = Math.atan2(npc.dirX, npc.dirZ);
        group.rotation.y = npc.isLatched
          ? targetRotation
          : MathUtils.lerp(group.rotation.y, targetRotation, dampAlpha(0.25, rawDelta));
        const npcSquash = npc.isLatched
          ? 1 + Math.sin(state.clock.elapsedTime * 18) * 0.05
          : 1;
        group.scale.setScalar(npcSquash);
      }

      if (shadow) {
        shadow.visible = npc.taggedCooldown <= 0 || npc.isLatched;
        shadow.position.set(npc.x, 0.03, npc.z);
      }
    });

    burstStates.current.forEach((burst, index) => {
      const burstGroup = burstGroups.current[index];
      const ring = burstRings.current[index];
      if (!burstGroup || !ring) {
        return;
      }

      if (!burst.active) {
        burstGroup.visible = false;
        return;
      }

      burst.age += rawDelta;
      const lifetime = 0.55;
      const t = burst.age / lifetime;

      if (t >= 1) {
        burst.active = false;
        burstGroup.visible = false;
        return;
      }

      burstGroup.visible = true;
      burstGroup.position.set(
        playerData.x + burst.offsetX,
        0.05,
        playerData.z + burst.offsetZ,
      );
      const radius = MathUtils.lerp(0.4, 1.9, t);
      ring.scale.setScalar(radius);
      const material = ring.material as { opacity: number; transparent: boolean };
      material.transparent = true;
      material.opacity = (1 - t) * 0.85;
    });

    confettiParticles.current.forEach((p, index) => {
      const node = confettiGroups.current[index];
      if (!node) return;
      if (!p.active) {
        node.visible = false;
        return;
      }
      p.age += rawDelta;
      if (p.age >= p.lifetime) {
        p.active = false;
        node.visible = false;
        return;
      }
      // Gravity + light air drag on horizontal motion.
      p.vy -= 9 * rawDelta;
      const drag = Math.pow(0.94, rawDelta * 60);
      p.vx *= drag;
      p.vz *= drag;
      p.x += p.vx * rawDelta;
      p.y += p.vy * rawDelta;
      p.z += p.vz * rawDelta;
      if (p.y < 0.02) {
        p.y = 0.02;
        // Settle on the ground — kill vertical, damp horizontal so confetti
        // doesn't slide forever.
        p.vy = 0;
        p.vx *= 0.45;
        p.vz *= 0.45;
        p.spinX *= 0.4;
        p.spinZ *= 0.4;
      }
      p.rotX += p.spinX * rawDelta;
      p.rotY += p.spinY * rawDelta;
      p.rotZ += p.spinZ * rawDelta;
      node.position.set(p.x, p.y, p.z);
      node.rotation.set(p.rotX, p.rotY, p.rotZ);
      const lifeT = p.age / p.lifetime;
      // Fade by scaling down over the last 30% of life — cheaper than per-mesh
      // material opacity updates and visually similar.
      const fade = lifeT > 0.7 ? Math.max(0, 1 - (lifeT - 0.7) / 0.3) : 1;
      node.scale.setScalar(fade);
      node.visible = true;
    });
  });

  return (
    <>
      <Environment decor={decor} score={score} timeLeft={timeLeft} />

      <group ref={playerShadow}>
        <mesh receiveShadow rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.84, 24]} />
          {/* depthWrite off: fake blob shadows must not occlude flat ground
              decals like the center-circle logo (else the logo gets
              depth-rejected and grass shows through). */}
          <meshStandardMaterial color="#000000" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      </group>

      <Suspense fallback={null}>
        <group ref={player}>
          <PugCharacter
            isPlayer
            actionRef={playerAction}
            modelUrl={PLAYER_MODEL_URL}
            bodyScale={500}
            palette={{
              bodyColor: '#d9b58d',
              headColor: '#39211a',
              accentColor: '#ff7d8e',
              accessoryColor: '#ff6a86',
              jerseyColor,
              jerseyAccentColor,
            }}
          />
          <Html
            position={[0, 1.6, 0]}
            center
            zIndexRange={[10, 0]}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <SpeechBubble phrase={activePhrase} />
          </Html>
        </group>
      </Suspense>

      {Array.from({ length: NPC_COUNT }, (_, index) => {
        const variant = NPC_VARIANTS[index % NPC_VARIANTS.length];
        return (
          <group key={index}>
            <group
              ref={(node) => {
                npcShadows.current[index] = node;
              }}
            >
              <mesh receiveShadow rotation-x={-Math.PI / 2}>
                <circleGeometry args={[0.72, 24]} />
                <meshStandardMaterial
                  color="#000000"
                  transparent
                  opacity={0.12}
                  depthWrite={false}
                />
              </mesh>
            </group>

            <Suspense fallback={null}>
              <group
                ref={(node) => {
                  npcGroups.current[index] = node;
                }}
              >
                <PugCharacter
                  npcIndex={index}
                  npcActions={npcActions}
                  palette={{
                    bodyColor: variant.bodyColor,
                    headColor: variant.headColor,
                    accentColor: variant.accentColor,
                    accessoryColor: variant.dressColor,
                  }}
                />
              </group>
            </Suspense>
          </group>
        );
      })}

      {Array.from({ length: BURST_COUNT }, (_, index) => (
        <group
          key={index}
          ref={(node) => {
            burstGroups.current[index] = node;
          }}
        >
          <mesh
            ref={(node) => {
              burstRings.current[index] = node;
            }}
            rotation-x={-Math.PI / 2}
          >
            <ringGeometry args={[0.42, 0.58, 32]} />
            <meshBasicMaterial color="#fff5d6" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      {/* Confetti meshes are mounted in a separate canvas overlay
          (ConfettiOverlay) so they can render above the speech bubble
          HTML overlay. Physics + spawning still run here in this scene's
          useFrame; transforms are written to confettiGroups (parent-owned
          refs that point at the overlay canvas's group objects). */}
    </>
  );
}

function spawnBurst(
  bursts: TagBurstState[],
  offsetX: number,
  offsetZ: number,
) {
  const burst = bursts.find((item) => !item.active) ?? bursts[0];
  burst.active = true;
  burst.age = 0;
  burst.offsetX = offsetX;
  burst.offsetZ = offsetZ;
}

function SpeechBubble({
  phrase,
}: {
  readonly phrase: { text: string; kind: 'tag' | 'multi' | 'goal'; nonce: number } | null;
}) {
  const [visible, setVisible] = useState<
    | { text: string; emphasis: boolean; key: number; exiting: boolean }
    | null
  >(null);

  useEffect(() => {
    if (!phrase) {
      setVisible(null);
      return;
    }
    const emphasis = phrase.kind !== 'tag';
    setVisible({
      text: phrase.text,
      emphasis,
      key: phrase.nonce,
      exiting: false,
    });
    // Emphasised phrases hold a bit longer so the bounce reads.
    const totalMs = emphasis ? 1600 : 1200;
    const exitAfterMs = totalMs - 220;
    const exitTimer = globalThis.setTimeout(() => {
      setVisible((v) => (v ? { ...v, exiting: true } : null));
    }, exitAfterMs);
    const clearTimer = globalThis.setTimeout(() => {
      setVisible(null);
    }, totalMs);
    return () => {
      globalThis.clearTimeout(exitTimer);
      globalThis.clearTimeout(clearTimer);
    };
  }, [phrase?.nonce, phrase?.text, phrase?.kind, phrase]);

  if (!visible) return null;

  const cls = [
    'speech-bubble',
    visible.emphasis ? 'is-emphasis' : '',
    visible.exiting ? 'is-exiting' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div key={visible.key} className={cls}>
      {visible.text}
    </div>
  );
}

function latchNpc(
  npc: NpcState,
  index: number,
  playerData: PlayerState,
  actions: CharacterAction[],
) {
  playerData.latchedNpcIds.push(index);
  npc.isLatched = true;
  npc.taggedCooldown = NPC_RESPAWN_DELAY;
  // Record the pug's position at the moment of catch — the follow loop
  // lerps from this origin into the formation slot over LATCH_SNAP_DURATION
  // instead of teleporting.
  npc.latchOriginX = npc.x;
  npc.latchOriginZ = npc.z;
  npc.latchAge = 0;
  npc.dirX = playerData.facingX;
  npc.dirZ = playerData.facingZ;
  actions[index] = 'react';
}

function createPlayerState(): PlayerState {
  return {
    x: 0,
    z: 0,
    velocityX: 0,
    velocityZ: 0,
    facingX: 0,
    facingZ: 1,
    dashTime: 0,
    dashCooldown: 0,
    latchTime: 0,
    latchedNpcIds: [],
    bob: 0,
    dashRequestedAt: -1000,
  };
}

function clampToArena(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(-FIELD_HALF_X, Math.min(FIELD_HALF_X, x)),
    z: Math.max(-FIELD_HALF_Z, Math.min(FIELD_HALF_Z, z)),
  };
}

const MIN_SPAWN_DISTANCE_FROM_PLAYER = 3.2;

function createNpcState(
  index: number,
  roundSeed: number,
  playerX: number,
  playerZ: number,
): NpcState {
  let angle = roundSeed * 0.77 + (index / NPC_COUNT) * Math.PI * 2;
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (normalized < 0.6 || normalized > Math.PI * 2 - 0.6) {
    angle += 0.9;
  } else if (Math.abs(normalized - Math.PI) < 0.6) {
    angle += 0.9;
  }
  const baseRadius = 3.3 + (index % 2) * 1.2;

  // Try a few angles outward from the seed until we land far enough from the
  // player. Cheap, deterministic, and avoids "respawn right on top of you"
  // chain-tags.
  let x = Math.cos(angle) * baseRadius;
  let z = Math.sin(angle) * (baseRadius * 0.55);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (Math.hypot(x - playerX, z - playerZ) >= MIN_SPAWN_DISTANCE_FROM_PLAYER) {
      break;
    }
    angle += Math.PI / 3;
    x = Math.cos(angle) * baseRadius;
    z = Math.sin(angle) * (baseRadius * 0.55);
  }

  return {
    x,
    z,
    dirX: Math.cos(angle + Math.PI * 0.5),
    dirZ: Math.sin(angle + Math.PI * 0.5),
    wanderTime: 0.65 + index * 0.18,
    taggedCooldown: 0,
    isLatched: false,
    bob: index * 0.6,
    speed: 2.55 + index * 0.18,
    fleeBoost: 1,
    latchOriginX: 0,
    latchOriginZ: 0,
    latchAge: 0,
  };
}
