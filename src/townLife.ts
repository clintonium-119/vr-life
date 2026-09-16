import * as THREE from 'three';
import type { Grab } from './grab';
import type { Locomotion } from './locomotion';
import type { MovementAudio } from './movementAudio';
import { NpcManager } from './npc';
import { buildPedestrians, type Pedestrians } from './pedestrians';
import type { PlayerRig } from './placeholderPlayer';
import type { Progress } from './progress';
import type { PropWorld } from './props';
import { buildShops, type Shops } from './shop';
import type { World } from './world';

// Town life: the NPC population and the shops, updated after locomotion.

export interface TownLife {
  npcs: NpcManager;
  pedestrians: Pedestrians | null;
  shops: Shops | null;
  update(dt: number, headWorld: THREE.Vector3): void;
}

export function buildTownLife(
  scene: THREE.Scene,
  rig: PlayerRig,
  world: World,
  props: PropWorld,
  grab: Grab,
  locomotion: Locomotion,
  progress: Progress,
  audio: MovementAudio,
): TownLife {
  const npcs = new NpcManager();
  scene.add(npcs.group);
  const isTown = world.kind === 'home';
  const pedestrians = isTown ? buildPedestrians(npcs, audio) : null;
  const shops = isTown ? buildShops(scene, props, grab, npcs, progress, rig, audio) : null;
  return {
    npcs,
    pedestrians,
    shops,
    update(dt, headWorld): void {
      npcs.update(dt, headWorld);
      pedestrians?.update(headWorld, locomotion.velocity.length());
      shops?.update();
    },
  };
}
