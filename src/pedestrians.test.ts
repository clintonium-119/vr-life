import { describe, expect, it } from 'vitest';
import { tuning } from './movementTuning';
import { shouldReact } from './pedestrians';

describe('shouldReact', () => {
  it('reacts to a bump at any speed and to a fast pass within the radius', () => {
    expect(shouldReact(0.5, 0, tuning)).toBe(true);
    expect(shouldReact(2.0, tuning.npcReactSpeed + 1, tuning)).toBe(true);
    expect(shouldReact(2.0, tuning.npcReactSpeed - 1, tuning)).toBe(false);
    expect(shouldReact(3.0, 20, tuning)).toBe(false);
  });
});
