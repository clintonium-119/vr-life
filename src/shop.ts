import * as THREE from 'three';
import { PALETTE } from './appearance';
import type { Grab } from './grab';
import type { MovementAudio } from './movementAudio';
import { tuning, type MovementTuning } from './movementTuning';
import { Npc, type NpcManager } from './npc';
import { applyPlayerAppearance, type PlayerRig } from './placeholderPlayer';
import { Prop, type PropSpec, type PropWorld, type ShopEffect } from './props';
import type { Progress } from './progress';
import { PLACES } from './townPlan';
import { isColorUnlocked, isSlotUnlocked } from './unlocks';

// Shops: shelf goods are props with prices; the shopkeeper stands behind
// the counter; releasing a held item inside the pay zone buys it. Too poor
// or locked → it pops back to the shelf with a refusal. Carrying an unpaid
// item out of the shop returns it to the shelf.

export interface ShopItem {
  id: string;
  spec: PropSpec;
  home: [number, number, number];
  color: number;
  size: [number, number, number];
}

export interface Shop {
  id: string;
  bounds: THREE.Box3;
  payZone: THREE.Box3;
  keeper: [number, number, number];
  keeperYaw: number;
  items: ShopItem[];
}

export type RefusalReason = 'poor' | 'locked';

/** The purchase rule. */
export function tryPurchase(
  progress: Progress,
  item: { price: number; effect: ShopEffect },
): { ok: boolean; reason?: RefusalReason } {
  if (item.effect.kind === 'dye' && !isColorUnlocked(progress.level, item.effect.color))
    return { ok: false, reason: 'locked' };
  if (item.effect.kind === 'accessory' && !isSlotUnlocked(progress.level, item.effect.slot))
    return { ok: false, reason: 'locked' };
  if (progress.money < item.price) return { ok: false, reason: 'poor' };
  return { ok: true };
}

/** An unpaid shop good that is free and outside its shop goes back to the shelf. */
export function shouldRecall(prop: Prop, shop: Shop): boolean {
  return (
    prop.spec.price !== undefined &&
    !prop.paid &&
    prop.state === 'free' &&
    !shop.bounds.containsPoint(prop.position)
  );
}

const ACCESSORY_TINT = { cap: 0xc53030, band: 0xf6e05e, scarf: 0x2b6cb0 } as const;

function dye(
  shopId: string,
  color: number,
  x: number,
  y: number,
  z: number,
  t: MovementTuning,
): ShopItem {
  return {
    id: `${shopId}:dye${color}`,
    spec: {
      id: `${shopId}:dye${color}`,
      radius: 0.1,
      mass: 0.4,
      restitution: 0.3,
      rollingFriction: 4,
      sizeClass: 'small',
      surface: 'metal',
      price: t.priceDye,
      effect: { kind: 'dye', color },
      shopId,
    },
    home: [x, y, z],
    color: PALETTE[color],
    size: [0.12, 0.18, 0.12],
  };
}

function accessory(
  shopId: string,
  slot: 0 | 1,
  item: 'cap' | 'band' | 'scarf',
  x: number,
  y: number,
  z: number,
  t: MovementTuning,
): ShopItem {
  return {
    id: `${shopId}:${item}`,
    spec: {
      id: `${shopId}:${item}`,
      radius: 0.13,
      mass: 0.5,
      restitution: 0.3,
      rollingFriction: 6,
      sizeClass: 'small',
      surface: 'wood',
      price: t.priceAccessory,
      effect: { kind: 'accessory', slot, item },
      shopId,
    },
    home: [x, y, z],
    color: ACCESSORY_TINT[item],
    size: [0.24, 0.2, 0.24],
  };
}

function snack(
  shopId: string,
  n: number,
  x: number,
  y: number,
  z: number,
  t: MovementTuning,
): ShopItem {
  return {
    id: `${shopId}:snack${n}`,
    spec: {
      id: `${shopId}:snack${n}`,
      radius: 0.08,
      mass: 0.2,
      restitution: 0.4,
      rollingFriction: 5,
      sizeClass: 'small',
      surface: 'leaves',
      price: t.priceSnack,
      effect: { kind: 'snack' },
      shopId,
    },
    home: [x, y, z],
    color: n % 2 === 0 ? 0xd69e2e : 0xe53e3e,
    size: [0.14, 0.1, 0.06],
  };
}

