import * as THREE from 'three';
import type { GorillaParts } from './gorilla';
import {
  advancePose,
  makePose,
  solveTwoBoneIK,
  type IKResult,
  type MotionState,
  type Pose,
} from './gorillaPose';
import type { Locomotion } from './locomotion';
import { tuning, type MovementTuning } from './movementTuning';
import type { PlayerRig } from './placeholderPlayer';

// Applies pose math to gorilla parts. The player's gorilla hangs below and
// behind the head (view discipline) and answers the tracked hands through
// arm IK; crowd gorillas reuse applyGorillaPose with scripted targets.
// Nothing here ever moves a camera or a hand group.

const NEG_Y = new THREE.Vector3(0, -1, 0);
const FORWARD = new THREE.Vector3(0, 0, -1);
const UP = new THREE.Vector3(0, 1, 0);
const YAW_RATE = 10; // 1/s
const SAG_DROP_M = 0.15;
const SAG_PITCH_RAD = 0.5;

const _fwd = new THREE.Vector3();
const _yawTarget = new THREE.Quaternion();
const _offset = new THREE.Vector3();
const _shoulderW = new THREE.Vector3();
const _handW = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _dir = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _lean = new THREE.Quaternion();
const _pitch = new THREE.Quaternion();
const _ik: IKResult = { elbow: new THREE.Vector3(), reach: 0 };

/** Yaw-only quaternion facing the horizontal part of `forward`. */
export function yawFromForward(forward: THREE.Vector3, out: THREE.Quaternion): THREE.Quaternion {
  _fwd.set(forward.x, 0, forward.z);
  if (_fwd.lengthSq() < 1e-6) return out.identity();
  _fwd.normalize();
  return out.setFromUnitVectors(FORWARD, _fwd);
}

/**
 * Pose the parts: torso lean/sag, legs, and both arms solved from the
 * shoulders to the given world-space hand targets. `parts.root` must
 * already carry the yaw and be positioned by the caller.
 */
export function applyGorillaPose(
  parts: GorillaParts,
  pose: Pose,
  handTargetsWorld: readonly [THREE.Vector3, THREE.Vector3],
  t: MovementTuning = tuning,
): void {
  // Torso: lean into motion (axis = up × direction, in root space), sag pitch.
  parts.root.getWorldQuaternion(_q);
  _axis.copy(UP).cross(pose.leanDir);
  if (_axis.lengthSq() > 1e-8) {
    _axis.normalize().applyQuaternion(_q.invert());
    _lean.setFromAxisAngle(_axis, THREE.MathUtils.degToRad(pose.leanDeg));
  } else {
    _lean.identity();
  }
  _pitch.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pose.sag * SAG_PITCH_RAD);
  parts.torso.quaternion.copy(_lean).multiply(_pitch);
  parts.torso.position.y = -pose.sag * SAG_DROP_M + pose.hipBob;

  parts.leg[0].rotation.x = pose.legSwing[0];
  parts.leg[1].rotation.x = pose.legSwing[1];

  parts.root.updateWorldMatrix(true, true);
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    const pivot = parts.shoulder[i];
    pivot.getWorldPosition(_shoulderW);
    _handW.copy(handTargetsWorld[i]);
    // Elbows bend down, outward and back: a knuckle-walker's arms.
    _pole
      .set(side * 0.5, -1, 0.35)
      .applyQuaternion(parts.root.getWorldQuaternion(_q))
      .normalize();
    solveTwoBoneIK(_shoulderW, _handW, t.upperArmM, t.forearmM, _pole, _ik);

    // Upper arm: local -Y toward the elbow (in the torso's frame).
    parts.torso.getWorldQuaternion(_q).invert();
    _dir.copy(_ik.elbow).sub(_shoulderW).applyQuaternion(_q).normalize();
    pivot.quaternion.setFromUnitVectors(NEG_Y, _dir);
    pivot.updateWorldMatrix(false, false);
    // Forearm: local -Y from the elbow toward the hand (in the pivot's frame).
    pivot.getWorldQuaternion(_q).invert();
    _dir.copy(_handW).sub(_ik.elbow).applyQuaternion(_q).normalize();
    parts.elbow[i].quaternion.setFromUnitVectors(NEG_Y, _dir);
  }
}

export interface GorillaRig {
  update(dt: number): void;
  readonly pose: Pose;
}

const _yaw = new THREE.Quaternion();

export function buildGorillaRig(
  rig: PlayerRig,
  locomotion: Locomotion,
  t: MovementTuning = tuning,
): GorillaRig {
  const pose = makePose();
  const state: MotionState = { velocity: new THREE.Vector3(), grounded: true, landingImpulse: 0 };
  let landing = 0;
  const previous = locomotion.events.landed;
  locomotion.events.landed = (speed, surface) => {
    previous?.(speed, surface);
    landing = speed;
  };
  const handTargets: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(), new THREE.Vector3()];
  let first = true;

  return {
    pose,
    update(dt: number): void {
      state.velocity.copy(locomotion.velocity);
      state.grounded = locomotion.grounded;
      state.landingImpulse = landing;
      landing = 0;
      advancePose(pose, state, dt, t);

      // Torso hangs below and behind the head, following head yaw (smoothed).
      const head = rig.head;
      _fwd.copy(FORWARD).applyQuaternion(head.quaternion);
      yawFromForward(_fwd, _yawTarget);
      if (first) {
        _yaw.copy(_yawTarget);
        first = false;
      } else {
        _yaw.slerp(_yawTarget, 1 - Math.exp(-YAW_RATE * dt));
      }
      _offset.set(0, -t.torsoBelowHeadM, t.torsoBehindHeadM).applyQuaternion(_yaw);
      rig.group.position.copy(head.position).add(_offset);
      rig.gorilla.root.quaternion.copy(_yaw);

      rig.handLeft.getWorldPosition(handTargets[0]);
      rig.handRight.getWorldPosition(handTargets[1]);
      applyGorillaPose(rig.gorilla, pose, handTargets, t);
    },
  };
}
