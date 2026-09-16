import { describe, expect, it } from 'vitest';
import { Box3, Group, Vector3 } from 'three';
import { ChunkManager } from './chunkManager';
import { tuning } from './movementTuning';

describe('ChunkManager', () => {
  it('toggles chunks by distance and interiors by bounds', () => {
    const cm = new ChunkManager(tuning);
    const near = { mesh: new Group(), center: new Vector3(40, 0, 0), radius: 20 };
    const far = { mesh: new Group(), center: new Vector3(300, 0, 0), radius: 20 };
    const interior = {
      mesh: new Group(),
      center: new Vector3(0, 5, 0),
      radius: 15,
      interiorBounds: new Box3(new Vector3(-10, 0, -10), new Vector3(10, 10, 10)),
    };
    cm.add(near);
    cm.add(far);
    cm.add(interior);
    cm.update(new Vector3(0, 1, 30));
    expect(near.mesh.visible).toBe(true);
    expect(far.mesh.visible).toBe(false);
    expect(interior.mesh.visible).toBe(false); // outside the bounds + margin
    expect(cm.visibleCount).toBe(1);
    cm.update(new Vector3(0, 1, 11.5)); // at the door (within the 2.5 m margin)
    expect(interior.mesh.visible).toBe(true);
    cm.update(new Vector3(0, 1, 0));
    expect(interior.mesh.visible).toBe(true);
    expect(cm.total).toBe(3);
  });
});
