import * as THREE from 'three';
import { tileRect, type TileName } from './atlas';
import { makeBoxCollider, type BoxCollider, type SurfaceTag } from './collision';

// A chunk is the unit of world authoring: builders add box parts; build()
// merges every part into one mesh (tiled atlas UVs, baked vertex occlusion)
// and emits one oriented-box collider per collidable part. Simple collision
// under merged visuals, one draw per chunk.

export interface PartTiles {
  sides: TileName;
  top?: TileName;
  bottom?: TileName;
}

export interface BoxPart {
  name?: string;
  /** Full size, m. */
  size: [number, number, number];
  /** Centre, m. */
  position: [number, number, number];
  /** Euler XYZ, radians. */
  rotation?: [number, number, number];
  tiles: PartTiles;
  /** World metres per tile repeat (default 2). */
  uvScale?: number;
  surface: SurfaceTag;
  /** Visual only (decals such as windows). */
  noCollide?: boolean;
  /** Vertex colour multiplier, hex (default white). */
  tint?: number;
}

export interface BuiltChunk {
  mesh: THREE.Mesh;
  colliders: BoxCollider[];
  partCount: number;
  vertexCount: number;
}

const DEFAULT_UV_SCALE = 2;
const GROUND_AO = 0.55;
const GROUND_AO_HEIGHT = 0.6;
const OVERHANG_AO = 0.7;
const OVERHANG_MIN = 0.05;
const OVERHANG_MAX = 0.6;
const CORNER_AO = 0.85;
const CORNER_REACH = 0.08;

// Face bases: normal, u axis, v axis (all in box-local space).
const FACES: {
  n: [number, number, number];
  u: [number, number, number];
  v: [number, number, number];
  slot: 'sides' | 'top' | 'bottom';
}[] = [
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], slot: 'sides' },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], slot: 'sides' },
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], slot: 'sides' },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], slot: 'sides' },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], slot: 'top' },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], slot: 'bottom' },
];

