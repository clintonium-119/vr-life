import { Vector3 } from 'three';
import { makeContact, type BoxCollider, type CollisionWorld, type SurfaceTag } from './collision';
import { tuning, type MovementTuning } from './movementTuning';

// The hands: on contact a hand anchors at the contact point, stored in the
// collider's local space (so a moving platform carries the anchor). While
// anchored, the difference between where the hand is and where the anchor
// is becomes a correction the rig must make: pull the hand back along the
// surface and the body goes forward; push into the surface and the body
// lifts. Lifting the hand off the surface releases. Pure math.

export type AnchorState = 'free' | 'anchored';

export interface HandEvents {
  /** Contact made; speed is the hand's approach speed in m/s. */
  slap?(speed: number, surface: SurfaceTag): void;
}

const _contact = makeContact();
const _anchorWorld = new Vector3();
const _tangent = new Vector3();

export class HandAnchor {
  state: AnchorState = 'free';
  collider: BoxCollider | null = null;
  surface: SurfaceTag | null = null;
  /** Rig displacement that would put the hand back on its anchor (unscaled). */
  readonly correction = new Vector3();
  /** Surface normal at the anchor, world space, refreshed each frame. */
  readonly normal = new Vector3();

  private readonly localPoint = new Vector3();
  private readonly localNormal = new Vector3();
  private readonly prevHand = new Vector3();
  private hasPrev = false;

  constructor(
    private readonly world: CollisionWorld,
    private readonly t: MovementTuning = tuning,
  ) {}

  release(): void {
    this.state = 'free';
    this.collider = null;
    this.surface = null;
    this.correction.set(0, 0, 0);
  }

  /** Forget the previous hand position (after a teleport). */
  resetHistory(): void {
    this.hasPrev = false;
  }

  update(hand: Vector3, dt: number, events?: HandEvents): void {
    const speed = this.hasPrev && dt > 0 ? hand.distanceTo(this.prevHand) / dt : 0;
    this.prevHand.copy(hand);
    this.hasPrev = true;

    if (this.state === 'free') {
      this.correction.set(0, 0, 0);
      if (!this.world.nearest(hand, this.t.handRadius, _contact)) return;
      const collider = _contact.collider as BoxCollider;
      this.state = 'anchored';
      this.collider = collider;
      this.surface = collider.surface;
      // Anchor the hand centre where it first touched; pushing further in
      // from here lifts the rig, pulling back along the surface drives it.
      this.localPoint.copy(hand).applyMatrix4(collider.worldToBox);
      this.localNormal.copy(_contact.normal).transformDirection(collider.worldToBox);
      this.normal.copy(_contact.normal);
      this.correction.set(0, 0, 0);
      events?.slap?.(speed, collider.surface);
      return;
    }

    const collider = this.collider as BoxCollider;
    _anchorWorld.copy(this.localPoint).applyMatrix4(collider.boxToWorld);
    this.normal.copy(this.localNormal).transformDirection(collider.boxToWorld);
    this.correction.copy(_anchorWorld).sub(hand);

    // Lift off the surface (hand moved out along the normal) releases.
    const lift = -this.correction.dot(this.normal);
    if (lift > this.t.handReleaseDistance) {
      this.release();
      return;
    }
    // Too much slip along the surface breaks the hold.
    _tangent.copy(this.correction).addScaledVector(this.normal, lift);
    if (_tangent.length() > this.t.handSlipBreak) this.release();
  }

  /**
   * Combine the anchored hands' corrections into this frame's rig move:
   * sum, scaled down when both hands hold, then the spring fraction
   * `1 - exp(-stiffness * dt)`. Returns whether any hand is anchored.
   */
  static combine(
    anchors: readonly HandAnchor[],
    dt: number,
    t: MovementTuning,
    out: Vector3,
  ): boolean {
    let n = 0;
    out.set(0, 0, 0);
    for (const a of anchors) {
      if (a.state !== 'anchored') continue;
      out.add(a.correction);
      n++;
    }
    if (n === 0) return false;
    if (n >= 2) out.multiplyScalar(t.twoHandScale);
    out.multiplyScalar(1 - Math.exp(-t.handStiffness * dt));
    return true;
  }
}

const _rate = new Vector3();

/** Exponential moving average of the rig's velocity while hands hold. */
export class VelocityTracker {
  readonly velocity = new Vector3();

  constructor(private readonly t: MovementTuning = tuning) {}

  push(displacement: Vector3, dt: number): void {
    if (dt <= 0) return;
    _rate.copy(displacement).divideScalar(dt);
    const alpha = 1 - Math.exp(-dt / this.t.velocitySmoothing);
    this.velocity.lerp(_rate, alpha);
  }

  reset(): void {
    this.velocity.set(0, 0, 0);
  }
}
