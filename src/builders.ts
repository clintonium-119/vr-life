import type { TileName } from './atlas';
import type { BoxPart, Chunk } from './chunk';
import type { SurfaceTag } from './collision';

// Parametric builders: each adds box parts to a chunk. Sizes in metres.
// Every part is a collider unless it is a flat decal (windows, door faces).

export type Axis = 'x' | 'z';

export interface WallSpec {
  /** Wall centre line start (x, z) and length along `axis`. */
  start: [number, number];
  axis: Axis;
  length: number;
  height: number;
  thickness: number;
  /** Base height (floor level), default 0. */
  base?: number;
  tiles: TileName;
  surface?: SurfaceTag;
  /** Opening measured from the start along the wall: [at, width, height]. */
  opening?: [number, number, number];
  name?: string;
}

function along(axis: Axis, start: [number, number], t: number, offset = 0): [number, number] {
  return axis === 'x' ? [start[0] + t, start[1] + offset] : [start[0] + offset, start[1] + t];
}

/** A straight wall, optionally with one opening (two piers + a lintel). */
export function addWall(chunk: Chunk, spec: WallSpec): BoxPart[] {
  const base = spec.base ?? 0;
  const surface = spec.surface ?? 'stone';
  const seg = (from: number, len: number, bottom: number, h: number, label: string): BoxPart => {
    const [cx, cz] = along(spec.axis, spec.start, from + len / 2);
    return chunk.add({
      name: `${spec.name ?? 'wall'}:${label}`,
      size: spec.axis === 'x' ? [len, h, spec.thickness] : [spec.thickness, h, len],
      position: [cx, bottom + h / 2, cz],
      tiles: { sides: spec.tiles },
      surface,
    });
  };
  if (spec.opening === undefined) return [seg(0, spec.length, base, spec.height, 'full')];
  const [at, width, oh] = spec.opening;
  const parts: BoxPart[] = [];
  if (at > 0.01) parts.push(seg(0, at, base, spec.height, 'pierA'));
  const rest = spec.length - at - width;
  if (rest > 0.01) parts.push(seg(at + width, rest, base, spec.height, 'pierB'));
  const lintelH = spec.height - oh;
  if (lintelH > 0.01) parts.push(seg(at, width, base + oh, lintelH, 'lintel'));
  return parts;
}

export interface SlabSpec {
  centre: [number, number, number];
  size: [number, number, number];
  tiles: TileName | { sides: TileName; top?: TileName; bottom?: TileName };
  surface: SurfaceTag;
  rotation?: [number, number, number];
  uvScale?: number;
  noCollide?: boolean;
  name?: string;
  tint?: number;
}

/** Any flat or blocky thing: floors, roofs, benches, crates. */
export function addSlab(chunk: Chunk, spec: SlabSpec): BoxPart {
  return chunk.add({
    name: spec.name,
    size: spec.size,
    position: spec.centre,
    rotation: spec.rotation,
    tiles: typeof spec.tiles === 'string' ? { sides: spec.tiles } : spec.tiles,
    surface: spec.surface,
    uvScale: spec.uvScale,
    noCollide: spec.noCollide,
    tint: spec.tint,
  });
}

/** Window decal: a thin non-colliding box proud of a wall face. */
export function addWindow(
  chunk: Chunk,
  centre: [number, number, number],
  axis: Axis,
  width = 1.2,
  height = 1.3,
): BoxPart {
  return chunk.add({
    name: 'window',
    size: axis === 'x' ? [width, height, 0.06] : [0.06, height, width],
    position: centre,
    tiles: { sides: 'window' },
    uvScale: Math.max(width, height),
    surface: 'metal',
    noCollide: true,
  });
}

export interface HouseSpec {
  /** Footprint centre (x, z). */
  centre: [number, number];
  width: number; // along x
  depth: number; // along z
  wallHeight: number;
  /** Which side the front door is on (the wall facing that direction). */
  doorSide: '+z' | '-z';
  siding: TileName;
  /** True: the door is a decal on a solid wall (neighbour shells). */
  doorDecal?: boolean;
  name?: string;
}

