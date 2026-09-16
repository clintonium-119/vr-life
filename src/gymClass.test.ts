import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { crossedGoal, crossedHoop } from './gymClass';

const hoop = { centre: [10, 3, 0] as [number, number, number], radius: 0.3 };
const goal = { x: -9.5, zMin: -3.66, zMax: 3.66, yMax: 2.44 };

describe('crossedHoop', () => {
  it('scores a downward pass inside the ring only', () => {
    expect(crossedHoop(new Vector3(10.1, 3.4, 0), new Vector3(10, 2.8, 0.05), hoop)).toBe(true);
    expect(crossedHoop(new Vector3(10, 2.8, 0), new Vector3(10, 3.4, 0), hoop)).toBe(false); // upward
    expect(crossedHoop(new Vector3(10.6, 3.4, 0), new Vector3(10.6, 2.8, 0), hoop)).toBe(false); // outside
    expect(crossedHoop(new Vector3(10, 3.5, 0), new Vector3(10, 3.2, 0), hoop)).toBe(false); // no crossing
  });
});

describe('crossedGoal', () => {
  it('scores a crossing between the posts under the bar only', () => {
    expect(crossedGoal(new Vector3(-9, 1, 0), new Vector3(-10, 1, 0.5), goal)).toBe(true);
    expect(crossedGoal(new Vector3(-10, 1, 0), new Vector3(-9, 1, 0), goal)).toBe(true); // either direction
    expect(crossedGoal(new Vector3(-9, 2.6, 0), new Vector3(-10, 2.5, 0), goal)).toBe(false); // over the bar
    expect(crossedGoal(new Vector3(-9, 1, 4), new Vector3(-10, 1, 4.2), goal)).toBe(false); // wide
    expect(crossedGoal(new Vector3(-9, 1, 0), new Vector3(-9.2, 1, 0), goal)).toBe(false); // no crossing
  });
});
