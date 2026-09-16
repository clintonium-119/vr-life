import type { Vector3 } from 'three';

// Uniform grid over axis-aligned bounds: constant-time "what is near this
// sphere" for thousands of static items. Items spanning many cells go to an
// always-tested list (ground, roads). Queries are allocation-free: a stamp
// per item dedupes items that sit in several cells.

const LARGE_CELLS = 64;

export class SpatialGrid<T> {
  private readonly items: T[] = [];
  private readonly cells = new Map<number, number[]>();
  private readonly large: number[] = [];
  private stamps: number[] = [];
  private queryId = 0;

  constructor(readonly cellM: number) {}

  get size(): number {
    return this.items.length;
  }

  private key(ix: number, iy: number, iz: number): number {
    // Spatial hash; collisions only add candidates, never miss them.
    return (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791);
  }

  insert(item: T, min: Vector3, max: Vector3): void {
    const index = this.items.length;
    this.items.push(item);
    this.stamps.push(0);
    const c = this.cellM;
    const x0 = Math.floor(min.x / c);
    const y0 = Math.floor(min.y / c);
    const z0 = Math.floor(min.z / c);
    const x1 = Math.floor(max.x / c);
    const y1 = Math.floor(max.y / c);
    const z1 = Math.floor(max.z / c);
    const span = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
    if (span > LARGE_CELLS) {
      this.large.push(index);
      return;
    }
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        for (let iz = z0; iz <= z1; iz++) {
          const k = this.key(ix, iy, iz);
          const list = this.cells.get(k);
          if (list === undefined) this.cells.set(k, [index]);
          else list.push(index);
        }
      }
    }
  }

  /** Visit every item whose cells overlap the sphere, each once. */
  forEachNear(center: Vector3, radius: number, cb: (item: T) => void): void {
    const id = ++this.queryId;
    const c = this.cellM;
    const x0 = Math.floor((center.x - radius) / c);
    const y0 = Math.floor((center.y - radius) / c);
    const z0 = Math.floor((center.z - radius) / c);
    const x1 = Math.floor((center.x + radius) / c);
    const y1 = Math.floor((center.y + radius) / c);
    const z1 = Math.floor((center.z + radius) / c);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        for (let iz = z0; iz <= z1; iz++) {
          const list = this.cells.get(this.key(ix, iy, iz));
          if (list === undefined) continue;
          for (const index of list) {
            if (this.stamps[index] === id) continue;
            this.stamps[index] = id;
            cb(this.items[index]);
          }
        }
      }
    }
    for (const index of this.large) cb(this.items[index]);
  }
}
