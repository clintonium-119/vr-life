import { describe, expect, it } from 'vitest';
import { Box3, Matrix4, Vector3 } from 'three';
import { CollisionWorld, makeBoxCollider } from './collision';
import { tuning } from './movementTuning';
import { PlayerBody } from './playerBody';

const DT = 1 / 60;
const R = tuning.bodyRadius;

/** Ground slab with its top at y = 0, plus an optional wall facing +Z at z = -5. */
function world(withWall = false): CollisionWorld {
  const w = new CollisionWorld();
  w.add(
    makeBoxCollider(
      'ground',
      'ground',
      new Box3(new Vector3(-20, -1, -20), new Vector3(20, 0, 20)),
      new Matrix4(),
    ),
  );
  if (withWall) {
    w.add(
      makeBoxCollider(
        'wall',
        'stone',
        new Box3(new Vector3(-5, 0, -0.2), new Vector3(5, 6, 0.2)),
        new Matrix4().setPosition(0, 0, -5),
      ),
    );
  }
  return w;
}

describe('PlayerBody', () => {
  it('falls under gravity only when no hand holds', () => {
    const body = new PlayerBody(world());
    body.teleportTo(new Vector3(0, 3, 0));
    body.step(DT, true);
    expect(body.velocity.y).toBe(0);
    body.step(DT, false);
    expect(body.velocity.y).toBeCloseTo(-tuning.gravity * DT, 5);
  });

  it('lands with one landed event and rests at radius height', () => {
    const body = new PlayerBody(world());
    body.teleportTo(new Vector3(0, 2, 0));
    const landings: number[] = [];
    for (let i = 0; i < 120; i++) body.step(DT, false, { landed: (s) => landings.push(s) });
    expect(landings).toHaveLength(1);
    expect(landings[0]).toBeGreaterThan(5);
    expect(body.grounded).toBe(true);
    expect(body.position.y).toBeCloseTo(R, 3);
    expect(Math.abs(body.velocity.y)).toBeLessThan(0.2);
  });

  it('never tunnels a wall at twice the speed cap', () => {
    const body = new PlayerBody(world(true), { ...tuning, speedCap: 60 });
    body.teleportTo(new Vector3(0, 1, -4));
    body.velocity.set(0, 0, -30);
    body.step(DT, true);
    expect(body.position.z).toBeGreaterThanOrEqual(-5 + 0.2 + R - 1e-6);
  });

  it('slides along a wall instead of stopping', () => {
    const body = new PlayerBody(world(true));
    body.teleportTo(new Vector3(0, 1, -4.45));
    body.velocity.set(5, 0, -5);
    body.step(DT, true);
    expect(body.velocity.x).toBeCloseTo(5, 5);
    expect(body.velocity.z).toBeCloseTo(0, 5);
  });

  it('caps speed', () => {
    const body = new PlayerBody(world());
    body.teleportTo(new Vector3(0, 5, 0));
    body.velocity.set(100, 0, 0);
    body.step(DT, true);
    expect(body.velocity.length()).toBeCloseTo(tuning.speedCap, 5);
  });

  it('applies ground friction only when grounded and unanchored', () => {
    const body = new PlayerBody(world());
    body.teleportTo(new Vector3(0, R, 0));
    body.step(DT, false); // establish grounded
    body.velocity.set(4, 0, 0);
    body.step(DT, false);
    expect(body.velocity.x).toBeCloseTo(4 * (1 - tuning.groundFriction * DT), 5);
    body.velocity.set(4, 0, 0);
    body.step(DT, true);
    expect(body.velocity.x).toBeCloseTo(4, 5);
  });

  it('fires bump on a fast wall hit and not on a gentle ground rest', () => {
    const bumps: number[] = [];
    const events = { bump: (s: number) => bumps.push(s) };
    const body = new PlayerBody(world(true));
    body.teleportTo(new Vector3(0, R, 0));
    body.step(DT, false, events);
    body.step(DT, false, events);
    expect(bumps).toHaveLength(0);
    body.teleportTo(new Vector3(0, 1, -4.5));
    body.velocity.set(0, 0, -6);
    body.step(DT, true, events);
    expect(bumps).toHaveLength(1);
    expect(bumps[0]).toBeCloseTo(6, 3);
  });
});
