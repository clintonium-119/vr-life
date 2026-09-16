import { describe, expect, it } from 'vitest';
import { DayState } from './dayState';
import { tuning } from './movementTuning';
import { Progress } from './progress';

function day() {
  const d = new DayState(new Progress(), tuning);
  const log: string[] = [];
  d.events = {
    phase: (f, t) => log.push(`${f}>${t}`),
    lateBus: () => log.push('late'),
    backpack: () => log.push('backpack'),
    questionResult: (s, c) => log.push(`${s}:${c ? 'ok' : 'no'}`),
    classPassed: (s) => log.push(`pass ${s}`),
    gymPassed: () => log.push('gym'),
  };
  return { d, log };
}

describe('DayState', () => {
  it('runs the arc asleep → rush → ride → school → done with events once', () => {
    const { d, log } = day();
    d.wake();
    d.wake();
    d.grabBackpack();
    d.grabBackpack();
    d.boardBus();
    d.arriveSchool();
    for (const s of ['math', 'science', 'history'] as const) {
      d.answer(s, false);
      d.answer(s, true);
      d.answer(s, true);
      d.answer(s, false);
      d.answer(s, true);
      expect(d.classPassed(s)).toBe(true);
      d.answer(s, true); // ignored once passed
    }
    expect(d.phase).toBe('school');
    d.score();
    d.score();
    d.score();
    expect(d.phase).toBe('done');
    expect(d.progress.money).toBe(tuning.classPayout * 3 + tuning.gymPayout);
    expect(log.filter((l) => l.includes('>'))).toEqual([
      'asleep>rush',
      'rush>ride',
      'ride>school',
      'school>done',
    ]);
    expect(log.filter((l) => l === 'backpack')).toHaveLength(1);
    expect(log.filter((l) => l.startsWith('pass'))).toHaveLength(3);
    expect(log.filter((l) => l === 'gym')).toHaveLength(1);
  });

  it('flags the late bus when the timer runs out and keeps the rush going', () => {
    const { d, log } = day();
    const remaining: number[] = [];
    d.events.timer = (r) => remaining.push(r);
    d.tick(1); // asleep: no timer
    d.wake();
    for (let i = 0; i < tuning.rushTimerS + 5; i++) d.tick(1);
    expect(d.lateBus).toBe(true);
    expect(d.phase).toBe('rush');
    expect(log.filter((l) => l === 'late')).toHaveLength(1);
    expect(remaining[0]).toBe(tuning.rushTimerS - 1);
    expect(remaining[remaining.length - 1]).toBe(0);
    d.boardBus(); // the late bus still rides
    expect(d.phase).toBe('ride');
  });

  it('lets a walker arrive at school without the bus, and wakes on any progress', () => {
    const { d } = day();
    d.arriveSchool();
    expect(d.phase).toBe('school');
    expect(d.progress.completed.has('bus')).toBe(false);
  });
});
