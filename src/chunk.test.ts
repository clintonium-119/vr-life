import { describe, expect, it } from 'vitest';
import { MeshLambertMaterial, Vector3 } from 'three';
import { tileRect } from './atlas';
import { Chunk, appendBoxPart, type BoxPart } from './chunk';
import { CollisionWorld, makeContact } from './collision';
import { addWall } from './builders';

const material = new MeshLambertMaterial();
const box = (
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  extra: Partial<BoxPart> = {},
): BoxPart => ({
  name,
  size,
  position,
  tiles: { sides: 'brick' },
  surface: 'stone',
  ...extra,
});

describe('Chunk', () => {
  it('merges parts into one mesh with a colour attribute and one collider per collidable part', () => {
    const chunk = new Chunk('c');
    chunk.add(box('a', [1, 1, 1], [0, 0.5, 0]));
    chunk.add(box('b', [2, 1, 1], [3, 0.5, 0]));
    chunk.add(box('decal', [1, 1, 0.05], [0, 1, 1], { noCollide: true }));
    const built = chunk.build(material);
    expect(built.mesh.material).toBe(material);
    expect(built.mesh.geometry.getAttribute('color')).toBeDefined();
    expect(built.mesh.geometry.getAttribute('position').count).toBe(built.vertexCount);
    expect(built.colliders).toHaveLength(2);
    expect(built.colliders[1].halfExtents.x).toBeCloseTo(1);
    expect(built.partCount).toBe(3);
  });

  it('keeps tiled UVs inside the tile rect and repeats by uvScale', () => {
    const arrays = { position: [], normal: [], uv: [], color: [], part: [] };
    const added = appendBoxPart(box('w', [4, 2, 0.2], [0, 1, 0], { uvScale: 2 }), 0, arrays);
    // Front/back faces: 2×1 quads; sides: 1×1; top/bottom: 2×1 → (2+2+1+1+2+2) quads × 6 verts
    expect(added).toBe(10 * 6);
    const r = tileRect('brick');
    for (let i = 0; i < arrays.uv.length; i += 2) {
      expect(arrays.uv[i]).toBeGreaterThanOrEqual(r.u0 - 1e-6);
      expect(arrays.uv[i]).toBeLessThanOrEqual(r.u1 + 1e-6);
      expect(arrays.uv[i + 1]).toBeGreaterThanOrEqual(r.v0 - 1e-6);
      expect(arrays.uv[i + 1]).toBeLessThanOrEqual(r.v1 + 1e-6);
    }
  });

  it('bakes occlusion: darker at the ground and under an overhang', () => {
    const chunk = new Chunk('ao');
    chunk.add(box('wall', [0.3, 3, 4], [0, 1.5, 0]));
    chunk.add(box('eave', [3, 0.2, 4], [1.5, 3.1, 0])); // overhangs +x side of the wall
    const built = chunk.build(material);
    const pos = built.mesh.geometry.getAttribute('position');
    const col = built.mesh.geometry.getAttribute('color');
    let low = Infinity;
    let high = -Infinity;
    let underEave = Infinity;
    let exposed = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const c = col.getX(i);
      if (Math.abs(x) <= 0.15 + 1e-6) {
        if (y < 0.01) low = Math.min(low, c);
        if (y > 2.9) high = Math.max(high, c);
      }
    }
    // Compare eave-side vertices of the wall's +x face just below the eave vs the -x face.
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 2.9 && y < 3.01) {
        if (Math.abs(x - 0.15) < 1e-6) underEave = Math.min(underEave, col.getX(i));
        if (Math.abs(x + 0.15) < 1e-6) exposed = Math.max(exposed, col.getX(i));
      }
    }
    expect(low).toBeLessThan(high);
    expect(underEave).toBeLessThan(exposed);
  });
});

describe('addWall with an opening', () => {
  it('leaves the opening clear and blocks beside it', () => {
    const chunk = new Chunk('w');
    const parts = addWall(chunk, {
      start: [-3, 0],
      axis: 'x',
      length: 6,
      height: 3,
      thickness: 0.25,
      tiles: 'siding',
      opening: [2.3, 1.4, 2.4],
    });
    expect(parts).toHaveLength(3);
    const built = chunk.build(material);
    const world = new CollisionWorld();
    world.add(...built.colliders);
    const out = makeContact();
    // Opening spans x ∈ [-0.7, 0.7], y < 2.4
    expect(world.nearest(new Vector3(0, 1.2, 0), 0.3, out)).toBe(false);
    expect(world.nearest(new Vector3(1.5, 1.2, 0), 0.3, out)).toBe(true);
    expect(world.nearest(new Vector3(0, 2.7, 0), 0.3, out)).toBe(true); // lintel
  });
});
