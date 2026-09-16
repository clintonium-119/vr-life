import type { Vector3 } from 'three';
import type { DayState } from './dayState';
import type { Prop, PropWorld } from './props';
import { GYM } from './school';

// Gym: a basketball passing down through the hoop ring scores; a soccer
// ball crossing the goal mouth (between the posts, under the bar) scores.
// Three scores pass gym. Feedback is the score chime and the wrist level.

export interface Hoop {
  centre: [number, number, number];
  radius: number;
}

export interface Goal {
  x: number;
  zMin: number;
  zMax: number;
  yMax: number;
}

/** Downward pass through the ring disc between two frames. */
export function crossedHoop(prev: Vector3, pos: Vector3, hoop: Hoop): boolean {
  const [hx, hy, hz] = hoop.centre;
  if (!(prev.y > hy && pos.y <= hy)) return false;
  const f = (prev.y - hy) / Math.max(1e-6, prev.y - pos.y);
  const x = prev.x + (pos.x - prev.x) * f;
  const z = prev.z + (pos.z - prev.z) * f;
  return Math.hypot(x - hx, z - hz) <= hoop.radius;
}

/** Crossing the goal plane (either direction) between the posts, under the bar. */
export function crossedGoal(prev: Vector3, pos: Vector3, goal: Goal): boolean {
  const a = prev.x - goal.x;
  const b = pos.x - goal.x;
  if (a === 0 || Math.sign(a) === Math.sign(b)) return false;
  const f = a / (a - b);
  const y = prev.y + (pos.y - prev.y) * f;
  const z = prev.z + (pos.z - prev.z) * f;
  return y <= goal.yMax && y >= 0 && z >= goal.zMin && z <= goal.zMax;
}

export const GYM_BASKETBALLS = ['gymBallA', 'gymBallB'];
export const GYM_SOCCER = ['gymSoccer'];
const COOLDOWN_S = 1;

export interface GymClass {
  update(dt: number): void;
}

export function buildGymClass(props: PropWorld, day: DayState): GymClass {
  const tracked = props.props.filter(
    (p) => GYM_BASKETBALLS.includes(p.spec.id) || GYM_SOCCER.includes(p.spec.id),
  );
  const prev = new Map<Prop, Vector3>(tracked.map((p) => [p, p.position.clone()]));
  const cooldown = new Map<Prop, number>();
  return {
    update(dt: number): void {
      for (const p of tracked) {
        const last = prev.get(p) as Vector3;
        const cd = (cooldown.get(p) ?? 0) - dt;
        cooldown.set(p, cd);
        if (p.state === 'free' && cd <= 0) {
          const scored = GYM_BASKETBALLS.includes(p.spec.id)
            ? crossedHoop(last, p.position, GYM.hoop)
            : crossedGoal(last, p.position, GYM.goal);
          if (scored) {
            day.score();
            cooldown.set(p, COOLDOWN_S);
          }
        }
        last.copy(p.position);
      }
    },
  };
}
