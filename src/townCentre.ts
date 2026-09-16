import { Vector3 } from 'three';
import {
  addBuilding,
  addCounter,
  addCubicles,
  addDrainpipe,
  addFireEscape,
  addShelfRun,
  addSign,
} from './buildings';
import { addSlab, addLampPost, addCrates } from './builders';
import { Chunk } from './chunk';
import { PLACES, emptyDistrict, type BuiltDistrict } from './townPlan';

// Town centre: the grocery (large open retail hall), the convenience store,
// and the office tower (the most vertical structure in town, atrium climb).

export function buildTownCentre(): BuiltDistrict {
  const d = emptyDistrict('townCentre');

  // Grocery: one big hall with aisle shelving and a counter.
  const groceryInt = new Chunk('groceryInterior');
  const g = addBuilding(d.chunk, groceryInt, {
    centre: [PLACES.grocery[0], PLACES.grocery[2] - 13],
    width: 32,
    depth: 22,
    storeys: 1,
    storeyHeight: 6,
    tiles: 'concrete',
    doors: [{ side: '+z', width: 3, height: 3.2 }],
    stairs: 'none',
    name: 'grocery',
  });
  for (let i = 0; i < 4; i++)
    addShelfRun(
      groceryInt,
      [PLACES.grocery[0] - 12, 0, PLACES.grocery[2] - 20 + i * 4],
      'x',
      20,
      4,
    );
  addCounter(groceryInt, [PLACES.grocery[0] + 10, 0, PLACES.grocery[2] - 4], 6);
  addSign(d.chunk, [PLACES.grocery[0], 6.8, PLACES.grocery[2] - 2.3], [10, 1.4, 0.2], 0x2f855a);
  d.interiors.push({ chunk: groceryInt, bounds: g.interiorBounds });
  d.roofs.push({ id: 'grocery', bounds: g.roofBounds, y: g.roofY });
  addDrainpipe(d.chunk, PLACES.grocery[0] - 16.3, PLACES.grocery[2] - 2.2, 0, 6);
  d.climbAids.push('grocery:drainpipe');
  // Parking in front.
  addSlab(d.chunk, {
    name: 'parking',
    centre: [PLACES.grocery[0], 0.005, PLACES.grocery[2] + 6],
    size: [32, 0.01, 10],
    tiles: 'asphalt',
    surface: 'stone',
    uvScale: 4,
  });
  addLampPost(d.chunk, PLACES.grocery[0] - 12, PLACES.grocery[2] + 10);
  addLampPost(d.chunk, PLACES.grocery[0] + 12, PLACES.grocery[2] + 10);
  addCrates(d.chunk, PLACES.grocery[0] + 14, PLACES.grocery[2] - 24);

  // Convenience store: small, one counter, a shelf run.
  const convInt = new Chunk('convenienceInterior');
  const c = addBuilding(d.chunk, convInt, {
    centre: [PLACES.convenience[0], PLACES.convenience[2] - 6],
    width: 12,
    depth: 9,
    storeys: 1,
    storeyHeight: 4,
    tiles: 'brick',
    doors: [{ side: '+z', width: 2 }],
    stairs: 'none',
    name: 'convenience',
  });
  addShelfRun(convInt, [PLACES.convenience[0] - 4, 0, PLACES.convenience[2] - 9], 'x', 8, 3);
  addCounter(convInt, [PLACES.convenience[0] + 3, 0, PLACES.convenience[2] - 3], 3);
  addSign(
    d.chunk,
    [PLACES.convenience[0], 4.8, PLACES.convenience[2] - 1.3],
    [6, 1.0, 0.2],
    0xd69e2e,
  );
  d.interiors.push({ chunk: convInt, bounds: c.interiorBounds });
  d.roofs.push({ id: 'convenience', bounds: c.roofBounds, y: c.roofY });
  addDrainpipe(d.chunk, PLACES.convenience[0] + 6.3, PLACES.convenience[2] - 1.5, 0, 4);
  d.climbAids.push('convenience:drainpipe');

  // Office: five storeys, atrium lattice, cubicles per floor, lobby counter.
  const officeInt = new Chunk('officeInterior');
  const o = addBuilding(d.chunk, officeInt, {
    centre: [PLACES.office[0], PLACES.office[2] - 13],
    width: 22,
    depth: 22,
    storeys: 5,
    storeyHeight: 4,
    tiles: 'concrete',
    doors: [{ side: '+z', width: 2.6, height: 3.2 }],
    stairs: 'atrium',
    name: 'office',
  });
  addCounter(officeInt, [PLACES.office[0] - 6, 0, PLACES.office[2] - 5], 5);
  for (let s = 1; s < 5; s++)
    addCubicles(officeInt, [PLACES.office[0] - 10, s * 4, PLACES.office[2] - 23.5], 2, 3);
  addFireEscape(d.chunk, PLACES.office[0] + 11.15, PLACES.office[2] - 13, '+x', 5, 4, 0);
  d.climbAids.push('office:fireEscape');
  addSign(d.chunk, [PLACES.office[0], 21.5, PLACES.office[2] - 2.3], [8, 1.6, 0.3], 0x2b6cb0);
  d.interiors.push({ chunk: officeInt, bounds: o.interiorBounds });
  d.roofs.push({ id: 'office', bounds: o.roofBounds, y: o.roofY });
  d.landmarks.officeRoof = [PLACES.office[0], o.roofY, PLACES.office[2] - 13];

  d.bounds.set(new Vector3(10, 0, -100), new Vector3(105, 25, -40));
  return d;
}
