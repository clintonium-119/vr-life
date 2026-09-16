import { Box3, Matrix4, Vector3 } from 'three';
import { addBuilding, addDrainpipe, addLadder, addSign } from './buildings';
import { addSlab, addWall } from './builders';
import { Chunk } from './chunk';
import { makeBoxCollider, type BoxCollider, type CollisionWorld } from './collision';
import { tuning, type MovementTuning } from './movementTuning';
import { emptyDistrict, type BuiltDistrict } from './townPlan';

// The prison: a place, designed around climbing out. Three open-top cells
// of bar beams inside a 7 m hall, a ledge and hatch above, a yard enclosed
// by a 5 m wall with staggered footholds and a drainpipe, and a gate to the
// avenue. Cell bars and the gate are dynamic colliders so the soft release
// can open them.

export const PRISON_CENTRE: [number, number] = [57, -138];
const HALL_W = 26;
const HALL_D = 18;
const HALL_H = 7;
const CELL = 3;
export const BAR_HEIGHT = 2.6;
const YARD_D = 14;
export const YARD_WALL_H = 5;
const FOOTHOLD_RISE = 1.2;

export interface PrisonDistrict extends BuiltDistrict {
  cellBars: BoxCollider[];
  gate: BoxCollider[];
  cellCentre: Vector3;
  yardBounds: Box3;
  /** Whole prison (hall + yard) for "inside" checks. */
  prisonBounds: Box3;
}

function barCollider(id: string, x: number, y: number, z: number, h: number): BoxCollider {
  return makeBoxCollider(
    id,
    'metal',
    new Box3(new Vector3(-0.04, -h / 2, -0.04), new Vector3(0.04, h / 2, 0.04)),
    new Matrix4().setPosition(x, y, z),
  );
}

