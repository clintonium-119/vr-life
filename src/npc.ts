import * as THREE from 'three';
import type { Appearance } from './appearance';
import { buildGorilla, type GorillaParts } from './gorilla';
import { advancePose, makePose, type MotionState, type Pose } from './gorillaPose';
import { applyGorillaPose, yawFromForward } from './gorillaRig';
import { tuning, type MovementTuning } from './movementTuning';

// An NPC: a third-person gorilla with its own behaviour state. Walkers
// stroll between sidewalk waypoints and pause; standing NPCs (teachers,
// shopkeepers) sway in place; any NPC can be knocked over into a dazed
// sit, then dusts off and resumes. No shared state, no pathfinding.

export type NpcRole = 'pedestrian' | 'shopkeeper' | 'teacher';
export type NpcState = 'walk' | 'pause' | 'react' | 'stand';

export interface NpcSpec {
  role: NpcRole;
  appearance: Appearance;
  /** Feet position. */
  position: THREE.Vector3;
  yaw?: number;
  /** Waypoints (feet positions) walked back and forth; walkers only. */
  route?: THREE.Vector3[];
  seed?: number;
}

const SHOULDER_HEIGHT_M = 0.8;
const ARRIVE_M = 0.4;
const PAUSE_MIN_S = 1;
const PAUSE_MAX_S = 3;
const DAZED_S = 2;
const RECOVER_S = 0.6;
const FALL_ROLL_RAD = 1.05;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _fwd = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _swing = new THREE.Vector3();
const _fall = new THREE.Quaternion();
const _axis = new THREE.Vector3();

export class Npc {
  readonly parts: GorillaParts;
  readonly pose: Pose = makePose();
  readonly position: THREE.Vector3;
  readonly velocity = new THREE.Vector3();
  state: NpcState;
  yaw: number;
  route: THREE.Vector3[];
  waypoint = 0;
  private direction = 1;
  private timer = 0;
  private fallDir = new THREE.Vector3(1, 0, 0);
  private readonly rnd: () => number;
  private readonly motion: MotionState = {
    velocity: new THREE.Vector3(),
    grounded: true,
    landingImpulse: 0,
  };
  private readonly hands: [THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  /** Number of knock-overs so far (for tests and comedy stats). */
  knockedOver = 0;

  constructor(readonly spec: NpcSpec) {
    this.parts = buildGorilla(spec.appearance);
    for (const h of this.parts.hand) this.parts.root.add(h);
    this.position = spec.position.clone();
    this.yaw = spec.yaw ?? 0;
    this.route = spec.route ?? [];
    this.state = this.route.length > 1 ? 'walk' : 'stand';
    this.rnd = mulberry32(spec.seed ?? 1);
    this.parts.root.position.set(
      this.position.x,
      this.position.y + SHOULDER_HEIGHT_M,
      this.position.z,
    );
    this.parts.root.rotation.y = this.yaw;
  }

  /** Knock the NPC over away from `from` (a world position). */
  knockOver(from: THREE.Vector3): void {
    if (this.state === 'react') return;
    this.fallDir.set(this.position.x - from.x, 0, this.position.z - from.z);
    if (this.fallDir.lengthSq() < 1e-6) this.fallDir.set(1, 0, 0);
    this.fallDir.normalize();
    this.state = 'react';
    this.timer = 0;
    this.knockedOver += 1;
    this.velocity.set(0, 0, 0);
  }

  private target(): THREE.Vector3 {
    return this.route[this.waypoint];
  }

  private advanceWaypoint(): void {
    let next = this.waypoint + this.direction;
    if (next >= this.route.length || next < 0) {
      this.direction = -this.direction;
      next = this.waypoint + this.direction;
    }
    this.waypoint = Math.max(0, Math.min(this.route.length - 1, next));
  }

  /** Behaviour + motion (always). */
  step(dt: number, t: MovementTuning = tuning): void {
    this.velocity.set(0, 0, 0);
    switch (this.state) {
      case 'walk': {
        const to = this.target();
        const dx = to.x - this.position.x;
        const dz = to.z - this.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < ARRIVE_M) {
          this.state = 'pause';
          this.timer = PAUSE_MIN_S + this.rnd() * (PAUSE_MAX_S - PAUSE_MIN_S);
          this.advanceWaypoint();
          break;
        }
        const step = Math.min(dist, t.npcWalkSpeed * dt);
        this.position.x += (dx / dist) * step;
        this.position.z += (dz / dist) * step;
        this.velocity.set((dx / dist) * t.npcWalkSpeed, 0, (dz / dist) * t.npcWalkSpeed);
        this.yaw = Math.atan2(dx, dz) + Math.PI; // forward is -z at yaw 0
        break;
      }
      case 'pause':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'walk';
        break;
      case 'react':
        this.timer += dt;
        if (this.timer >= DAZED_S + RECOVER_S)
          this.state = this.route.length > 1 ? 'walk' : 'stand';
        break;
      case 'stand':
        break;
    }
  }

