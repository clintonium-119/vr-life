// Player progression: money earned by objectives, level from how many
// objectives are done. Pure; the wrist displays subscribe to the events.
// Persistence arrives with the save loop (Phase 9).

export type Objective = 'backpack' | 'bus' | 'math' | 'science' | 'history' | 'gym';

export interface ProgressEvents {
  money?(total: number, delta: number): void;
  level?(level: number): void;
  completed?(objective: Objective): void;
}

/** Objectives completed → level (index = count). */
export const LEVEL_THRESHOLDS: readonly number[] = [0, 1, 2, 3, 4, 6];

export function levelFor(completedCount: number): number {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++)
    if (completedCount >= LEVEL_THRESHOLDS[i]) level = i;
  return level;
}

export interface ProgressSnapshot {
  money: number;
  lifetime: number;
  completed: Objective[];
}

export class Progress {
  money = 0;
  level = 0;
  /** Objectives ever completed (drives level; never resets). */
  lifetime = 0;
  /** Objectives completed today (resets each day). */
  readonly completed = new Set<Objective>();
  events: ProgressEvents = {};

  /** Load a saved profile (no events). */
  restore(snapshot: ProgressSnapshot): void {
    this.money = snapshot.money;
    this.lifetime = snapshot.lifetime;
    this.completed.clear();
    for (const o of snapshot.completed) this.completed.add(o);
    this.level = levelFor(this.lifetime);
  }

  /** A new day: today's objectives reset; money and level stay. */
  resetDay(): void {
    this.completed.clear();
  }

  /** Mark an objective done once and pay for it; repeats are ignored. */
  award(objective: Objective, money: number): boolean {
    if (this.completed.has(objective)) return false;
    this.completed.add(objective);
    this.lifetime += 1;
    this.events.completed?.(objective);
    if (money > 0) {
      this.money += money;
      this.events.money?.(this.money, money);
    }
    const level = levelFor(this.lifetime);
    if (level !== this.level) {
      this.level = level;
      this.events.level?.(level);
    }
    return true;
  }

  spend(amount: number): boolean {
    if (amount > this.money) return false;
    this.money -= amount;
    this.events.money?.(this.money, -amount);
    return true;
  }
}
