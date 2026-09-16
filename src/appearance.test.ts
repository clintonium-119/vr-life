import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, PALETTE, buildAccessory, parseLook } from './appearance';

describe('parseLook', () => {
  it('defaults with no param', () => {
    expect(parseLook('')).toEqual(DEFAULT_APPEARANCE);
    expect(parseLook('?dev=perf')).toEqual(DEFAULT_APPEARANCE);
  });
  it('parses index and slots', () => {
    expect(parseLook('?look=2,cap,scarf')).toEqual({ bodyColor: 2, accessories: ['cap', 'scarf'] });
  });
  it('clamps the index and ignores unknown accessories', () => {
    expect(parseLook('?look=99,hat').bodyColor).toBe(PALETTE.length - 1);
    expect(parseLook('?look=-3,hat,band')).toEqual({ bodyColor: 0, accessories: ['none', 'band'] });
    expect(parseLook('?look=abc').bodyColor).toBe(0);
  });
  it('has at least six distinct palette colours', () => {
    expect(new Set(PALETTE).size).toBeGreaterThanOrEqual(6);
  });
  it('builds head and neck accessories', () => {
    expect(buildAccessory('none')).toBeNull();
    expect(buildAccessory('cap')?.attachesTo).toBe('head');
    expect(buildAccessory('band')?.attachesTo).toBe('head');
    expect(buildAccessory('scarf')?.attachesTo).toBe('neck');
  });
});
