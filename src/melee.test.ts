import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_APPEARANCE } from './appearance';
import { strikeRule } from './melee';
import { tuning } from './movementTuning';
import { Npc } from './npc';
import { pickTarget } from './toyGun';

describe('strikeRule', () => {
  it('needs both reach and speed', () => {
    expect(strikeRule(0.3, 5, tuning)).toBe(true);
    expect(strikeRule(0.3, 1, tuning)).toBe(false);
    expect(strikeRule(1.0, 5, tuning)).toBe(false);
  });
});

describe('pickTarget', () => {
  const npcAt = (x: number, z: number) =>
    new Npc({ role: 'pedestrian', appearance: DEFAULT_APPEARANCE, position: new Vector3(x, 0, z) });
  it('picks the nearest NPC inside the forward cone within range', () => {
    const ahead = npcAt(0, -5);
    const farther = npcAt(0, -12);
    const behind = npcAt(0, 5);
    const wide = npcAt(6, -5);
    const outOfRange = npcAt(0, -40);
    const origin = new Vector3(0, 1, 0);
    const forward = new Vector3(0, 0, -1);
    expect(
      pickTarget(
        origin,
        forward,
        [farther, behind, wide, ahead, outOfRange],
        tuning.gunRange,
        tuning.gunConeDeg,
      ),
    ).toBe(ahead);
    expect(
      pickTarget(origin, forward, [behind, wide, outOfRange], tuning.gunRange, tuning.gunConeDeg),
    ).toBeNull();
    expect(pickTarget(origin, forward, [farther], tuning.gunRange, tuning.gunConeDeg)).toBe(
      farther,
    );
  });
});
