import { describe, expect, it } from 'vitest';
import { PerfSampler } from './perfStats';

/** Feed `frames` consecutive frame deltas (ms) into the sampler. */
function feed(sampler: PerfSampler, deltasMs: number[], startMs = 0): number {
  let now = startMs;
  if (sampler.samples === 0) sampler.sample(now); // anchor the clock
  for (const d of deltasMs) {
    now += d;
    sampler.sample(now);
  }
  return now;
}

const fill = (n: number, ms: number): number[] => Array.from({ length: n }, () => ms);

describe('PerfSampler window math', () => {
  it('computes min, avg, and p95 over one full window', () => {
    const sampler = new PerfSampler({ windowSize: 20 });
    // 18 frames at 10 ms plus two 30 ms spikes.
    feed(sampler, [...fill(18, 10), 30, 30]);
    expect(sampler.windowMinMs).toBeCloseTo(10, 3);
    expect(sampler.windowAvgMs).toBeCloseTo((18 * 10 + 60) / 20, 3);
    expect(sampler.windowP95Ms).toBeCloseTo(30, 3); // nearest-rank: sorted[ceil(20*0.95)-1]
    expect(sampler.instantFps).toBeCloseTo(1000 / 30, 3);
  });

  it('does not publish stats before the first window fills', () => {
    const sampler = new PerfSampler({ windowSize: 10 });
    feed(sampler, fill(9, 10));
    expect(sampler.windowAvgMs).toBe(0);
    expect(sampler.windowAvgFps).toBe(0);
  });
});

describe('PerfSampler warning state machine', () => {
  const fastMs = 1000 / 90; // 90 fps
  const slowMs = 1000 / 60; // 60 fps, below the 72 floor

  it('trips after sustained sub-floor windows and recovers with hysteresis', () => {
    const sampler = new PerfSampler({ windowSize: 10 });
    let now = feed(sampler, fill(10, fastMs));
    expect(sampler.state).toBe('ok');

    now = feed(sampler, fill(10, slowMs), now);
    expect(sampler.state).toBe('ok'); // one slow window: not yet
    now = feed(sampler, fill(10, slowMs), now);
    expect(sampler.state).toBe('warning'); // second consecutive: trip

    feed(sampler, fill(10, fastMs), now);
    expect(sampler.state).toBe('ok'); // one good window clears
  });

  it('ignores a single slow frame in an otherwise fast window', () => {
    const sampler = new PerfSampler(); // default 60-frame window
    let now = 0;
    for (let w = 0; w < 5; w++) {
      // One 50 ms hitch per window; the window average stays above 72 fps.
      now = feed(sampler, [...fill(59, fastMs), 50], now);
      expect(sampler.state).toBe('ok');
    }
  });

  it('honours the floorFps option', () => {
    const at80 = fill(10, 1000 / 80);
    const strict = new PerfSampler({ windowSize: 10, floorFps: 90 });
    const lax = new PerfSampler({ windowSize: 10 });
    const a = feed(strict, at80);
    feed(strict, at80, a);
    const b = feed(lax, at80);
    feed(lax, at80, b);
    expect(strict.state).toBe('warning');
    expect(lax.state).toBe('ok');
    expect(lax.floorFps).toBe(72);
  });
});
