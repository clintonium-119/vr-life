import { describe, expect, it } from 'vitest';
import { buildCabin, buildForest, forestTreeSpots } from './forest';
import { buildFarm } from './farm';
import { PLACES, distanceToRoad } from './townPlan';

describe('forest and cabin', () => {
  it('hides the cabin: far from any road and ringed by trees', () => {
    const [cx, , cz] = PLACES.cabin;
    expect(distanceToRoad(cx, cz)).toBeGreaterThan(40);
    const near = forestTreeSpots().filter((s) => Math.hypot(s.x - cx, s.z - cz) < 12);
    expect(near.length).toBeGreaterThanOrEqual(6);
    const cabin = buildCabin();
    expect(cabin.chunk.parts.some((p) => p.name === 'sign')).toBe(false);
    expect(cabin.chunk.parts.some((p) => p.name === 'chest')).toBe(true);
  });

  it('keeps every forest chunk within the part budget', () => {
    for (const d of buildForest()) {
      expect(d.chunk.parts.length).toBeLessThanOrEqual(400);
      expect(d.chunk.parts.length).toBeGreaterThan(60);
    }
  });
});

describe('farm', () => {
  it('has a silo with a ladder reaching its top and a barn interior', () => {
    const farm = buildFarm();
    const ladder = farm.chunk.parts.find((p) => p.name === 'ladder' && p.size[1] >= 12)!;
    expect(ladder).toBeDefined();
    expect(ladder.position[1] + ladder.size[1] / 2).toBeGreaterThanOrEqual(12);
    expect(farm.interiors).toHaveLength(1);
    expect(farm.climbAids).toContain('silo:ladder');
  });
});
