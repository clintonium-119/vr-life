import { describe, expect, it } from 'vitest';
import { parseWorld } from './world';

describe('parseWorld', () => {
  it('defaults to home and accepts test', () => {
    expect(parseWorld('')).toBe('home');
    expect(parseWorld('?dev=perf')).toBe('home');
    expect(parseWorld('?world=test')).toBe('test');
    expect(parseWorld('?world=bogus')).toBe('home');
  });
});
