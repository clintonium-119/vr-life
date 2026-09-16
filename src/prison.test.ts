import { describe, expect, it } from 'vitest';
import { MeshLambertMaterial, Vector3 } from 'three';
import { CollisionWorld, makeContact } from './collision';
import { tuning } from './movementTuning';
import { BAR_HEIGHT, PrisonState, YARD_WALL_H, buildPrison, setPrisonLocked } from './prison';

describe('the prison', () => {
  const prison = buildPrison();
  const material = new MeshLambertMaterial();
  const world = new CollisionWorld();
  world.add(...prison.chunk.build(material).colliders);
  for (const i of prison.interiors) world.add(...i.chunk.build(material).colliders);
  const out = makeContact();

  it('locks a body in a cell and lets it climb out over the bar tops', () => {
    setPrisonLocked(world, prison, true);
    const c = prison.cellCentre;
    // Bars block at chest height on the cell's front line.
    expect(world.nearest(new Vector3(c.x, 1.2, c.z + 1.5), 0.3, out)).toBe(true);
    expect(out.collider?.id.startsWith('cell0:bar')).toBe(true);
    // Above the bars the way is clear (under the 7 m hall roof).
    expect(world.nearest(new Vector3(c.x, BAR_HEIGHT + 0.5, c.z + 1.5), 0.3, out)).toBe(false);
    // Release: bars gone.
    setPrisonLocked(world, prison, false);
    expect(world.nearest(new Vector3(c.x, 1.2, c.z + 1.5), 0.3, out)).toBe(false);
  });

  it('gates the yard until released and offers footholds up the wall', () => {
    setPrisonLocked(world, prison, true);
    const gateZ = prison.yardBounds.max.z;
    expect(world.nearest(new Vector3(57, 1.5, gateZ), 0.3, out)).toBe(true);
    expect(out.collider?.id.startsWith('prisonGate')).toBe(true);
    setPrisonLocked(world, prison, false);
    expect(world.nearest(new Vector3(57, 1.5, gateZ), 0.3, out)).toBe(false);
    const footholds = prison.chunk.parts
      .filter((p) => p.name === 'foothold')
      .map((p) => p.position[1])
      .sort((a, b) => a - b);
    expect(footholds.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < footholds.length; i++)
      expect(footholds[i] - footholds[i - 1]).toBeLessThanOrEqual(1.3);
    expect(YARD_WALL_H - footholds[footholds.length - 1]).toBeLessThanOrEqual(1.3);
  });

  it('releases after the soft timer', () => {
    const s = new PrisonState({ ...tuning, prisonReleaseS: 10 });
    expect(s.tick(1)).toBe(false); // not inside
    s.enter();
    for (let i = 0; i < 9; i++) expect(s.tick(1)).toBe(false);
    expect(s.tick(1)).toBe(true);
    expect(s.tick(1)).toBe(false);
    expect(s.released).toBe(true);
  });
});
