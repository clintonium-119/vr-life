import { describe, expect, it } from 'vitest';
import { MeshLambertMaterial, Vector3 } from 'three';
import { buildCivic } from './civic';
import { CollisionWorld, makeContact } from './collision';
import { buildTownCentre } from './townCentre';
import { PLACES, PLACE_NAMES, parseSpawn } from './townPlan';

describe('town centre', () => {
  const tc = buildTownCentre();
  it('has the office as the peak and interiors with bounds under the part budget', () => {
    const office = tc.roofs.find((r) => r.id === 'office')!;
    expect(office.y).toBeGreaterThanOrEqual(20);
    expect(tc.chunk.parts.length).toBeLessThanOrEqual(400);
    for (const i of tc.interiors) {
      expect(i.chunk.parts.length).toBeLessThanOrEqual(400);
      expect(i.bounds.isEmpty()).toBe(false);
    }
    expect(tc.climbAids.length).toBeGreaterThanOrEqual(3);
  });
});

describe('civic', () => {
  const civic = buildCivic();
  const material = new MeshLambertMaterial();
  const world = new CollisionWorld();
  world.add(...civic.chunk.build(material).colliders);
  it('has 5 m tall fire bay doors, poles, and the hospital as a peak', () => {
    const out = makeContact();
    const fx = PLACES.fire[0];
    const fz = PLACES.fire[2] - 9 + 8;
    expect(
      world.nearest(new Vector3(fx - 6, 4.5, fz), 0.3, out),
      `bay A hit ${out.collider?.id}`,
    ).toBe(false);
    expect(
      world.nearest(new Vector3(fx + 3.5, 4.5, fz), 0.3, out),
      `bay B hit ${out.collider?.id}`,
    ).toBe(false);
    expect(world.nearest(new Vector3(fx, 4.5, fz), 0.3, out)).toBe(true); // pier between the bays
    const poles = civic.interiors
      .find((i) => i.chunk.name === 'fireInterior')!
      .chunk.parts.filter((p) => p.name === 'firePole');
    expect(poles).toHaveLength(2);
    expect(civic.roofs.find((r) => r.id === 'hospital')!.y).toBeGreaterThanOrEqual(12);
  });
});

describe('places', () => {
  it('parseSpawn defaults to the bedroom and accepts every place', () => {
    expect(parseSpawn('')).toBe('bedroom');
    expect(parseSpawn('?spawn=nowhere')).toBe('bedroom');
    for (const name of PLACE_NAMES) expect(parseSpawn(`?spawn=${name}`)).toBe(name);
  });
});
