import { Vector3 } from 'three';
import type { CollisionWorld, SurfaceTag } from './collision';
import { tuning, type MovementTuning } from './movementTuning';

// Props: every object the player can pick up, simulated as one rigid sphere
// against the box collision world (gravity, substepped sweep, bounce with
// restitution, rolling friction), plus the safety rules that make sure no
// prop is ever lost. Pure math; the scene mapping lives in testProps.ts.

export type SizeClass = 'small' | 'large';
export type PropState = 'free' | 'held' | 'stowed';
export type RespawnReason = 'floor' | 'bounds' | 'recall';

export interface PropSpec {
  id: string;
  /** Bounding-sphere radius, m. */
  radius: number;
  /** kg; drives the carry lean. */
  mass: number;
  /** Bounce energy kept, 0..1. */
  restitution?: number;
  /** Tangential velocity decay while rolling on the ground, 1/s. */
  rollingFriction: number;
  sizeClass: SizeClass;
  /** Recalled home when left far away (the backpack). */
  important?: boolean;
  /** What it sounds like when it hits something. */
  surface: SurfaceTag;
  /** Shop goods: price and what buying it does. */
  price?: number;
  effect?: ShopEffect;
  shopId?: string;
}

export type ShopEffect =
  | { kind: 'dye'; color: number }
  | { kind: 'accessory'; slot: 0 | 1; item: 'cap' | 'band' | 'scarf' }
  | { kind: 'snack' }
  | { kind: 'gun' };

export interface PropEvents {
  bounce?(prop: Prop, speedInto: number, surface: SurfaceTag): void;
  respawn?(prop: Prop, reason: RespawnReason): void;
}

const GROUND_NORMAL_Y = 0.7;
const MAX_SUBSTEPS = 16;
const DEPENETRATION_ITERATIONS = 4;
const BOUNCE_EVENT_SPEED = 0.5;
const REST_SPEED = 0.05;

const _disp = new Vector3();
const _sub = new Vector3();
const _tangent = new Vector3();

export class Prop {
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  /** Visual spin, rad/s (axis × magnitude). */
  readonly angularVelocity = new Vector3();
  readonly home: Vector3;
  state: PropState = 'free';
  /** Shop goods: true once paid for. */
  paid = false;
  resting = false;
  /** Seconds spent resting (free, unheld). */
  restTime = 0;

  constructor(
    readonly spec: PropSpec,
    home: Vector3,
  ) {
    this.home = home.clone();
    this.position.copy(home);
  }

  resetToHome(): void {
    this.position.copy(this.home);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.state = 'free';
    this.resting = false;
    this.restTime = 0;
  }
}

/** One frame of free-flight dynamics for a free prop. */
export function stepProp(
  prop: Prop,
  dt: number,
  world: CollisionWorld,
  t: MovementTuning = tuning,
  events?: PropEvents,
): void {
  if (prop.state !== 'free') return;
  const v = prop.velocity;
  const r = prop.spec.radius;
  const restitution = prop.spec.restitution ?? t.propRestitutionDefault;

  v.y -= t.gravity * dt;
  const cap = t.speedCap * 2;
  const speed = v.length();
  if (speed > cap) v.multiplyScalar(cap / speed);

  _disp.copy(v).multiplyScalar(dt);
  const n = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(_disp.length() / t.maxSubstepDistance)));
  _sub.copy(_disp).divideScalar(n);

  let onGround = false;
  for (let i = 0; i < n; i++) {
    prop.position.add(_sub);
    for (let iter = 0; iter < DEPENETRATION_ITERATIONS; iter++) {
      let any = false;
      world.forEachContact(prop.position, r, (c) => {
        any = true;
        prop.position.addScaledVector(c.normal, c.depth);
        const isGround = c.normal.y > GROUND_NORMAL_Y;
        if (isGround) onGround = true;
        const into = -v.dot(c.normal);
        if (into > 0) {
          const out = into * restitution;
          v.addScaledVector(c.normal, into + (out < t.propRestThreshold ? 0 : out));
          if (into > BOUNCE_EVENT_SPEED) {
            events?.bounce?.(prop, into, c.collider?.surface ?? prop.spec.surface);
          }
        }
        // Ground contact: roll along the surface (visual spin).
        if (isGround) prop.angularVelocity.copy(c.normal).cross(v).divideScalar(r);
      });
      if (!any) break;
    }
  }

  if (onGround) {
    // Rolling friction on the tangential (horizontal) part.
    _tangent.set(v.x, 0, v.z);
    const f = Math.max(0, 1 - prop.spec.rollingFriction * dt);
    v.x = _tangent.x * f;
    v.z = _tangent.z * f;
  } else {
    // Free flight keeps whatever spin it had (visual only).
  }

  const slow = v.length() < REST_SPEED;
  prop.resting = onGround && slow;
  if (prop.resting) {
    v.set(0, 0, 0);
    prop.angularVelocity.set(0, 0, 0);
    prop.restTime += dt;
  } else {
    prop.restTime = 0;
  }
}

/** Safety pass; returns the reason if the prop was respawned. */
export function enforceSafety(
  prop: Prop,
  t: MovementTuning,
  playerPos: Vector3 | null,
): RespawnReason | null {
  if (prop.state !== 'free') return null;
  const p = prop.position;
  let reason: RespawnReason | null = null;
  if (p.y < t.worldFloorY) reason = 'floor';
  else if (Math.abs(p.x) > t.worldHalfExtent || Math.abs(p.z) > t.worldHalfExtent)
    reason = 'bounds';
  else if (
    prop.spec.important === true &&
    prop.resting &&
    prop.restTime >= t.recallSeconds &&
    playerPos !== null &&
    p.distanceTo(playerPos) > t.recallDistance
  ) {
    reason = 'recall';
  }
  if (reason !== null) prop.resetToHome();
  return reason;
}

export class PropWorld {
  readonly props: Prop[] = [];

  add(...props: Prop[]): void {
    this.props.push(...props);
  }

  /** Closest free prop whose centre is within `radius` of `point`. */
  nearestFree(point: Vector3, radius: number): Prop | null {
    let best: Prop | null = null;
    let bestDist = radius;
    for (const prop of this.props) {
      if (prop.state !== 'free') continue;
      const d = prop.position.distanceTo(point);
      if (d <= bestDist) {
        bestDist = d;
        best = prop;
      }
    }
    return best;
  }

  step(
    dt: number,
    world: CollisionWorld,
    t: MovementTuning = tuning,
    events?: PropEvents,
    playerPos: Vector3 | null = null,
  ): void {
    for (const prop of this.props) {
      stepProp(prop, dt, world, t, events);
      const reason = enforceSafety(prop, t, playerPos);
      if (reason !== null) events?.respawn?.(prop, reason);
    }
  }

  get restingCount(): number {
    let n = 0;
    for (const p of this.props) if (p.state !== 'free' || p.resting) n++;
    return n;
  }
}
