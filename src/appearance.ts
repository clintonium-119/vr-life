import {
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshLambertMaterial,
  TorusGeometry,
  type Object3D,
} from 'three';

// Customisation: a plain record applied to the gorilla's materials and
// accessory anchors. Network-friendly and trivially persisted later.

export type Accessory = 'none' | 'cap' | 'band' | 'scarf';

export interface Appearance {
  /** Index into PALETTE. */
  bodyColor: number;
  accessories: [Accessory, Accessory];
}

/** Fur colours: black, charcoal, silverback grey, brown, rust, blue-black. */
export const PALETTE: readonly number[] = [
  0x1c1a19, 0x3a3634, 0x6b6f73, 0x4a3324, 0x7a3b1e, 0x1e2233,
];

export const DEFAULT_APPEARANCE: Appearance = { bodyColor: 0, accessories: ['none', 'none'] };

const ACCESSORIES: ReadonlySet<string> = new Set(['none', 'cap', 'band', 'scarf']);

/** `?look=<paletteIndex>,<slotA>,<slotB>`; junk falls back to defaults. */
export function parseLook(query: string): Appearance {
  const raw = new URLSearchParams(query).get('look');
  const out: Appearance = { bodyColor: 0, accessories: ['none', 'none'] };
  if (!raw) return out;
  const [index, a, b] = raw.split(',').map((s) => s.trim());
  const n = Number(index);
  if (Number.isInteger(n)) out.bodyColor = Math.min(PALETTE.length - 1, Math.max(0, n));
  const slot = (v: string | undefined): Accessory =>
    v !== undefined && ACCESSORIES.has(v) ? (v as Accessory) : 'none';
  out.accessories = [slot(a), slot(b)];
  return out;
}

const CAP_COLOR = 0xc53030;
const BAND_COLOR = 0xf6e05e;
const SCARF_COLOR = 0x2b6cb0;

/**
 * Accessory mesh for a slot, or null for 'none'. Head accessories go on
 * the head anchor, the scarf on the neck anchor: `attachesTo` says which.
 */
export function buildAccessory(
  kind: Accessory,
): { object: Object3D; attachesTo: 'head' | 'neck' } | null {
  switch (kind) {
    case 'cap': {
      const cap = new Mesh(
        new CylinderGeometry(0.11, 0.13, 0.07, 12),
        new MeshLambertMaterial({ color: CAP_COLOR }),
      );
      cap.name = 'cap';
      cap.position.set(0, 0.11, 0.01);
      const peak = new Mesh(new BoxGeometry(0.14, 0.015, 0.09), cap.material);
      peak.position.set(0, -0.03, -0.11);
      cap.add(peak);
      return { object: cap, attachesTo: 'head' };
    }
    case 'band': {
      const band = new Mesh(
        new TorusGeometry(0.135, 0.015, 8, 20),
        new MeshLambertMaterial({ color: BAND_COLOR }),
      );
      band.name = 'band';
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0.05, 0);
      return { object: band, attachesTo: 'head' };
    }
    case 'scarf': {
      const scarf = new Mesh(
        new TorusGeometry(0.17, 0.035, 8, 20),
        new MeshLambertMaterial({ color: SCARF_COLOR }),
      );
      scarf.name = 'scarf';
      scarf.rotation.x = Math.PI / 2;
      return { object: scarf, attachesTo: 'neck' };
    }
    default:
      return null;
  }
}
