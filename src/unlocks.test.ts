import { describe, expect, it } from 'vitest';
import { Group, PerspectiveCamera, Vector3 } from 'three';
import { DEFAULT_APPEARANCE, PALETTE } from './appearance';
import { buildGorilla } from './gorilla';
import { applyPlayerAppearance, type PlayerRig } from './placeholderPlayer';
import { UNLOCKS, isColorUnlocked, isSlotUnlocked, unlockedColors, unlockedSlots } from './unlocks';

describe('unlocks', () => {
  it('is monotonic and hits the thresholds', () => {
    for (let i = 1; i < UNLOCKS.length; i++) {
      for (const c of UNLOCKS[i - 1].colors) expect(UNLOCKS[i].colors).toContain(c);
      for (const s of UNLOCKS[i - 1].slots) expect(UNLOCKS[i].slots).toContain(s);
    }
    expect(unlockedColors(0)).toEqual([0, 1]);
    expect(unlockedSlots(0)).toEqual([]);
    expect(isSlotUnlocked(2, 0)).toBe(true);
    expect(isSlotUnlocked(2, 1)).toBe(false);
    expect(isSlotUnlocked(4, 1)).toBe(true);
    expect(isColorUnlocked(3, 5)).toBe(false);
    expect(isColorUnlocked(9, 5)).toBe(true);
  });

  it('applies an appearance to the player at runtime', () => {
    const root = new Group();
    const gorilla = buildGorilla(DEFAULT_APPEARANCE, { firstPerson: true });
    const rig: PlayerRig = {
      root,
      head: new PerspectiveCamera(),
      group: new Group(),
      gorilla,
      appearance: DEFAULT_APPEARANCE,
      handLeft: gorilla.hand[0],
      handRight: gorilla.hand[1],
    };
    applyPlayerAppearance(rig, { bodyColor: 3, accessories: ['none', 'scarf'] });
    expect(gorilla.furMaterial.color.getHex()).toBe(PALETTE[3]);
    expect(rig.appearance.accessories[1]).toBe('scarf');
    expect(gorilla.neckAnchor.children.some((c) => c.name === 'scarf')).toBe(true);
    void Vector3;
  });
});
