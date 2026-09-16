import * as THREE from 'three';
import {
  makeBoxCollider,
  updateCollider,
  type BoxCollider,
  type CollisionWorld,
} from './collision';
import type { DayState } from './dayState';
import { tuning, type MovementTuning } from './movementTuning';
import { AVENUE_Z, PLACES, ROAD_W } from './townPlan';

// The bus: a real moving platform. Floor, walls, rails and roof are dynamic
// colliders refreshed from the bus transform every frame and tagged with
// the bus velocity, so a body standing aboard rides along and hands on the
// rails stick. It waits at the stop, drives the avenue to the school
// drop-off, waits, drives back: the late bus for whoever missed it.

export type BusState = 'waitingAtStop' | 'toSchool' | 'waitingAtSchool' | 'toStop';

export interface Bus {
  group: THREE.Group;
  state: BusState;
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  aboard(bodyPos: THREE.Vector3): boolean;
  update(dt: number, day: DayState, bodyPos: THREE.Vector3): void;
}

const LENGTH = 10;
const WIDTH = 2.6;
const HEIGHT = 2.4;
const FLOOR_TOP = 0.5;
export const BUS_LANE_Z = AVENUE_Z - ROAD_W / 4; // south lane: door faces the stop sidewalk
const BOARD_SECONDS = 1.5;

interface Part {
  local: THREE.Matrix4;
  collider: BoxCollider;
}

