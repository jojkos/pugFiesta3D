export type GameMode = 'menu' | 'playing' | 'gameOver';

export type KeyboardState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export type AnalogInput = {
  x: number;
  y: number;
};

export type NpcState = {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  wanderTime: number;
  taggedCooldown: number;
  isLatched: boolean;
  bob: number;
  speed: number;
  fleeBoost: number;
};

export type NpcVariant = {
  bodyColor: string;
  headColor: string;
  dressColor: string;
  accentColor: string;
};
