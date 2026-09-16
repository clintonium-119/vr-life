import { Vector3 } from 'three';
import {
  addBuilding,
  addDeskRows,
  addDrainpipe,
  addGymBeams,
  addLockers,
  addShelfRun,
  addSign,
} from './buildings';
import { addSlab, addWall } from './builders';
import { Chunk } from './chunk';
import { PLACES, emptyDistrict, type BuiltDistrict } from './townPlan';

// The school: a two-storey block with a wide central hallway lined with
// lockers, three classrooms opening onto it, an attached gym hall, and the
// bus drop-off outside on the avenue.

/** School block centre z: front wall at −24, the drop-off and spawn in front. */
export const SCHOOL_BLOCK_Z = -34;
export const CLASSROOM_W = 10;
export const CLASSROOM_D = 8;

export function buildSchool(): BuiltDistrict {
  const d = emptyDistrict('school');
  const sx = PLACES.school[0];
  const sz = SCHOOL_BLOCK_Z; // block centre (the place is the spawn in front of it)
  const W = 44;
  const D = 20;

  const int = new Chunk('schoolInterior');
  const b = addBuilding(d.chunk, int, {
    centre: [sx, sz],
    width: W,
    depth: D,
    storeys: 2,
    storeyHeight: 4,
    tiles: 'brick',
    doors: [{ side: '+z', width: 3, height: 3 }],
    stairs: 'ramp',
    name: 'school',
  });

  // Ground floor: hallway along x through the middle (z from sz-2 to sz+2 is
  // open), classrooms on the -z side behind partition walls with 1.8 m doors.
  const hallZ0 = sz - 2;
  const partZ = hallZ0; // partition line between hallway and classrooms
  const roomZ = sz - 2 - CLASSROOM_D / 2; // classroom centre z
  for (let i = 0; i < 3; i++) {
    const rx = sx - 15 + i * 13; // classroom centres at -15, -2, +11
    // Partition facing the hallway with a door.
    addWall(int, {
      name: `class${i + 1}:front`,
      start: [rx - CLASSROOM_W / 2, partZ],
      axis: 'x',
      length: CLASSROOM_W,
      height: 4,
      thickness: 0.15,
      tiles: 'plaster',
      opening: [CLASSROOM_W / 2 - 0.9, 1.8, 2.6],
    });
    // Side walls between classrooms.
    addWall(int, {
      name: `class${i + 1}:side`,
      start: [rx + CLASSROOM_W / 2, roomZ - CLASSROOM_D / 2],
      axis: 'z',
      length: CLASSROOM_D,
      height: 4,
      thickness: 0.15,
      tiles: 'plaster',
    });
    addDeskRows(int, [rx - 3.2, 0, roomZ - 2.4], 3, 3);
    addSlab(int, {
      name: 'teacherDesk',
      centre: [rx, 0.4, roomZ + 3],
      size: [1.8, 0.8, 0.8],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 1,
    });
    addShelfRun(
      int,
      [rx - CLASSROOM_W / 2 + 0.4, 0, roomZ - CLASSROOM_D / 2 + 0.5],
      'z',
      CLASSROOM_D - 1,
      6,
      0.6,
    );
    d.landmarks[`classroom${i + 1}`] = [rx, 0, roomZ];
  }
  // Hallway lockers on both sides.
  // Lockers line the +z side of the hallway and the back wall (the -z side
  // is the classroom doors).
  addLockers(int, [sx - 20, 0, sz + 2.2], 'x', 40);
  addLockers(int, [sx - 20, 0, sz + 9.5], 'x', 40);
  d.landmarks.hallway = [sx, 0, sz];

  // Gym: attached at the east end, one tall open hall with beams, a hoop and a goal.
  const gymInt = new Chunk('gymInterior');
  const gx = PLACES.gym[0];
  const gz = sz;
  const g = addBuilding(d.chunk, gymInt, {
    centre: [gx, gz],
    width: 24,
    depth: 14,
    storeys: 1,
    storeyHeight: 8,
    tiles: 'concrete',
    doors: [
      { side: '-x', width: 3, height: 3 },
      { side: '+z', width: 2.4 },
    ],
    windows: false,
    stairs: 'none',
    name: 'gym',
  });
  addGymBeams(gymInt, [gx, 0, gz], 23, 13, 6.5);
  // Hoop placeholder: backboard + pole at the east end; goal frame at the west end.
  addSlab(gymInt, {
    name: 'hoopPole',
    centre: [gx + 10, 1.75, gz],
    size: [0.15, 3.5, 0.15],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 1,
  });
  addSlab(gymInt, {
    name: 'backboard',
    centre: [gx + 9.6, 3.3, gz],
    size: [0.08, 1.05, 1.8],
    tiles: 'trim',
    surface: 'metal',
    uvScale: 1,
  });
  addSlab(gymInt, {
    name: 'goalBar',
    centre: [gx - 9.5, 2.44, gz],
    size: [0.12, 0.12, 7.3],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 1,
  });
  for (const s of [-1, 1])
    addSlab(gymInt, {
      name: 'goalPost',
      centre: [gx - 9.5, 1.22, gz + s * 3.66],
      size: [0.12, 2.44, 0.12],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 1,
    });
  d.interiors.push({ chunk: int, bounds: b.interiorBounds });
  d.interiors.push({ chunk: gymInt, bounds: g.interiorBounds });
  d.roofs.push({ id: 'school', bounds: b.roofBounds, y: b.roofY });
  d.roofs.push({ id: 'gym', bounds: g.roofBounds, y: g.roofY });
  d.landmarks.gym = [gx, 0, gz];
  addDrainpipe(d.chunk, sx - 22.3, sz + 8, 0, 8);
  addDrainpipe(d.chunk, gx + 12.3, gz - 5, 0, 8);
  d.climbAids.push('school:drainpipe', 'gym:drainpipe');

  // Drop-off: a bus loop slab off the avenue with a sign and a shelter-like canopy.
  const dz = PLACES.schoolDropOff[2];
  addSlab(d.chunk, {
    name: 'dropOff',
    centre: [sx, 0.005, dz + 3],
    size: [30, 0.01, 6],
    tiles: 'asphalt',
    surface: 'stone',
    uvScale: 4,
  });
  addSign(d.chunk, [sx, 3.2, dz - 6], [9, 1.2, 0.2], 0xf6ad55);
  for (const px of [sx - 4, sx + 4])
    addSlab(d.chunk, {
      name: 'canopyPost',
      centre: [px, 1.6, dz + 1],
      size: [0.15, 3.2, 0.15],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 1,
    });
  addSlab(d.chunk, {
    name: 'canopy',
    centre: [sx, 3.25, dz + 1],
    size: [10, 0.1, 3],
    tiles: { sides: 'trim', top: 'shingles' },
    surface: 'metal',
    uvScale: 1.5,
  });
  d.landmarks.dropOff = [sx, 0, dz];

  d.bounds.set(new Vector3(110, 0, -50), new Vector3(195, 12, -12));
  return d;
}
