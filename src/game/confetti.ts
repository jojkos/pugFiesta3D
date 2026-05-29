// Confetti state + helpers shared between the main 3D scene (which owns the
// physics and spawning) and the overlay canvas (which owns the rendering of
// the meshes). Splitting them across two canvases lets confetti appear ON TOP
// of the speech bubble overlay without affecting any other 3D content.

import type { Group } from 'three';

export const CONFETTI_COUNT = 40;
export const CONFETTI_SPAWN_PER_GOAL = 30;
export const CONFETTI_COLORS = [
  '#ff6fb1',
  '#ffe066',
  '#7be2ff',
  '#9dff9d',
  '#ff9ac0',
  '#ffd76a',
  '#b08cff',
  '#ff8c5a',
];

export type ConfettiParticle = {
  active: boolean;
  age: number;
  lifetime: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  spinX: number;
  spinY: number;
  spinZ: number;
};

export function createConfettiPool(): ConfettiParticle[] {
  return Array.from({ length: CONFETTI_COUNT }, () => ({
    active: false,
    age: 0,
    lifetime: 0,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    spinX: 0,
    spinY: 0,
    spinZ: 0,
  }));
}

export function createConfettiGroupsArray(): Array<Group | null> {
  return new Array(CONFETTI_COUNT).fill(null);
}

export function spawnConfetti(
  particles: ConfettiParticle[],
  x: number,
  z: number,
) {
  let spawned = 0;
  for (const p of particles) {
    if (spawned >= CONFETTI_SPAWN_PER_GOAL) break;
    if (p.active) continue;
    p.active = true;
    p.age = 0;
    p.lifetime = 2 + Math.random() * 0.9;
    p.x = x + (Math.random() - 0.5) * 0.5;
    p.y = 0.6 + Math.random() * 0.4;
    p.z = z + (Math.random() - 0.5) * 0.5;
    const angle = Math.random() * Math.PI * 2;
    const horiz = 1.4 + Math.random() * 2.6;
    p.vx = Math.cos(angle) * horiz;
    p.vz = Math.sin(angle) * horiz;
    p.vy = 3.2 + Math.random() * 2.6;
    p.rotX = Math.random() * Math.PI * 2;
    p.rotY = Math.random() * Math.PI * 2;
    p.rotZ = Math.random() * Math.PI * 2;
    p.spinX = (Math.random() - 0.5) * 14;
    p.spinY = (Math.random() - 0.5) * 14;
    p.spinZ = (Math.random() - 0.5) * 14;
    spawned += 1;
  }
}

// Live camera state mirrored from the main canvas each frame so the overlay
// canvas's camera tracks pan + zoom identically. Without this the confetti
// would visibly desync from the rest of the scene when the camera moves.
export type CameraMirror = {
  posX: number;
  posY: number;
  posZ: number;
  focusX: number;
  focusZ: number;
  zoom: number;
};

export function createCameraMirror(): CameraMirror {
  return { posX: 0, posY: 0, posZ: 0, focusX: 0, focusZ: 0, zoom: 1 };
}
