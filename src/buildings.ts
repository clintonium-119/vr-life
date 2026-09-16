import { Box3, Vector3 } from 'three';
import type { TileName } from './atlas';
import { addSlab, addWall, type Axis } from './builders';
import type { Chunk } from './chunk';

// The building kit every district uses. Exterior parts (walls, ground slab,
// roof, escapes) go to the district chunk; everything inside (upper floors,
// ramps or atrium lattice, furniture) goes to an interior chunk that is only
// drawn when the player is inside or at the door. Interior rules by default:
// 4 m storeys, 1.6 m+ doors, open floors, climbable structure.

export type Side = '+z' | '-z' | '+x' | '-x';

export interface BuildingSpec {
  centre: [number, number];
  width: number;
  depth: number;
  storeys: number;
  storeyHeight?: number;
  tiles: TileName;
  /** One door per side at most: fraction along the wall, width, height. */
  doors: { side: Side; at?: number; width?: number; height?: number }[];
  windows?: boolean;
  stairs?: 'ramp' | 'atrium' | 'none';
  base?: number;
  name?: string;
}

export interface BuildingResult {
  roofY: number;
  roofBounds: Box3;
  footprint: Box3;
  interiorBounds: Box3;
  doorCentres: [number, number, number][];
}

const WALL_T = 0.3;
const PARAPET_H = 0.9;
const RAMP_WIDTH = 2.0;

function sideInfo(spec: BuildingSpec, side: Side) {
  const [cx, cz] = spec.centre;
  const hw = spec.width / 2;
  const hd = spec.depth / 2;
  switch (side) {
    case '+z':
      return {
        start: [cx - hw, cz + hd] as [number, number],
        axis: 'x' as Axis,
        length: spec.width,
        out: [0, 1],
      };
    case '-z':
      return {
        start: [cx - hw, cz - hd] as [number, number],
        axis: 'x' as Axis,
        length: spec.width,
        out: [0, -1],
      };
    case '+x':
      return {
        start: [cx + hw, cz - hd] as [number, number],
        axis: 'z' as Axis,
        length: spec.depth,
        out: [1, 0],
      };
    default:
      return {
        start: [cx - hw, cz - hd] as [number, number],
        axis: 'z' as Axis,
        length: spec.depth,
        out: [-1, 0],
      };
  }
}

