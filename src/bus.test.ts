import { describe, expect, it } from 'vitest';
import { Box3, Group, Matrix4, PerspectiveCamera, Scene, Vector3 } from 'three';
import { DEFAULT_APPEARANCE } from './appearance';
import { BUS_LANE_Z, buildBus } from './bus';
import { CollisionWorld, makeBoxCollider, updateCollider } from './collision';
import { DayState } from './dayState';
import { buildGorilla } from './gorilla';
import { buildLocomotion } from './locomotion';
import { tuning } from './movementTuning';
import type { PlayerRig } from './placeholderPlayer';
import { Progress } from './progress';
import { PLACES } from './townPlan';

const DT = 1 / 72;

function fakeRig(): PlayerRig {
  const root = new Group();
  const head = new PerspectiveCamera();
  head.position.set(0, 1.6, 0);
  const group = new Group();
  const gorilla = buildGorilla(DEFAULT_APPEARANCE, { firstPerson: true });
  const [handLeft, handRight] = gorilla.hand;
  handLeft.position.set(-0.3, 1.0, 0);
  handRight.position.set(0.3, 1.0, 0);
  root.add(head, group, handLeft, handRight);
  return { root, head, group, gorilla, appearance: DEFAULT_APPEARANCE, handLeft, handRight };
}

describe('platform carry', () => {
  it('rides a moving platform and keeps its velocity when stepping off', () => {
    const world = new CollisionWorld();
    world.add(
      makeBoxCollider(
        'ground',
        'ground',
        new Box3(new Vector3(-50, -1, -50), new Vector3(50, 0, 50)),
        new Matrix4(),
      ),
    );
    const m = new Matrix4().setPosition(0, 0.2, 0);
    const platform = makeBoxCollider(
      'platform',
      'metal',
      new Box3(new Vector3(-3, -0.2, -2), new Vector3(3, 0.2, 2)),
      m,
    );
    platform.velocity = new Vector3(3, 0, 0);
    world.addDynamic(platform);
    const rig = fakeRig();
    rig.root.position.set(0, 0.4 - tuning.eyeHeightOffset, 0); // feet on the platform top (0.4)
    const loco = buildLocomotion(rig, world, tuning);
    let x = 0;
    for (let i = 0; i < 72; i++) {
      x += 3 * DT;
      m.setPosition(x, 0.2, 0);
      updateCollider(platform);
      loco.update(DT);
    }
    expect(rig.root.position.x).toBeGreaterThan(2.6);
    expect(rig.root.position.x).toBeLessThan(3.3);
    expect(Math.abs(rig.root.position.y - (0.4 - tuning.eyeHeightOffset))).toBeLessThan(0.05);
    // Platform vanishes from under the body: the body keeps ~3 m/s.
    m.setPosition(100, 0.2, 0);
    updateCollider(platform);
    loco.update(DT);
    expect(loco.velocity.x).toBeGreaterThan(2.5);
  });
});

describe('bus schedule', () => {
  it('waits, drives to the school, waits, and comes back; a rider changes the day', () => {
    const scene = new Scene();
    const world = new CollisionWorld();
    const bus = buildBus(scene, world, tuning);
    const day = new DayState(new Progress(), tuning);
    day.wake();
    const far = new Vector3(0, 0, 0);
    const stopX = PLACES.busStop[0];
    expect(bus.position.x).toBe(stopX);
    expect(bus.position.z).toBe(BUS_LANE_Z);
    // Nobody aboard: departs after busWaitS.
    for (let s = 0; s < tuning.busWaitS - 0.5; s += 0.1) bus.update(0.1, day, far);
    expect(bus.state).toBe('waitingAtStop');
    bus.update(1, day, far);
    expect(bus.state).toBe('toSchool');
    let guard = 0;
    while (bus.state === 'toSchool' && guard++ < 10000) bus.update(0.05, day, far);
    expect(bus.state).toBe('waitingAtSchool');
    expect(bus.position.x).toBeCloseTo(PLACES.schoolDropOff[0], 3);
    expect(day.phase).toBe('rush'); // nobody was aboard
    for (let s = 0; s <= tuning.busWaitS; s += 0.5) bus.update(0.5, day, far);
    expect(bus.state).toBe('toStop');
    guard = 0;
    while (bus.state === 'toStop' && guard++ < 10000) bus.update(0.05, day, far);
    expect(bus.state).toBe('waitingAtStop');
    // A rider standing aboard: departs early, arrives at school.
    const rider = new Vector3(bus.position.x, 0.8, bus.position.z);
    for (let s = 0; s < 2; s += 0.1) {
      rider.x = bus.position.x;
      bus.update(0.1, day, rider);
    }
    expect(bus.state).toBe('toSchool');
    expect(day.phase).toBe('ride');
    guard = 0;
    while (bus.state === 'toSchool' && guard++ < 10000) {
      rider.x = bus.position.x;
      bus.update(0.05, day, rider);
    }
    expect(day.phase).toBe('school');
    expect(world.dynamic.length).toBeGreaterThan(8);
  });
});
