import { Vector2, Vector3 } from 'three';
import type { NpcVariant } from './types';

export const ROUND_DURATION = 45;
export const ARENA_LIMIT = 8.5;
export const DASH_DURATION = 0.22;
export const DASH_COOLDOWN = 0.42;
export const LATCH_DURATION = 0.32;
export const NPC_COUNT = 4;
export const DASH_BUFFER = 0.18;
export const HITSTOP_DURATION = 0.08;
export const TAG_RADIUS = 1.35;
export const NPC_FLEE_RADIUS = 3.6;
export const PLAYER_SPEED = 5.7;
export const DASH_SPEED = 11.4;
export const NPC_RESPAWN_DELAY = 1;
export const TOUCH_DEADZONE = 0.16;

export const CAMERA_POSITION = new Vector3(14, 14, 14);
export const SCREEN_FORWARD = new Vector2(
  -CAMERA_POSITION.x,
  -CAMERA_POSITION.z,
).normalize();
export const SCREEN_RIGHT = new Vector2(1, -1).normalize();

export const NPC_VARIANTS: NpcVariant[] = [
  {
    bodyColor: '#f2d4b6',
    headColor: '#422520',
    dressColor: '#ff9ac0',
    accentColor: '#ffde74',
  },
  {
    bodyColor: '#f4cfae',
    headColor: '#53312a',
    dressColor: '#8dd9ff',
    accentColor: '#9dff9d',
  },
  {
    bodyColor: '#efd2bc',
    headColor: '#3e2422',
    dressColor: '#cfa8ff',
    accentColor: '#ffd38d',
  },
  {
    bodyColor: '#eec7a3',
    headColor: '#4a2d29',
    dressColor: '#ffb67d',
    accentColor: '#ff88b0',
  },
];
