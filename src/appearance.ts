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