const WALL_T = 0.25;

/**
 * A closed house shell: four walls, floor slab, stepped gable roof, windows,
 * and a front door (a real opening, or a decal for neighbours).
 */
export function addHouseShell(
  chunk: Chunk,
  spec: HouseSpec,
): { doorCentre: [number, number, number] } {
  const [cx, cz] = spec.centre;
  const hw = spec.width / 2;
  const hd = spec.depth / 2;
  const H = spec.wallHeight;
  const name = spec.name ?? 'house';
  const frontZ = spec.doorSide === '-z' ? cz - hd : cz + hd;
  const backZ = spec.doorSide === '-z' ? cz + hd : cz - hd;
  const doorAt = spec.width / 2 - 0.7; // centred door, 1.4 m wide

  // Front wall (along x) with the door.
  addWall(chunk, {
    name: `${name}:front`,
    start: [cx - hw, frontZ],
    axis: 'x',
    length: spec.width,
    height: H,
    thickness: WALL_T,
    tiles: spec.siding,
    opening: spec.doorDecal === true ? undefined : [doorAt, 1.4, 2.4],
  });
  if (spec.doorDecal === true) {
    const dz = frontZ + (spec.doorSide === '-z' ? -WALL_T / 2 - 0.03 : WALL_T / 2 + 0.03);
    chunk.add({
      name: `${name}:doorDecal`,
      size: [1.2, 2.2, 0.06],
      position: [cx, 1.1, dz],
      tiles: { sides: 'door' },
      uvScale: 2.2,
      surface: 'wood',
      noCollide: true,
    });
  }
  // Back wall, side walls.
  addWall(chunk, {
    name: `${name}:back`,
    start: [cx - hw, backZ],
    axis: 'x',
    length: spec.width,
    height: H,
    thickness: WALL_T,
    tiles: spec.siding,
  });
  addWall(chunk, {
    name: `${name}:left`,
    start: [cx - hw, cz - hd],
    axis: 'z',
    length: spec.depth,
    height: H,
    thickness: WALL_T,
    tiles: spec.siding,
  });
  addWall(chunk, {
    name: `${name}:right`,
    start: [cx + hw, cz - hd],
    axis: 'z',
    length: spec.depth,
    height: H,
    thickness: WALL_T,
    tiles: spec.siding,
  });

  // Floor slab and ceiling.
  addSlab(chunk, {
    name: `${name}:floor`,
    centre: [cx, 0.05, cz],
    size: [spec.width, 0.1, spec.depth],
    tiles: { sides: 'concrete', top: 'floorboards' },
    surface: 'wood',
    uvScale: 1.5,
  });
  addSlab(chunk, {
    name: `${name}:ceiling`,
    centre: [cx, H + 0.06, cz],
    size: [spec.width + WALL_T, 0.12, spec.depth + WALL_T],
    tiles: { sides: spec.siding, top: 'planks', bottom: 'plaster' },
    surface: 'wood',
    uvScale: 2,
  });

  // Stepped gable roof: two shingle slabs pitched over the x axis (ridge along x).
  const pitch = 0.55; // rad
  const run = hd + 0.4;
  const slabLen = run / Math.cos(pitch);
  const rise = run * Math.tan(pitch);
  for (const s of [-1, 1]) {
    addSlab(chunk, {
      name: `${name}:roof${s < 0 ? 'N' : 'S'}`,
      centre: [cx, H + 0.12 + rise / 2, cz + (s * run) / 2],
      size: [spec.width + 0.8, 0.16, slabLen],
      rotation: [-s * pitch, 0, 0],
      tiles: { sides: 'planks', top: 'shingles', bottom: 'planks' },
      surface: 'wood',
      uvScale: 1.5,
    });
  }
  // Gable ends: three stepped boxes of siding under each roof half.
  for (const x of [cx - hw + WALL_T / 2, cx + hw - WALL_T / 2]) {
    for (let step = 0; step < 3; step++) {
      const frac = 1 - (step + 0.5) / 3;
      const depth = spec.depth * frac;
      addSlab(chunk, {
        name: `${name}:gable`,
        centre: [x, H + 0.12 + (rise / 3) * (step + 0.5), cz],
        size: [WALL_T, rise / 3, depth],
        tiles: spec.siding,
        surface: 'stone',
      });
    }
  }

  // Windows: two on the front (either side of the door), one per side wall.
  const wz = frontZ + (spec.doorSide === '-z' ? -WALL_T / 2 - 0.04 : WALL_T / 2 + 0.04);
  addWindow(chunk, [cx - hw / 2, 1.6, wz], 'x');
  addWindow(chunk, [cx + hw / 2, 1.6, wz], 'x');
  addWindow(chunk, [cx - hw - WALL_T / 2 - 0.04, 1.6, cz], 'z');
  addWindow(chunk, [cx + hw + WALL_T / 2 + 0.04, 1.6, cz], 'z');

  return { doorCentre: [cx, 1.2, frontZ] };
}

