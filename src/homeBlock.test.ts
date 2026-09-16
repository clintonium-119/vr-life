import { describe, expect, it } from 'vitest';
import { Chunk } from './chunk';
import { addHomeBlock } from './homeBlock';
import { addHomeHouse } from './homeHouse';

describe('the first street block', () => {
  const chunk = new Chunk('b');
  const house = addHomeHouse(chunk, 0, 0);
  const block = addHomeBlock(chunk, 0, 0);

  it('places the bus stop 30 to 50 m from the front door', () => {
    const d = Math.hypot(block.busStop[0] - house.door[0], block.busStop[2] - house.door[2]);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(50);
  });

  it('stays within the part budget and gives every solid part a collider', () => {
    expect(chunk.parts.length).toBeLessThanOrEqual(400);
    const decals = chunk.parts.filter((p) => p.noCollide === true);
    for (const p of decals) expect(['window', 'door', 'plaster']).toContain(p.tiles.sides);
  });

  it('tags surfaces for slap audio', () => {
    const byName = (n: string) => chunk.parts.filter((p) => p.name === n);
    expect(byName('road')[0].surface).toBe('stone');
    expect(byName('ground')[0].surface).toBe('ground');
    expect(byName('fenceRail').every((p) => p.surface === 'wood')).toBe(true);
    expect(byName('lampPost').every((p) => p.surface === 'metal')).toBe(true);
  });
});