/** Shop definitions derived from the town-centre geometry. */
export function shopDefinitions(t: MovementTuning = tuning): Shop[] {
  const [gx, , gz0] = PLACES.grocery;
  const gz = gz0 - 13; // building centre
  const grocery: Shop = {
    id: 'grocery',
    bounds: new THREE.Box3(
      new THREE.Vector3(gx - 16, 0, gz - 11),
      new THREE.Vector3(gx + 16, 6, gz + 11),
    ),
    // The counter runs along x at (gx + 10, 0, gz0 - 4), 6 m long, 1 m tall.
    payZone: new THREE.Box3(
      new THREE.Vector3(gx + 7, 0.9, gz0 - 4.7),
      new THREE.Vector3(gx + 13, 1.9, gz0 - 3.3),
    ),
    keeper: [gx + 10, 0, gz0 - 5.2],
    keeperYaw: 0,
    items: [],
  };
  // Shelf runs at z = gz0 - 20 + i*4 (x from gx-12 to gx+8); tier 2 top at y = 1.0.
  for (let c = 0; c < PALETTE.length; c++)
    grocery.items.push(dye('grocery', c, gx - 10 + c * 1.6, 1.13, gz0 - 20, t));
  grocery.items.push(accessory('grocery', 0, 'cap', gx - 8, 1.15, gz0 - 16, t));
  grocery.items.push(accessory('grocery', 0, 'band', gx - 5, 1.15, gz0 - 16, t));
  grocery.items.push(accessory('grocery', 1, 'scarf', gx - 2, 1.15, gz0 - 16, t));
  for (let n = 0; n < 4; n++)
    grocery.items.push(snack('grocery', n, gx - 9 + n * 1.4, 1.08, gz0 - 12, t));

  const [cx, , cz0] = PLACES.convenience;
  const cz = cz0 - 6;
  const convenience: Shop = {
    id: 'convenience',
    bounds: new THREE.Box3(
      new THREE.Vector3(cx - 6, 0, cz - 4.5),
      new THREE.Vector3(cx + 6, 4, cz + 4.5),
    ),
    // Counter at (cx + 3, 0, cz0 - 3), 3 m long.
    payZone: new THREE.Box3(
      new THREE.Vector3(cx + 1.5, 0.9, cz0 - 3.7),
      new THREE.Vector3(cx + 4.5, 1.9, cz0 - 2.3),
    ),
    keeper: [cx + 3, 0, cz0 - 4.2],
    keeperYaw: 0,
    items: [],
  };
  // Shelf run at z = cz0 - 9 (x from cx-4 to cx+4), tier 2 top at y 1.0.
  convenience.items.push(dye('convenience', 1, cx - 3, 1.13, cz0 - 9, t));
  convenience.items.push(dye('convenience', 2, cx - 1.8, 1.13, cz0 - 9, t));
  convenience.items.push(accessory('convenience', 0, 'cap', cx - 0.2, 1.15, cz0 - 9, t));
  for (let n = 0; n < 4; n++)
    convenience.items.push(snack('convenience', 4 + n, cx + 1.2 + n * 0.7, 1.08, cz0 - 9, t));
  return [grocery, convenience];
}

export interface Shops {
  group: THREE.Group;
  shops: Shop[];
  update(): void;
}

export function buildShops(
  scene: THREE.Scene,
  props: PropWorld,
  grab: Grab,
  manager: NpcManager,
  progress: Progress,
  rig: PlayerRig,
  audio: MovementAudio,
  t: MovementTuning = tuning,
): Shops {
  const shops = shopDefinitions(t);
  const group = new THREE.Group();
  group.name = 'shops';
  scene.add(group);
  const byProp = new Map<Prop, { shop: Shop; item: ShopItem; mesh: THREE.Mesh }>();

  for (const shop of shops) {
    const keeper = new Npc({
      role: 'shopkeeper',
      appearance: { bodyColor: shop.id === 'grocery' ? 2 : 4, accessories: ['band', 'none'] },
      position: new THREE.Vector3(...shop.keeper),
      yaw: shop.keeperYaw,
    });
    manager.add(keeper);
    for (const item of shop.items) {
      const prop = new Prop(item.spec, new THREE.Vector3(...item.home));
      props.add(prop);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...item.size),
        new THREE.MeshLambertMaterial({ color: item.color }),
      );
      mesh.name = item.id;
      mesh.position.copy(prop.position);
      group.add(mesh);
      byProp.set(prop, { shop, item, mesh });
    }
  }

  function apply(effect: ShopEffect): void {
    const a = rig.appearance;
    if (effect.kind === 'dye')
      applyPlayerAppearance(rig, { bodyColor: effect.color, accessories: a.accessories });
    if (effect.kind === 'accessory') {
      const accessories: [(typeof a.accessories)[0], (typeof a.accessories)[1]] = [
        a.accessories[0],
        a.accessories[1],
      ];
      accessories[effect.slot] = effect.item;
      applyPlayerAppearance(rig, { bodyColor: a.bodyColor, accessories });
    }
  }

  const previous = grab.events.release;
  grab.events.release = (prop, speed) => {
    previous?.(prop, speed);
    const entry = byProp.get(prop);
    if (
      entry === undefined ||
      prop.paid ||
      prop.spec.price === undefined ||
      prop.spec.effect === undefined
    )
      return;
    if (!entry.shop.payZone.containsPoint(prop.position)) return;
    const result = tryPurchase(progress, { price: prop.spec.price, effect: prop.spec.effect });
    if (!result.ok) {
      console.info(`[vr-life] shop: refused ${prop.spec.id} (${result.reason})`);
      audio.chime('wrong');
      prop.resetToHome();
      return;
    }
    progress.spend(prop.spec.price);
    audio.chime('cash');
    console.info(`[vr-life] shop: bought ${prop.spec.id} for ${prop.spec.price}`);
    if (prop.spec.effect.kind === 'snack') {
      prop.paid = true; // yours to keep (and throw)
    } else {
      apply(prop.spec.effect);
      prop.resetToHome(); // the shelf stays stocked
    }
  };

  return {
    group,
    shops,
    update(): void {
      for (const [prop, entry] of byProp) {
        if (shouldRecall(prop, entry.shop)) prop.resetToHome();
        entry.mesh.position.copy(prop.position);
        entry.mesh.visible = prop.state !== 'stowed';
      }
    },
  };
}
