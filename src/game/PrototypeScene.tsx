import { useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { MathUtils, Vector2, Vector3 } from 'three';
import {
  ARENA_LIMIT,
  CAMERA_POSITION,
  DASH_BUFFER,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  HITSTOP_DURATION,
  LATCH_DURATION,
  NPC_COUNT,
  NPC_FLEE_RADIUS,
  NPC_RESPAWN_DELAY,
  NPC_VARIANTS,
  PLAYER_SPEED,
  TAG_RADIUS,
} from './config';
import { PugCharacter, type CharacterAction } from './CharacterModels';
import { Environment } from './Environment';
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
  latchedNpcId: number | null;
  bob: number;
  dashRequestedAt: number;
};

type TagBurstState = {
  active: boolean;
  age: number;
  x: number;
  z: number;
  variant: number;
};

const BURST_COUNT = 6;
const HITSTOP_RAMP = 0.05;

export function PrototypeScene({
  isPlaying,
  moveInput,
  dashNonce,
  onDashStart,
  onTag,
  roundId,
}: {
  isPlaying: boolean;
  moveInput: AnalogInput;
  dashNonce: number;
  onDashStart: () => void;
  onTag: () => void;
  roundId: number;
}) {
  const { camera } = useThree();
  const player = useRef<Group>(null);
  const playerShadow = useRef<Group>(null);
  const npcGroups = useRef<Array<Group | null>>([]);
  const npcShadows = useRef<Array<Group | null>>([]);
  const burstGroups = useRef<Array<Group | null>>([]);
  const burstRings = useRef<Array<Mesh | null>>([]);
  const playerState = useRef<PlayerState>(createPlayerState());
  const npcStates = useRef<NpcState[]>(
    Array.from({ length: NPC_COUNT }, (_, index) => createNpcState(index, roundId)),
  );
  const npcActions = useRef<CharacterAction[]>(
    Array.from({ length: NPC_COUNT }, () => 'idle' as CharacterAction),
  );
  const playerAction = useRef<CharacterAction>('idle');
  const lastDashNonce = useRef(0);
  const facingVector = useRef(new Vector2(0, 1));
  const cameraFocus = useRef(new Vector3(0, 0, 0));
  const cameraShake = useRef(0);
  const cameraShakeDirX = useRef(0);
  const cameraShakeDirZ = useRef(0);
  const hitstopTime = useRef(0);
  const burstStates = useRef<TagBurstState[]>(
    Array.from({ length: BURST_COUNT }, () => ({
      active: false,
      age: 0,
      x: 0,
      z: 0,
      variant: 0,
    })),
  );
  const decor = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2;
        const radius = 6.1 + (index % 4) * 0.85;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          scale: 0.82 + (index % 4) * 0.12,
        };
      }),
    [],
  );

  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useEffect(() => {
    playerState.current = createPlayerState();
    npcStates.current = Array.from({ length: NPC_COUNT }, (_, index) =>
      createNpcState(index, roundId),
    );
    npcActions.current = Array.from(
      { length: NPC_COUNT },
      () => 'idle' as CharacterAction,
    );
    playerAction.current = 'idle';
    lastDashNonce.current = 0;
    facingVector.current.set(0, 1);
    cameraFocus.current.set(0, 0, 0);
    cameraShake.current = 0;
    hitstopTime.current = 0;
    burstStates.current.forEach((burst) => {
      burst.active = false;
      burst.age = 0;
    });
  }, [roundId]);

  useFrame((state, rawDelta) => {
    const playerData = playerState.current;
    const npcData = npcStates.current;

    const now = state.clock.elapsedTime;

    if (dashNonce !== lastDashNonce.current && isPlaying) {
      lastDashNonce.current = dashNonce;
      playerData.dashRequestedAt = now;
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
      const direction = new Vector2(moveInput.x, moveInput.y);
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
      const moveVector = new Vector2(moveInput.x, moveInput.y);
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
      const accel = playerData.dashTime > 0 ? 0.36 : isLatching ? 0.5 : 0.18;

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
      playerData.x = MathUtils.clamp(
        playerData.x + playerData.velocityX * delta,
        -ARENA_LIMIT,
        ARENA_LIMIT,
      );
      playerData.z = MathUtils.clamp(
        playerData.z + playerData.velocityZ * delta,
        -ARENA_LIMIT,
        ARENA_LIMIT,
      );
      playerData.dashTime = Math.max(0, playerData.dashTime - delta);
      playerData.dashCooldown = Math.max(0, playerData.dashCooldown - delta);
      playerData.latchTime = Math.max(0, playerData.latchTime - delta);

      if (playerData.latchTime <= 0 && playerData.latchedNpcId !== null) {
        npcData[playerData.latchedNpcId].isLatched = false;
        playerData.latchedNpcId = null;
      }

      let taggedThisFrame = false;
      npcData.forEach((npc, index) => {
        if (npc.taggedCooldown > 0) {
          npc.taggedCooldown = Math.max(0, npc.taggedCooldown - delta);

          if (npc.taggedCooldown === 0) {
            npcStates.current[index] = createNpcState(
              index,
              roundId + state.clock.elapsedTime * 0.1,
            );
            npcActions.current[index] = 'idle';
          }
          return;
        }

        if (npc.isLatched) {
          npcActions.current[index] = 'react';
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
          npc.dirX = MathUtils.lerp(npc.dirX, fleeX / fleeLength, 0.18 + easing * 0.4);
          npc.dirZ = MathUtils.lerp(npc.dirZ, fleeZ / fleeLength, 0.18 + easing * 0.4);
          const fleeNorm = Math.max(0.001, Math.hypot(npc.dirX, npc.dirZ));
          npc.dirX /= fleeNorm;
          npc.dirZ /= fleeNorm;
          npc.fleeBoost = MathUtils.lerp(npc.fleeBoost, 1.3 + easing * 0.6, 0.2);
        } else {
          npc.fleeBoost = MathUtils.lerp(npc.fleeBoost, 1, 0.05);
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
        npc.x = MathUtils.clamp(
          npc.x + npc.dirX * speed * delta,
          -ARENA_LIMIT,
          ARENA_LIMIT,
        );
        npc.z = MathUtils.clamp(
          npc.z + npc.dirZ * speed * delta,
          -ARENA_LIMIT,
          ARENA_LIMIT,
        );

        npcActions.current[index] = speed > 1.5 ? 'run' : 'idle';

        if (!taggedThisFrame && playerData.dashTime > 0) {
          const postMoveDistance = Math.hypot(
            npc.x - playerData.x,
            npc.z - playerData.z,
          );
          if (postMoveDistance < TAG_RADIUS) {
            taggedThisFrame = true;
            onTag();
            playerData.dashTime = 0;
            playerData.latchTime = LATCH_DURATION;
            playerData.latchedNpcId = index;
            playerData.velocityX = 0;
            playerData.velocityZ = 0;
            npc.isLatched = true;
            npc.taggedCooldown = NPC_RESPAWN_DELAY;
            npcActions.current[index] = 'react';
            hitstopTime.current = HITSTOP_DURATION;
            cameraShake.current = 1;
            cameraShakeDirX.current = playerData.facingX;
            cameraShakeDirZ.current = playerData.facingZ;
            spawnBurst(burstStates.current, npc.x, npc.z, index);
          }
        }
      });

      if (playerData.latchedNpcId !== null) {
        const latchedNpc = npcData[playerData.latchedNpcId];
        const latchOffset = 0.7;
        const targetX = latchedNpc.x - playerData.facingX * latchOffset;
        const targetZ = latchedNpc.z - playerData.facingZ * latchOffset;
        playerData.x = MathUtils.lerp(playerData.x, targetX, 0.42);
        playerData.z = MathUtils.lerp(playerData.z, targetZ, 0.42);
      }
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

    cameraShake.current = Math.max(0, cameraShake.current - rawDelta * 6);
    const shakeAmount = cameraShake.current * 0.32;
    const shakeOffsetX = cameraShakeDirX.current * shakeAmount;
    const shakeOffsetZ = cameraShakeDirZ.current * shakeAmount;

    cameraFocus.current.lerp(
      new Vector3(playerData.x * 0.22, 0, playerData.z * 0.22),
      0.08,
    );
    camera.position.lerp(
      new Vector3(
        CAMERA_POSITION.x + cameraFocus.current.x + shakeOffsetX,
        CAMERA_POSITION.y,
        CAMERA_POSITION.z + cameraFocus.current.z + shakeOffsetZ,
      ),
      0.12,
    );
    camera.lookAt(
      cameraFocus.current.x + shakeOffsetX * 0.4,
      0,
      cameraFocus.current.z + shakeOffsetZ * 0.4,
    );

    if (player.current) {
      const dashProgress =
        playerData.dashTime > 0 ? 1 - playerData.dashTime / DASH_DURATION : 0;
      const dashLift =
        playerData.dashTime > 0 ? Math.sin(dashProgress * Math.PI) * 0.55 : 0;
      const latchLift =
        playerData.latchTime > 0
          ? Math.sin((playerData.latchTime / LATCH_DURATION) * Math.PI) * 0.12
          : 0;

      player.current.position.set(
        playerData.x,
        0.02 + Math.sin(playerData.bob) * 0.015 + dashLift + latchLift,
        playerData.z,
      );
      player.current.rotation.y = MathUtils.lerp(
        player.current.rotation.y,
        Math.atan2(playerData.facingX, playerData.facingZ),
        0.4,
      );
      const lean = MathUtils.clamp(playerData.velocityX * -0.02, -0.1, 0.1);
      player.current.rotation.z =
        lean + (playerData.dashTime > 0 ? -0.08 : 0);

      const squashScale =
        playerData.latchTime > 0
          ? 1 + Math.sin((playerData.latchTime / LATCH_DURATION) * Math.PI) * 0.05
          : playerData.dashTime > 0
            ? 1.04
            : 1;
      player.current.scale.setScalar(squashScale);
    }

    if (playerShadow.current) {
      playerShadow.current.position.set(playerData.x, 0.03, playerData.z);
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
        group.rotation.y = MathUtils.lerp(
          group.rotation.y,
          Math.atan2(npc.dirX, npc.dirZ),
          0.25,
        );
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
      burstGroup.position.set(burst.x, 0.05, burst.z);
      const radius = MathUtils.lerp(0.4, 1.9, t);
      ring.scale.setScalar(radius);
      const material = ring.material as { opacity: number; transparent: boolean };
      material.transparent = true;
      material.opacity = (1 - t) * 0.85;
    });
  });

  return (
    <>
      <Environment decor={decor} />

      <group ref={playerShadow}>
        <mesh receiveShadow rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.84, 24]} />
          <meshStandardMaterial color="#000000" transparent opacity={0.15} />
        </mesh>
      </group>

      <Suspense fallback={null}>
        <group ref={player}>
          <PugCharacter
            isPlayer
            actionRef={playerAction}
            palette={{
              bodyColor: '#d9b58d',
              headColor: '#39211a',
              accentColor: '#ff7d8e',
              accessoryColor: '#ff6a86',
            }}
          />
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
    </>
  );
}

function spawnBurst(
  bursts: TagBurstState[],
  x: number,
  z: number,
  variant: number,
) {
  const burst = bursts.find((item) => !item.active) ?? bursts[0];
  burst.active = true;
  burst.age = 0;
  burst.x = x;
  burst.z = z;
  burst.variant = variant;
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
    latchedNpcId: null,
    bob: 0,
    dashRequestedAt: -1000,
  };
}

function createNpcState(index: number, roundSeed: number): NpcState {
  const angle = roundSeed * 0.77 + (index / NPC_COUNT) * Math.PI * 2;
  const radius = 4.7 + (index % 2) * 1.2;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * (radius - 0.5),
    dirX: Math.cos(angle + Math.PI * 0.5),
    dirZ: Math.sin(angle + Math.PI * 0.5),
    wanderTime: 0.65 + index * 0.18,
    taggedCooldown: 0,
    isLatched: false,
    bob: index * 0.6,
    speed: 2.55 + index * 0.18,
    fleeBoost: 1,
  };
}
