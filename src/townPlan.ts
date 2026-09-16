import { Box3, Vector3 } from 'three';
import { addSlab } from './builders';
import { Chunk } from './chunk';

// The single map of the game: a fixed street grid and where every district
// and named place sits. Districts are built by their own modules from these
// numbers; moving a district is one edit here.

export const AVENUE_Z = -15.5; // the home street, runs along x
export const CROSS_X = 55; // main cross street, runs along z
export const NORTH_AVENUE_Z = -105; // second avenue through the civic district
export const ROAD_W = 8;
export const SIDEWALK_W = 2;

export interface RoadSegment {
  axis: 'x' | 'z';
  /** Fixed coordinate (z for an x-road, x for a z-road). */
  at: number;
  from: number;
  to: number;
}

export const ROADS: RoadSegment[] = [
  { axis: 'x', at: AVENUE_Z, from: -175, to: 185 },
  { axis: 'z', at: CROSS_X, from: -155, to: 12 },
  { axis: 'x', at: NORTH_AVENUE_Z, from: 10, to: 125 },
];

/** Named places (world coordinates, feet level). */
export const PLACES = {
  bedroom: [0, 0.5, 2.4],
  busStop: [30, 0.12, -22.8],
  grocery: [85, 0, -47],
  convenience: [85, 0, -86],
  office: [25, 0, -62],
  officeRoof: [25, 20.2, -75],
  police: [25, 0, -122],
  fire: [25, 0, -148],
  hospital: [95, 0, -113],
  hospitalRoof: [95, 12.2, -130],
  school: [140, 0, -19],
  schoolDropOff: [140, 0.12, -20],
  gym: [176, 0, -34],
  farm: [-110, 0, -8],
  forest: [0, 0, 45],
  cabin: [40, 0, 95],
} as const satisfies Record<string, readonly [number, number, number]>;

export type PlaceName = keyof typeof PLACES;
export const PLACE_NAMES = Object.keys(PLACES) as PlaceName[];

export function parseSpawn(query: string): PlaceName {
  const raw = new URLSearchParams(query).get('spawn');
  return raw !== null && raw in PLACES ? (raw as PlaceName) : 'bedroom';
}

export interface Roof {
  id: string;
  bounds: Box3;
  y: number;
}

export interface Interior {
  chunk: Chunk;
  bounds: Box3;
}

export interface BuiltDistrict {
  name: string;
  chunk: Chunk;
  interiors: Interior[];
  bounds: Box3;
  landmarks: Record<string, [number, number, number]>;
  roofs: Roof[];
  /** Names of climb aids present (escapes, pipes, ladders, stepped structure). */
  climbAids: string[];
}

export function emptyDistrict(name: string): BuiltDistrict {
  return {
    name,
    chunk: new Chunk(name),
    interiors: [],
    bounds: new Box3(),
    landmarks: {},
    roofs: [],
    climbAids: [],
  };
}

/** Ground, roads and sidewalks for the whole town. */
export function buildStreets(): BuiltDistrict {
  const d = emptyDistrict('streets');
  addSlab(d.chunk, {
    name: 'ground',
    centre: [0, -0.05, -10],
    size: [420, 0.1, 320],
    tiles: 'grass',
    surface: 'ground',
    uvScale: 12,
  });
  for (const r of ROADS) {
    const len = r.to - r.from;
    const mid = (r.from + r.to) / 2;
    const centre: [number, number, number] = r.axis === 'x' ? [mid, 0.01, r.at] : [r.at, 0.01, mid];
    addSlab(d.chunk, {
      name: 'road',
      centre,
      size: r.axis === 'x' ? [len, 0.02, ROAD_W] : [ROAD_W, 0.02, len],
      tiles: 'asphalt',
      surface: 'stone',
      uvScale: 4,
    });
    for (const side of [-1, 1]) {
      const off = side * (ROAD_W / 2 + SIDEWALK_W / 2);
      const c: [number, number, number] =
        r.axis === 'x' ? [mid, 0.06, r.at + off] : [r.at + off, 0.06, mid];
      addSlab(d.chunk, {
        name: 'sidewalk',
        centre: c,
        size: r.axis === 'x' ? [len, 0.12, SIDEWALK_W] : [SIDEWALK_W, 0.12, len],
        tiles: 'concrete',
        surface: 'stone',
        uvScale: 4,
      });
    }
  }
  d.bounds.set(new Vector3(-210, -1, -170), new Vector3(210, 1, 150));
  return d;
}

/** Distance from a point to the nearest road centre line (2D). */
export function distanceToRoad(x: number, z: number): number {
  let best = Infinity;
  for (const r of ROADS) {
    const along = r.axis === 'x' ? x : z;
    const across = r.axis === 'x' ? z - r.at : x - r.at;
    const clampedAlong = Math.min(r.to, Math.max(r.from, along));
    const dAlong = along - clampedAlong;
    best = Math.min(best, Math.hypot(dAlong, across));
  }
  return best;
}
