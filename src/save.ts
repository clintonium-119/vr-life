import type { Appearance } from './appearance';
import type { Objective, Progress } from './progress';

// Persistence: one versioned JSON record in localStorage, written on every
// change, read once at startup. Anything unreadable starts a fresh profile;
// storage errors (private mode, quota) are swallowed.

export const SAVE_KEY = 'vr-life.save';
export const SAVE_VERSION = 1;

export interface SaveRecord {
  version: number;
  money: number;
  lifetime: number;
  completed: Objective[];
  appearance: Appearance;
  dayIndex: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const OBJECTIVES = new Set(['backpack', 'bus', 'math', 'science', 'history', 'gym']);

export function loadSave(storage: StorageLike | null): SaveRecord | null {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const data = JSON.parse(raw) as Partial<SaveRecord>;
    if (data.version !== SAVE_VERSION) return null;
    if (
      typeof data.money !== 'number' ||
      typeof data.lifetime !== 'number' ||
      typeof data.dayIndex !== 'number'
    )
      return null;
    if (!Array.isArray(data.completed) || !data.completed.every((o) => OBJECTIVES.has(o)))
      return null;
    const a = data.appearance;
    if (
      a === undefined ||
      typeof a.bodyColor !== 'number' ||
      !Array.isArray(a.accessories) ||
      a.accessories.length !== 2
    )
      return null;
    return {
      version: SAVE_VERSION,
      money: Math.max(0, Math.floor(data.money)),
      lifetime: Math.max(0, Math.floor(data.lifetime)),
      completed: data.completed,
      appearance: { bodyColor: a.bodyColor, accessories: [a.accessories[0], a.accessories[1]] },
      dayIndex: Math.max(0, Math.floor(data.dayIndex)),
    };
  } catch {
    return null;
  }
}

export function writeSave(storage: StorageLike | null, record: SaveRecord): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike | null): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    /* nothing to clear */
  }
}

export function parseReset(query: string): boolean {
  return new URLSearchParams(query).get('reset') === '1';
}

export function recordFrom(
  progress: Progress,
  appearance: Appearance,
  dayIndex: number,
): SaveRecord {
  return {
    version: SAVE_VERSION,
    money: progress.money,
    lifetime: progress.lifetime,
    completed: [...progress.completed],
    appearance: {
      bodyColor: appearance.bodyColor,
      accessories: [appearance.accessories[0], appearance.accessories[1]],
    },
    dayIndex,
  };
}

/** The browser's localStorage when it is usable, else null. */
export function browserStorage(): StorageLike | null {
  try {
    const s = globalThis.localStorage;
    if (s === undefined) return null;
    s.getItem(SAVE_KEY); // throws in some private modes
    return s;
  } catch {
    return null;
  }
}
