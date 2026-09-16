import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { PuffPool } from './puffs';
import { fogDistances } from './world';

describe('PuffPool', () => {
  it('spawns, ages out, and recycles the oldest at capacity', () => {
    const pool = new PuffPool(3);
    const a = pool.spawn(new Vector3(0, 0, 0), 1, 0.4, 0.5);
    pool.update(0.2);
    pool.spawn(new Vector3(1, 0, 0), 2);
    pool.spawn(new Vector3(2, 0, 0), 3);
    expect(pool.active).toBe(3);
    const d = pool.spawn(new Vector3(3, 0, 0), 4);
    expect(d).toBe(a); // the oldest slot was recycled
    expect(pool.active).toBe(3);
    pool.update(0.6);
    expect(pool.active).toBe(0);
  });
});

describe('fogDistances', () => {
  it('spans half the view distance to the view distance', () => {
    expect(fogDistances(120)).toEqual([60, 120]);
  });
});