export function addBuilding(exterior: Chunk, interior: Chunk, spec: BuildingSpec): BuildingResult {
  const [cx, cz] = spec.centre;
  const hw = spec.width / 2;
  const hd = spec.depth / 2;
  const B = spec.base ?? 0;
  const SH = spec.storeyHeight ?? 4;
  const H = spec.storeys * SH;
  const name = spec.name ?? 'building';
  const doorCentres: [number, number, number][] = [];

  // Walls, one per side, full height; a door opening on the ground storey.
  for (const side of ['+z', '-z', '+x', '-x'] as Side[]) {
    const info = sideInfo(spec, side);
    const door = spec.doors.find((d) => d.side === side);
    const dw = door?.width ?? 1.8;
    const dh = door?.height ?? 2.8;
    const at = door
      ? Math.min(info.length - dw - 0.3, Math.max(0.3, (door.at ?? 0.5) * info.length - dw / 2))
      : 0;
    addWall(exterior, {
      name: `${name}:${side}`,
      start: info.start,
      axis: info.axis,
      length: info.length,
      height: H,
      thickness: WALL_T,
      base: B,
      tiles: spec.tiles,
      opening: door ? [at, dw, dh] : undefined,
    });
    if (door) {
      const dx = info.axis === 'x' ? info.start[0] + at + dw / 2 : info.start[0];
      const dz = info.axis === 'z' ? info.start[1] + at + dw / 2 : info.start[1];
      doorCentres.push([dx, B + dh / 2, dz]);
    }
    // Window strips: one decal per storey per side (cheap, reads as glazing).
    if (spec.windows !== false) {
      for (let s = 0; s < spec.storeys; s++) {
        const y = B + s * SH + 1.9;
        const len = info.length - 1.2;
        const [mx, mz] =
          info.axis === 'x'
            ? [info.start[0] + info.length / 2, info.start[1] + info.out[1] * (WALL_T / 2 + 0.03)]
            : [info.start[0] + info.out[0] * (WALL_T / 2 + 0.03), info.start[1] + info.length / 2];
        exterior.add({
          name: `${name}:glazing`,
          size: info.axis === 'x' ? [len, 1.4, 0.05] : [0.05, 1.4, len],
          position: [mx, y, mz],
          tiles: { sides: 'window' },
          uvScale: 1.4,
          surface: 'metal',
          noCollide: true,
        });
      }
    }
  }

  // Ground slab (exterior: seen through the door) and upper floors (interior).
  addSlab(exterior, {
    name: `${name}:ground`,
    centre: [cx, B + 0.05, cz],
    size: [spec.width, 0.1, spec.depth],
    tiles: 'concrete',
    surface: 'stone',
    uvScale: 2,
  });
  const stairs = spec.stairs ?? 'ramp';
  const holeW = stairs === 'atrium' ? 6 : RAMP_WIDTH + 0.4;
  const holeD = stairs === 'atrium' ? 6 : Math.min(spec.depth - 2 * WALL_T - 1, 6);
  // Hole position: atrium centred; ramp hole along the +x interior wall.
  const holeX = stairs === 'atrium' ? cx : cx + hw - WALL_T - holeW / 2 - 0.3;
  const holeZ = cz;
  for (let s = 1; s < spec.storeys; s++) {
    const y = B + s * SH;
    if (stairs === 'none') {
      addSlab(interior, {
        name: `${name}:floor${s}`,
        centre: [cx, y - 0.1, cz],
        size: [spec.width - 2 * WALL_T, 0.2, spec.depth - 2 * WALL_T],
        tiles: { sides: 'concrete', top: 'floorboards', bottom: 'plaster' },
        surface: 'wood',
        uvScale: 2,
      });
      continue;
    }
    // Floor with a hole: four slabs around it.
    const inW = spec.width - 2 * WALL_T;
    const inD = spec.depth - 2 * WALL_T;
    const x0 = cx - inW / 2;
    const x1 = cx + inW / 2;
    const z0 = cz - inD / 2;
    const z1 = cz + inD / 2;
    const hx0 = holeX - holeW / 2;
    const hx1 = holeX + holeW / 2;
    const hz0 = holeZ - holeD / 2;
    const hz1 = holeZ + holeD / 2;
    const pieces: [number, number, number, number][] = [
      [x0, z0, hx0, z1], // west strip
      [hx1, z0, x1, z1], // east strip
      [hx0, z0, hx1, hz0], // south between
      [hx0, hz1, hx1, z1], // north between
    ];
    for (const [ax, az, bx, bz] of pieces) {
      if (bx - ax < 0.05 || bz - az < 0.05) continue;
      addSlab(interior, {
        name: `${name}:floor${s}`,
        centre: [(ax + bx) / 2, y - 0.1, (az + bz) / 2],
        size: [bx - ax, 0.2, bz - az],
        tiles: { sides: 'concrete', top: 'floorboards', bottom: 'plaster' },
        surface: 'wood',
        uvScale: 2,
      });
    }
  }

  // Vertical circulation.
  if (stairs === 'ramp') {
    // One sloped slab per storey inside the hole footprint, alternating direction, plus a landing.
    for (let s = 0; s < spec.storeys - 1; s++) {
      const y0 = B + s * SH;
      const run = holeD - 1.2;
      const dir = s % 2 === 0 ? 1 : -1;
      const slope = Math.atan2(SH, run);
      const len = Math.hypot(SH, run);
      addSlab(interior, {
        name: `${name}:ramp${s}`,
        centre: [holeX, y0 + SH / 2, holeZ + dir * (run / 2 - holeD / 2 + 0.6) * 0 + dir * 0],
        size: [RAMP_WIDTH, 0.16, len],
        rotation: [-dir * slope, 0, 0],
        tiles: { sides: 'planks', top: 'planks' },
        surface: 'wood',
        uvScale: 1.5,
      });
    }
  } else if (stairs === 'atrium') {
    // Climbing lattice: four columns at the hole corners and beams every 1.2 m.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addSlab(interior, {
          name: `${name}:column`,
          centre: [holeX + sx * 2.8, B + H / 2, holeZ + sz * 2.8],
          size: [0.3, H, 0.3],
          tiles: 'metal',
          surface: 'metal',
          uvScale: 1.5,
        });
      }
    }
    for (let y = B + 1.2; y < B + H - 0.5; y += 1.2) {
      const along = Math.round(y / 1.2) % 2 === 0;
      for (const s of [-1, 1]) {
        addSlab(interior, {
          name: `${name}:beam`,
          centre: along ? [holeX, y, holeZ + s * 2.8] : [holeX + s * 2.8, y, holeZ],
          size: along ? [5.9, 0.2, 0.2] : [0.2, 0.2, 5.9],
          tiles: 'metal',
          surface: 'metal',
          uvScale: 1.5,
        });
      }
    }
  }

  // Flat roof with parapet and a hatch box; roof access is via the hole (atrium/ramp) below the hatch.
  const roofY = B + H + 0.2;
  addSlab(exterior, {
    name: `${name}:roof`,
    centre: [cx, B + H + 0.1, cz],
    size: [spec.width + WALL_T, 0.2, spec.depth + WALL_T],
    tiles: { sides: 'concrete', top: 'gravel', bottom: 'plaster' },
    surface: 'stone',
    uvScale: 2,
  });
  for (const side of ['+z', '-z', '+x', '-x'] as Side[]) {
    const info = sideInfo(spec, side);
    addWall(exterior, {
      name: `${name}:parapet`,
      start: info.start,
      axis: info.axis,
      length: info.length,
      height: PARAPET_H,
      thickness: 0.25,
      base: roofY,
      tiles: spec.tiles,
    });
  }
  addSlab(exterior, {
    name: `${name}:hatch`,
    centre: [holeX, roofY + 0.5, holeZ + holeD / 2 + 0.8],
    size: [1.2, 1.0, 1.2],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 1,
  });

  const footprint = new Box3(
    new Vector3(cx - hw, B, cz - hd),
    new Vector3(cx + hw, roofY, cz + hd),
  );
  return {
    roofY,
    roofBounds: new Box3(
      new Vector3(cx - hw, roofY, cz - hd),
      new Vector3(cx + hw, roofY + PARAPET_H, cz + hd),
    ),
    footprint,
    interiorBounds: footprint.clone(),
    doorCentres,
  };
}

