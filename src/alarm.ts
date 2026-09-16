import * as THREE from 'three';
import type { DayState } from './dayState';
import type { MovementAudio } from './movementAudio';
import type { PlayerRig } from './placeholderPlayer';

// The alarm clock: rings while the day is asleep; a hand on the clock (or
// moving a metre away from the bed) silences it and starts the rush.

const BEEP_PERIOD_S = 0.6;
const TOUCH_RADIUS_M = 0.25;
const WAKE_DISTANCE_M = 1.0;

export interface Alarm {
  update(dt: number): void;
}

const _hand = new THREE.Vector3();
const _head = new THREE.Vector3();

export function buildAlarm(
  rig: PlayerRig,
  day: DayState,
  audio: MovementAudio,
  clockPos: THREE.Vector3,
  spawn: THREE.Vector3,
): Alarm {
  let clock = 0;
  let high = false;
  return {
    update(dt: number): void {
      if (day.phase !== 'asleep') return;
      clock += dt;
      if (clock >= BEEP_PERIOD_S) {
        clock = 0;
        high = !high;
        audio.tone(high ? 1100 : 880, 0.15, 0.18);
      }
      for (const hand of [rig.handLeft, rig.handRight]) {
        hand.getWorldPosition(_hand);
        if (_hand.distanceTo(clockPos) <= TOUCH_RADIUS_M) {
          day.wake();
          return;
        }
      }
      rig.head.getWorldPosition(_head);
      if (Math.hypot(_head.x - spawn.x, _head.z - spawn.z) >= WAKE_DISTANCE_M) day.wake();
    },
  };
}