export function buildBus(
  scene: THREE.Scene,
  world: CollisionWorld,
  t: MovementTuning = tuning,
): Bus {
  const group = new THREE.Group();
  group.name = 'bus';
  const body = new THREE.MeshLambertMaterial({ color: 0xf6c026 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2d3748 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd0ef });
  const parts: Part[] = [];
  const velocity = new THREE.Vector3();

  const add = (
    name: string,
    size: [number, number, number],
    pos: [number, number, number],
    material: THREE.Material,
    solid = true,
  ): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...pos);
    group.add(mesh);
    if (!solid) return;
    const local = new THREE.Matrix4().setPosition(...pos);
    const collider = makeBoxCollider(
      `bus:${name}`,
      'metal',
      new THREE.Box3(
        new THREE.Vector3(-size[0] / 2, -size[1] / 2, -size[2] / 2),
        new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2),
      ),
      new THREE.Matrix4(),
    );
    collider.velocity = velocity;
    parts.push({ local, collider });
  };

  // Floor (top at FLOOR_TOP), roof, front/back, north wall, south wall with a door gap near the front.
  add('floor', [LENGTH, 0.3, WIDTH], [0, FLOOR_TOP - 0.15, 0], dark);
  add('roof', [LENGTH, 0.12, WIDTH], [0, FLOOR_TOP + HEIGHT, 0], body);
  add('front', [0.15, HEIGHT, WIDTH], [LENGTH / 2, FLOOR_TOP + HEIGHT / 2, 0], body);
  add('back', [0.15, HEIGHT, WIDTH], [-LENGTH / 2, FLOOR_TOP + HEIGHT / 2, 0], body);
  add('northWall', [LENGTH, HEIGHT, 0.12], [0, FLOOR_TOP + HEIGHT / 2, WIDTH / 2], body);
  add('southWallA', [LENGTH - 3.2, HEIGHT, 0.12], [-1.6, FLOOR_TOP + HEIGHT / 2, -WIDTH / 2], body);
  add(
    'southWallB',
    [1.0, HEIGHT, 0.12],
    [LENGTH / 2 - 0.5, FLOOR_TOP + HEIGHT / 2, -WIDTH / 2],
    body,
  );
  add(
    'doorLintel',
    [1.2, 0.5, 0.12],
    [LENGTH / 2 - 1.6, FLOOR_TOP + HEIGHT - 0.25, -WIDTH / 2],
    body,
  );
  // Windows (visual only) and skirt.
  add('windowsN', [LENGTH - 0.6, 0.9, 0.02], [0, FLOOR_TOP + 1.6, WIDTH / 2 + 0.01], glass, false);
  add(
    'windowsS',
    [LENGTH - 3.6, 0.9, 0.02],
    [-1.8, FLOOR_TOP + 1.6, -WIDTH / 2 - 0.01],
    glass,
    false,
  );
  add('skirt', [LENGTH, FLOOR_TOP - 0.3, WIDTH], [0, (FLOOR_TOP - 0.3) / 2 + 0.3, 0], dark, false);
  for (const x of [-3.2, 3.2]) {
    for (const z of [-WIDTH / 2 - 0.05, WIDTH / 2 + 0.05])
      add(`wheel${x}${z}`, [0.9, 0.9, 0.3], [x, 0.45, z], dark, false);
  }
  // Rails: two poles and a ceiling rail down the middle.
  add('poleA', [0.05, HEIGHT, 0.05], [1.5, FLOOR_TOP + HEIGHT / 2, 0], dark);
  add('poleB', [0.05, HEIGHT, 0.05], [-2.5, FLOOR_TOP + HEIGHT / 2, 0], dark);
  add('ceilingRail', [LENGTH - 1, 0.05, 0.05], [0, FLOOR_TOP + HEIGHT - 0.3, 0], dark);
  // Bench seats along the north wall.
  add('bench', [LENGTH - 1.5, 0.45, 0.5], [0, FLOOR_TOP + 0.225, WIDTH / 2 - 0.35], dark);

  world.addDynamic(...parts.map((p) => p.collider));
  scene.add(group);

  const stopX = PLACES.busStop[0];
  const schoolX = PLACES.schoolDropOff[0];
  const position = new THREE.Vector3(stopX, 0, BUS_LANE_Z);
  let speed = 0;
  let state: BusState = 'waitingAtStop';
  let waited = 0;
  let aboardFor = 0;

  function refresh(): void {
    group.position.copy(position);
    group.updateMatrixWorld(true);
    for (const p of parts) {
      p.collider.matrixWorld.multiplyMatrices(group.matrixWorld, p.local);
      updateCollider(p.collider);
    }
  }
  refresh();

  const _local = new THREE.Vector3();
  function aboard(bodyPos: THREE.Vector3): boolean {
    _local.copy(bodyPos).sub(position);
    return (
      Math.abs(_local.x) <= LENGTH / 2 &&
      Math.abs(_local.z) <= WIDTH / 2 &&
      _local.y > FLOOR_TOP - 0.2 &&
      _local.y < FLOOR_TOP + HEIGHT
    );
  }

  /** Move toward targetX with acceleration limits; true when arrived. */
  function drive(dt: number, targetX: number): boolean {
    const remaining = targetX - position.x;
    const dir = Math.sign(remaining);
    const dist = Math.abs(remaining);
    const stoppingSpeed = Math.sqrt(2 * t.busAccel * dist);
    const target = Math.min(t.busSpeed, stoppingSpeed);
    speed = Math.min(target, speed + t.busAccel * dt);
    const step = Math.min(dist, speed * dt);
    position.x += dir * step;
    velocity.set((dir * step) / Math.max(dt, 1e-6), 0, 0);
    if (dist - step < 0.02) {
      position.x = targetX;
      speed = 0;
      velocity.set(0, 0, 0);
      return true;
    }
    return false;
  }

  return {
    group,
    get state(): BusState {
      return state;
    },
    set state(next: BusState) {
      state = next;
    },
    position,
    velocity,
    aboard,
    update(dt: number, day: DayState, bodyPos: THREE.Vector3): void {
      const isAboard = aboard(bodyPos);
      aboardFor = isAboard ? aboardFor + dt : 0;
      switch (state) {
        case 'waitingAtStop':
          velocity.set(0, 0, 0);
          waited += dt;
          if (waited >= t.busWaitS || aboardFor >= BOARD_SECONDS) {
            waited = 0;
            state = 'toSchool';
            if (isAboard) day.boardBus();
          }
          break;
        case 'toSchool':
          if (drive(dt, schoolX)) {
            state = 'waitingAtSchool';
            if (isAboard) day.arriveSchool();
          }
          break;
        case 'waitingAtSchool':
          velocity.set(0, 0, 0);
          waited += dt;
          if (waited >= t.busWaitS) {
            waited = 0;
            state = 'toStop';
          }
          break;
        case 'toStop':
          if (drive(dt, stopX)) state = 'waitingAtStop';
          break;
      }
      refresh();
    },
  };
}
