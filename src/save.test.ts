import { describe, expect, it } from 'vitest';
import { Progress } from './progress';
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  loadSave,
  parseReset,
  recordFrom,
  writeSave,
  type StorageLike,
} from './save';
import { DayState } from './dayState';
import { tuning } from './movementTuning';

function memory(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('save', () => {
  it('round-trips a profile and restores it', () => {
    const storage = memory();
    const p = new Progress();
    p.award('math', 50);
    p.award('gym', 50);
    const record = recordFrom(p, { bodyColor: 3, accessories: ['cap', 'none'] }, 2);
    expect(writeSave(storage, record)).toBe(true);
    const loaded = loadSave(storage);
    expect(loaded).toEqual(record);
    const q = new Progress();
    q.restore(loaded!);
    expect(q.money).toBe(100);
    expect(q.level).toBe(2);
    expect([...q.completed]).toEqual(['math', 'gym']);
  });

  it('starts fresh on missing, garbage, or wrong-version records and swallows write errors', () => {
    expect(loadSave(null)).toBeNull();
    const storage = memory();
    expect(loadSave(storage)).toBeNull();
    storage.setItem(SAVE_KEY, '{not json');
    expect(loadSave(storage)).toBeNull();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: SAVE_VERSION + 1,
        money: 1,
        lifetime: 1,
        completed: [],
        appearance: { bodyColor: 0, accessories: ['none', 'none'] },
        dayIndex: 0,
      }),
    );
    expect(loadSave(storage)).toBeNull();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: SAVE_VERSION,
        money: 1,
        lifetime: 1,
        completed: ['cheat'],
        appearance: { bodyColor: 0, accessories: ['none', 'none'] },
        dayIndex: 0,
      }),
    );
    expect(loadSave(storage)).toBeNull();
    const broken: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    };
    expect(
      writeSave(
        broken,
        recordFrom(new Progress(), { bodyColor: 0, accessories: ['none', 'none'] }, 0),
      ),
    ).toBe(false);
    expect(() => clearSave(broken)).not.toThrow();
    expect(parseReset('?reset=1')).toBe(true);
    expect(parseReset('?reset=0')).toBe(false);
  });

  it('a new day resets objectives but keeps money and level', () => {
    const d = new DayState(new Progress(), tuning);
    d.wake();
    d.boardBus();
    d.arriveSchool();
    for (const s of ['math', 'science', 'history'] as const)
      for (let i = 0; i < 3; i++) d.answer(s, true);
    for (let i = 0; i < 3; i++) d.score();
    expect(d.phase).toBe('done');
    const money = d.progress.money;
    const level = d.progress.level;
    let announced = -1;
    d.events.newDay = (i) => (announced = i);
    d.newDay();
    expect(d.dayIndex).toBe(1);
    expect(announced).toBe(1);
    expect(d.phase).toBe('asleep');
    expect(d.progress.completed.size).toBe(0);
    expect(d.progress.money).toBe(money);
    expect(d.progress.level).toBe(level);
    expect(d.classCorrect.math).toBe(0);
    d.wake();
    d.answer('math', true);
    d.answer('math', true);
    d.answer('math', true);
    expect(d.progress.money).toBe(money + tuning.classPayout); // classes pay again
  });
});
