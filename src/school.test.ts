import { describe, expect, it } from 'vitest';
import { MeshLambertMaterial, Vector3 } from 'three';
import { CollisionWorld, makeContact } from './collision';
import { buildSchool } from './school';
import { PLACES, distanceToRoad } from './townPlan';

describe('the school', () => {
  const school = buildSchool();
  const material = new MeshLambertMaterial();
  const world = new CollisionWorld();
  world.add(...school.chunk.build(material).colliders);
  for (const i of school.interiors) world.add(...i.chunk.build(material).colliders);
  const out = makeContact();

  it('has three classrooms with clear doors onto the hallway', () => {
    for (let i = 1; i <= 3; i++) {
      const [rx, , rz] = school.landmarks[`classroom${i}`];
      const doorZ = rz + 4; // partition line
      expect(
        world.nearest(new Vector3(rx, 1.3, doorZ), 0.3, out),
        `door ${i} hit ${out.collider?.id}`,
      ).toBe(false);
      expect(world.nearest(new Vector3(rx + 2.5, 1.3, doorZ), 0.3, out)).toBe(true);
    }
  });

  it('has an open gym floor of at least 20 × 12 m', () => {
    const [gx, , gz] = school.landmarks.gym;
    for (let x = -9; x <= 9; x += 2) {
      for (let z = -6; z <= 6; z += 2) {
        expect(
          world.nearest(new Vector3(gx + x, 1.5, gz + z), 0.3, out),
          `gym ${x},${z} hit ${out.collider?.id}`,
        ).toBe(false);
      }
    }
  });

  it('lines the hallway with lockers and puts the drop-off by the road', () => {
    const lockers = school.interiors[0].chunk.parts.filter((p) => p.name === 'lockers');
    expect(lockers.length).toBeGreaterThanOrEqual(10);
    expect(distanceToRoad(PLACES.schoolDropOff[0], PLACES.schoolDropOff[2])).toBeLessThan(8);
  });
});
