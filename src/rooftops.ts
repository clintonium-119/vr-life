import { Box3, Vector3 } from 'three';
import { addLadder } from './buildings';
import { addSlab } from './builders';
import type { Chunk } from './chunk';
import type { Roof } from './townPlan';

// Roofs are traversal. A roof graph says which roofs a gorilla can reach
// from which (small gap, modest rise); a greedy planner adds catwalks where
// the route from the residential roofs to the office and hospital peaks is
// broken. A water tower between the neighbourhoods is the hub landmark.

export interface RoofGraph {
  roofs: Roof[];
  /** Adjacency by roof id (directed: from → reachable). */
  edges: Map<string, Set<string>>;
}

/** Horizontal gap between two AABBs (0 when they overlap in plan). */
export function horizontalGap(a: Box3, b: Box3): number {
  const dx = Math.max(0, Math.max(a.min.x - b.max.x, b.min.x - a.max.x));
  const dz = Math.max(0, Math.max(a.min.z - b.max.z, b.min.z - a.max.z));
  return Math.hypot(dx, dz);
}

export function roofGraph(roofs: Roof[], maxGap: number, maxRise: number): RoofGraph {
  const edges = new Map<string, Set<string>>();
  for (const a of roofs) {
    const set = new Set<string>();
    for (const b of roofs) {
      if (a === b) continue;
      if (horizontalGap(a.bounds, b.bounds) > maxGap) continue;
      if (b.y - a.y > maxRise) continue; // dropping down is always allowed
      set.add(b.id);
    }
    edges.set(a.id, set);
  }
  return { roofs, edges };
}

export function reachable(graph: RoofGraph, from: string): Set<string> {
  const seen = new Set<string>([from]);
  const queue = [from];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const next of graph.edges.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

export function roofRouteConnected(graph: RoofGraph, from: string, to: string): boolean {
  return reachable(graph, from).has(to);
}

export interface Connector {
  from: Roof;
  to: Roof;
}

/**
 * Greedy planner: while `to` is unreachable from `from`, connect the closest
 * (reachable, unreachable) roof pair with a catwalk and add the edge both
 * ways. Returns the connectors to build. Catwalks slope, so rise is free;
 * only the gap is limited.
 */
export function planRoofConnectors(
  graph: RoofGraph,
  from: string,
  to: string,
  maxCatwalkGap: number,
): Connector[] {
  const byId = new Map(graph.roofs.map((r) => [r.id, r]));
  const out: Connector[] = [];
  for (let guard = 0; guard < graph.roofs.length; guard++) {
    const seen = reachable(graph, from);
    if (seen.has(to)) return out;
    let best: Connector | null = null;
    let bestGap = Infinity;
    for (const a of seen) {
      for (const b of graph.roofs) {
        if (seen.has(b.id)) continue;
        const gap = horizontalGap((byId.get(a) as Roof).bounds, b.bounds);
        if (gap < bestGap && gap <= maxCatwalkGap) {
          bestGap = gap;
          best = { from: byId.get(a) as Roof, to: b };
        }
      }
    }
    if (best === null) return out; // no pair within reach: route stays broken
    out.push(best);
    graph.edges.get(best.from.id)?.add(best.to.id);
    graph.edges.get(best.to.id)?.add(best.from.id);
  }
  return out;
}

const _a = new Vector3();
const _b = new Vector3();

/** Closest points on two roof AABBs (in plan), at each roof's height. */
function closestPoints(a: Roof, b: Roof, outA: Vector3, outB: Vector3): void {
  const ca = a.bounds.getCenter(new Vector3());
  const cb = b.bounds.getCenter(new Vector3());
  outA.set(
    Math.min(a.bounds.max.x, Math.max(a.bounds.min.x, cb.x)),
    a.y,
    Math.min(a.bounds.max.z, Math.max(a.bounds.min.z, cb.z)),
  );
  outB.set(
    Math.min(b.bounds.max.x, Math.max(b.bounds.min.x, ca.x)),
    b.y,
    Math.min(b.bounds.max.z, Math.max(b.bounds.min.z, ca.z)),
  );
}

/** A plank catwalk between two roofs: slopes if the heights differ, with a low rail. */
export function addCatwalk(chunk: Chunk, c: Connector): void {
  closestPoints(c.from, c.to, _a, _b);
  const dx = _b.x - _a.x;
  const dz = _b.z - _a.z;
  const dy = _b.y - _a.y;
  const run = Math.hypot(dx, dz);
  if (run < 0.5) return;
  const yaw = Math.atan2(dx, dz); // rotation about Y so local +Z points along the run
  const pitch = -Math.atan2(dy, run); // rotate about local X to climb
  const len = Math.hypot(run, dy) + 1.2;
  const centre: [number, number, number] = [
    (_a.x + _b.x) / 2,
    (_a.y + _b.y) / 2 + 0.1,
    (_a.z + _b.z) / 2,
  ];
  addSlab(chunk, {
    name: 'catwalk',
    centre,
    size: [1.6, 0.2, len],
    rotation: [pitch, yaw, 0],
    tiles: 'planks',
    surface: 'wood',
    uvScale: 2,
  });
  for (const side of [-1, 1]) {
    addSlab(chunk, {
      name: 'catwalkRail',
      centre: [
        centre[0] + Math.cos(yaw) * side * 0.85,
        centre[1] + 0.6,
        centre[2] - Math.sin(yaw) * side * 0.85,
      ],
      size: [0.08, 0.9, len],
      rotation: [pitch, yaw, 0],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 2,
    });
  }
}

/** Water tower: tank on four legs with a ladder; a hub roof node and a landmark. */
export function addWaterTower(chunk: Chunk, x: number, z: number, deckY = 14): Roof {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addSlab(chunk, {
        name: 'towerLeg',
        centre: [x + sx * 2.2, deckY / 2, z + sz * 2.2],
        size: [0.35, deckY, 0.35],
        tiles: 'metal',
        surface: 'metal',
        uvScale: 2,
        tint: 0x6e7580,
      });
    }
  }
  for (let y = 3.5; y < deckY - 1; y += 3.5) {
    addSlab(chunk, {
      name: 'towerBrace',
      centre: [x, y, z],
      size: [4.75, 0.2, 0.2],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 2,
      tint: 0x6e7580,
    });
    addSlab(chunk, {
      name: 'towerBrace',
      centre: [x, y, z],
      size: [0.2, 0.2, 4.75],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 2,
      tint: 0x6e7580,
    });
  }
  addSlab(chunk, {
    name: 'towerDeck',
    centre: [x, deckY, z],
    size: [6, 0.3, 6],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 2,
  });
  for (const rot of [0, Math.PI / 4]) {
    addSlab(chunk, {
      name: 'towerTank',
      centre: [x, deckY + 2.6, z],
      size: [4.6, 5, 4.6],
      rotation: [0, rot, 0],
      tiles: 'metal',
      surface: 'metal',
      uvScale: 2,
      tint: 0xd9dde2,
    });
  }
  addSlab(chunk, {
    name: 'towerCap',
    centre: [x, deckY + 5.4, z],
    size: [3.2, 0.6, 3.2],
    rotation: [0, Math.PI / 8, 0],
    tiles: 'metal',
    surface: 'metal',
    uvScale: 1,
    tint: 0x8a9096,
  });
  addLadder(chunk, x + 2.2, z + 2.6, 0, deckY, '+z');
  return {
    id: 'waterTower',
    bounds: new Box3(new Vector3(x - 3, deckY, z - 3), new Vector3(x + 3, deckY + 0.3, z + 3)),
    y: deckY,
  };
}
