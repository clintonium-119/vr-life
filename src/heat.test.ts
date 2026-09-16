import { describe, expect, it } from 'vitest';
import { Heat, arrestCosts } from './heat';
import { tuning } from './movementTuning';
import { Progress } from './progress';

describe('Heat', () => {
  it('rises, dispatches once, decays only when not chased, clears, resets', () => {
    const h = new Heat(tuning);
    const log: string[] = [];
    h.events = { dispatch: () => log.push('dispatch'), cleared: () => log.push('cleared') };
    h.strike();
    expect(h.wanted).toBe(false);
    h.strike();
    expect(h.value).toBeCloseTo(0.5);
    expect(h.wanted).toBe(true);
    h.pop();
    expect(h.value).toBeCloseTo(0.9);
    expect(log).toEqual(['dispatch']);
    h.tick(10, true);
    expect(h.value).toBeCloseTo(0.9); // chased: no decay
    for (let i = 0; i < 40; i++) h.tick(1, false);
    expect(h.value).toBe(0);
    expect(h.wanted).toBe(false);
    expect(log).toEqual(['dispatch', 'cleared']);
    h.strike();
    h.strike();
    h.reset();
    expect(h.value).toBe(0);
    expect(log).toEqual(['dispatch', 'cleared', 'dispatch', 'cleared']);
  });
});

describe('arrestCosts', () => {
  it('takes half with a floor and never overdraws', () => {
    const rich = new Progress();
    rich.money = 200;
    expect(arrestCosts(rich, tuning)).toEqual({ fine: 100 });
    expect(rich.money).toBe(100);
    const poor = new Progress();
    poor.money = 30;
    expect(arrestCosts(poor, tuning)).toEqual({ fine: 20 });
    expect(poor.money).toBe(10);
    const broke = new Progress();
    expect(arrestCosts(broke, tuning)).toEqual({ fine: 0 });
    expect(broke.money).toBe(0);
  });
});
