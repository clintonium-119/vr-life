import * as THREE from 'three';
import { buildAlarm, type Alarm } from './alarm';
import { buildBus, type Bus } from './bus';
import { buildClassrooms, type Classrooms } from './classroom';
import { buildGymClass, type GymClass } from './gymClass';
import type { PropWorld } from './props';
import type { NpcManager } from './npc';
import { daySeed } from './questions';
import type { CollisionWorld } from './collision';
import { DayState, type DayPhase } from './dayState';
import type { Grab } from './grab';
import { ALARM_CLOCK_POS, BED_POS } from './homeHouse';
import { applyPlayerAppearance } from './placeholderPlayer';
import { browserStorage, clearSave, loadSave, parseReset, recordFrom, writeSave } from './save';
import type { Locomotion } from './locomotion';
import type { MovementAudio } from './movementAudio';
import type { PlayerRig } from './placeholderPlayer';
import { Progress } from './progress';
import { PLACES } from './townPlan';
import type { World } from './world';
import { buildWristDisplays } from './wristDisplay';

// The objective spine wired to the scene: alarm → rush (backpack, out the
// door, at the stop) → bus ride → school. Classes and gym attach through
// buildClassrooms / buildGymClass (see schoolDay.attach). Audio cues for
// every transition; a dev `?day=<phase>` hook jumps the state for testing.

export interface SchoolDay {
  day: DayState;
  progress: Progress;
  bus: Bus | null;
  update(dt: number): void;
}

const STOP_RADIUS_M = 4;
const _head = new THREE.Vector3();
const _body = new THREE.Vector3();

export function parseDayJump(query: string): DayPhase | null {
  const raw = new URLSearchParams(query).get('day');
  return raw === 'rush' || raw === 'ride' || raw === 'school' || raw === 'done' ? raw : null;
}

export function buildSchoolDay(
  scene: THREE.Scene,
  rig: PlayerRig,
  world: World,
  collision: CollisionWorld,
  grab: Grab,
  locomotion: Locomotion,
  audio: MovementAudio,
  props: PropWorld,
  npcs: NpcManager,
  query = '',
): SchoolDay {
  const progress = new Progress();
  const day = new DayState(progress);

  // Persistence: load (or reset) before anything reads progress.
  const storage = browserStorage();
  if (parseReset(query)) clearSave(storage);
  const saved = loadSave(storage);
  if (saved !== null) {
    progress.restore(saved);
    day.dayIndex = saved.dayIndex;
    if (!new URLSearchParams(query).has('look')) applyPlayerAppearance(rig, saved.appearance);
    console.info(
      `[vr-life] save: loaded day ${saved.dayIndex}, money ${saved.money}, level ${progress.level}`,
    );
  } else {
    console.info('[vr-life] save: fresh profile');
  }
  const save = (): void => {
    writeSave(storage, recordFrom(progress, rig.appearance, day.dayIndex));
  };
  const chainedEvents = progress.events;
  progress.events = {
    ...chainedEvents,
    money: (total, delta) => {
      chainedEvents.money?.(total, delta);
      save();
    },
    completed: (o) => {
      chainedEvents.completed?.(o);
      save();
    },
  };
  buildWristDisplays(rig, progress);

  // Only the home world has a day; the test space is for movement tuning.
  const isTown = world.kind === 'home';
  const alarm: Alarm | null = isTown
    ? buildAlarm(rig, day, audio, new THREE.Vector3(...ALARM_CLOCK_POS), world.spawn)
    : null;
  const bus: Bus | null = isTown ? buildBus(scene, collision) : null;
  const classrooms: Classrooms | null = isTown
    ? buildClassrooms(scene, rig, day, npcs, daySeed())
    : null;
  const gym: GymClass | null = isTown ? buildGymClass(props, day) : null;

  // Objectives from the scene.
  const previousGrab = grab.events.grab;
  grab.events.grab = (prop, hand) => {
    previousGrab?.(prop, hand);
    if (prop.spec.id === 'backpack') day.grabBackpack();
  };
  day.events.phase = (from, to) => {
    console.info(`[vr-life] day: ${to} (from ${from})`);
    if (to === 'school') audio.chime('bell');
    if (to === 'done') audio.chime('bell');
  };
  day.events.backpack = () => {
    console.info('[vr-life] backpack grabbed');
    audio.chime('score');
  };
  day.events.lateBus = () => console.info('[vr-life] late for the bus');
  day.events.questionResult = (_subject, correct) => audio.chime(correct ? 'correct' : 'wrong');
  day.events.gymScore = () => audio.chime('score');
  day.events.classPassed = (subject) => console.info(`[vr-life] class passed: ${subject}`);
  day.events.gymPassed = () => console.info('[vr-life] gym passed');

  // Dev jump: skip ahead for testing (tools flag not required; harmless).
  const jump = parseDayJump(query);
  if (jump !== null) {
    day.wake();
    if (jump === 'ride' || jump === 'school' || jump === 'done') day.boardBus();
    if (jump === 'school' || jump === 'done') day.arriveSchool();
    if (jump === 'done') {
      for (const s of ['math', 'science', 'history'] as const)
        for (let i = 0; i < 3; i++) day.answer(s, true);
      for (let i = 0; i < 3; i++) day.score();
    }
  }

  const stop = new THREE.Vector3(...PLACES.busStop);
  const dropOff = new THREE.Vector3(...PLACES.schoolDropOff);
  const bed = new THREE.Vector3(...BED_POS);
  const bedroom = new THREE.Vector3(...PLACES.bedroom);
  const _hand = new THREE.Vector3();
  day.events.newDay = (index) => {
    classrooms?.reseed(daySeed() + index);
    save();
    console.info(`[vr-life] day: new day ${index}`);
  };

  return {
    day,
    progress,
    bus,
    update(dt: number): void {
      day.tick(dt);
      alarm?.update(dt);
      rig.head.getWorldPosition(_head);
      // Body position ≈ feet under the head.
      _body.set(_head.x, rig.root.position.y + 0.8, _head.z);
      if (day.phase === 'rush') {
        if (!day.leftHouse && world.doorZ !== null && _head.z < world.doorZ) day.markLeftHouse();
        if (!day.atStop && Math.hypot(_head.x - stop.x, _head.z - stop.z) < STOP_RADIUS_M)
          day.markAtStop();
        // Walking to school counts too (the late option).
        if (Math.hypot(_head.x - dropOff.x, _head.z - dropOff.z) < STOP_RADIUS_M)
          day.arriveSchool();
      }
      // Sleep: a hand on the bed after a done day starts tomorrow.
      if (day.phase === 'done' && isTown) {
        for (const hand of [rig.handLeft, rig.handRight]) {
          hand.getWorldPosition(_hand);
          if (_hand.distanceTo(bed) <= 0.6) {
            day.newDay();
            rig.root.position.set(
              bedroom.x - rig.head.position.x,
              bedroom.y - 0.5,
              bedroom.z - rig.head.position.z,
            );
            locomotion.teleportReset();
            break;
          }
        }
      }
      bus?.update(dt, day, _body);
      classrooms?.update(dt);
      gym?.update(dt);
    },
  };
}
