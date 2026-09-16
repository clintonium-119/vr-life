import { Vector3 } from 'three';
import {
  addBeds,
  addBuilding,
  addCounter,
  addDrainpipe,
  addFireEscape,
  addLadder,
  addSign,
} from './buildings';
import { addSlab, addWall } from './builders';
import { Chunk } from './chunk';
import { PLACES, emptyDistrict, type BuiltDistrict } from './townPlan';

// Civic district: police station (two storeys, front desk, a cell block of
// bar beams), fire department (a tall engine bay with two big doors and two
// poles from the upper floor), and the hospital (largest footprint, three
// storeys, reception, wards, a helipad on the roof as a peak).

export function buildCivic(): BuiltDistrict {
  const d = emptyDistrict('civic');

  // Police.
  const policeInt = new Chunk('policeInterior');
  const p = addBuilding(d.chunk, policeInt, {
    centre: [PLACES.police[0], PLACES.police[2] - 9],
    width: 18,
    depth: 14,
    storeys: 2,
    tiles: 'brick',
    doors: [{ side: '+z', width: 2 }],
    stairs: 'ramp',
    name: 'police',
  });
  addCounter(policeInt, [PLACES.police[0] - 3, 0, PLACES.police[2] - 5], 5);
  // Cell block: three cells of bar beams along the back wall.
  for (let i = 0; i < 3; i++) {
    const x = PLACES.police[0] - 7 + i * 4;
    for (let b = 0; b < 4; b++)
      addSlab(policeInt, {
        name: 'cellBar',
        centre: [x + b * 0.9, 1.6, PLACES.police[2] - 12],
        size: [0.08, 3.2, 0.08],
        tiles: 'metal',
        surface: 'metal',
        uvScale: 1,
      });
  }
  addSign(d.chunk, [PLACES.police[0], 8.9, PLACES.police[2] - 1.8], [7, 1.2, 0.2], 0x3182ce);
  addDrainpipe(d.chunk, PLACES.police[0] + 9.3, PLACES.police[2] - 3, 0, 8);
  d.climbAids.push('police:drainpipe');
  d.interiors.push({ chunk: policeInt, bounds: p.interiorBounds });
  d.roofs.push({ id: 'police', bounds: p.roofBounds, y: p.roofY });

  // Fire department: engine bay 8 m tall with two 4 × 5 m doors, upper floor with poles.
  const fireInt = new Chunk('fireInterior');
  const fx = PLACES.fire[0];
  const fz = PLACES.fire[2] - 9;
  const f = addBuilding(d.chunk, fireInt, {
    centre: [fx, fz],
    width: 20,
    depth: 16,
    storeys: 2,
    storeyHeight: 4.5,
    tiles: 'brick',
    doors: [{ side: '-x', width: 2 }],
    windows: false,
    stairs: 'ramp',
    name: 'fire',
  });
  // Replace the front wall's single door with two tall bay doors: add the bay
  // openings as a separate front wall segment set (the kit built a solid +z wall).
  // Cut: remove the kit's +z wall parts and rebuild with two openings.
  for (let i = d.chunk.parts.length - 1; i >= 0; i--) {
    if (d.chunk.parts[i].name?.startsWith('fire:+z')) d.chunk.parts.splice(i, 1);
  }
  const wallStart: [number, number] = [fx - 10, fz + 8];
  addWall(d.chunk, {
    name: 'fire:bayA',
    start: wallStart,
    axis: 'x',
    length: 9.5,
    height: 9,
    thickness: 0.3,
    tiles: 'brick',
    opening: [1.5, 5, 5],
  });
  addWall(d.chunk, {
    name: 'fire:bayB',
    start: [fx - 0.5, fz + 8],
    axis: 'x',
    length: 10.5,
    height: 9,
    thickness: 0.3,
    tiles: 'brick',
    opening: [1.5, 5, 5],
  });
  for (const px of [fx - 4, fx + 4]) {
    addSlab(fireInt, {
      name: 'firePole',
      centre: [px, 4.5, fz - 4],
      size: [0.15, 9, 0.15],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 1,
      tint: 0xd4a017,
    });
  }
  addSign(d.chunk, [fx, 9.6, fz + 8.3], [8, 1.2, 0.2], 0xf56565);
  addLadder(d.chunk, fx + 10.3, fz, 0, 9, '+x');
  d.climbAids.push('fire:ladder');
  d.interiors.push({ chunk: fireInt, bounds: f.interiorBounds });
  d.roofs.push({ id: 'fire', bounds: f.roofBounds, y: f.roofY });

  // Hospital: 40 × 30, three storeys, atrium, reception, wards, helipad.
  const hospInt = new Chunk('hospitalInterior');
  const hx = PLACES.hospital[0];
  const hz = PLACES.hospital[2] - 17;
  const h = addBuilding(d.chunk, hospInt, {
    centre: [hx, hz],
    width: 40,
    depth: 30,
    storeys: 3,
    tiles: 'concrete',
    doors: [
      { side: '+z', width: 3.2, height: 3.2 },
      { side: '-x', width: 2 },
    ],
    stairs: 'atrium',
    name: 'hospital',
  });
  addCounter(hospInt, [hx - 10, 0, hz + 9], 8);
  for (let s = 1; s < 3; s++) {
    addBeds(hospInt, [hx - 17, s * 4, hz - 10], 6, 'x', 2.6);
    addBeds(hospInt, [hx - 17, s * 4, hz + 6], 6, 'x', 2.6);
  }
  addSlab(d.chunk, {
    name: 'helipad',
    centre: [hx + 8, h.roofY + 0.1, hz - 6],
    size: [12, 0.2, 12],
    tiles: 'asphalt',
    surface: 'stone',
    uvScale: 3,
    tint: 0x9aa3ad,
  });
  addFireEscape(d.chunk, hx - 20.15, hz, '-x', 3, 4, 0);
  d.climbAids.push('hospital:fireEscape');
  addSign(d.chunk, [hx, 13.6, hz + 15.3], [12, 1.6, 0.3], 0xfc8181);
  d.interiors.push({ chunk: hospInt, bounds: h.interiorBounds });
  d.roofs.push({ id: 'hospital', bounds: h.roofBounds, y: h.roofY });
  d.landmarks.hospitalRoof = [hx, h.roofY, hz];

  d.bounds.set(new Vector3(10, 0, -160), new Vector3(120, 16, -100));
  return d;
}
