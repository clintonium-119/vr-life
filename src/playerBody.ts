import { Vector3 } from 'three';
import { makeContact, type BoxCollider, type CollisionWorld, type SurfaceTag } from './collision';
import { tuning, type MovementTuning } from './movementTuning';

// The body: one sphere hung below the head. Gravity whenever no hand holds,
// substepped sweeps so it never tunnels a wall at speed, iterative
// depenetration that removes only the into-surface velocity (a wall at speed
// becomes a slide, the ground becomes a rest), light ground friction, hard
// speed cap. Pure math; the rig integration lives in locomotion.ts.

export interface BodyEvents {
  /** Grounded transition with impact speed at or above the landing threshold. */
  landed?(speedInto: number, surface: SurfaceTag): void;
  /** A non-ground contact removed more than 1 m/s of into-surface velocity. */
  bump?(speedInto: number, surface: SurfaceTag): void;
}

const GROUND_NORMAL_Y = 0.7;
const MAX_SUBSTEPS = 16;
const DEPENETRATION_ITERATIONS = 4;
const BUMP_SPEED = 1;

const _disp = new Vector3();
const _sub = new Vector3();
const _contact = makeContact();

export class PlayerBody {
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  grounded = false;
  /** The collider under the body this step (null when airborne). */
  groundCollider: BoxCollider | null = null;

  constructor(
    private readonly world: CollisionWorld,
    private readonly t: MovementTuning = tuning,
  ) {}

  /** Place the body at rest (dev teleport). */
  teleportTo(center: Vector3): void {
    this.position.copy(center);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
  }

  step(dt: number, hasAnchor: boolean, events?: BodyEvents): void {
    const t = this.t;
    const v = this.velocity;

    if (!hasAnchor) {
      v.y -= t.gravity * dt;
      if (this.grounded) {
        const f = Math.max(0, 1 - t.groundFriction * dt);
        v.x *= f;
        v.z *= f;
      }
    }
    const speed = v.length();
    if (speed > t.speedCap) v.multiplyScalar(t.speedCap / speed);

    _disp.copy(v).multiplyScalar(dt);
    const n = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(_disp.length() / t.maxSubstepDistance)));
    _sub.copy(_disp).divideScalar(n);

    const wasGrounded = this.grounded;
    let grounded = false;
    let groundCollider: BoxCollider | null = null;
    let landingSpeed = 0;
    let landingSurface: SurfaceTag = 'ground';
    let bumpSpeed = 0;
    let bumpSurface: SurfaceTag = 'stone';

    for (let i = 0; i < n; i++) {
      this.position.add(_sub);
      for (let iter = 0; iter < DEPENETRATION_ITERATIONS; iter++) {
        let any = false;
        this.world.forEachContact(this.position, t.bodyRadius, (c) => {
          any = true;
          this.position.addScaledVector(c.normal, c.depth);
          const isGround = c.normal.y > GROUND_NORMAL_Y;
          if (isGround) {
            grounded = true;
            groundCollider = c.collider;
          }
          const into = -v.dot(c.normal);
          if (into <= 0) return;
          v.addScaledVector(c.normal, into); // slide: drop the into-surface component
          const surface = c.collider?.surface ?? 'stone';
          if (isGround) {
            if (into > landingSpeed) {
              landingSpeed = into;
              landingSurface = surface;
            }
          } else if (into > bumpSpeed) {
            bumpSpeed = into;
            bumpSurface = surface;
          }
        });
        if (!any) break;
      }
    }
    _contact.collider = null;

    this.grounded = grounded;
    this.groundCollider = groundCollider;
    if (!wasGrounded && grounded && landingSpeed >= t.landingThudSpeed) {
      events?.landed?.(landingSpeed, landingSurface);
    }
    if (bumpSpeed > BUMP_SPEED) events?.bump?.(bumpSpeed, bumpSurface);
  }
}
