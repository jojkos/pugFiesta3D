import type { AnalogInput } from './types';

export function clampInput(input: AnalogInput): AnalogInput {
  const magnitudeSq = input.x * input.x + input.y * input.y;
  if (magnitudeSq <= 1) {
    return { x: input.x, y: input.y };
  }
  const magnitude = Math.sqrt(magnitudeSq);
  return { x: input.x / magnitude, y: input.y / magnitude };
}
