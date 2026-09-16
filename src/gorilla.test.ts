import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, PALETTE } from './appearance';
import { buildGorilla, gorillaMeshes, setAppearance } from './gorilla';

describe('buildGorilla', () => {
  it('builds the named parts, omits the head in first person, and uses two materials', () => {
    const g = buildGorilla(DEFAULT_APPEARANCE, { firstPerson: true });
    expect(g.head).toBeNull();
    expect(g.headAnchor.visible).toBe(false);
    expect(g.shoulder).toHaveLength(2);
    expect(g.hand[0].name).toBe('handLeft');
    expect(g.hand[1].name).toBe('handRight');
    const materials = new Set(gorillaMeshes(g).map((m) => m.material));
    expect(materials.size).toBe(2);
    expect(materials.has(g.furMaterial)).toBe(true);
    expect(materials.has(g.skinMaterial)).toBe(true);
  });

  it('has a head with brow and crest in third person and stays under 30 primitives', () => {
    const g = buildGorilla(DEFAULT_APPEARANCE);
    expect(g.head).not.toBeNull();
    const names = gorillaMeshes(g).map((m) => m.name);
    expect(names).toContain('brow');
    expect(names).toContain('crest');
    expect(names.length).toBeLessThanOrEqual(30);
  });

  it('recolours the fur from the palette', () => {
    const g = buildGorilla(DEFAULT_APPEARANCE);
    setAppearance(g, { bodyColor: 2, accessories: ['none', 'none'] });
    expect(g.furMaterial.color.getHex()).toBe(PALETTE[2]);
    setAppearance(g, { bodyColor: 99, accessories: ['none', 'none'] });
    expect(g.furMaterial.color.getHex()).toBe(PALETTE[0]);
  });
});
