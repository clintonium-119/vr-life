import * as THREE from 'three';
import { PALETTE, type Accessory, type Appearance } from './appearance';
import { tuning, type MovementTuning } from './movementTuning';
import { Npc, NpcManager } from './npc';

// Dev flag `crowd`: a handful of NPC gorillas walking small loops near
// spawn so the frame cost of several bodies in scene is measurable.

const RING_RADIUS_M = 3;
const LOOP_RADIUS_M = 3;
const ACCESSORY_CYCLE: Accessory[] = ['none', 'cap', 'band', 'scarf'];

export interface GorillaCrowd {
  group: THREE.Group;
  update(dt: number, playerPos: THREE.Vector3): void;
}

export function buildGorillaCrowd(
  scene: THREE.Scene,
  count = 5,
  t: MovementTuning = tuning,
): GorillaCrowd {
  const manager = new NpcManager();
  manager.group.name = 'gorillaCrowd';
  scene.add(manager.group);
  for (let i = 0; i < count; i++) {
    const appearance: Appearance = {
      bodyColor: i % PALETTE.length,
      accessories: [ACCESSORY_CYCLE[i % 4], ACCESSORY_CYCLE[(i + 2) % 4]],
    };
    const a = (i / count) * Math.PI * 2;
    const centre = new THREE.Vector3(
      Math.cos(a) * RING_RADIUS_M,
      0,
      Math.sin(a) * RING_RADIUS_M - 4,
    );
    const route: THREE.Vector3[] = [];
    for (let k = 0; k < 6; k++) {
      const b = (k / 6) * Math.PI * 2;
      route.push(
        new THREE.Vector3(
          centre.x + Math.cos(b) * LOOP_RADIUS_M,
          0,
          centre.z + Math.sin(b) * LOOP_RADIUS_M,
        ),
      );
    }
    manager.add(
      new Npc({ role: 'pedestrian', appearance, position: route[0].clone(), route, seed: i + 11 }),
    );
  }
  return {
    group: manager.group,
    update(dt: number, playerPos: THREE.Vector3): void {
      manager.update(dt, playerPos, t);
    },
  };
}
