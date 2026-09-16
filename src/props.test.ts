import { describe, expect, it } from 'vitest';
import { Box3, Matrix4, Vector3 } from 'three';
import { CollisionWorld, makeBoxCollider } from './collision';
import { tuning } from './movementTuning';
import { Prop, PropWorld, enforceSafety, stepProp, type PropSpec } from './props';

const DT = 1 / 60;
const ground = (): CollisionWorld => {
  const w = new CollisionWorld();
  w.add(
    makeBoxCollider(
      'ground',
      'ground',
      new Box3(new Vector3(-50, -1, -50), new Vector3(50, 0, 50)),
      new Matrix4(),
    ),
  );
  return w;
};
const ball: PropSpec = {
  id: 'basketball',
  radius: 0.12,
  mass: 0.6,
  restitution: 0.75,
  rollingFriction: 0.8,
  sizeClass: 'small',
  surface: 'wood',
};
const run = (
  prop: Prop,
  w: CollisionWorld,
  seconds: number,
  events?: Parameters<typeof stepProp>[4],
) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepProp(prop, DT, w, tuning, events);
};

describe('stepProp', () => {
  it('bounces to about e² of the drop height, then settles without jitter', () => {
    const w = ground();
    const prop = new Prop(ball, new Vector3(0, 2, 0));
    let bounced = false;
    let apex = 0;
    for (let i = 0; i < 600; i++) {
      const before = prop.velocity.y;
      stepProp(prop, DT, w, tuning);
      if (!bounced && before < 0 && prop.velocity.y > 0) bounced = true;
      if (bounced && prop.velocity.y <= 0 && apex === 0) apex = prop.position.y - ball.radius;
      if (apex > 0) break;
    }
    const expected = 0.75 * 0.75 * (2 - ball.radius);
    expect(apex).toBeGreaterThan(expected * 0.85);
    expect(apex).toBeLessThan(expected * 1.15);
    run(prop, w, 6);
    expect(prop.resting).toBe(true);
    const y = prop.position.y;
    expect(y).toBeCloseTo(ball.radius, 3);
    run(prop, w, 2);
    expect(Math.abs(prop.position.y - y)).toBeLessThan(0.001);
    expect(prop.restTime).toBeGreaterThan(1.9);
  });

  it('never tunnels the floor at 40 m/s', () => {
    const w = ground();
    const prop = new Prop(ball, new Vector3(0, 1, 0));
    prop.velocity.set(0, -40, 0);
    stepProp(prop, DT, w, tuning);
    expect(prop.position.y).toBeGreaterThanOrEqual(ball.radius - 1e-6);
  });

  it('rolls with friction and spins about the perpendicular axis', () => {
    const w = ground();
    const prop = new Prop(ball, new Vector3(0, ball.radius, 0));
    prop.velocity.set(3, 0, 0);
    stepProp(prop, DT, w, tuning);
    expect(prop.velocity.x).toBeLessThan(3);
    expect(prop.velocity.x).toBeGreaterThan(2.5);
    // normal (0,1,0) × v (x,0,0) → (0,0,-x): spin about -Z for +X travel
    expect(prop.angularVelocity.z).toBeLessThan(0);
    expect(Math.abs(prop.angularVelocity.x)).toBeLessThan(1e-6);
    run(prop, w, 10);
    expect(prop.resting).toBe(true);
  });

  it('fires bounce with the impact speed and surface, not on a gentle rest', () => {
    const w = ground();
    const events: [number, string][] = [];
    const prop = new Prop(ball, new Vector3(0, ball.radius + 0.05, 0));
    prop.velocity.set(0, -6, 0);
    stepProp(prop, DT, w, tuning, { bounce: (_p, s, surf) => events.push([s, surf]) });
    expect(events).toHaveLength(1);
    expect(events[0][0]).toBeCloseTo(6, 0);
    expect(events[0][1]).toBe('ground');
    const resting = new Prop(ball, new Vector3(1, ball.radius, 0));
    run(resting, w, 1, { bounce: (_p, s, surf) => events.push([s, surf]) });
    expect(events).toHaveLength(1);
  });
});

describe('PropWorld', () => {
  it('nearestFree picks the closest free prop within radius', () => {
    const pw = new PropWorld();
    const a = new Prop({ ...ball, id: 'a' }, new Vector3(0, 0, 0));
    const b = new Prop({ ...ball, id: 'b' }, new Vector3(0.1, 0, 0));
    const held = new Prop({ ...ball, id: 'h' }, new Vector3(0.05, 0, 0));
    held.state = 'held';
    pw.add(a, b, held);
    expect(pw.nearestFree(new Vector3(0.08, 0, 0), 0.2)).toBe(b);
    expect(pw.nearestFree(new Vector3(0.5, 0, 0), 0.2)).toBeNull();
  });

  it('resetToHome restores position and zeroes motion', () => {
    const prop = new Prop(ball, new Vector3(1, 2, 3));
    prop.position.set(9, 9, 9);
    prop.velocity.set(1, 1, 1);
    prop.resetToHome();
    expect(prop.position.toArray()).toEqual([1, 2, 3]);
    expect(prop.velocity.length()).toBe(0);
  });
});

describe('enforceSafety', () => {
  const backpack: PropSpec = { ...ball, id: 'backpack', sizeClass: 'large', important: true };

  it('respawns below the floor and outside the bounds', () => {
    const a = new Prop(ball, new Vector3(0, 1, 0));
    a.position.y = tuning.worldFloorY - 1;
    expect(enforceSafety(a, tuning, null)).toBe('floor');
    expect(a.position.y).toBe(1);
    a.position.x = tuning.worldHalfExtent + 1;
    expect(enforceSafety(a, tuning, null)).toBe('bounds');
    expect(a.position.x).toBe(0);
  });

  it('recalls only important, resting, unheld props left far away long enough', () => {
    const far = new Vector3(20, ball.radius, 0);
    const player = new Vector3(0, 1, 0);
    const bp = new Prop(backpack, new Vector3(0, 1, 0));
    bp.position.copy(far);
    bp.resting = true;
    bp.restTime = tuning.recallSeconds + 1;
    const box = new Prop(ball, new Vector3(0, 1, 0));
    box.position.copy(far);
    box.resting = true;
    box.restTime = tuning.recallSeconds + 1;
    expect(enforceSafety(box, tuning, player)).toBeNull();
    expect(enforceSafety(bp, tuning, new Vector3(19, 1, 0))).toBeNull(); // near player
    bp.state = 'held';
    expect(enforceSafety(bp, tuning, player)).toBeNull();
    bp.state = 'free';
    bp.restTime = 1;
    expect(enforceSafety(bp, tuning, player)).toBeNull();
    bp.restTime = tuning.recallSeconds;
    expect(enforceSafety(bp, tuning, player)).toBe('recall');
    expect(bp.position.toArray()).toEqual([0, 1, 0]);
  });
});
