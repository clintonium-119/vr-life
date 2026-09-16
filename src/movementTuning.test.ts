import { describe, expect, it } from 'vitest';
import { applyTuneOverrides, tuning } from './movementTuning';

const fresh = (): Record<string, number> => ({ ...tuning });

describe('applyTuneOverrides', () => {
  it('applies nothing for an empty query', () => {
    const t = fresh();
    expect(applyTuneOverrides('', t)).toEqual({});
    expect(t).toEqual(tuning);
  });

  it('applies known numeric keys and returns them', () => {
    const t = fresh();
    expect(applyTuneOverrides('?tune=speedCap=20,gravity=5', t)).toEqual({
      speedCap: 20,
      gravity: 5,
    });
    expect(t.speedCap).toBe(20);
    expect(t.gravity).toBe(5);
  });

  it('ignores unknown keys and non-numeric values', () => {
    const t = fresh();
    expect(applyTuneOverrides('?tune=bogus=1,speedCap=fast,gravity=', t)).toEqual({});
    expect(t).toEqual(tuning);
  });

  it('merges repeated tune params', () => {
    const t = fresh();
    expect(applyTuneOverrides('?tune=speedCap=20&dev=perf&tune=gravity=5', t)).toEqual({
      speedCap: 20,
      gravity: 5,
    });
  });

  it('keeps every default numeric', () => {
    for (const [key, value] of Object.entries(tuning)) {
      expect(typeof value, key).toBe('number');
      expect(Number.isFinite(value), key).toBe(true);
    }
  });
});
