import type { Box3, Object3D, Vector3 } from 'three';
import { tuning, type MovementTuning } from './movementTuning';

// Chunk visibility: a chunk's mesh is drawn while its bounding sphere is
// within the view distance of the player; an interior chunk additionally
// requires the player to be inside its building bounds plus a door margin.
// Collision is untouched by any of this.

export interface ManagedChunk {
  mesh: Object3D;
  center: Vector3;
  radius: number;
  /** Present for interiors: the building footprint × storeys. */
  interiorBounds?: Box3;
}

export class ChunkManager {
  readonly chunks: ManagedChunk[] = [];
  visibleCount = 0;

  constructor(private readonly t: MovementTuning = tuning) {}

  add(chunk: ManagedChunk): void {
    this.chunks.push(chunk);
  }

  get total(): number {
    return this.chunks.length;
  }

  update(playerPos: Vector3): void {
    let visible = 0;
    const t = this.t;
    for (const c of this.chunks) {
      let show = c.center.distanceTo(playerPos) - c.radius <= t.viewDistanceM;
      if (show && c.interiorBounds !== undefined) {
        const b = c.interiorBounds;
        const m = t.interiorDoorMarginM;
        show =
          playerPos.x >= b.min.x - m &&
          playerPos.x <= b.max.x + m &&
          playerPos.y >= b.min.y - m &&
          playerPos.y <= b.max.y + m &&
          playerPos.z >= b.min.z - m &&
          playerPos.z <= b.max.z + m;
      }
      c.mesh.visible = show;
      if (show) visible++;
    }
    this.visibleCount = visible;
  }
}
