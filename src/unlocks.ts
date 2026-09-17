// Level → cosmetics: which palette colours and accessory slots are unlocked.
// The only thing levelling gates. Pure.

export interface UnlockTier {
  level: number;
  colors: number[];
  slots: (0 | 1)[];
}

export const UNLOCKS: readonly UnlockTier[] = [
  { level: 0, colors: [0, 1, 2], slots: [] },
  { level: 1, colors: [0, 1, 2, 3, 4], slots: [] },
  { level: 2, colors: [0, 1, 2, 3, 4, 5, 6], slots: [0] },
  { level: 3, colors: [0, 1, 2, 3, 4, 5, 6, 7, 8], slots: [0] },
  { level: 4, colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], slots: [0, 1] },
  { level: 5, colors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], slots: [0, 1] },
];

function tierFor(level: number): UnlockTier {
  let tier = UNLOCKS[0];
  for (const t of UNLOCKS) if (level >= t.level) tier = t;
  return tier;
}

export function unlockedColors(level: number): readonly number[] {
  return tierFor(level).colors;
}

export function unlockedSlots(level: number): readonly (0 | 1)[] {
  return tierFor(level).slots;
}

export function isColorUnlocked(level: number, index: number): boolean {
  return unlockedColors(level).includes(index);
}

export function isSlotUnlocked(level: number, slot: 0 | 1): boolean {
  return unlockedSlots(level).includes(slot);
}