// ---- climbable structure -----------------------------------------------------

export function addFireEscape(
  chunk: Chunk,
  x: number,
  z: number,
  side: Side,
  storeys: number,
  storeyHeight = 4,
  base = 0,
): void {
  const out = side === '+z' ? [0, 1] : side === '-z' ? [0, -1] : side === '+x' ? [1, 0] : [-1, 0];
  for (let s = 1; s <= storeys; s++) {
    const y = base + s * storeyHeight - 0.2;
    addSlab(chunk, {
      name: 'escapePlatform',
      centre: [x + out[0] * 0.7, y, z + out[1] * 0.7],
      size: out[0] !== 0 ? [1.4, 0.1, 2.4] : [2.4, 0.1, 1.4],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 1,
    });
    addSlab(chunk, {
      name: 'escapeRail',
      centre: [x + out[0] * 1.35, y + 0.5, z + out[1] * 1.35],
      size: out[0] !== 0 ? [0.08, 1.0, 2.4] : [2.4, 1.0, 0.08],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 1,
    });
  }
  addLadder(chunk, x + out[0] * 1.2, z + out[1] * 1.2, base, storeys * storeyHeight, side);
}

/** A ladder: one thin climbable box with rungs implied by the metal tile. */
export function addLadder(
  chunk: Chunk,
  x: number,
  z: number,
  base: number,
  height: number,
  side: Side,
): void {
  const alongX = side === '+z' || side === '-z';
  addSlab(chunk, {
    name: 'ladder',
    centre: [x, base + height / 2, z],
    size: alongX ? [0.5, height, 0.12] : [0.12, height, 0.5],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 0.5,
  });
}

export function addDrainpipe(
  chunk: Chunk,
  x: number,
  z: number,
  base: number,
  height: number,
): void {
  addSlab(chunk, {
    name: 'drainpipe',
    centre: [x, base + height / 2, z],
    size: [0.14, height, 0.14],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 1,
    tint: 0x8a9096,
  });
}

export function addPowerPole(chunk: Chunk, x: number, z: number, height = 8): void {
  addSlab(chunk, {
    name: 'powerPole',
    centre: [x, height / 2, z],
    size: [0.3, height, 0.3],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 2,
    tint: 0x7a6248,
  });
  addSlab(chunk, {
    name: 'crossarm',
    centre: [x, height - 0.6, z],
    size: [2.2, 0.15, 0.15],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1,
    tint: 0x7a6248,
  });
}

export function addSign(
  chunk: Chunk,
  centre: [number, number, number],
  size: [number, number, number],
  tint: number,
): void {
  addSlab(chunk, {
    name: 'sign',
    centre,
    size,
    tiles: 'trim',
    surface: 'metal',
    uvScale: Math.max(size[0], size[1]),
    tint,
  });
}

// ---- furniture kits ------------------------------------------------------------

export function addDeskRows(
  chunk: Chunk,
  origin: [number, number, number],
  rows: number,
  cols: number,
  axis: Axis = 'x',
): void {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = axis === 'x' ? c * 1.6 : r * 1.8;
      const dz = axis === 'x' ? r * 1.8 : c * 1.6;
      addSlab(chunk, {
        name: 'desk',
        centre: [origin[0] + dx, origin[1] + 0.375, origin[2] + dz],
        size: [1.2, 0.75, 0.6],
        tiles: 'planks',
        surface: 'wood',
        uvScale: 1.2,
      });
    }
  }
}

