import { Vector3 } from 'three';
import type { NpcVariant } from './types';

export const ROUND_DURATION = 45;
export const ROUND_INTRO_DELAY = 0.5;
export const FIELD_HALF_X = 9.5;
export const FIELD_HALF_Z = 5;
export const GOAL_AREA_RADIUS = 3.4;
export const GOAL_WIDTH = 2.7;
export const GOAL_HEIGHT = 1.5;
export const GOAL_DEPTH = 0.9;
export const LINE_WIDTH = 0.12;
export const LINE_Y = 0.02;
export const DASH_DURATION = 0.22;
export const DASH_COOLDOWN = 0.42;
export const LATCH_DURATION = 0.64;
export const LATCH_SNAP_DURATION = 0.08;
export const LATCH_SPLASH_RADIUS_MULT = 1.4;
export const MAX_SIMULTANEOUS_LATCHES = 3;
export const NPC_COUNT = 7;
export const DASH_BUFFER = 0.18;
export const HITSTOP_DURATION = 0.08;
export const TAG_RADIUS = 1.35;
export const GOAL_LINE_THRESHOLD = 0.4;
export const GOAL_SCORE_MULTIPLIER = 2;
export const GOAL_SHOUT_COOLDOWN = 0.5;
export const NPC_FLEE_RADIUS = 3.6;
export const PLAYER_SPEED = 5.7;
export const DASH_SPEED = 11.4;
export const NPC_RESPAWN_DELAY = 1;
export const TOUCH_DEADZONE = 0.16;

export const CAMERA_POSITION = new Vector3(0, 14, 15);

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
  {
    bodyColor: '#f6d8b8',
    headColor: '#3a201c',
    dressColor: '#ff6fb1',
    accentColor: '#7be2ff',
  },
  {
    bodyColor: '#e9c39e',
    headColor: '#492a25',
    dressColor: '#b0ff8a',
    accentColor: '#ffd76a',
  },
  {
    bodyColor: '#f1cdab',
    headColor: '#3d231e',
    dressColor: '#ffdf6b',
    accentColor: '#ff9bd5',
  },
];
