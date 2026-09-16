import * as THREE from 'three';
import type { Grab } from './grab';
import type { Heat } from './heat';
import type { MovementAudio } from './movementAudio';
import { tuning, type MovementTuning } from './movementTuning';
import type { Npc, NpcManager } from './npc';
import type { PlayerRig } from './placeholderPlayer';

// The toy gun: a large prop that costs a hand. The trigger of the hand
// holding it pops the nearest NPC inside a forward cone backwards. Nobody
// is hurt; the police are interested.

/** Nearest NPC inside the cone ahead of `origin`, or null. */
export function pickTarget(
  origin: THREE.Vector3,
  forward: THREE.Vector3,
  npcs: readonly Npc[],
  range: number,
  coneDeg: number,
): Npc | null {
  const cos = Math.cos(THREE.MathUtils.degToRad(coneDeg));
  let best: Npc | null = null;
  let bestDist = range;
  const to = new THREE.Vector3();
  const f = forward.clone().normalize();
  for (const npc of npcs) {
    to.set(npc.position.x, npc.position.y + 0.8, npc.position.z).sub(origin);
    const dist = to.length();
    if (dist > range || dist < 1e-6) continue;
    if (to.divideScalar(dist).dot(f) < cos) continue;
    if (dist < bestDist) {
      bestDist = dist;
      best = npc;
    }
  }
  return best;
}

export interface ToyGun {
  /** Fire the gun held in `hand` (0 left, 1 right); no-op without a gun. */
  fire(hand: number): boolean;
  pops: number;
}

const SHOVE_M = 1.5;
const _origin = new THREE.Vector3();
const _forward = new THREE.Vector3();

export function buildToyGun(
  rig: PlayerRig,
  grab: Grab,
  npcs: NpcManager,
  heat: Heat,
  audio: MovementAudio,
  xr: THREE.WebXRManager | null,
  t: MovementTuning = tuning,
): ToyGun {
  const hands = [rig.handLeft, rig.handRight];
  const self: ToyGun = {
    pops: 0,
    fire(hand: number): boolean {
      const held = grab.held(hand);
      if (held === null || held.spec.effect?.kind !== 'gun') return false;
      hands[hand].getWorldPosition(_origin);
      hands[hand].getWorldDirection(_forward).negate();
      const target = pickTarget(
        _origin,
        _forward,
        npcs.npcs.filter((n) => n.parts.root.visible),
        t.gunRange,
        t.gunConeDeg,
      );
      audio.chime('pop');
      heat.pop();
      if (target !== null) {
        target.knockOver(_origin);
        target.shove(_forward, SHOVE_M);
      }
      self.pops += 1;
      return true;
    },
  };
  if (xr !== null) {
    for (let i = 0; i < 2; i++) {
      const controller = xr.getController(i);
      const grip = xr.getControllerGrip(i);
      const slot = (): number =>
        rig.handLeft.parent === grip ? 0 : rig.handRight.parent === grip ? 1 : i;
      // SAFETY: WebXRManager dispatches selectstart on this exact Object3D.
      (controller as unknown as EventTarget).addEventListener('selectstart', () =>
        self.fire(slot()),
      );
    }
  }
  return self;
}
