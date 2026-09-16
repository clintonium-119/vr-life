import type { Chunk } from './chunk';
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
import { HOUSE_DEPTH, HOUSE_WIDTH } from './homeHouse';

// The first street block around the player's house: road, sidewalks,
// yards, fences, driveways, two neighbour shells, trees, lamp posts,
// crates, mailboxes, and the bus stop across the road. Every part is a
// collider: the block is a movement space as much as a place.

export const ROAD_Z = -15.5; // centre line, in front of the house
export const ROAD_WIDTH = 8;
export const SIDEWALK_WIDTH = 2;

export interface HomeBlock {
  busStop: [number, number, number];
}

export function addHomeBlock(chunk: Chunk, houseX = 0, houseZ = 0): HomeBlock {
  const frontZ = houseZ - HOUSE_DEPTH / 2;
  // Ground: one big grass slab whose top is y = 0.
  addSlab(chunk, {
    name: 'ground',
    centre: [houseX, -0.05, -8],
    size: [140, 0.1, 100],
    tiles: 'grass',
    surface: 'ground',
    uvScale: 3,
  });
  // Road and sidewalks (raised 0.12 m with a curb edge).
  addSlab(chunk, {
    name: 'road',
    centre: [houseX, 0.01, ROAD_Z],
    size: [140, 0.02, ROAD_WIDTH],
    tiles: 'asphalt',
    surface: 'stone',
    uvScale: 3,
  });
  for (const side of [-1, 1]) {
    const z = ROAD_Z + side * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2);
    addSlab(chunk, {
      name: 'sidewalk',
      centre: [houseX, 0.06, z],
      size: [140, 0.12, SIDEWALK_WIDTH],
      tiles: 'concrete',
      surface: 'stone',
      uvScale: 2,
    });
  }
  // Front walk from the porch steps to the sidewalk.
  addSlab(chunk, {
    name: 'frontWalk',
    centre: [houseX, 0.005, (frontZ - 2.6 + ROAD_Z + ROAD_WIDTH / 2 + SIDEWALK_WIDTH) / 2],
    size: [1.4, 0.01, frontZ - 2.6 - (ROAD_Z + ROAD_WIDTH / 2 + SIDEWALK_WIDTH)],
    tiles: 'concrete',
    surface: 'stone',
    uvScale: 1.4,
  });
  // Driveway to the right of the house.
  const driveX = houseX + HOUSE_WIDTH / 2 + 1.8;
  addSlab(chunk, {
    name: 'driveway',
    centre: [driveX, 0.005, (frontZ + ROAD_Z + ROAD_WIDTH / 2 + SIDEWALK_WIDTH) / 2],
    size: [3.0, 0.01, frontZ - (ROAD_Z + ROAD_WIDTH / 2 + SIDEWALK_WIDTH)],
    tiles: 'concrete',
    surface: 'stone',
    uvScale: 2,
  });
  // Yard fence along the sidewalk with a gap for the walk, and side fences.
  const fenceZ = ROAD_Z + ROAD_WIDTH / 2 + SIDEWALK_WIDTH + 0.1;
  const lotHalf = 10;
  addFence(chunk, [houseX - lotHalf, fenceZ], 'x', lotHalf - 1);
  addFence(chunk, [houseX + 1, fenceZ], 'x', lotHalf - 1 - 3.6);
  addFence(chunk, [houseX - lotHalf, fenceZ], 'z', 6 + HOUSE_DEPTH + 2);
  addFence(chunk, [houseX + lotHalf, fenceZ], 'z', 6 + HOUSE_DEPTH + 2);
  addMailbox(chunk, driveX + 1.8, fenceZ - 0.4);
  addCrates(chunk, driveX + 2.6, frontZ - 2.5);

  // Neighbours: closed shells with door decals, their own yards and fences.
  for (const nx of [houseX - 20, houseX + 20]) {
    addHouseShell(chunk, {
      centre: [nx, houseZ],
      width: 8,
      depth: 7,
      wallHeight: 3.0,
      doorSide: '-z',
      siding: nx < houseX ? 'brick' : 'siding',
      doorDecal: true,
      base: 0.1,
      name: 'neighbour',
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
  }

  // Street trees and lamp posts along the house-side sidewalk edge.
  for (const x of [-26, -13, 13, 26])
    addTree(chunk, houseX + x, fenceZ - 1.2 - SIDEWALK_WIDTH, 5 + (x % 7) * 0.1, 3.2);
  for (const x of [-30, -10, 10, 30]) addLampPost(chunk, houseX + x, fenceZ - 1.0);
  // Far side of the road: trees, and the bus stop 30 m along.
  const farSidewalkZ = ROAD_Z - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2;
  for (const x of [-20, 0, 20]) addTree(chunk, houseX + x, farSidewalkZ - 2.5, 5.5, 3.4);
  addLampPost(chunk, houseX + 20, farSidewalkZ - 1.2);
  const busStop = addBusStop(chunk, houseX + 30, farSidewalkZ - 1.3, 1);

  return { busStop };
}