export function addShelfRun(
  chunk: Chunk,
  start: [number, number, number],
  axis: Axis,
  length: number,
  tiers = 4,
  tierHeight = 0.5,
): void {
  for (let t = 1; t <= tiers; t++) {
    const y = start[1] + t * tierHeight;
    addSlab(chunk, {
      name: 'shelf',
      centre: [
        axis === 'x' ? start[0] + length / 2 : start[0],
        y,
        axis === 'z' ? start[2] + length / 2 : start[2],
      ],
      size: axis === 'x' ? [length, 0.06, 0.6] : [0.6, 0.06, length],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 1.5,
    });
  }
  for (const end of [0, length]) {
    addSlab(chunk, {
      name: 'shelfEnd',
      centre: [
        axis === 'x' ? start[0] + end : start[0],
        start[1] + (tiers * tierHeight) / 2,
        axis === 'z' ? start[2] + end : start[2],
      ],
      size: axis === 'x' ? [0.06, tiers * tierHeight, 0.6] : [0.6, tiers * tierHeight, 0.06],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 1,
    });
  }
}

export function addLockers(
  chunk: Chunk,
  start: [number, number, number],
  axis: Axis,
  length: number,
): void {
  const segs = Math.max(1, Math.round(length / 4));
  for (let i = 0; i < segs; i++) {
    const segLen = length / segs;
    addSlab(chunk, {
      name: 'lockers',
      centre: [
        axis === 'x' ? start[0] + segLen * (i + 0.5) : start[0],
        start[1] + 0.95,
        axis === 'z' ? start[2] + segLen * (i + 0.5) : start[2],
      ],
      size: axis === 'x' ? [segLen, 1.9, 0.45] : [0.45, 1.9, segLen],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 1,
      tint: 0x5b7f9e,
    });
  }
}

export function addBeds(
  chunk: Chunk,
  start: [number, number, number],
  count: number,
  axis: Axis = 'x',
  spacing = 2.4,
): void {
  for (let i = 0; i < count; i++) {
    const x = axis === 'x' ? start[0] + i * spacing : start[0];
    const z = axis === 'z' ? start[2] + i * spacing : start[2];
    addSlab(chunk, {
      name: 'bed',
      centre: [x, start[1] + 0.3, z],
      size: [1.0, 0.6, 2.0],
      tiles: { sides: 'metal', top: 'trim' },
      surface: 'leaves',
      uvScale: 1,
    });
  }
}

export function addCubicles(
  chunk: Chunk,
  origin: [number, number, number],
  rows: number,
  cols: number,
): void {
  const cell = 2.4;
  for (let r = 0; r <= rows; r++) {
    addSlab(chunk, {
      name: 'cubicleWall',
      centre: [origin[0] + (cols * cell) / 2, origin[1] + 0.7, origin[2] + r * cell],
      size: [cols * cell, 1.4, 0.08],
      tiles: 'trim',
      surface: 'wood',
      uvScale: 1.4,
      tint: 0xb9c0c8,
    });
  }
  for (let c = 0; c <= cols; c++) {
    addSlab(chunk, {
      name: 'cubicleWall',
      centre: [origin[0] + c * cell, origin[1] + 0.7, origin[2] + (rows * cell) / 2],
      size: [0.08, 1.4, rows * cell],
      tiles: 'trim',
      surface: 'wood',
      uvScale: 1.4,
      tint: 0xb9c0c8,
    });
  }
  addDeskRows(chunk, [origin[0] + 1.2, origin[1], origin[2] + 1.2], rows, cols, 'x');
}

export function addCounter(
  chunk: Chunk,
  centre: [number, number, number],
  length: number,
  axis: Axis = 'x',
): void {
  addSlab(chunk, {
    name: 'counter',
    centre: [centre[0], centre[1] + 0.5, centre[2]],
    size: axis === 'x' ? [length, 1.0, 0.7] : [0.7, 1.0, length],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1.5,
  });
}

export function addGymBeams(
  chunk: Chunk,
  centre: [number, number, number],
  span: number,
  depth: number,
  height: number,
): void {
  const count = Math.max(2, Math.round(depth / 4));
  for (let i = 0; i < count; i++) {
    const z = centre[2] - depth / 2 + (depth / (count - 1)) * i;
    addSlab(chunk, {
      name: 'gymBeam',
      centre: [centre[0], height, z],
      size: [span, 0.3, 0.3],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 2,
    });
  }
}
