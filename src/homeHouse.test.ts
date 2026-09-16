import { describe, expect, it } from 'vitest';
import { MeshLambertMaterial, Vector3 } from 'three';
import { Chunk } from './chunk';
import { CollisionWorld, makeContact } from './collision';
import { HOUSE_FLOOR_Y, addHomeHouse } from './homeHouse';

function built() {
  const chunk = new Chunk('h');
  const house = addHomeHouse(chunk, 0, 0);
  const { colliders } = chunk.build(new MeshLambertMaterial());
  const world = new CollisionWorld();
  world.add(...colliders);
  return { house, world };
}

describe("the player's house", () => {
  it('has a clear straight route from the spawn through both doors for the body sphere', () => {
    const { house, world } = built();
    const out = makeContact();
    const [sx, , sz] = house.spawn;
    const bodyY = HOUSE_FLOOR_Y + 0.3 + 0.02; // sphere resting on the floor, a hair above
    for (let z = sz; z >= house.door[2] - 0.5; z -= 0.25) {
      const hit = world.nearest(new Vector3(sx, bodyY + 0.05, z), 0.3, out);
      expect(hit, `blocked at z=${z.toFixed(2)} by ${out.collider?.id}`).toBe(false);
    }
  });

  it('puts the backpack inside, near the front door', () => {
    const { house } = built();
    const [bx, by, bz] = house.backpackHome;
    expect(Math.abs(bx)).toBeLessThan(4.5);
    expect(bz).toBeGreaterThan(house.door[2]);
    expect(Math.hypot(bx - house.door[0], bz - house.door[2])).toBeLessThan(1.6);
    expect(by).toBeGreaterThan(HOUSE_FLOOR_Y);
  });

  it('has doorways at least 1.4 m wide and 2.2 m tall', () => {
    const { house, world } = built();
    const out = makeContact();
    const probe = (x: number, y: number, z: number) =>
      world.nearest(new Vector3(x, y, z), 0.05, out);
    for (const z of [0.5, house.door[2]]) {
      for (const x of [-0.6, 0, 0.6]) {
        expect(
          probe(x, HOUSE_FLOOR_Y + 1.2, z),
          `door at z=${z} x=${x} hit ${out.collider?.id} depth ${out.depth}`,
        ).toBe(false);
        expect(
          probe(x, HOUSE_FLOOR_Y + 2.15, z),
          `door top at z=${z} x=${x} hit ${out.collider?.id} depth ${out.depth}`,
        ).toBe(false);
      }
      expect(probe(1.0, HOUSE_FLOOR_Y + 1.2, z)).toBe(true); // pier beside the opening
    }
  });
});
