import { describe, expect, it } from 'vitest';
import { Box3, Group, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { DEFAULT_APPEARANCE } from './appearance';
import { CollisionWorld, makeBoxCollider } from './collision';
import { buildGorilla } from './gorilla';
import { buildGrab } from './grab';
import { Heat } from './heat';
import { buildLocomotion } from './locomotion';
import type { MovementAudio } from './movementAudio';
import { tuning } from './movementTuning';
import { NpcManager } from './npc';
import type { PlayerRig } from './placeholderPlayer';
import { Officer, buildPolice, climbAssist, steer } from './police';
import { buildPrison } from './prison';
import { Progress } from './progress';
import { PropWorld } from './props';

const DT = 1 / 60;
const silent: MovementAudio = {
  resume() {},
  update() {},
  dispose() {},
  bounce() {},
  catch() {},
  tone() {},
  chime() {},
  siren() {},
};

function ground(): CollisionWorld {
  const w = new CollisionWorld();
  w.add(
    makeBoxCollider(
      'ground',
      'ground',
      new Box3(new Vector3(-300, -1, -300), new Vector3(300, 0, 300)),
      new Matrix4(),
    ),
  );
  return w;
}

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

describe('steering and climbing', () => {
  it('steers toward the target and stops inside the radius; climbs only when blocked below', () => {
    const out = new Vector3();
    steer(new Vector3(0, 0, 0), new Vector3(10, 0, 0), 6, 1, out);
    expect(out.x).toBeCloseTo(6);
    steer(new Vector3(0, 0, 0), new Vector3(0.5, 0, 0), 6, 1, out);
    expect(out.length()).toBe(0);
    expect(climbAssist(true, true)).toBeGreaterThan(0);
    expect(climbAssist(true, false)).toBe(0);
    expect(climbAssist(false, true)).toBe(0);
  });

  it('an officer closes on a standing player and rises when a wall blocks a higher player', () => {
    const w = ground();
    const o = new Officer(w, new Vector3(0, 0, 0), new Vector3(0, 0, 0), tuning);
    const player = new Vector3(12, 0, 0);
    for (let i = 0; i < 3 * 60; i++) o.update(DT, player);
    expect(o.feet(new Vector3()).distanceTo(player)).toBeLessThan(tuning.arrestRadius);
    expect(o.holdTimer).toBeGreaterThan(tuning.arrestHoldS);
    // A wall between the officer and a player standing on a roof: the officer rises.
    const w2 = ground();
    w2.add(
      makeBoxCollider(
        'wall',
        'stone',
        new Box3(new Vector3(-0.3, 0, -5), new Vector3(0.3, 6, 5)),
        new Matrix4().setPosition(3, 0, 0),
      ),
    );
    const o2 = new Officer(w2, new Vector3(0, 0, 0), new Vector3(0, 0, 0), tuning);
    const high = new Vector3(6, 6, 0);
    for (let i = 0; i < 4 * 60; i++) o2.update(DT, high);
    expect(o2.body.position.y).toBeGreaterThan(2);
  });
});

describe('arrest and escort', () => {
  it('catches a standing player, drags the rig to the cell, fines, and releases on the timer', () => {
    const world = ground();
    const prison = buildPrison();
    const rig = fakeRig();
    const props = new PropWorld();
    const grab = buildGrab(rig, props, tuning);
    const loco = buildLocomotion(rig, world, tuning, (h) => grab.handHolding(h));
    const heat = new Heat({ ...tuning });
    const npcs = new NpcManager();
    const progress = new Progress();
    progress.money = 200;
    let confiscated = 0;
    const t = { ...tuning, prisonReleaseS: 5 };
    const police = buildPolice(
      world,
      npcs,
      heat,
      loco,
      rig,
      grab,
      prison,
      progress,
      () => confiscated++,
      silent,
      t,
    );
    const log: string[] = [];
    Object.assign(police.events, {
      dispatched: (n: number) => log.push(`dispatched ${n}`),
      arrested: () => log.push('arrested'),
      jailed: (f: number) => log.push(`jailed ${f}`),
      released: () => log.push('released'),
    });
    // Stand near the station and get wanted.
    rig.root.position.set(30, -tuning.eyeHeightOffset, -125);
    heat.strike();
    heat.strike();
    expect(log[0]).toBe('dispatched 3');
    const feet = new Vector3();
    let guard = 0;
    while (!log.includes('arrested') && guard++ < 60 * 20) {
      feet.set(
        rig.root.position.x + rig.head.position.x,
        rig.root.position.y + tuning.eyeHeightOffset,
        rig.root.position.z + rig.head.position.z,
      );
      police.update(DT, feet);
      loco.update(DT);
    }
    expect(log).toContain('arrested');
    expect(loco.overridden).toBe(true);
    guard = 0;
    while (!log.some((l) => l.startsWith('jailed')) && guard++ < 60 * 120) {
      feet.set(
        rig.root.position.x + rig.head.position.x,
        rig.root.position.y + tuning.eyeHeightOffset,
        rig.root.position.z + rig.head.position.z,
      );
      police.update(DT, feet);
      loco.update(DT);
    }
    expect(log.some((l) => l.startsWith('jailed'))).toBe(true);
    expect(progress.money).toBe(100);
    expect(confiscated).toBe(1);
    expect(heat.value).toBe(0);
    expect(loco.overridden).toBe(false);
    const inCell = prison.prisonBounds.containsPoint(
      new Vector3(
        rig.root.position.x + rig.head.position.x,
        1,
        rig.root.position.z + rig.head.position.z,
      ),
    );
    expect(inCell).toBe(true);
    for (let i = 0; i < 6 * 60; i++) {
      feet.copy(prison.cellCentre);
      police.update(DT, feet);
    }
    expect(log).toContain('released');
  });
});
