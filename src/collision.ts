import { Box3, Matrix4, Quaternion, Vector3, type Object3D, type Mesh } from 'three';

// The collision world: oriented boxes only. Every collidable mesh contributes
// one box from its geometry bounds and world transform, tagged with a surface
// type that the audio reads. Pure math (three's math classes only), so the
// hand anchors and the body sphere can be unit-tested in Node.
//
// ponytail: linear scan over a few dozen boxes; add a grid or BVH when the
// town arrives and the count passes a few hundred.

export type SurfaceTag = 'ground' | 'stone' | 'wood' | 'metal' | 'leaves';

const SURFACE_TAGS: ReadonlySet<string> = new Set(['ground', 'stone', 'wood', 'metal', 'leaves']);

/** Minimum half-thickness given to zero-volume (plane) colliders, in metres. */
export const MIN_HALF_THICKNESS_M = 0.05;

export interface BoxCollider {
  id: string;
  surface: SurfaceTag;
  /** Box half sizes in box space (object scale folded in). */
  halfExtents: Vector3;
  /** Geometry bounds centre in object-local space (before scale). */
  center: Vector3;
  /** Live reference to the source object's world matrix (a moving mesh moves its box). */
  matrixWorld: Matrix4;
  /** Rotation + translation only, box space -> world. Refresh with updateCollider(). */
  boxToWorld: Matrix4;
  worldToBox: Matrix4;
}

export interface Contact {
  point: Vector3;
  normal: Vector3;
  /** Penetration depth in metres; > 0 when the sphere overlaps the box. */
  depth: number;
  collider: BoxCollider | null;
}

export function makeContact(): Contact {
  return { point: new Vector3(), normal: new Vector3(), depth: 0, collider: null };
}

const _pos = new Vector3();
const _quat = new Quaternion();
const _scale = new Vector3();
const _offset = new Vector3();

/** Recompute the box transforms from the (possibly changed) world matrix. */
export function updateCollider(c: BoxCollider): void {
  c.matrixWorld.decompose(_pos, _quat, _scale);
  _offset.copy(c.center).multiply(_scale).applyQuaternion(_quat);
  _pos.add(_offset);
  c.boxToWorld.compose(_pos, _quat, _scale.set(1, 1, 1));
  c.worldToBox.copy(c.boxToWorld).invert();
}

export function makeBoxCollider(
  id: string,
  surface: SurfaceTag,
  localBounds: Box3,
  matrixWorld: Matrix4,
): BoxCollider {
  const center = localBounds.getCenter(new Vector3());
  const half = localBounds.getSize(new Vector3()).multiplyScalar(0.5);
  // Planes have zero thickness: extend them on their back side (-Z local for
  // a PlaneGeometry) so the visible face stays the contact face.
  for (const axis of ['x', 'y', 'z'] as const) {
    if (half[axis] < 0.01) {
      half[axis] = MIN_HALF_THICKNESS_M;
      center[axis] -= MIN_HALF_THICKNESS_M;
    }
  }
  matrixWorld.decompose(_pos, _quat, _scale);
  half.multiply(_scale);
  const c: BoxCollider = {
    id,
    surface,
    halfExtents: half,
    center,
    matrixWorld,
    boxToWorld: new Matrix4(),
    worldToBox: new Matrix4(),
  };
  updateCollider(c);
  return c;
}

/** One collider from a mesh whose geometry bounds and world matrix are current. */
export function colliderFromMesh(mesh: Mesh, surface: SurfaceTag): BoxCollider {
  if (mesh.geometry.boundingBox === null) mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox as Box3;
  return makeBoxCollider(mesh.name || mesh.uuid, surface, bounds, mesh.matrixWorld);
}

/**
 * Collect colliders from every mesh under `root` tagged with
 * `userData.surface`. Untagged objects (lights, hands, HUD) are not
 * collidable. Updates world matrices first so freshly built groups work.
 */
export function collidersFromGroup(root: Object3D): BoxCollider[] {
  root.updateWorldMatrix(true, true);
  const out: BoxCollider[] = [];
  root.traverse((object) => {
    const surface = object.userData.surface as unknown;
    if (typeof surface !== 'string' || !SURFACE_TAGS.has(surface)) return;
    const mesh = object as Mesh;
    if (mesh.isMesh !== true) return;
    out.push(colliderFromMesh(mesh, surface as SurfaceTag));
  });
  return out;
}

const _local = new Vector3();
const _closest = new Vector3();
const _delta = new Vector3();

/**
 * Sphere vs. oriented box. Writes the world-space contact point, outward
 * normal and penetration depth into `out`; returns false (out untouched)
 * when the sphere does not overlap the box. Allocation-free.
 */
export function sphereBoxContact(
  center: Vector3,
  radius: number,
  c: BoxCollider,
  out: Contact,
): boolean {
  const h = c.halfExtents;
  _local.copy(center).applyMatrix4(c.worldToBox);
  _closest.set(
    Math.min(h.x, Math.max(-h.x, _local.x)),
    Math.min(h.y, Math.max(-h.y, _local.y)),
    Math.min(h.z, Math.max(-h.z, _local.z)),
  );
  _delta.copy(_local).sub(_closest);
  const dist = _delta.length();

  if (dist > 0) {
    if (dist >= radius) return false;
    out.normal.copy(_delta).divideScalar(dist);
    out.point.copy(_closest);
    out.depth = radius - dist;
  } else {
    // Centre inside the box: exit through the nearest face.
    const dx = h.x - Math.abs(_local.x);
    const dy = h.y - Math.abs(_local.y);
    const dz = h.z - Math.abs(_local.z);
    out.point.copy(_local);
    if (dx <= dy && dx <= dz) {
      const s = _local.x < 0 ? -1 : 1;
      out.normal.set(s, 0, 0);
      out.point.x = s * h.x;
      out.depth = radius + dx;
    } else if (dy <= dz) {
      const s = _local.y < 0 ? -1 : 1;
      out.normal.set(0, s, 0);
      out.point.y = s * h.y;
      out.depth = radius + dy;
    } else {
      const s = _local.z < 0 ? -1 : 1;
      out.normal.set(0, 0, s);
      out.point.z = s * h.z;
      out.depth = radius + dz;
    }
  }
  out.point.applyMatrix4(c.boxToWorld);
  out.normal.transformDirection(c.boxToWorld);
  out.collider = c;
  return true;
}

const _scratch = makeContact();

export class CollisionWorld {
  readonly colliders: BoxCollider[] = [];

  add(...colliders: BoxCollider[]): void {
    this.colliders.push(...colliders);
  }

  /** Deepest contact for the sphere, if any. */
  nearest(center: Vector3, radius: number, out: Contact): boolean {
    let found = false;
    let best = -Infinity;
    for (const c of this.colliders) {
      if (!sphereBoxContact(center, radius, c, _scratch)) continue;
      if (_scratch.depth <= best) continue;
      best = _scratch.depth;
      out.point.copy(_scratch.point);
      out.normal.copy(_scratch.normal);
      out.depth = _scratch.depth;
      out.collider = _scratch.collider;
      found = true;
    }
    return found;
  }

  /** Every contact for the sphere; the contact object is reused per call. */
  forEachContact(center: Vector3, radius: number, cb: (contact: Contact) => void): void {
    for (const c of this.colliders) {
      if (sphereBoxContact(center, radius, c, _scratch)) cb(_scratch);
    }
  }
}