export function buildPrison(): PrisonDistrict {
  const d = emptyDistrict('prison');
  const [px, pz] = PRISON_CENTRE;
  const interior = new Chunk('prisonInterior');
  const b = addBuilding(d.chunk, interior, {
    centre: [px, pz],
    width: HALL_W,
    depth: HALL_D,
    storeys: 1,
    storeyHeight: HALL_H,
    tiles: 'concrete',
    doors: [{ side: '+z', width: 2.4, height: 3 }],
    windows: false,
    stairs: 'none',
    name: 'prison',
  });
  // Hall ledge along the back wall at 4.5 m and a roof hatch above it: the climb target.
  addSlab(interior, {
    name: 'prisonLedge',
    centre: [px, 4.5, pz - HALL_D / 2 + 1.2],
    size: [HALL_W - 1, 0.2, 2],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 2,
  });
  addLadder(interior, px + HALL_W / 2 - 0.6, pz - HALL_D / 2 + 2.3, 4.6, HALL_H - 4.8, '-z');
  // Three cells along the west side: solid low plinth walls plus bar beams (dynamic).
  const cellBars: BoxCollider[] = [];
  const cellX0 = px - HALL_W / 2 + 1.5;
  const cellZ = pz - 2;
  for (let c = 0; c < 3; c++) {
    const cx = cellX0 + CELL / 2 + c * (CELL + 0.5);
    // Visual bars as slabs (in the interior chunk) and colliders per bar in the dynamic list.
    for (const [x0, z0, x1, z1] of [
      [cx - CELL / 2, cellZ + CELL / 2, cx + CELL / 2, cellZ + CELL / 2], // front
      [cx + CELL / 2, cellZ - CELL / 2, cx + CELL / 2, cellZ + CELL / 2], // east side
      [cx - CELL / 2, cellZ - CELL / 2, cx - CELL / 2, cellZ + CELL / 2], // west side
    ]) {
      const steps = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.3);
      for (let i = 0; i <= steps; i++) {
        const x = x0 + ((x1 - x0) * i) / steps;
        const z = z0 + ((z1 - z0) * i) / steps;
        addSlab(interior, {
          name: 'cellBar',
          centre: [x, BAR_HEIGHT / 2, z],
          size: [0.08, BAR_HEIGHT, 0.08],
          tiles: 'metal',
          surface: 'metal',
          uvScale: 1,
          noCollide: true,
        });
        cellBars.push(barCollider(`cell${c}:bar${i}`, x, BAR_HEIGHT / 2, z, BAR_HEIGHT));
      }
    }
    addSlab(interior, {
      name: 'bunk',
      centre: [cx, 0.3, cellZ - 1],
      size: [1.8, 0.4, 0.8],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 1,
      tint: 0x5b6470,
    });
  }
  const cellCentre = new Vector3(cellX0 + CELL / 2, 0, cellZ);
  d.interiors.push({ chunk: interior, bounds: b.interiorBounds });
  d.roofs.push({ id: 'prison', bounds: b.roofBounds, y: b.roofY });
  addSign(d.chunk, [px, HALL_H + 0.9, pz + HALL_D / 2 + 0.3], [8, 1.2, 0.2], 0x4a5568);

  // Yard on the +z side, enclosed by a 5 m wall with staggered inside footholds.
  const yz0 = pz + HALL_D / 2;
  const yz1 = yz0 + YARD_D;
  const yx0 = px - HALL_W / 2;
  const yx1 = px + HALL_W / 2;
  addSlab(d.chunk, {
    name: 'yard',
    centre: [px, 0.02, (yz0 + yz1) / 2],
    size: [HALL_W, 0.04, YARD_D],
    tiles: 'concrete',
    surface: 'stone',
    uvScale: 3,
  });
  const wallT = 0.4;
  addWall(d.chunk, {
    name: 'yardWallW',
    start: [yx0, yz0],
    axis: 'z',
    length: YARD_D,
    height: YARD_WALL_H,
    thickness: wallT,
    tiles: 'concrete',
  });
  addWall(d.chunk, {
    name: 'yardWallE',
    start: [yx1, yz0],
    axis: 'z',
    length: YARD_D,
    height: YARD_WALL_H,
    thickness: wallT,
    tiles: 'concrete',
  });
  // North yard wall (toward the avenue) has the gate opening in the middle.
  addWall(d.chunk, {
    name: 'yardWallN',
    start: [yx0, yz1],
    axis: 'x',
    length: HALL_W,
    height: YARD_WALL_H,
    thickness: wallT,
    tiles: 'concrete',
    opening: [HALL_W / 2 - 2, 4, 4],
  });
  // Footholds: staggered blocks up the east wall inside the yard.
  for (let i = 1; i * FOOTHOLD_RISE < YARD_WALL_H; i++) {
    const y = i * FOOTHOLD_RISE;
    const z = yz0 + 3 + (i % 2) * 1.4;
    addSlab(d.chunk, {
      name: 'foothold',
      centre: [yx1 - wallT / 2 - 0.25, y, z],
      size: [0.5, 0.25, 0.6],
      tiles: 'concrete',
      surface: 'stone',
      uvScale: 0.6,
    });
  }
  addDrainpipe(d.chunk, yx0 + wallT / 2 + 0.2, yz1 - 0.6, 0, YARD_WALL_H);
  d.climbAids.push('prison:footholds', 'prison:drainpipe', 'prison:hallLadder');
  // Gate: two panels (dynamic colliders, visual slabs non-colliding).
  const gate: BoxCollider[] = [];
  for (const side of [-1, 1]) {
    const gx = px + side * 1;
    addSlab(d.chunk, {
      name: 'gatePanel',
      centre: [gx, 2, yz1],
      size: [2, 4, 0.15],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 2,
      noCollide: true,
      tint: 0x3d4653,
    });
    gate.push(
      makeBoxCollider(
        `prisonGate${side}`,
        'metal',
        new Box3(new Vector3(-1, -2, -0.08), new Vector3(1, 2, 0.08)),
        new Matrix4().setPosition(gx, 2, yz1),
      ),
    );
  }
  d.bounds.set(
    new Vector3(yx0 - 2, 0, pz - HALL_D / 2 - 2),
    new Vector3(yx1 + 2, HALL_H + 2, yz1 + 2),
  );
  d.landmarks.prison = [px, 0, yz1 + 3];
  return {
    ...d,
    cellBars,
    gate,
    cellCentre,
    yardBounds: new Box3(new Vector3(yx0, 0, yz0), new Vector3(yx1, YARD_WALL_H, yz1)),
    prisonBounds: new Box3(
      new Vector3(yx0 - 1, 0, pz - HALL_D / 2 - 1),
      new Vector3(yx1 + 1, HALL_H + 1, yz1 + 1),
    ),
  };
}

/** Time inside the prison; opens everything after the soft release. */
export class PrisonState {
  inside = false;
  timer = 0;
  released = false;

  constructor(private readonly t: MovementTuning = tuning) {}

  /** Locked up: bars close, the clock starts. */
  enter(): void {
    this.inside = true;
    this.timer = 0;
    this.released = false;
  }

  /** Left the prison bounds. */
  leave(): void {
    this.inside = false;
  }

  /** Returns true on the frame the release happens. */
  tick(dt: number): boolean {
    if (!this.inside || this.released) return false;
    this.timer += dt;
    if (this.timer >= this.t.prisonReleaseS) {
      this.released = true;
      return true;
    }
    return false;
  }
}

/** Close the cell bars and gate (arrest) or open them (release / escape). */
export function setPrisonLocked(
  world: CollisionWorld,
  prison: PrisonDistrict,
  locked: boolean,
): void {
  const all = [...prison.cellBars, ...prison.gate];
  world.removeDynamic(...all);
  if (locked) world.addDynamic(...all);
}
