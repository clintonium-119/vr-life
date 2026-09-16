import * as THREE from 'three';
import { type CollisionWorld, type SurfaceTag } from './collision';
import { HandAnchor, VelocityTracker } from './handAnchor';
import { tuning, type MovementTuning } from './movementTuning';
import { PlayerBody } from './playerBody';
import type { PlayerRig } from './placeholderPlayer';

// Frame-loop integration of the movement model against the rig. Each frame:
// read the head and hand world positions, update the hand anchors, move the
// rig root by their combined correction (the push), then step the body
// sphere and move the rig root by whatever the body moved (gravity, slide,
// nudge out of walls). Only the rig root ever moves: the camera and hands
// stay 1:1 with the player's real head and controllers.
//
// The body sphere sits on the virtual floor under the head: its centre is
// `eyeHeightOffset + bodyRadius` above the rig's floor plane, at the head's
// horizontal position. Rig-relative (not head-relative) so a physical crouch
// lowers the eye instead of being cancelled by the floor pushing back.

export interface LocomotionEvents {
  slap?(speed: number, surface: SurfaceTag): void;
  landed?(speed: number, surface: SurfaceTag): void;
  bump?(speed: number, surface: SurfaceTag): void;
}

export interface Locomotion {
  /** Advance one frame; dt in seconds (clamped internally). */
  update(dt: number): void;
  /** Current body velocity (tracked rig velocity while a hand holds). */
  readonly velocity: THREE.Vector3;
  readonly anchored: boolean;
  readonly grounded: boolean;
  events: LocomotionEvents;
  /** Forget all motion (after a dev teleport). */
  teleportReset(): void;
}

const MAX_DT = 0.05;

const _head = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _corr = new THREE.Vector3();
const _target = new THREE.Vector3();
const _before = new THREE.Vector3();

export function buildLocomotion(
  rig: PlayerRig,
  world: CollisionWorld,
  t: MovementTuning = tuning,
): Locomotion {
  const body = new PlayerBody(world, t);
  const anchors = [new HandAnchor(world, t), new HandAnchor(world, t)];
  const hands = [rig.handLeft, rig.handRight];
  const tracker = new VelocityTracker(t);
  let wasAnchored = false;

  const events: LocomotionEvents = {};
  const handEvents = { slap: (s: number, surf: SurfaceTag) => events.slap?.(s, surf) };
  const bodyEvents = {
    landed: (s: number, surf: SurfaceTag) => events.landed?.(s, surf),
    bump: (s: number, surf: SurfaceTag) => events.bump?.(s, surf),
  };

  function bodyTarget(out: THREE.Vector3): void {
    rig.head.getWorldPosition(_head);
    out.set(_head.x, rig.root.position.y + t.eyeHeightOffset + t.bodyRadius, _head.z);
  }

  return {
    events,
    get velocity(): THREE.Vector3 {
      return wasAnchored ? tracker.velocity : body.velocity;
    },
    get anchored(): boolean {
      return wasAnchored;
    },
    get grounded(): boolean {
      return body.grounded;
    },

    update(rawDt: number): void {
      const dt = Math.min(Math.max(rawDt, 0), MAX_DT);
      if (dt === 0) return;
      // Fresh world matrices for the rig's children (poses were written this frame).
      rig.root.updateWorldMatrix(false, true);

      for (let i = 0; i < 2; i++) {
        hands[i].getWorldPosition(_hand);
        anchors[i].update(_hand, dt, handEvents);
      }
      const anyAnchored = HandAnchor.combine(anchors, dt, t, _corr);

      if (anyAnchored) {
        if (!wasAnchored) tracker.velocity.copy(body.velocity);
        wasAnchored = true;
        rig.root.position.add(_corr);
        tracker.push(_corr, dt);
        rig.root.updateWorldMatrix(false, true);
        bodyTarget(_target);
        body.position.copy(_target);
        body.velocity.set(0, 0, 0);
        body.step(dt, true, bodyEvents);
      } else {
        if (wasAnchored) body.velocity.copy(tracker.velocity);
        wasAnchored = false;
        bodyTarget(_target);
        body.position.copy(_target);
        body.step(dt, false, bodyEvents);
      }
      // Whatever the body moved (gravity, slide, nudge), the whole rig follows.
      _before.copy(body.position).sub(_target);
      rig.root.position.add(_before);
    },

    teleportReset(): void {
      body.teleportTo(body.position);
      tracker.reset();
      wasAnchored = false;
      for (const a of anchors) {
        a.release();
        a.resetHistory();
      }
    },
  };
}