interface Arrays {
  position: number[];
  normal: number[];
  uv: number[];
  color: number[];
  /** Part index per vertex (for the occlusion bake). */
  part: number[];
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _e = new THREE.Euler();

export function partMatrix(part: BoxPart, out = new THREE.Matrix4()): THREE.Matrix4 {
  const r = part.rotation ?? [0, 0, 0];
  _e.set(r[0], r[1], r[2]);
  return out
    .makeRotationFromEuler(_e)
    .setPosition(part.position[0], part.position[1], part.position[2]);
}

/** Append one box's six tiled faces to the arrays. */
export function appendBoxPart(part: BoxPart, partIndex: number, arrays: Arrays): number {
  const [w, h, d] = part.size;
  const half = [w / 2, h / 2, d / 2];
  const uvScale = part.uvScale ?? DEFAULT_UV_SCALE;
  const tint = new THREE.Color(part.tint ?? 0xffffff);
  partMatrix(part, _m);
  let added = 0;
  for (const face of FACES) {
    const tile = part.tiles[face.slot] ?? part.tiles.sides;
    const rect = tileRect(tile);
    // Face extents along its u and v axes.
    const extent = (axis: [number, number, number]): number =>
      Math.abs(axis[0]) * w + Math.abs(axis[1]) * h + Math.abs(axis[2]) * d;
    const fw = extent(face.u);
    const fh = extent(face.v);
    const repU = Math.max(1, Math.round(fw / uvScale));
    const repV = Math.max(1, Math.round(fh / uvScale));
    const centre = [face.n[0] * half[0], face.n[1] * half[1], face.n[2] * half[2]];
    _n.set(face.n[0], face.n[1], face.n[2]).transformDirection(_m);
    for (let i = 0; i < repU; i++) {
      for (let j = 0; j < repV; j++) {
        const u0 = -0.5 + i / repU;
        const u1 = -0.5 + (i + 1) / repU;
        const v0 = -0.5 + j / repV;
        const v1 = -0.5 + (j + 1) / repV;
        const corners: [number, number, number, number][] = [
          [u0, v0, rect.u0, rect.v0],
          [u1, v0, rect.u1, rect.v0],
          [u1, v1, rect.u1, rect.v1],
          [u0, v0, rect.u0, rect.v0],
          [u1, v1, rect.u1, rect.v1],
          [u0, v1, rect.u0, rect.v1],
        ];
        for (const [cu, cv, tu, tv] of corners) {
          _p.set(
            centre[0] + face.u[0] * cu * fw + face.v[0] * cv * fh,
            centre[1] + face.u[1] * cu * fw + face.v[1] * cv * fh,
            centre[2] + face.u[2] * cu * fw + face.v[2] * cv * fh,
          ).applyMatrix4(_m);
          arrays.position.push(_p.x, _p.y, _p.z);
          arrays.normal.push(_n.x, _n.y, _n.z);
          arrays.uv.push(tu, tv);
          arrays.color.push(tint.r, tint.g, tint.b);
          arrays.part.push(partIndex);
          added++;
        }
      }
    }
  }
  return added;
}

interface PartFrame {
  inverse: THREE.Matrix4;
  half: [number, number, number];
  bottomY: number;
}

/**
 * Cheap baked occlusion: darker near the ground, under overhangs, and in
 * inside corners. Multiplies the colour attribute in place.
 * ponytail: O(vertices × parts); add a spatial hash past ~2k parts.
 */
export function bakeVertexAO(arrays: Arrays, parts: BoxPart[]): void {
  const frames: PartFrame[] = parts.map((part) => {
    const m = partMatrix(part);
    return {
      inverse: m.clone().invert(),
      half: [part.size[0] / 2, part.size[1] / 2, part.size[2] / 2],
      bottomY: part.position[1] - part.size[1] / 2,
    };
  });
  const local = new THREE.Vector3();
  const count = arrays.position.length / 3;
  for (let v = 0; v < count; v++) {
    const x = arrays.position[v * 3];
    const y = arrays.position[v * 3 + 1];
    const z = arrays.position[v * 3 + 2];
    let ao = THREE.MathUtils.lerp(GROUND_AO, 1, Math.min(1, Math.max(0, y / GROUND_AO_HEIGHT)));
    const own = arrays.part[v];
    for (let p = 0; p < frames.length; p++) {
      if (p === own || parts[p].noCollide === true) continue;
      const f = frames[p];
      local.set(x, y, z).applyMatrix4(f.inverse);
      const inX = Math.abs(local.x) <= f.half[0];
      const inZ = Math.abs(local.z) <= f.half[2];
      // Under an overhang: inside the footprint, below the part's bottom by a little.
      const below = f.bottomY - y;
      if (inX && inZ && below > OVERHANG_MIN && below < OVERHANG_MAX) ao *= OVERHANG_AO;
      // Inside corner: just outside the part's volume.
      const inExpanded =
        Math.abs(local.x) <= f.half[0] + CORNER_REACH &&
        Math.abs(local.y) <= f.half[1] + CORNER_REACH &&
        Math.abs(local.z) <= f.half[2] + CORNER_REACH;
      const inside =
        Math.abs(local.x) < f.half[0] - 0.01 &&
        Math.abs(local.y) < f.half[1] - 0.01 &&
        Math.abs(local.z) < f.half[2] - 0.01;
      if (inExpanded && !inside) ao *= CORNER_AO;
    }
    arrays.color[v * 3] *= ao;
    arrays.color[v * 3 + 1] *= ao;
    arrays.color[v * 3 + 2] *= ao;
  }
}

export class Chunk {
  readonly parts: BoxPart[] = [];

  constructor(readonly name: string) {}

  add(part: BoxPart): BoxPart {
    this.parts.push(part);
    return part;
  }

  build(material: THREE.Material): BuiltChunk {
    const arrays: Arrays = { position: [], normal: [], uv: [], color: [], part: [] };
    let vertexCount = 0;
    this.parts.forEach((part, i) => {
      vertexCount += appendBoxPart(part, i, arrays);
    });
    bakeVertexAO(arrays, this.parts);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(arrays.position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(arrays.normal, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(arrays.uv, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(arrays.color, 3));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = this.name;

    const colliders: BoxCollider[] = [];
    this.parts.forEach((part, i) => {
      if (part.noCollide === true) return;
      const [w, h, d] = part.size;
      colliders.push(
        makeBoxCollider(
          part.name ?? `${this.name}:${i}`,
          part.surface,
          new THREE.Box3(
            new THREE.Vector3(-w / 2, -h / 2, -d / 2),
            new THREE.Vector3(w / 2, h / 2, d / 2),
          ),
          partMatrix(part),
        ),
      );
    });
    return { mesh, colliders, partCount: this.parts.length, vertexCount };
  }
}