/** Picket fence: posts every 1.5 m and two rails. */
export function addFence(
  chunk: Chunk,
  start: [number, number],
  axis: Axis,
  length: number,
  height = 1.0,
): void {
  const posts = Math.max(2, Math.round(length / 1.5) + 1);
  for (let i = 0; i < posts; i++) {
    const [x, z] = along(axis, start, (i / (posts - 1)) * length);
    chunk.add({
      name: 'fencePost',
      size: [0.1, height, 0.1],
      position: [x, height / 2, z],
      tiles: { sides: 'trim' },
      surface: 'wood',
      uvScale: 1,
    });
  }
  for (const y of [height * 0.4, height * 0.85]) {
    const [cx, cz] = along(axis, start, length / 2);
    chunk.add({
      name: 'fenceRail',
      size: axis === 'x' ? [length, 0.08, 0.05] : [0.05, 0.08, length],
      position: [cx, y, cz],
      tiles: { sides: 'trim' },
      surface: 'wood',
      uvScale: 2,
    });
  }
}

/** A tree: plank trunk, blocky canopy. Both climbable. */
export function addTree(chunk: Chunk, x: number, z: number, height = 5, canopy = 3): void {
  chunk.add({
    name: 'trunk',
    size: [0.4, height, 0.4],
    position: [x, height / 2, z],
    tiles: { sides: 'planks' },
    surface: 'wood',
    uvScale: 1.5,
    tint: 0x8a6a45,
  });
  chunk.add({
    name: 'canopy',
    size: [canopy, canopy * 0.8, canopy],
    position: [x, height + canopy * 0.3, z],
    tiles: { sides: 'grass' },
    surface: 'leaves',
    uvScale: 1.5,
    tint: 0x5d8b3a,
  });
  chunk.add({
    name: 'canopyTop',
    size: [canopy * 0.6, canopy * 0.5, canopy * 0.6],
    position: [x, height + canopy * 0.85, z],
    tiles: { sides: 'grass' },
    surface: 'leaves',
    uvScale: 1.5,
    tint: 0x6b9d45,
  });
}

export function addLampPost(chunk: Chunk, x: number, z: number, height = 4.5): void {
  chunk.add({
    name: 'lampPost',
    size: [0.16, height, 0.16],
    position: [x, height / 2, z],
    tiles: { sides: 'concrete' },
    surface: 'metal',
    uvScale: 1.5,
    tint: 0x4a4f55,
  });
  chunk.add({
    name: 'lampHead',
    size: [0.5, 0.25, 0.5],
    position: [x, height + 0.1, z],
    tiles: { sides: 'trim' },
    surface: 'metal',
    uvScale: 0.5,
    tint: 0xfff2c0,
  });
}

