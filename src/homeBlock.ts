import { Box3, Vector3 } from 'three';
import { addDrainpipe, addPowerPole } from './buildings';
import {
  addBusStop,
  addCrates,
  addFence,
  addHouseShell,
  addLampPost,
  addMailbox,
  addSlab,
  addTree,
} from './builders';
import {
  HOUSE_DEPTH,
  HOUSE_FLOOR_Y,
  HOUSE_WIDTH,
  WALL_HEIGHT,
  addHomeHouse,
  type HomeHouse,
} from './homeHouse';
import { AVENUE_Z, ROAD_W, SIDEWALK_W, emptyDistrict, type BuiltDistrict } from './townPlan';

// The residential district around the player's house: yards, fences,
// driveway, crates, mailboxes, neighbour shells along the avenue, trees,
// lamp posts, power poles, drainpipes on every house (the way onto the
// roofs), and the bus stop across the road. Roads and ground come from the
// streets chunk.

export const ROAD_Z = AVENUE_Z;

export interface Residential extends BuiltDistrict {
  house: HomeHouse;
  busStop: [number, number, number];
}

const NEIGHBOUR_X = [-60, -40, -20, 20, 40, 60];

export function buildResidential(): Residential {
  const d = emptyDistrict('residential');
  const chunk = d.chunk;
  const houseX = 0;
  const houseZ = 0;
  const house = addHomeHouse(chunk, houseX, houseZ);
  const frontZ = houseZ - HOUSE_DEPTH / 2;
  const fenceZ = ROAD_Z + ROAD_W / 2 + SIDEWALK_W + 0.1;
  const lotHalf = 10;

  // Player's house: eave-height roof node and drainpipes at two corners.
  const eaveY = HOUSE_FLOOR_Y + WALL_HEIGHT + 0.12;
  d.roofs.push({
    id: 'home',
    bounds: new Box3(
      new Vector3(-HOUSE_WIDTH / 2, eaveY, -HOUSE_DEPTH / 2),
      new Vector3(HOUSE_WIDTH / 2, eaveY + 2, HOUSE_DEPTH / 2),
    ),
    y: eaveY,
  });
  addDrainpipe(chunk, HOUSE_WIDTH / 2 + 0.3, frontZ + 0.3, 0, eaveY);
  addDrainpipe(chunk, -HOUSE_WIDTH / 2 - 0.3, houseZ + HOUSE_DEPTH / 2 - 0.3, 0, eaveY);
  d.climbAids.push('home:drainpipe');
  // A shed by the driveway: the first step up toward the roof.
  addSlab(chunk, {
    name: 'shed',
    centre: [houseX + HOUSE_WIDTH / 2 + 3.2, 1.3, houseZ + 1.5],
    size: [3, 2.6, 3],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1.5,
    tint: 0x8b6f47,
  });
  addSlab(chunk, {
    name: 'shedRoof',
    centre: [houseX + HOUSE_WIDTH / 2 + 3.2, 2.75, houseZ + 1.5],
    size: [3.4, 0.3, 3.4],
    tiles: { sides: 'planks', top: 'shingles' },
    surface: 'wood',
    uvScale: 1.5,
  });

  // Front walk, driveway, yard fences, mailbox, crates.
  const sidewalkInner = ROAD_Z + ROAD_W / 2 + SIDEWALK_W;
  addSlab(chunk, {
    name: 'frontWalk',
    centre: [houseX, 0.005, (frontZ - 2.6 + sidewalkInner) / 2],
    size: [1.4, 0.01, frontZ - 2.6 - sidewalkInner],
    tiles: 'concrete',
    surface: 'stone',
    uvScale: 1.4,
  });
  const driveX = houseX + HOUSE_WIDTH / 2 + 1.8;
  addSlab(chunk, {
    name: 'driveway',
    centre: [driveX, 0.005, (frontZ + sidewalkInner) / 2],
    size: [3.0, 0.01, frontZ - sidewalkInner],
    tiles: 'concrete',
    surface: 'stone',
    uvScale: 2,
  });
  addFence(chunk, [houseX - lotHalf, fenceZ], 'x', lotHalf - 1);
  addFence(chunk, [houseX + 1, fenceZ], 'x', lotHalf - 1 - 3.6);
  addFence(chunk, [houseX - lotHalf, fenceZ], 'z', 6 + HOUSE_DEPTH + 2);
  addFence(chunk, [houseX + lotHalf, fenceZ], 'z', 6 + HOUSE_DEPTH + 2);
  addMailbox(chunk, driveX + 1.8, fenceZ - 0.4);
  addCrates(chunk, driveX + 2.6, frontZ - 2.5);

  // Neighbours along the avenue: closed shells, door decals, drainpipes, fences.
  NEIGHBOUR_X.forEach((nx, i) => {
    const brick = i % 2 === 0;
    addHouseShell(chunk, {
      centre: [nx, houseZ],
      width: 8,
      depth: 7,
      wallHeight: 3.0,
      doorSide: '-z',
      siding: brick ? 'brick' : 'siding',
      doorDecal: true,
      base: 0.1,
      name: `neighbour${i}`,
    });
    addSlab(chunk, {
      name: 'neighbourFoundation',
      centre: [nx, 0.05, houseZ],
      size: [8.4, 0.1, 7.4],
      tiles: 'concrete',
      surface: 'stone',
      uvScale: 2,
    });
    addFence(chunk, [nx - lotHalf, fenceZ], 'x', 2 * lotHalf, 0.9);
    addMailbox(chunk, nx + 4.5, fenceZ - 0.4);
    const eave = 0.1 + 3.0 + 0.12;
    addDrainpipe(chunk, nx + 4.3, houseZ - 3.2, 0, eave);
    d.roofs.push({
      id: `neighbour${i}`,
      bounds: new Box3(
        new Vector3(nx - 4, eave, houseZ - 3.5),
        new Vector3(nx + 4, eave + 2, houseZ + 3.5),
      ),
      y: eave,
    });
    d.climbAids.push(`neighbour${i}:drainpipe`);
  });

  // Street trees, lamp posts and power poles along the house-side sidewalk.
  for (const x of [-52, -32, -13, 13, 32, 52])
    addTree(chunk, houseX + x, fenceZ - 1.2 - SIDEWALK_W, 5 + Math.abs(x % 7) * 0.1, 3.2);
  for (const x of [-50, -10, 10, 50]) addLampPost(chunk, houseX + x, fenceZ - 1.0);
  for (const x of [-64, -30, 4, 38, 68]) addPowerPole(chunk, houseX + x, fenceZ + 0.6);
  // Far side of the road: trees, and the bus stop 30 m along.
  const farSidewalkZ = ROAD_Z - ROAD_W / 2 - SIDEWALK_W / 2;
  for (const x of [-20, 0, 20]) addTree(chunk, houseX + x, farSidewalkZ - 2.5, 5.5, 3.4);
  addLampPost(chunk, houseX + 20, farSidewalkZ - 1.2);
  const busStop = addBusStop(chunk, houseX + 30, farSidewalkZ - 1.3, 1);

  d.bounds.set(new Vector3(-75, 0, -30), new Vector3(75, 10, 15));
  return { ...d, house, busStop };
}
