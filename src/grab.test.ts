import { describe, expect, it } from 'vitest';
import { Box3, Group, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { CollisionWorld, makeBoxCollider } from './collision';
import { applyThrow, buildGrab, leanFor, selectGrabTarget, stowDecision } from './grab';
import { buildLocomotion } from './locomotion';
import { tuning } from './movementTuning';
import type { PlayerRig } from './placeholderPlayer';
import { Prop, PropWorld, type PropSpec } from './props';
import { DEFAULT_APPEARANCE } from './appearance';
import { buildGorilla } from './gorilla';

const DT = 1 / 72;
const small: PropSpec = {
  id: 'ball',
  radius: 0.12,
  mass: 0.6,
  rollingFriction: 0.8,
  sizeClass: 'small',
  surface: 'wood',
};
const large: PropSpec = { ...small, id: 'barrel', mass: 8, sizeClass: 'large', surface: 'metal' };

function fakeRig(): PlayerRig {
  const root = new Group();
  const head = new PerspectiveCamera();
  head.position.set(0, 1.6, 0);
  const group = new Group();
  const gorilla = buildGorilla(DEFAULT_APPEARANCE, { firstPerson: true });
  const [handLeft, handRight] = gorilla.hand;
  root.add(head, group, handLeft, handRight);
  return { root, head, group, gorilla, appearance: DEFAULT_APPEARANCE, handLeft, handRight };
}

describe('pure helpers', () => {
  it('selectGrabTarget wraps nearestFree', () => {
    const pw = new PropWorld();
    const p = new Prop(small, new Vector3(0, 0, 0));
    pw.add(p);
    expect(selectGrabTarget(pw, new Vector3(0.1, 0, 0), 0.18)).toBe(p);
    expect(selectGrabTarget(pw, new Vector3(0.5, 0, 0), 0.18)).toBeNull();
  });

  it('applyThrow frees the prop with the scaled hand velocity', () => {
    const p = new Prop(small, new Vector3());
    p.state = 'held';
    applyThrow(p, new Vector3(2, 1, 0), 1.5);
    expect(p.state).toBe('free');
    expect(p.velocity.toArray()).toEqual([3, 1.5, 0]);
  });

  it('stowDecision: small near the socket stows; small far or large drops', () => {
    const socket = new Vector3(0, 1, 0.3);
    expect(
      stowDecision(new Prop(small, new Vector3()), new Vector3(0, 1, 0.2), socket, tuning),
    ).toBe('stow');
    expect(
      stowDecision(new Prop(small, new Vector3()), new Vector3(0, 1, -0.5), socket, tuning),
    ).toBe('drop');
    expect(
      stowDecision(new Prop(large, new Vector3()), new Vector3(0, 1, 0.2), socket, tuning),
    ).toBe('drop');
  });

  it('leanFor: left negative, right positive, balanced zero, clamped', () => {
    expect(leanFor([8, 0], tuning)).toBeLessThan(0);
    expect(leanFor([0, 8], tuning)).toBeGreaterThan(0);
    expect(leanFor([3, 3], tuning)).toBe(0);
    expect(Math.abs(leanFor([0, 100], tuning))).toBe(tuning.carryLeanDeg);
  });
});

describe('buildGrab', () => {
  it('holds a prop at the hand, throws it with the hand velocity, and blocks locomotion for that hand', () => {
    const rig = fakeRig();
    const pw = new PropWorld();
    const ball = new Prop(small, new Vector3(0.3, 1.0, -0.4));
    pw.add(ball);
    const grab = buildGrab(rig, pw, tuning);
    rig.handRight.position.set(0.3, 1.0, -0.3);
    grab.update(DT);
    grab.pressGrip(1);
    expect(grab.handHolding(1)).toBe(true);
    expect(grab.held(1)).toBe(ball);
    expect(ball.state).toBe('held');
    // Move the hand forward at 3.6 m/s for a while; the ball follows.
    for (let i = 0; i < 40; i++) {
      rig.handRight.position.z -= 0.05;
      grab.update(DT);
    }
    expect(ball.position.z).toBeCloseTo(rig.handRight.position.z - tuning.holdOffset, 3);
    grab.releaseGrip(1);
    expect(ball.state).toBe('free');
    expect(ball.velocity.z).toBeLessThan(-3);
    expect(grab.handHolding(1)).toBe(false);
    // Grip with nothing in reach does nothing.
    rig.handRight.position.set(5, 5, 5);
    grab.update(DT);
    grab.pressGrip(1);
    expect(grab.handHolding(1)).toBe(false);
  });

  it('a holding hand never anchors', () => {
    const rig = fakeRig();
    const world = new CollisionWorld();
    world.add(
      makeBoxCollider(
        'g',
        'ground',
        new Box3(new Vector3(-9, -1, -9), new Vector3(9, 0, 9)),
        new Matrix4(),
      ),
    );
    rig.root.position.y = -tuning.eyeHeightOffset;
    const pw = new PropWorld();
    const ball = new Prop(small, new Vector3(0, 0.5, 0));
    pw.add(ball);
    const grab = buildGrab(rig, pw, tuning);
    const loco = buildLocomotion(rig, world, tuning, (i) => grab.handHolding(i));
    rig.handLeft.position.set(0, 0.5 + tuning.eyeHeightOffset, 0); // at the ball (world y 0.5)
    rig.handRight.position.set(0.4, 1.2, 0); // idle, clear of the ground
    grab.update(DT);
    grab.pressGrip(0);
    expect(grab.handHolding(0)).toBe(true);
    // Put the holding hand into the ground and drag it: no rig motion from it.
    rig.handLeft.position.set(0, tuning.eyeHeightOffset + 0.02, 0);
    loco.update(DT);
    rig.handLeft.position.z += 0.2;
    const before = rig.root.position.z;
    loco.update(DT);
    expect(loco.anchored).toBe(false);
    expect(rig.root.position.z).toBeCloseTo(before, 6);
  });

  it('stows small props behind the back and returns them last-in first-out', () => {
    const rig = fakeRig();
    const pw = new PropWorld();
    const a = new Prop({ ...small, id: 'a' }, new Vector3(0.3, 1.0, -0.4));
    const b = new Prop({ ...small, id: 'b' }, new Vector3(-0.3, 1.0, -0.4));
    const barrel = new Prop(large, new Vector3(0, 1.0, -0.8));
    pw.add(a, b, barrel);
    const grab = buildGrab(rig, pw, tuning);
    grab.update(DT);
    const socket = grab.backSocket.position; // rig space == world here (root at origin)
    // Grab a with the right hand, release it at the socket → stowed.
    rig.handRight.position.set(0.3, 1.0, -0.4);
    grab.update(DT);
    grab.pressGrip(1);
    rig.handRight.position.copy(socket);
    grab.update(DT);
    grab.releaseGrip(1);
    expect(a.state).toBe('stowed');
    expect(grab.stowed).toEqual([a]);
    expect(grab.handHolding(1)).toBe(false);
    // Same with b using the left hand.
    rig.handLeft.position.set(-0.3, 1.0, -0.4);
    grab.update(DT);
    grab.pressGrip(0);
    rig.handLeft.position.copy(socket);
    grab.update(DT);
    grab.releaseGrip(0);
    expect(grab.stowed).toEqual([a, b]);
    // Reaching back with an empty hand takes b first.
    grab.pressGrip(0);
    expect(grab.held(0)).toBe(b);
    expect(grab.stowed).toEqual([a]);
    // The barrel never stows and leans the body.
    rig.handLeft.position.copy(socket);
    grab.update(DT);
    grab.releaseGrip(0); // b dropped here (it is small but we already hold; fine)
    rig.handRight.position.set(0, 1.0, -0.8);
    grab.update(DT);
    grab.pressGrip(1);
    expect(grab.held(1)).toBe(barrel);
    for (let i = 0; i < 72; i++) grab.update(DT);
    expect(rig.group.rotation.z).toBeLessThan(-0.1); // rolls toward the right (+X)
    rig.handRight.position.copy(socket);
    grab.update(DT);
    grab.releaseGrip(1);
    expect(barrel.state).toBe('free');
    for (let i = 0; i < 144; i++) grab.update(DT);
    expect(Math.abs(rig.group.rotation.z)).toBeLessThan(0.01);
  });
});
