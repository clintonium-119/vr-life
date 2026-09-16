import { Box3, Vector3 } from 'three';
import { addLadder } from './buildings';
import { addFence, addHouseShell, addSlab } from './builders';
import { Chunk } from './chunk';
import { PLACES, emptyDistrict, type BuiltDistrict } from './townPlan';

// The farm: farmhouse, barn with a hayloft, silo with a ladder, fields with
// fence lines, two sheds. The silo is the outskirts landmark.

export function buildFarm(): BuiltDistrict {
  const d = emptyDistrict('farm');
  const [fx, , fz] = PLACES.farm;

  // Farmhouse (closed shell) on a low foundation.
  addSlab(d.chunk, {
    name: 'farmFoundation',
    centre: [fx + 10, 0.05, fz],
    size: [10.4, 0.1, 8.4],
    tiles: 'concrete',
    surface: 'stone',
    uvScale: 2,
  });
  const house = addHouseShell(d.chunk, {
    centre: [fx + 10, fz],
    width: 10,
    depth: 8,
    wallHeight: 3.2,
    doorSide: '-z',
    siding: 'siding',
    doorDecal: true,
    base: 0.1,
    name: 'farmhouse',
  });
  void house;
  d.roofs.push({
    id: 'farmhouse',
    bounds: new Box3(new Vector3(fx + 5, 3.4, fz - 4), new Vector3(fx + 15, 6, fz + 4)),
    y: 3.4,
  });

  // Barn: tall gable box with an open front bay and a hayloft slab.
  const bx = fx - 12;
  const barnInt = new Chunk('barnInterior');
  addSlab(d.chunk, {
    name: 'barnFloor',
    centre: [bx, 0.05, fz],
    size: [16, 0.1, 10],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 2,
  });
  for (const side of [-1, 1]) {
    addSlab(d.chunk, {
      name: 'barnWall',
      centre: [bx + side * 7.85, 3.5, fz],
      size: [0.3, 7, 10],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 2,
      tint: 0xa33a2a,
    });
  }
  addSlab(d.chunk, {
    name: 'barnBack',
    centre: [bx, 3.5, fz + 4.85],
    size: [16, 7, 0.3],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 2,
    tint: 0xa33a2a,
  });
  // Front: two piers leaving a 6 m bay.
  for (const side of [-1, 1]) {
    addSlab(d.chunk, {
      name: 'barnFront',
      centre: [bx + side * 5.5, 3.5, fz - 4.85],
      size: [5, 7, 0.3],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 2,
      tint: 0xa33a2a,
    });
  }
  addSlab(d.chunk, {
    name: 'barnLintel',
    centre: [bx, 6, fz - 4.85],
    size: [6, 2, 0.3],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 2,
    tint: 0xa33a2a,
  });
  addSlab(d.chunk, {
    name: 'barnRoof',
    centre: [bx, 7.3, fz],
    size: [17, 0.4, 11],
    tiles: { sides: 'planks', top: 'shingles' },
    surface: 'wood',
    uvScale: 2,
  });
  addSlab(barnInt, {
    name: 'hayloft',
    centre: [bx, 3.9, fz + 2],
    size: [15.4, 0.2, 5.5],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 2,
  });
  addLadder(barnInt, bx - 6, fz - 0.9, 0, 4, '-z');
  for (let i = 0; i < 4; i++)
    addSlab(barnInt, {
      name: 'hayBale',
      centre: [bx - 4 + i * 2.2, 0.5, fz - 2.5],
      size: [1.6, 1.0, 1.0],
      tiles: 'planks',
      surface: 'leaves',
      uvScale: 1,
      tint: 0xd7b95a,
    });
  d.interiors.push({
    chunk: barnInt,
    bounds: new Box3(new Vector3(bx - 8, 0, fz - 5), new Vector3(bx + 8, 7.5, fz + 5)),
  });
  d.roofs.push({
    id: 'barn',
    bounds: new Box3(new Vector3(bx - 8.5, 7.5, fz - 5.5), new Vector3(bx + 8.5, 7.5, fz + 5.5)),
    y: 7.5,
  });
  d.climbAids.push('barn:ladder');

  // Silo: two rotated boxes make an eight-point tower; ladder to the top.
  const sx = fx - 28;
  for (const rot of [0, Math.PI / 4]) {
    addSlab(d.chunk, {
      name: 'silo',
      centre: [sx, 6, fz],
      size: [4, 12, 4],
      rotation: [0, rot, 0],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 2,
      tint: 0xc8ccd0,
    });
  }
  addSlab(d.chunk, {
    name: 'siloCap',
    centre: [sx, 12.4, fz],
    size: [3, 0.8, 3],
    rotation: [0, Math.PI / 8, 0],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 1,
    tint: 0x8a9096,
  });
  addLadder(d.chunk, sx + 2.55, fz, 0, 12, '+x');
  d.climbAids.push('silo:ladder');
  d.landmarks.silo = [sx, 12, fz];
  d.roofs.push({
    id: 'silo',
    bounds: new Box3(new Vector3(sx - 2, 12, fz - 2), new Vector3(sx + 2, 12.8, fz + 2)),
    y: 12,
  });

  // Fields: tinted grass slabs with fence lines; two sheds.
  for (let i = 0; i < 3; i++) {
    const cx = fx - 40 + i * 24;
    addSlab(d.chunk, {
      name: 'field',
      centre: [cx, 0.02, fz + 26],
      size: [22, 0.04, 30],
      tiles: 'grass',
      surface: 'ground',
      uvScale: 6,
      tint: i % 2 === 0 ? 0xb8a65a : 0x7d9b4d,
    });
    addFence(d.chunk, [cx - 11, fz + 11], 'x', 22, 1.1);
    addFence(d.chunk, [cx - 11, fz + 11], 'z', 30, 1.1);
  }
  addFence(d.chunk, [fx + 23, fz + 11], 'z', 30, 1.1);
  for (const [shx, shz] of [
    [fx + 22, fz - 6],
    [fx - 6, fz - 12],
  ]) {
    addSlab(d.chunk, {
      name: 'shed',
      centre: [shx, 1.4, shz],
      size: [4, 2.8, 3],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 1.5,
      tint: 0x8b6f47,
    });
    addSlab(d.chunk, {
      name: 'shedRoof',
      centre: [shx, 2.95, shz],
      size: [4.6, 0.3, 3.6],
      tiles: { sides: 'planks', top: 'metal' },
      surface: 'metal',
      uvScale: 1.5,
    });
  }

  d.bounds.set(new Vector3(fx - 60, 0, fz - 20), new Vector3(fx + 30, 14, fz + 45));
  return d;
}
