import * as THREE from 'three';
import { VelocityTracker } from './handAnchor';
import { tuning, type MovementTuning } from './movementTuning';
import type { PlayerRig } from './placeholderPlayer';
import type { Prop, PropWorld } from './props';

// The grab verb. Grip pressed by a free hand → the nearest free prop within
// reach rides that hand kinematically; grip released → the prop leaves with
// the hand's tracked velocity (a throw). Small props released behind the
// back stow at a back socket and free both hands; a grip pressed there with
// nothing in reach takes the last stowed prop back. Large props stay in the
// hand (that hand cannot push: locomotion asks handHolding()) and roll the
// body stub toward the loaded side. Hand slots: 0 = left, 1 = right.

export type StowDecision = 'stow' | 'drop';

export interface GrabEvents {
  grab?(prop: Prop, hand: number): void;
  release?(prop: Prop, speed: number): void;
  stow?(prop: Prop): void;
  unstow?(prop: Prop): void;
}

export interface Grab {
  update(dt: number): void;
  handHolding(hand: number): boolean;
  held(hand: number): Prop | null;
  pressGrip(hand: number): void;
  releaseGrip(hand: number): void;
  /** Take a prop out of whichever hand holds it without a throw. */
  drop(prop: Prop): void;
  readonly stowed: readonly Prop[];
  readonly backSocket: THREE.Object3D;
  events: GrabEvents;
}

/** Nearest free prop within reach of the hand, or null. */
export function selectGrabTarget(
  props: PropWorld,
  hand: THREE.Vector3,
  radius: number,
): Prop | null {
  return props.nearestFree(hand, radius);
}

/** Let a held prop go with the hand's velocity. */
export function applyThrow(prop: Prop, handVelocity: THREE.Vector3, scale: number): void {
  prop.state = 'free';
  prop.velocity.copy(handVelocity).multiplyScalar(scale);
  prop.resting = false;
  prop.restTime = 0;
}

export function stowDecision(
  prop: Prop,
  hand: THREE.Vector3,
  socket: THREE.Vector3,
  t: MovementTuning,
): StowDecision {
  if (prop.spec.sizeClass !== 'small') return 'drop';
  return hand.distanceTo(socket) <= t.stowRadius ? 'stow' : 'drop';
}

/** Signed body roll in degrees toward the loaded side (+ = right). */
export function leanFor(heldMasses: readonly [number, number], t: MovementTuning): number {
  const [left, right] = heldMasses;
  const raw = (right - left) * t.carryLeanDeg;
  return Math.max(-t.carryLeanDeg, Math.min(t.carryLeanDeg, raw));
}

const LEAN_RATE = 6; // 1/s
const STOW_STACK_SPACING_M = 0.12;
const SOCKET_BELOW_HEAD_M = 0.25;
const SOCKET_BEHIND_HEAD_M = 0.25;

const _handPos = new THREE.Vector3();
const _prevHand = [new THREE.Vector3(), new THREE.Vector3()];
const _delta = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _socketWorld = new THREE.Vector3();
const _headBack = new THREE.Vector3();

