import { describe, expect, it } from 'vitest';
import { Box3, Matrix4, Vector3 } from 'three';
import { CollisionWorld, makeBoxCollider, updateCollider } from './collision';
import { HandAnchor, VelocityTracker } from './handAnchor';
import { tuning } from './movementTuning';

const DT = 1 / 72;
const groundMatrix = new Matrix4();

function groundWorld(): CollisionWorld {
  const w = new CollisionWorld();
  w.add(
    makeBoxCollider(
      'ground',
      'ground',
      new Box3(new Vector3(-20, -1, -20), new Vector3(20, 0, 20)),
      groundMatrix,
    ),
  );
  return w;
}

/** A hand resting just inside the ground surface at (x, z). */
const onGround = (x: number, z: number, depth = 0.01): Vector3 =>
  new Vector3(x, tuning.handRadius - depth, z);

describe('HandAnchor', () => {
  it('anchors on contact and fires slap with the surface', () => {
    const slaps: [number, string][] = [];
    const a = new HandAnchor(groundWorld());
    a.update(new Vector3(0, 0.5, 0), DT);
    a.update(onGround(0, 0), DT, { slap: (s, surf) => slaps.push([s, surf]) });
    expect(a.state).toBe('anchored');
    expect(slaps).toHaveLength(1);
    expect(slaps[0][1]).toBe('ground');
    expect(slaps[0][0]).toBeGreaterThan(10); // 0.5 m in one 72 Hz frame
    expect(a.correction.length()).toBe(0);
    a.update(onGround(0, 0, 0.03), DT); // push 2 cm further in: rig lifts 2 cm
    expect(a.correction.y).toBeCloseTo(0.02);
  });

  it('turns a backward hand stroke into a forward correction of the same size', () => {
    const a = new HandAnchor(groundWorld());
    a.update(onGround(0, 0), DT);
    a.update(onGround(0, 0.2), DT); // hand slides back toward +Z
    expect(a.state).toBe('anchored');
    expect(a.correction.z).toBeCloseTo(-0.2);
    expect(a.correction.x).toBeCloseTo(0);
  });

  it('releases when lifted along the normal, not when moved along the surface', () => {
    const a = new HandAnchor(groundWorld());
    a.update(onGround(0, 0), DT);
    a.update(onGround(0.2, 0), DT);
    expect(a.state).toBe('anchored');
    a.update(new Vector3(0.2, tuning.handRadius + tuning.handReleaseDistance + 0.01, 0), DT);
    expect(a.state).toBe('free');
    expect(a.correction.length()).toBe(0);
  });

  it('releases when slip exceeds the break distance', () => {
    const a = new HandAnchor(groundWorld());
    a.update(onGround(0, 0), DT);
    a.update(onGround(tuning.handSlipBreak + 0.05, 0), DT);
    expect(a.state).toBe('free');
  });

  it('combines: one hand full, two hands summed and scaled, then the spring fraction', () => {
    const w = groundWorld();
    const left = new HandAnchor(w);
    const right = new HandAnchor(w);
    left.update(onGround(-0.3, 0), DT);
    right.update(onGround(0.3, 0), DT);
    left.update(onGround(-0.3, 0.2), DT);
    right.update(onGround(0.3, 0.2), DT);
    const out = new Vector3();
    const bigDt = 100; // spring fraction -> 1
    expect(HandAnchor.combine([left], bigDt, tuning, out)).toBe(true);
    expect(out.z).toBeCloseTo(-0.2);
    expect(HandAnchor.combine([left, right], bigDt, tuning, out)).toBe(true);
    expect(out.z).toBeCloseTo(-0.4 * tuning.twoHandScale);
    expect(HandAnchor.combine([left], DT, tuning, out)).toBe(true);
    expect(out.z).toBeCloseTo(-0.2 * (1 - Math.exp(-tuning.handStiffness * DT)));
    left.release();
    right.release();
    expect(HandAnchor.combine([left, right], DT, tuning, out)).toBe(false);
  });

  it('is dragged by a moving collider', () => {
    const w = new CollisionWorld();
    const m = new Matrix4();
    const platform = makeBoxCollider(
      'bus',
      'metal',
      new Box3(new Vector3(-2, -0.5, -2), new Vector3(2, 0, 2)),
      m,
    );
    w.add(platform);
    const a = new HandAnchor(w);
    const hand = onGround(0, 0);
    a.update(hand, DT);
    expect(a.state).toBe('anchored');
    // One frame of platform motion (well under the slip break) drags the anchor.
    m.setPosition(0.1, 0, 0);
    updateCollider(platform);
    a.update(hand, DT);
    expect(a.state).toBe('anchored');
    expect(a.correction.x).toBeCloseTo(0.1);
  });
});

describe('VelocityTracker', () => {
  it('converges to a steady displacement rate', () => {
    const tracker = new VelocityTracker();
    const disp = new Vector3(0.05, 0, 0); // 3.6 m/s at 72 Hz
    for (let i = 0; i < 72; i++) tracker.push(disp, DT);
    expect(tracker.velocity.x).toBeCloseTo(3.6, 1);
    tracker.reset();
    expect(tracker.velocity.length()).toBe(0);
  });
});
