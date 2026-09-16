import * as THREE from 'three';
import { PALETTE, type Accessory } from './appearance';
import type { MovementAudio } from './movementAudio';
import { tuning, type MovementTuning } from './movementTuning';
import { Npc, type NpcManager } from './npc';
import { randomRoute } from './npcRoutes';

// The town's walkers: pedestrians on random sidewalk slices with distinct
// looks. A player sprinting past within the reaction radius, or bumping
// into one at any speed, knocks it over (slapstick, with a whoop).

const ACCESSORIES: Accessory[] = ['none', 'none', 'cap', 'band', 'scarf'];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The slapstick rule: bumped at any speed, or passed fast within the radius. */
export function shouldReact(
  distance: number,
  playerSpeed: number,
  t: MovementTuning = tuning,
): boolean {
  if (distance <= t.npcBumpRadius) return true;
  return distance <= t.npcReactRadius && playerSpeed >= t.npcReactSpeed;
}

export interface Pedestrians {
  npcs: Npc[];
  update(playerPos: THREE.Vector3, playerSpeed: number): void;
}

export function buildPedestrians(
  manager: NpcManager,
  audio: MovementAudio,
  count = 14,
  seed = 2026,
  t: MovementTuning = tuning,
): Pedestrians {
  const rnd = mulberry32(seed);
  const npcs: Npc[] = [];
  for (let i = 0; i < count; i++) {
    const route = randomRoute(rnd, 4 + Math.floor(rnd() * 4));
    const npc = new Npc({
      role: 'pedestrian',
      appearance: {
        bodyColor: Math.floor(rnd() * PALETTE.length),
        accessories: [ACCESSORIES[Math.floor(rnd() * 5)], ACCESSORIES[Math.floor(rnd() * 5)]],
      },
      position: route[0].clone(),
      route,
      seed: 100 + i,
    });
    npc.waypoint = Math.min(route.length - 1, 1);
    npcs.push(manager.add(npc));
  }
  return {
    npcs,
    update(playerPos, playerSpeed): void {
      for (const npc of npcs) {
        if (npc.state === 'react' || !npc.parts.root.visible) continue;
        const d = Math.hypot(npc.position.x - playerPos.x, npc.position.z - playerPos.z);
        if (shouldReact(d, playerSpeed, t)) {
          npc.knockOver(playerPos);
          audio.chime('whoop');
        }
      }
    },
  };
}
