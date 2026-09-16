import { describe, expect, it } from 'vitest';
import { TILE_NAMES, tileRect } from './atlas';

describe('atlas tile table', () => {
  it('keeps every rect inside the unit square with positive size', () => {
    for (const name of TILE_NAMES) {
      const r = tileRect(name);
      expect(r.u0).toBeGreaterThanOrEqual(0);
      expect(r.v0).toBeGreaterThanOrEqual(0);
      expect(r.u1).toBeLessThanOrEqual(1);
      expect(r.v1).toBeLessThanOrEqual(1);
      expect(r.u1 - r.u0).toBeGreaterThan(0.2);
      expect(r.v1 - r.v0).toBeGreaterThan(0.2);
    }
  });

  it('has pairwise disjoint rects', () => {
    for (const a of TILE_NAMES) {
      for (const b of TILE_NAMES) {
        if (a === b) continue;
        const ra = tileRect(a);
        const rb = tileRect(b);
        const overlap = ra.u0 < rb.u1 && rb.u0 < ra.u1 && ra.v0 < rb.v1 && rb.v0 < ra.v1;
        expect(overlap, `${a} vs ${b}`).toBe(false);
      }
    }
  });

  it('has fourteen tiles', () => {
    expect(TILE_NAMES).toHaveLength(14);
  });
});
