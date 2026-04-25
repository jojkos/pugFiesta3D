import { Vector2 } from 'three';
import { SCREEN_FORWARD, SCREEN_RIGHT } from './config';
import type { AnalogInput } from './types';

export function clampInput(input: AnalogInput) {
  const vector = new Vector2(input.x, input.y);
  if (vector.lengthSq() > 1) {
    vector.normalize();
  }

  return {
    x: vector.x,
    y: vector.y,
  };
}

export function screenInputToWorld(input: AnalogInput) {
  const vector = new Vector2()
    .addScaledVector(SCREEN_RIGHT, input.x)
    .addScaledVector(SCREEN_FORWARD, input.y);

  if (vector.lengthSq() > 1) {
    vector.normalize();
  }

  return {
    x: vector.x,
    y: vector.y,
  };
}
