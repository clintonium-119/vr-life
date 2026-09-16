import * as THREE from 'three';
import type { Grab } from './grab';
import type { Heat } from './heat';
import type { MovementAudio } from './movementAudio';
import { tuning, type MovementTuning } from './movementTuning';
import type { NpcManager } from './npc';
import type { PlayerRig } from './placeholderPlayer';

// Melee: the universal hand verb extended. A hand moving fast within reach
// of an NPC knocks it over (slapstick) and draws heat. No damage.

/** The strike rule: close enough and fast enough. */
export function strikeRule(
  distance: number,
  handSpeed: number,
  t: MovementTuning = tuning,
): boolean {
  return distance <= t.strikeRadius && handSpeed >= t.strikeSpeed;
}

export interface Melee {
  update(dt: number): void;
  strikes: number;
}

const STRIKE_COOLDOWN_S = 0.35;
const TORSO_HEIGHT_M = 0.8;
const _hand = new THREE.Vector3();
const _torso = new THREE.Vector3();

export function buildMelee(
  rig: PlayerRig,
  grab: Grab,
  npcs: NpcManager,
  heat: Heat,
  audio: MovementAudio,
  t: MovementTuning = tuning,
): Melee {
  const hands = [rig.handLeft, rig.handRight];
  const cooldown = [0, 0];
  const self = {
    strikes: 0,
    update(dt: number): void {
      for (let i = 0; i < 2; i++) {
        cooldown[i] = Math.max(0, cooldown[i] - dt);
        if (cooldown[i] > 0 || grab.handHolding(i)) continue;
        const speed = grab.handVelocity(i).length();
        if (speed < t.strikeSpeed) continue;
        hands[i].getWorldPosition(_hand);
        for (const npc of npcs.npcs) {
          if (!npc.parts.root.visible || npc.state === 'react') continue;
          _torso.set(npc.position.x, npc.position.y + TORSO_HEIGHT_M, npc.position.z);
          if (!strikeRule(_hand.distanceTo(_torso), speed, t)) continue;
          npc.knockOver(_hand);
          heat.strike();
          audio.chime('thwack');
          self.strikes += 1;
          cooldown[i] = STRIKE_COOLDOWN_S;
          break;
        }
      }
    },
  };
  return self;
}
