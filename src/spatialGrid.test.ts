import { describe, expect, it } from 'vitest';
import { Box3, Matrix4, Vector3 } from 'three';
import {
  CollisionWorld,
  colliderAABB,
  makeBoxCollider,
  makeContact,
  sphereBoxContact,
  type BoxCollider,
} from './collision';
import { SpatialGrid } from './spatialGrid';

function rnd(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

describe('SpatialGrid + CollisionWorld', () => {
  const r = rnd(7);
  const colliders: BoxCollider[] = [];
  for (let i = 0; i < 3000; i++) {
    const size = new Vector3(0.5 + r() * 6, 0.5 + r() * 6, 0.5 + r() * 6);
    const m = new Matrix4()
      .makeRotationY(r() * Math.PI)
      .setPosition((r() - 0.5) * 400, r() * 30, (r() - 0.5) * 400);
    colliders.push(
      makeBoxCollider(
        `c${i}`,
        'stone',
        new Box3(size.clone().multiplyScalar(-0.5), size.clone().multiplyScalar(0.5)),
        m,
      ),
    );
  }
  const ground = makeBoxCollider(
    'ground',
    'ground',
    new Box3(new Vector3(-300, -1, -300), new Vector3(300, 0, 300)),
    new Matrix4(),
  );
  const world = new CollisionWorld(8);
  world.add(...colliders, ground);

  it('matches the linear scan for random spheres', () => {
    const out = makeContact();
    for (let q = 0; q < 200; q++) {
      const center = new Vector3((r() - 0.5) * 400, r() * 30, (r() - 0.5) * 400);
      const radius = 0.1 + r() * 2;
      const expected = new Set<string>();
      for (const c of [...colliders, ground])
        if (sphereBoxContact(center, radius, c, out)) expected.add(c.id);
      const got = new Set<string>();
      world.forEachContact(center, radius, (c) => got.add(c.collider!.id));
      expect(got, `query ${q}`).toEqual(expected);
      const linearBest = [...expected].length > 0;
      expect(world.nearest(center, radius, out)).toBe(linearBest);
    }
  });

  it('reports an item spanning several cells once', () => {
    const grid = new SpatialGrid<string>(1);
    grid.insert('big', new Vector3(0, 0, 0), new Vector3(3, 3, 0.5));
    const seen: string[] = [];
    grid.forEachNear(new Vector3(1.5, 1.5, 0), 2, (s) => seen.push(s));
    expect(seen).toEqual(['big']);
  });

  it('always tests very large items', () => {
    const out = makeContact();
    expect(world.nearest(new Vector3(250, 0.2, 250), 0.3, out)).toBe(true);
    expect(out.collider?.id).toBe('ground');
  });

  it('computes world AABBs for rotated boxes', () => {
    const c = makeBoxCollider(
      'r',
      'stone',
      new Box3(new Vector3(-2, -1, -0.5), new Vector3(2, 1, 0.5)),
      new Matrix4().makeRotationY(Math.PI / 4),
    );
    const box = colliderAABB(c, new Box3());
    const ext = Math.SQRT1_2 * (2 + 0.5);
    expect(box.max.x).toBeCloseTo(ext, 5);
    expect(box.max.z).toBeCloseTo(ext, 5);
    expect(box.max.y).toBeCloseTo(1, 5);
  });
});
