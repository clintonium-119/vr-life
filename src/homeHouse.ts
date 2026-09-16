import type { Chunk } from './chunk';
import { addHouseShell, addSlab, addSteps, addWall, addWindow } from './builders';

// The player's house: the game opens in its bedroom. Built to the interior
// rules: 3.2 m ceilings, 1.4 m doorways, open plan, climbable furniture.
// Laid out so the spawn, the bedroom door and the front door sit on one
// straight line toward -z: a first-timer walks straight out.

export const HOUSE_FLOOR_Y = 0.5; // top of the foundation slab
export const HOUSE_WIDTH = 9;
export const HOUSE_DEPTH = 7;
export const WALL_HEIGHT = 3.2;

export interface HomeHouse {
  spawn: [number, number, number];
  spawnYaw: number;
  backpackHome: [number, number, number];
  /** World position of the front-door opening's centre. */
  door: [number, number, number];
}

export function addHomeHouse(chunk: Chunk, cx = 0, cz = 0): HomeHouse {
  const F = HOUSE_FLOOR_Y;
  const hw = HOUSE_WIDTH / 2;
  const hd = HOUSE_DEPTH / 2;
  const frontZ = cz - hd;

  // Foundation: a concrete slab the walls stand on (the floor is its top).
  addSlab(chunk, {
    name: 'foundation',
    centre: [cx, F / 2, cz],
    size: [HOUSE_WIDTH + 0.5, F, HOUSE_DEPTH + 0.5],
    tiles: { sides: 'concrete', top: 'floorboards' },
    surface: 'stone',
    uvScale: 1.5,
  });

  // Shell (walls from the floor up, roof, windows, real front door).
  const shell = addHouseShell(chunk, {
    centre: [cx, cz],
    width: HOUSE_WIDTH,
    depth: HOUSE_DEPTH,
    wallHeight: WALL_HEIGHT,
    doorSide: '-z',
    siding: 'siding',
    base: F,
    name: 'home',
  });
  // Interior plaster skins on the inside of each wall (thin, non-colliding:
  // the structural wall already collides).
  const skin = 0.02;
  const t = 0.25;
  for (const [x, z, size] of [
    [cx, cz + hd - t / 2 - skin, [HOUSE_WIDTH - 2 * t, WALL_HEIGHT, skin]],
    [cx - hw + t / 2 + skin, cz, [skin, WALL_HEIGHT, HOUSE_DEPTH - 2 * t]],
    [cx + hw - t / 2 - skin, cz, [skin, WALL_HEIGHT, HOUSE_DEPTH - 2 * t]],
  ] as [number, number, [number, number, number]][]) {
    addSlab(chunk, {
      name: 'plaster',
      centre: [x, F + WALL_HEIGHT / 2, z],
      size,
      tiles: 'plaster',
      surface: 'stone',
      noCollide: true,
      uvScale: 2,
    });
  }

  // Bedroom partition (along x at z = cz + 0.5) with a 1.4 m door centred on x = cx.
  const partZ = cz + 0.5;
  addWall(chunk, {
    name: 'bedroomWall',
    start: [cx - hw + t, partZ],
    axis: 'x',
    length: HOUSE_WIDTH - 2 * t,
    height: WALL_HEIGHT,
    thickness: 0.15,
    base: F,
    tiles: 'plaster',
    opening: [(HOUSE_WIDTH - 2 * t) / 2 - 0.7, 1.4, 2.4],
  });

  // Bedroom furniture (all climbable).
  addSlab(chunk, {
    name: 'bed',
    centre: [cx - 3.0, F + 0.3, cz + 2.2],
    size: [1.6, 0.6, 2.0],
    tiles: { sides: 'planks', top: 'trim' },
    surface: 'wood',
    uvScale: 1,
  });
  addSlab(chunk, {
    name: 'pillow',
    centre: [cx - 3.0, F + 0.68, cz + 2.95],
    size: [1.2, 0.16, 0.45],
    tiles: 'trim',
    surface: 'leaves',
    uvScale: 1,
  });
  addSlab(chunk, {
    name: 'nightstand',
    centre: [cx - 1.7, F + 0.3, cz + 3.0],
    size: [0.5, 0.6, 0.5],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 0.5,
  });
  addSlab(chunk, {
    name: 'alarmClock',
    centre: [cx - 1.7, F + 0.66, cz + 3.0],
    size: [0.14, 0.12, 0.08],
    tiles: 'trim',
    surface: 'metal',
    uvScale: 0.14,
    tint: 0xd93025,
  });
  addSlab(chunk, {
    name: 'wardrobe',
    centre: [cx + 3.4, F + 1.1, cz + 2.85],
    size: [1.2, 2.2, 0.6],
    tiles: { sides: 'planks', top: 'planks' },
    surface: 'wood',
    uvScale: 1.1,
  });
  for (const y of [1.0, 1.6, 2.2]) {
    addSlab(chunk, {
      name: 'shelf',
      centre: [cx + hw - t - 0.16, F + y, cz + 1.6],
      size: [0.3, 0.05, 1.2],
      tiles: 'planks',
      surface: 'wood',
      uvScale: 1,
    });
  }
  addWindow(chunk, [cx - 3.0, F + 1.8, cz + hd - t / 2 - 0.05], 'x');

  // Living side: a low table and a sofa block, plus the entrance bench where
  // the backpack lives, just inside and right of the front door.
  addSlab(chunk, {
    name: 'sofa',
    centre: [cx + 2.8, F + 0.35, cz - 1.2],
    size: [2.0, 0.7, 0.9],
    tiles: { sides: 'trim', top: 'trim' },
    surface: 'leaves',
    uvScale: 1,
    tint: 0x6b8fb3,
  });
  addSlab(chunk, {
    name: 'table',
    centre: [cx + 2.8, F + 0.25, cz - 2.4],
    size: [1.0, 0.5, 0.6],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1,
  });
  addSlab(chunk, {
    name: 'entranceBench',
    centre: [cx + 1.4, F + 0.25, cz - hd + 0.6],
    size: [1.0, 0.5, 0.45],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 1,
  });

  // Porch and steps outside the front door.
  const porchDepth = 1.6;
  addSlab(chunk, {
    name: 'porch',
    centre: [cx, F / 2, frontZ - t / 2 - porchDepth / 2],
    size: [3.2, F, porchDepth],
    tiles: { sides: 'concrete', top: 'planks' },
    surface: 'wood',
    uvScale: 1.5,
  });
  for (const dx of [-1.4, 1.4]) {
    addSlab(chunk, {
      name: 'porchPost',
      centre: [cx + dx, F + WALL_HEIGHT / 2, frontZ - t / 2 - porchDepth + 0.1],
      size: [0.15, WALL_HEIGHT, 0.15],
      tiles: 'trim',
      surface: 'wood',
      uvScale: 1,
    });
  }
  addSlab(chunk, {
    name: 'porchRoof',
    centre: [cx, F + WALL_HEIGHT + 0.05, frontZ - t / 2 - porchDepth / 2],
    size: [3.4, 0.1, porchDepth + 0.2],
    tiles: { sides: 'trim', top: 'shingles', bottom: 'trim' },
    surface: 'wood',
    uvScale: 1.5,
  });
  addSteps(chunk, [cx, F, frontZ - t / 2 - porchDepth], 'z', -1, 1.6, 3, F / 3, 0.32);

  return {
    spawn: [cx, F, cz + 2.4],
    spawnYaw: 0,
    backpackHome: [cx + 1.4, F + 0.5, cz - hd + 0.6],
    door: [shell.doorCentre[0], F + 1.2, frontZ],
  };
}
