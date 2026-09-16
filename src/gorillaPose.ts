import { Vector3 } from 'three';
import { tuning, type MovementTuning } from './movementTuning';

// Pure pose math for the gorilla: analytic two-bone arm IK, and torso lean,
// gravity sag and a knuckle-walk gait derived from motion state. No scene
// objects; gorillaRig.ts applies the result to the parts.

export interface IKResult {
  /** World elbow position. */
  elbow: Vector3;
  /** 0..1, 1 = fully extended (target at or beyond reach). */
  reach: number;
}

const _d = new Vector3();
const _dir = new Vector3();
const _perp = new Vector3();

/**
 * Place the elbow so the shoulder→elbow→target chain has the given bone
 * lengths, bending toward `pole`. When the target is out of reach the chain
 * points straight at it.
 */
export function solveTwoBoneIK(
  shoulder: Vector3,
  target: Vector3,
  upper: number,
  lower: number,
  pole: Vector3,
  out: IKResult,
): void {
  _d.copy(target).sub(shoulder);
  let dist = _d.length();
  if (dist < 1e-6) {
    _dir.set(0, -1, 0);
    dist = 1e-6;
  } else {
    _dir.copy(_d).divideScalar(dist);
  }
  const maxLen = upper + lower;
  if (dist >= maxLen) {
    out.elbow.copy(shoulder).addScaledVector(_dir, upper);
    out.reach = 1;
    return;
  }
  dist = Math.max(dist, Math.abs(upper - lower) + 1e-4);
  const cosA = Math.min(
    1,
    Math.max(-1, (upper * upper + dist * dist - lower * lower) / (2 * upper * dist)),
  );
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  // Bend direction: the pole's component perpendicular to the chain.
  _perp.copy(pole).addScaledVector(_dir, -pole.dot(_dir));
  if (_perp.lengthSq() < 1e-8) {
    _perp.set(0, -1, 0).addScaledVector(_dir, _dir.y);
    if (_perp.lengthSq() < 1e-8) _perp.set(1, 0, 0).addScaledVector(_dir, -_dir.x);
  }
  _perp.normalize();
  out.elbow
    .copy(shoulder)
    .addScaledVector(_dir, upper * cosA)
    .addScaledVector(_perp, upper * sinA);
  out.reach = dist / maxLen;
}

export interface MotionState {
  velocity: Vector3;
  grounded: boolean;
  /** Impact speed of a landing this frame (0 otherwise). */
  landingImpulse: number;
}

export interface Pose {
  /** Lean into motion, degrees. */
  leanDeg: number;
  /** Unit horizontal direction of motion the lean is toward (zero at rest). */
  leanDir: Vector3;
  /** Crouch, 0..1. */
  sag: number;
  /** Knuckle-walk cycle, radians. */
  gaitPhase: number;
  /** Hip bob, m. */
  hipBob: number;
  /** Leg swing angles, radians. */
  legSwing: [number, number];
  /** The decaying landing part of `sag` (bookkeeping). */
  landingExtra: number;
}

export function makePose(): Pose {
  return {
    leanDeg: 0,
    leanDir: new Vector3(),
    sag: 0,
    gaitPhase: 0,
    hipBob: 0,
    legSwing: [0, 0],
    landingExtra: 0,
  };
}

const LANDING_DECAY = 6; // 1/s
const SAG_RATE = 4; // 1/s

/** Advance the pose one frame from the motion state. */
export function advancePose(
  pose: Pose,
  state: MotionState,
  dt: number,
  t: MovementTuning = tuning,
): void {
  const vx = state.velocity.x;
  const vz = state.velocity.z;
  const speedH = Math.hypot(vx, vz);

  pose.leanDeg = Math.min(t.leanMaxDeg, speedH * t.leanPerMps);
  if (speedH > 1e-3) pose.leanDir.set(vx / speedH, 0, vz / speedH);
  else pose.leanDir.set(0, 0, 0);

  const sagTarget = state.grounded ? 0 : t.sagAirborne;
  const ease = 1 - Math.exp(-SAG_RATE * dt);
  // Landing impulse adds sag instantly and decays; the eased base follows grounded state.
  const base = pose.sag - pose.landingExtra;
  const newBase = base + (sagTarget - base) * ease;
  const extra =
    pose.landingExtra * Math.exp(-LANDING_DECAY * dt) + state.landingImpulse * t.sagLanding;
  pose.landingExtra = extra;
  pose.sag = Math.min(1, newBase + extra);

  if (state.grounded && speedH > 1e-3) {
    pose.gaitPhase = (pose.gaitPhase + (speedH / t.gaitStrideM) * Math.PI * 2 * dt) % (Math.PI * 2);
  }
  const gaitScale = Math.min(1, speedH);
  pose.hipBob = Math.abs(Math.sin(pose.gaitPhase)) * t.gaitBobM * gaitScale;
  pose.legSwing = [
    Math.sin(pose.gaitPhase) * 0.5 * gaitScale,
    Math.sin(pose.gaitPhase + Math.PI) * 0.5 * gaitScale,
  ];
}