export function addCrates(chunk: Chunk, x: number, z: number, count = 3, size = 0.6): void {
  const offsets: [number, number, number][] = [
    [0, 0, 0],
    [size * 1.05, 0, 0],
    [size * 0.5, size, 0],
  ];
  for (let i = 0; i < Math.min(count, offsets.length); i++) {
    const [ox, oy, oz] = offsets[i];
    chunk.add({
      name: 'crate',
      size: [size, size, size],
      position: [x + ox, oy + size / 2, z + oz],
      tiles: { sides: 'planks' },
      surface: 'wood',
      uvScale: size,
    });
  }
}

export function addMailbox(chunk: Chunk, x: number, z: number): void {
  chunk.add({
    name: 'mailPost',
    size: [0.08, 1.0, 0.08],
    position: [x, 0.5, z],
    tiles: { sides: 'planks' },
    surface: 'wood',
    uvScale: 1,
  });
  chunk.add({
    name: 'mailbox',
    size: [0.22, 0.22, 0.45],
    position: [x, 1.1, z],
    tiles: { sides: 'concrete' },
    surface: 'metal',
    uvScale: 0.45,
    tint: 0x3b4a5c,
  });
}

/** Bus stop: shelter roof on two posts, bench, sign. Returns the stop centre. */
export function addBusStop(
  chunk: Chunk,
  x: number,
  z: number,
  facing: 1 | -1,
): [number, number, number] {
  for (const dx of [-1.4, 1.4]) {
    chunk.add({
      name: 'shelterPost',
      size: [0.12, 2.6, 0.12],
      position: [x + dx, 1.3, z],
      tiles: { sides: 'concrete' },
      surface: 'metal',
      uvScale: 1,
      tint: 0x4a4f55,
    });
  }
  chunk.add({
    name: 'shelterRoof',
    size: [3.2, 0.1, 2.4],
    position: [x, 2.65, z + facing * 0.6],
    tiles: { sides: 'trim', top: 'shingles', bottom: 'trim' },
    surface: 'metal',
    uvScale: 1.5,
  });
  chunk.add({
    name: 'shelterBack',
    size: [3.0, 1.6, 0.08],
    position: [x, 1.6, z - facing * 0.1],
    tiles: { sides: 'window' },
    surface: 'metal',
    uvScale: 1.6,
  });
  chunk.add({
    name: 'bench',
    size: [2.0, 0.08, 0.45],
    position: [x, 0.5, z + facing * 0.4],
    tiles: { sides: 'planks' },
    surface: 'wood',
    uvScale: 1,
  });
  for (const dx of [-0.8, 0.8]) {
    chunk.add({
      name: 'benchLeg',
      size: [0.08, 0.46, 0.4],
      position: [x + dx, 0.23, z + facing * 0.4],
      tiles: { sides: 'concrete' },
      surface: 'metal',
      uvScale: 0.5,
      tint: 0x4a4f55,
    });
  }
  chunk.add({
    name: 'signPost',
    size: [0.08, 2.4, 0.08],
    position: [x + 2.2, 1.2, z + facing * 1.0],
    tiles: { sides: 'concrete' },
    surface: 'metal',
    uvScale: 1,
    tint: 0x4a4f55,
  });
  chunk.add({
    name: 'sign',
    size: [0.5, 0.5, 0.05],
    position: [x + 2.2, 2.4, z + facing * 1.0],
    tiles: { sides: 'trim' },
    surface: 'metal',
    uvScale: 0.5,
    tint: 0x2f6fd6,
  });
  return [x, 0, z + facing * 0.6];
}

/** Steps down from a porch: `count` risers along -axis direction. */
export function addSteps(
  chunk: Chunk,
  start: [number, number, number],
  axis: Axis,
  dir: 1 | -1,
  width: number,
  count = 3,
  rise = 0.18,
  tread = 0.32,
): void {
  for (let i = 0; i < count; i++) {
    const top = start[1] - rise * i;
    const [x, z] = along(axis, [start[0], start[2]], dir * (tread * (i + 0.5)));
    chunk.add({
      name: 'step',
      size: axis === 'x' ? [tread, top, width] : [width, top, tread],
      position: [x, top / 2, z],
      tiles: { sides: 'concrete' },
      surface: 'stone',
      uvScale: 1,
    });
  }
}
