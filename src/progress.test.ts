import { describe, expect, it } from 'vitest';
import { Progress, levelFor } from './progress';

describe('Progress', () => {
  it('awards once, sums money, steps level, fires events once', () => {
    const p = new Progress();
    const log: string[] = [];
    p.events = {
      money: (t, d) => log.push(`money ${t} +${d}`),
      level: (l) => log.push(`level ${l}`),
      completed: (o) => log.push(`done ${o}`),
    };
    expect(p.award('backpack', 0)).toBe(true);
    expect(p.award('backpack', 0)).toBe(false);
    expect(p.award('math', 50)).toBe(true);
    expect(p.money).toBe(50);
    expect(p.level).toBe(levelFor(2));
    expect(log).toEqual(['done backpack', 'level 1', 'done math', 'money 50 +50', 'level 2']);
    expect(p.spend(30)).toBe(true);
    expect(p.spend(30)).toBe(false);
    expect(p.money).toBe(20);
  });

  it('levels by thresholds', () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(1)).toBe(1);
    expect(levelFor(4)).toBe(4);
    expect(levelFor(5)).toBe(4);
    expect(levelFor(6)).toBe(5);
  });
});
