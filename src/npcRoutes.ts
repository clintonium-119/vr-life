import { Vector3 } from 'three';
import { ROADS, ROAD_W, SIDEWALK_W, type RoadSegment } from './townPlan';

// Sidewalk polylines from the street grid: NPC routes are contiguous
// slices of one sidewalk, walked back and forth.

export const WAYPOINT_SPACING_M = 12;
export const SIDEWALK_OFFSET_M = ROAD_W / 2 + SIDEWALK_W / 2;

export interface Sidewalk {
  road: RoadSegment;
  side: -1 | 1;
  points: Vector3[];
}

export function sidewalks(): Sidewalk[] {
  const out: Sidewalk[] = [];
  for (const road of ROADS) {
    for (const side of [-1, 1] as const) {
      const points: Vector3[] = [];
      for (let s = road.from + 6; s <= road.to - 6; s += WAYPOINT_SPACING_M) {
        const off = side * SIDEWALK_OFFSET_M;
        points.push(
          road.axis === 'x'
            ? new Vector3(s, 0.12, road.at + off)
            : new Vector3(road.at + off, 0.12, s),
        );
      }
      out.push({ road, side, points });
    }
  }
  return out;
}

/** A random contiguous slice of a random sidewalk, `count` waypoints long. */
export function randomRoute(rnd: () => number, count = 6): Vector3[] {
  const walks = sidewalks();
  const walk = walks[Math.floor(rnd() * walks.length)];
  const n = Math.min(count, walk.points.length);
  const start = Math.floor(rnd() * (walk.points.length - n + 1));
  return walk.points.slice(start, start + n).map((p) => p.clone());
}