  /** Pose + transforms (only when drawn). */
  present(dt: number, t: MovementTuning = tuning): void {
    const root = this.parts.root;
    this.motion.velocity.copy(this.velocity);
    advancePose(this.pose, this.motion, dt, t);
    let sag = this.pose.sag;
    let roll = 0;
    if (this.state === 'react') {
      const k =
        this.timer < DAZED_S
          ? Math.min(1, this.timer / 0.25)
          : Math.max(0, 1 - (this.timer - DAZED_S) / RECOVER_S);
      sag = Math.max(sag, k);
      roll = FALL_ROLL_RAD * k;
    }
    root.position.set(
      this.position.x,
      this.position.y + SHOULDER_HEIGHT_M - sag * 0.45,
      this.position.z,
    );
    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    yawFromForward(_fwd, _q);
    if (roll > 0) {
      _axis.set(-this.fallDir.z, 0, this.fallDir.x); // perpendicular to the fall direction
      _fall.setFromAxisAngle(_axis, -roll);
      _q.premultiply(_fall);
    }
    root.quaternion.copy(_q);
    root.updateWorldMatrix(true, false);

    // Knuckle-walk hand targets, swinging with the gait while moving.
    const walking = this.velocity.lengthSq() > 1e-4;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const phase = this.pose.gaitPhase + (i === 0 ? Math.PI : 0);
      const stride = walking ? Math.sin(phase) * 0.25 : 0;
      _swing
        .set(side * (t.shoulderWidthM / 2 + 0.05), -SHOULDER_HEIGHT_M + 0.07, -0.35 + stride)
        .applyQuaternion(root.quaternion);
      this.hands[i].copy(root.position).add(_swing);
      this.hands[i].y = Math.max(
        this.position.y + 0.07,
        this.hands[i].y + (walking ? Math.max(0, Math.cos(phase)) * 0.12 : 0),
      );
      this.parts.hand[i].position
        .copy(this.hands[i])
        .sub(root.position)
        .applyQuaternion(_q.copy(root.quaternion).invert());
    }
    this.pose.sag = sag;
    applyGorillaPose(this.parts, this.pose, this.hands, t);
  }
}

export function buildNpc(spec: NpcSpec): Npc {
  return new Npc(spec);
}

/** Owns every NPC in the scene; draws only the near ones. */
export class NpcManager {
  readonly npcs: Npc[] = [];
  readonly group = new THREE.Group();
  visibleCount = 0;

  constructor() {
    this.group.name = 'npcs';
  }

  add(npc: Npc): Npc {
    this.npcs.push(npc);
    this.group.add(npc.parts.root);
    return npc;
  }

  update(dt: number, playerPos: THREE.Vector3, t: MovementTuning = tuning): void {
    let visible = 0;
    for (const npc of this.npcs) {
      npc.step(dt, t);
      const near = npc.position.distanceTo(playerPos) <= t.npcViewDistanceM;
      npc.parts.root.visible = near;
      if (near) {
        visible++;
        npc.present(dt, t);
      }
    }
    this.visibleCount = visible;
  }
}
