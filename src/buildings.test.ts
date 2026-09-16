import { describe, expect, it } from 'vitest';
import { MeshLambertMaterial, Vector3 } from 'three';
import { addBuilding, addCubicles, addDeskRows, addLockers, addShelfRun } from './buildings';
import { Chunk } from './chunk';
import { CollisionWorld, makeContact } from './collision';

const material = new MeshLambertMaterial();

function build(stairs: 'ramp' | 'atrium', storeys = 3) {
  const ext = new Chunk('ext');
  const int = new Chunk('int');
  const result = addBuilding(ext, int, {
    centre: [0, 0],
    width: 20,
    depth: 16,
    storeys,
    tiles: 'brick',
    doors: [{ side: '-z' }],
    stairs,
    name: 'b',
  });
  const world = new CollisionWorld();
  world.add(...ext.build(material).colliders, ...int.build(material).colliders);
  return { result, world, ext, int };
}

describe('addBuilding', () => {
  it('has a clear 1.8 m door, a roof at storeys × 4 m, and a parapet', () => {
    const { result, world } = build('ramp');
    const out = makeContact();
    const [dx, , dz] = result.doorCentres[0];
    expect(world.nearest(new Vector3(dx, 1.4, dz), 0.3, out)).toBe(false);
    expect(world.nearest(new Vector3(dx + 1.5, 1.4, dz), 0.3, out)).toBe(true);
    expect(result.roofY).toBeCloseTo(12.2, 3);
    // Parapet: a sphere just inside the roof edge at parapet height collides.
    expect(world.nearest(new Vector3(9.9, result.roofY + 0.45, 0), 0.3, out)).toBe(true);
    expect(out.collider?.id.includes('parapet')).toBe(true);
    // Roof top is clear.
    expect(world.nearest(new Vector3(0, result.roofY + 0.5, 0), 0.3, out)).toBe(false);
  });

  it('ramps climb from one storey to the next', () => {
    const { world, int } = build('ramp');
    const ramp = int.parts.find((p) => p.name === 'b:ramp0')!;
    const out = makeContact();
    // Walk the ramp surface 0.6 m above its centre line: no contact along the way.
    const len = ramp.size[2];
    const slope = -(ramp.rotation as [number, number, number])[0];
    for (let t = -0.45; t <= 0.45; t += 0.1) {
      const z = ramp.position[2] + t * len * Math.cos(slope);
      const y = ramp.position[1] + t * len * Math.sin(slope) + 0.6;
      expect(
        world.nearest(new Vector3(ramp.position[0], y, z), 0.3, out),
        `t=${t.toFixed(2)} hit ${out.collider?.id}`,
      ).toBe(false);
    }
    // The floor hole above the ramp is open.
    expect(world.nearest(new Vector3(ramp.position[0], 4.05, ramp.position[2]), 0.25, out)).toBe(
      false,
    );
  });

  it('atrium lattice reaches the roof and the floor holes are open', () => {
    const { result, world, int } = build('atrium', 4);
    const out = makeContact();
    const columns = int.parts.filter((p) => p.name === 'b:column');
    expect(columns).toHaveLength(4);
    expect(columns[0].position[1] + columns[0].size[1] / 2).toBeCloseTo(result.roofY - 0.2, 3);
    for (let s = 1; s < 4; s++)
      expect(world.nearest(new Vector3(0, s * 4 + 0.05, 0), 0.4, out)).toBe(false);
    expect(int.parts.filter((p) => p.name === 'b:beam').length).toBeGreaterThan(8);
  });
});

describe('furniture kits', () => {
  it('emit colliders', () => {
    const c = new Chunk('f');
    addDeskRows(c, [0, 0, 0], 2, 3);
    addShelfRun(c, [5, 0, 0], 'x', 4, 3);
    addLockers(c, [0, 0, 5], 'x', 8);
    addCubicles(c, [10, 0, 10], 2, 2);
    const built = c.build(material);
    expect(built.colliders.length).toBe(c.parts.length);
    expect(c.parts.filter((p) => p.name === 'desk')).toHaveLength(6 + 4);
  });
});
