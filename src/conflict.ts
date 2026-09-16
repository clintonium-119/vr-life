import * as THREE from 'three';
import type { CollisionWorld } from './collision';
import type { Grab } from './grab';
import { Heat } from './heat';
import type { Locomotion } from './locomotion';
import { buildMelee, type Melee } from './melee';
import type { MovementAudio } from './movementAudio';
import type { NpcManager } from './npc';
import type { PlayerRig } from './placeholderPlayer';
import { buildPolice, type Police } from './police';
import type { PrisonDistrict } from './prison';
import type { Progress } from './progress';
import type { Shops } from './shop';
import { buildToyGun, type ToyGun } from './toyGun';

// The conflict loop wired together: heat ← melee / toy gun; heat → police;
// police → prison, fine, confiscation. A dev `?heat=` value seeds heat.

export interface Conflict {
  heat: Heat;
  melee: Melee;
  gun: ToyGun;
  police: Police;
  update(dt: number, playerFeet: THREE.Vector3): void;
}

export function parseHeat(query: string): number {
  const raw = Number(new URLSearchParams(query).get('heat'));
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
}

export function buildConflict(
  world: CollisionWorld,
  rig: PlayerRig,
  grab: Grab,
  locomotion: Locomotion,
  npcs: NpcManager,
  prison: PrisonDistrict,
  progress: Progress,
  shops: Shops | null,
  audio: MovementAudio,
  xr: THREE.WebXRManager | null,
  query = '',
): Conflict {
  const heat = new Heat();
  const melee = buildMelee(rig, grab, npcs, heat, audio);
  const gun = buildToyGun(rig, grab, npcs, heat, audio, xr);
  const police = buildPolice(
    world,
    npcs,
    heat,
    locomotion,
    rig,
    grab,
    prison,
    progress,
    () => shops?.returnToShelf('convenience:toyGun'),
    audio,
  );
  const seeded = parseHeat(query);
  if (seeded > 0) {
    // Dev: seed heat (one pop's worth at a time so dispatch fires normally).
    while (heat.value < seeded - 1e-6) heat.pop();
  }
  return {
    heat,
    melee,
    gun,
    police,
    update(dt, playerFeet): void {
      melee.update(dt);
      police.update(dt, playerFeet);
    },
  };
}
