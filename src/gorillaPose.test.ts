import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  advancePose,
  makePose,
  solveTwoBoneIK,
  type IKResult,
  type MotionState,
} from './gorillaPose';
import { tuning } from './movementTuning';

const DT = 1 / 72;
const UPPER = 0.32;
const LOWER = 0.38;
const down = new Vector3(0, -1, 0);
const result = (): IKResult => ({ elbow: new Vector3(), reach: 0 });

describe('solveTwoBoneIK', () => {
  it('reaches an in-range target with exact bone lengths', () => {
    const shoulder = new Vector3(0.25, 1.2, 0);
    const target = new Vector3(0.3, 0.7, -0.3);
    const out = result();
    solveTwoBoneIK(shoulder, target, UPPER, LOWER, down, out);
    expect(out.elbow.distanceTo(shoulder)).toBeCloseTo(UPPER, 6);
    expect(out.elbow.distanceTo(target)).toBeCloseTo(LOWER, 6);
    expect(out.reach).toBeLessThan(1);
  });

  it('points straight at an out-of-range target', () => {
    const shoulder = new Vector3();
    const target = new Vector3(2, 0, 0);
    const out = result();
    solveTwoBoneIK(shoulder, target, UPPER, LOWER, down, out);
    expect(out.reach).toBe(1);
    expect(out.elbow.toArray()).toEqual([UPPER, 0, 0]);
  });

  it('bends the elbow toward the pole', () => {
    const out = result();
    solveTwoBoneIK(new Vector3(), new Vector3(0.3, 0, -0.3), UPPER, LOWER, down, out);
    expect(out.elbow.y).toBeLessThan(-0.05);
    solveTwoBoneIK(
      new Vector3(),
      new Vector3(0.3, 0, -0.3),
      UPPER,
      LOWER,
      new Vector3(0, 1, 0),
      out,
    );
    expect(out.elbow.y).toBeGreaterThan(0.05);
  });

  it('survives a pole parallel to the chain and a target at the shoulder', () => {
    const out = result();
    solveTwoBoneIK(new Vector3(), new Vector3(0, -0.5, 0), UPPER, LOWER, down, out);
    expect(Number.isFinite(out.elbow.x)).toBe(true);
    expect(out.elbow.distanceTo(new Vector3())).toBeCloseTo(UPPER, 6);
    solveTwoBoneIK(new Vector3(), new Vector3(), UPPER, LOWER, down, out);
    expect(Number.isFinite(out.elbow.y)).toBe(true);
  });
});

describe('advancePose', () => {
  const state = (v: [number, number, number], grounded = true, landing = 0): MotionState => ({
    velocity: new Vector3(...v),
    grounded,
    landingImpulse: landing,
  });

  it('leans with horizontal speed and clamps', () => {
    const pose = makePose();
    advancePose(pose, state([0, 0, 0]), DT);
    expect(pose.leanDeg).toBe(0);
    expect(pose.leanDir.length()).toBe(0);
    advancePose(pose, state([0, 0, -4]), DT);
    expect(pose.leanDeg).toBeCloseTo(4 * tuning.leanPerMps, 6);
    expect(pose.leanDir.z).toBeCloseTo(-1);
    advancePose(pose, state([50, 0, 0]), DT);
    expect(pose.leanDeg).toBe(tuning.leanMaxDeg);
  });

  it('sags while airborne and spikes then decays on landing', () => {
    const pose = makePose();
    for (let i = 0; i < 72; i++) advancePose(pose, state([0, -3, 0], false), DT);
    expect(pose.sag).toBeGreaterThan(tuning.sagAirborne * 0.9);
    expect(pose.sag).toBeLessThanOrEqual(tuning.sagAirborne + 1e-6);
    advancePose(pose, state([0, 0, 0], true, 6), DT);
    const spike = pose.sag;
    expect(spike).toBeGreaterThan(pose.landingExtra - 1e-9);
    expect(pose.landingExtra).toBeCloseTo(6 * tuning.sagLanding, 6);
    for (let i = 0; i < 36; i++) advancePose(pose, state([0, 0, 0], true), DT);
    expect(pose.landingExtra).toBeLessThan(6 * tuning.sagLanding * 0.1);
    expect(pose.sag).toBeLessThan(spike * 0.4);
  });

  it('advances the gait only while grounded and moving', () => {
    const pose = makePose();
    advancePose(pose, state([0, 0, 0]), DT);
    expect(pose.gaitPhase).toBe(0);
    advancePose(pose, state([3, 0, 0], false), DT);
    expect(pose.gaitPhase).toBe(0);
    // Travel exactly one stride at 3 m/s.
    const steps = Math.round(tuning.gaitStrideM / 3 / DT);
    for (let i = 0; i < steps; i++) advancePose(pose, state([3, 0, 0]), DT);
    const wrapped = pose.gaitPhase < 0.2 || pose.gaitPhase > Math.PI * 2 - 0.2;
    expect(wrapped).toBe(true);
    expect(Math.abs(pose.legSwing[0] + pose.legSwing[1])).toBeLessThan(1e-9);
  });
});
