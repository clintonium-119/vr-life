import { describe, expect, it } from 'vitest';
import { buildResidential } from './homeBlock';
import { buildStreets } from './townPlan';

describe('the residential district', () => {
  const res = buildResidential();

  it('places the bus stop 30 to 50 m from the front door', () => {
    const d = Math.hypot(res.busStop[0] - res.house.door[0], res.busStop[2] - res.house.door[2]);
    expect(d).toBeGreaterThan(30);
    expect(d).toBeLessThan(50);
  });

  it('stays within the part budget and gives every solid part a collider', () => {
    expect(res.chunk.parts.length).toBeLessThanOrEqual(400);
    for (const p of res.chunk.parts.filter((p) => p.noCollide === true)) {
      expect(['window', 'door', 'plaster']).toContain(p.tiles.sides);
    }
  });

  it('registers a roof and a drainpipe for every house', () => {
    expect(res.roofs.length).toBe(7);
    expect(res.climbAids.length).toBe(7);
  });

  it('tags surfaces for slap audio (streets own the road and ground)', () => {
    const streets = buildStreets();
    const byName = (n: string) => streets.chunk.parts.filter((p) => p.name === n);
    expect(byName('road')[0].surface).toBe('stone');
    expect(byName('ground')[0].surface).toBe('ground');
    expect(
      res.chunk.parts.filter((p) => p.name === 'fenceRail').every((p) => p.surface === 'wood'),
    ).toBe(true);
    expect(
      res.chunk.parts.filter((p) => p.name === 'lampPost').every((p) => p.surface === 'metal'),
    ).toBe(true);
  });
});