export function buildGrab(
  rig: PlayerRig,
  props: PropWorld,
  t: MovementTuning = tuning,
  xr: THREE.WebXRManager | null = null,
): Grab {
  const hands = [rig.handLeft, rig.handRight];
  const heldProps: (Prop | null)[] = [null, null];
  const trackers = [new VelocityTracker(t), new VelocityTracker(t)];
  const hasPrev = [false, false];
  const stowed: Prop[] = [];
  const events: GrabEvents = {};

  const backSocket = new THREE.Object3D();
  backSocket.name = 'backSocket';
  rig.root.add(backSocket);

  function handWorld(hand: number, out: THREE.Vector3): THREE.Vector3 {
    return hands[hand].getWorldPosition(out);
  }

  function pressGrip(hand: number): void {
    if (heldProps[hand] !== null) return;
    handWorld(hand, _handPos);
    let prop = selectGrabTarget(props, _handPos, t.grabRadius);
    if (prop === null) {
      backSocket.getWorldPosition(_socketWorld);
      if (stowed.length > 0 && _handPos.distanceTo(_socketWorld) <= t.stowRadius) {
        prop = stowed.pop() as Prop;
        events.unstow?.(prop);
      }
    }
    if (prop === null) return;
    prop.state = 'held';
    prop.velocity.set(0, 0, 0);
    prop.angularVelocity.set(0, 0, 0);
    heldProps[hand] = prop;
    events.grab?.(prop, hand);
  }

  function releaseGrip(hand: number): void {
    const prop = heldProps[hand];
    if (prop === null) return;
    heldProps[hand] = null;
    handWorld(hand, _handPos);
    backSocket.getWorldPosition(_socketWorld);
    if (stowDecision(prop, _handPos, _socketWorld, t) === 'stow') {
      prop.state = 'stowed';
      prop.velocity.set(0, 0, 0);
      stowed.push(prop);
      events.stow?.(prop);
      return;
    }
    applyThrow(prop, trackers[hand].velocity, t.throwVelocityScale);
    events.release?.(prop, prop.velocity.length());
  }

  if (xr !== null) {
    for (let i = 0; i < 2; i++) {
      const controller = xr.getController(i);
      const grip = xr.getControllerGrip(i);
      // Which hand slot this controller drives: the hand group parented to
      // its grip (assigned on connect), falling back to the index.
      const slot = (): number =>
        rig.handLeft.parent === grip ? 0 : rig.handRight.parent === grip ? 1 : i;
      // SAFETY: WebXRManager dispatches squeezestart/squeezeend on this exact
      // Object3D; Object3DEventMap does not declare them.
      const target = controller as unknown as EventTarget;
      target.addEventListener('squeezestart', () => pressGrip(slot()));
      target.addEventListener('squeezeend', () => releaseGrip(slot()));
    }
  }

  function drop(prop: Prop): void {
    const hand = heldProps.indexOf(prop);
    if (hand < 0) return;
    heldProps[hand] = null;
    prop.state = 'free';
    prop.velocity.set(0, 0, 0);
  }

  return {
    events,
    stowed,
    backSocket,
    drop,
    handHolding: (hand) => heldProps[hand] !== null,
    held: (hand) => heldProps[hand],
    pressGrip,
    releaseGrip,

    update(dt: number): void {
      // Back socket: below and behind the head, following head yaw.
      const head = rig.head;
      _headBack.set(0, 0, 1).applyQuaternion(head.quaternion);
      _headBack.y = 0;
      if (_headBack.lengthSq() < 1e-6) _headBack.set(0, 0, 1);
      _headBack.normalize().multiplyScalar(SOCKET_BEHIND_HEAD_M);
      backSocket.position.copy(head.position).add(_headBack);
      backSocket.position.y -= SOCKET_BELOW_HEAD_M;
      backSocket.getWorldPosition(_socketWorld);

      for (let i = 0; i < 2; i++) {
        handWorld(i, _handPos);
        if (hasPrev[i] && dt > 0) {
          _delta.copy(_handPos).sub(_prevHand[i]);
          trackers[i].push(_delta, dt);
        }
        _prevHand[i].copy(_handPos);
        hasPrev[i] = true;

        const prop = heldProps[i];
        if (prop !== null) {
          hands[i].getWorldDirection(_forward).negate(); // grip forward is -Z
          prop.position.copy(_handPos).addScaledVector(_forward, t.holdOffset);
        }
      }

      for (let s = 0; s < stowed.length; s++) {
        stowed[s].position.copy(_socketWorld);
        stowed[s].position.y += s * STOW_STACK_SPACING_M;
      }

      // Carry lean: large props only, toward the loaded side; stub-only.
      const massL = heldProps[0]?.spec.sizeClass === 'large' ? heldProps[0].spec.mass : 0;
      const massR = heldProps[1]?.spec.sizeClass === 'large' ? heldProps[1].spec.mass : 0;
      const targetRad = -THREE.MathUtils.degToRad(leanFor([massL, massR], t));
      const k = 1 - Math.exp(-LEAN_RATE * dt);
      rig.group.rotation.z += (targetRad - rig.group.rotation.z) * k;
    },
  };
}
