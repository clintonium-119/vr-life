import { Vector3 } from 'three';
import { addSlab, addTree } from './builders';
import { PLACES, emptyDistrict, type BuiltDistrict } from './townPlan';

// The forest: a seeded jittered scatter of trees dense enough to read as a
// different space, with clearings, split into chunks that cull by distance.
// The haunted cabin sits in a clearing deep inside: unmarked, unsigned,
// ringed by trees, with one small secret under a trapdoor.

export const FOREST_MIN = new Vector3(-120, 0, 28);
export const FOREST_MAX = new Vector3(120, 0, 130);
const SPACING = 6.5;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TreeSpot {
  x: number;
  z: number;
}

/** Tree positions: jittered grid, minus clearings. */
export function forestTreeSpots(): TreeSpot[] {
  const rnd = mulberry32(1337);
  const spots: TreeSpot[] = [];
  const cabin = PLACES.cabin;
  for (let x = FOREST_MIN.x; x <= FOREST_MAX.x; x += SPACING) {
    for (let z = FOREST_MIN.z; z <= FOREST_MAX.z; z += SPACING) {
      const jx = x + (rnd() - 0.5) * SPACING * 0.8;
      const jz = z + (rnd() - 0.5) * SPACING * 0.8;
      // Clearings: the cabin's, and one open glade near the town edge.
      const dCabin = Math.hypot(jx - cabin[0], jz - cabin[2]);
      if (dCabin < 7) continue;
      if (Math.hypot(jx + 60, jz - 60) < 12) continue;
      if (rnd() < 0.12) continue; // natural gaps
      spots.push({ x: jx, z: jz });
    }
  }
  return spots;
}

export function buildForest(): BuiltDistrict[] {
  const spots = forestTreeSpots();
  const rnd = mulberry32(99);
  // Four chunks by x quadrant so distance culling drops the far ones.
  const districts: BuiltDistrict[] = [];
  const edges = [FOREST_MIN.x, -60, 0, 60, FOREST_MAX.x + 1];
  for (let q = 0; q < 4; q++) {
    const d = emptyDistrict(`forest${q}`);
    const inQuad = spots.filter((s) => s.x >= edges[q] && s.x < edges[q + 1]);
    for (const s of inQuad) addTree(d.chunk, s.x, s.z, 4.5 + rnd() * 3, 2.6 + rnd() * 1.4);
    d.bounds.set(
      new Vector3(edges[q], 0, FOREST_MIN.z),
      new Vector3(edges[q + 1], 12, FOREST_MAX.z),
    );
    districts.push(d);
  }
  return districts;
}

export function buildCabin(): BuiltDistrict {
  const d = emptyDistrict('cabin');
  const [cx, , cz] = PLACES.cabin;
  const W = 6;
  const D = 5;
  const H = 3;
  // Log-cabin walls (planks, dark tint), one door opening toward -z, a stove pipe.
  addSlab(d.chunk, {
    name: 'cabinFloor',
    centre: [cx, 0.15, cz],
    size: [W, 0.3, D],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1.5,
    tint: 0x6b5236,
  });
  for (const side of [-1, 1]) {
    addSlab(d.chunk, {
      name: 'cabinWall',
      centre: [cx + side * (W / 2 - 0.15), 0.3 + H / 2, cz],
      size: [0.3, H, D],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 1,
      tint: 0x5a4430,
    });
  }
  addSlab(d.chunk, {
    name: 'cabinWall',
    centre: [cx, 0.3 + H / 2, cz + D / 2 - 0.15],
    size: [W, H, 0.3],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1,
    tint: 0x5a4430,
  });
  for (const side of [-1, 1]) {
    addSlab(d.chunk, {
      name: 'cabinFront',
      centre: [cx + side * 1.9, 0.3 + H / 2, cz - D / 2 + 0.15],
      size: [2.2, H, 0.3],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 1,
      tint: 0x5a4430,
    });
  }
  addSlab(d.chunk, {
    name: 'cabinLintel',
    centre: [cx, 0.3 + H - 0.3, cz - D / 2 + 0.15],
    size: [1.6, 0.6, 0.3],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1,
    tint: 0x5a4430,
  });
  addSlab(d.chunk, {
    name: 'cabinRoof',
    centre: [cx, 0.3 + H + 0.2, cz],
    size: [W + 1, 0.4, D + 1],
    tiles: { sides: 'planks', top: 'shingles' },
    surface: 'wood',
    uvScale: 1.5,
    tint: 0x4a4a4a,
  });
  addSlab(d.chunk, {
    name: 'stovePipe',
    centre: [cx + 2, 0.3 + H + 1.0, cz + 1.5],
    size: [0.3, 1.6, 0.3],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 1,
    tint: 0x333333,
  });
  addSlab(d.chunk, {
    name: 'cabinPorch',
    centre: [cx, 0.1, cz - D / 2 - 0.8],
    size: [3, 0.2, 1.6],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1.5,
    tint: 0x6b5236,
  });
  // The secret: a trapdoor slab in the floor over a cellar pit with a glowing chest.
  addSlab(d.chunk, {
    name: 'cellarPit',
    centre: [cx + 1.5, -1.2, cz + 1],
    size: [2, 2.4, 2],
    tiles: 'concrete',
    surface: 'stone',
    uvScale: 1,
    tint: 0x555555,
    noCollide: true,
  });
  addSlab(d.chunk, {
    name: 'trapdoor',
    centre: [cx + 1.5, 0.32, cz + 1],
    size: [1.2, 0.06, 1.2],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1.2,
    tint: 0x3d2f20,
  });
  addSlab(d.chunk, {
    name: 'chest',
    centre: [cx + 1.5, -1.7, cz + 1],
    size: [0.8, 0.5, 0.5],
    tiles: 'trim',
    surface: 'wood',
    uvScale: 0.8,
    tint: 0xffd166,
  });
  d.landmarks.cabin = [cx, 0.3, cz];
  d.bounds.set(new Vector3(cx - 5, -3, cz - 5), new Vector3(cx + 5, 6, cz + 5));
  return d;
}
