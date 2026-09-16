import { tuning, type MovementTuning } from './movementTuning';
import type { Progress } from './progress';

// Heat: how much police attention the player has drawn, 0..1. Strikes and
// toy-gun pops raise it; it decays while nobody is chasing; crossing the
// dispatch threshold sends the police once; an arrest resets it. Shown only
// through sirens and flashing, never a number.

export interface HeatEvents {
  changed?(value: number): void;
  /** Crossed the dispatch threshold (once per wanted episode). */
  dispatch?(): void;
  /** Decayed back to zero after being wanted. */
  cleared?(): void;
}

export class Heat {
  value = 0;
  wanted = false;
  events: HeatEvents = {};

  constructor(private readonly t: MovementTuning = tuning) {}

  private add(amount: number): void {
    this.value = Math.min(1, this.value + amount);
    this.events.changed?.(this.value);
    if (!this.wanted && this.value >= this.t.heatDispatch) {
      this.wanted = true;
      this.events.dispatch?.();
    }
  }

  strike(): void {
    this.add(this.t.heatPerStrike);
  }

  pop(): void {
    this.add(this.t.heatPerPop);
  }

  /** Decay when nobody is actively chasing. */
  tick(dt: number, chasing: boolean): void {
    if (chasing || this.value <= 0) return;
    this.value = Math.max(0, this.value - this.t.heatDecayPerS * dt);
    this.events.changed?.(this.value);
    if (this.wanted && this.value <= 0) {
      this.wanted = false;
      this.events.cleared?.();
    }
  }

  /** Arrest: all forgiven. */
  reset(): void {
    const wasWanted = this.wanted;
    this.value = 0;
    this.wanted = false;
    this.events.changed?.(0);
    if (wasWanted) this.events.cleared?.();
  }
}

/** The fine: half the money with a floor, never more than the player has. */
export function arrestCosts(progress: Progress, t: MovementTuning = tuning): { fine: number } {
  const fine = Math.min(
    progress.money,
    Math.max(t.fineMin, Math.floor(progress.money * t.fineFraction)),
  );
  if (fine > 0) progress.spend(fine);
  return { fine };
}
