import { tuning, type MovementTuning } from './movementTuning';
import type { Progress } from './progress';

// The day: asleep (alarm) → rush (timer) → ride → school (three classes and
// gym, any order) → done. Soft fails only: the timer running out flags the
// late bus and the day stays in `rush`; a wrong answer just means another
// question. Pure and event-driven; nothing here touches the scene.

export type DayPhase = 'asleep' | 'rush' | 'ride' | 'school' | 'done';
export type Subject = 'math' | 'science' | 'history';
export const SUBJECTS: readonly Subject[] = ['math', 'science', 'history'];

export interface DayEvents {
  phase?(from: DayPhase, to: DayPhase): void;
  /** Fires every second of the rush with the remaining seconds (≥ 0). */
  timer?(remaining: number): void;
  lateBus?(): void;
  backpack?(): void;
  leftHouse?(): void;
  atStop?(): void;
  questionResult?(subject: Subject, correct: boolean): void;
  classPassed?(subject: Subject): void;
  gymScore?(score: number): void;
  gymPassed?(): void;
}

export class DayState {
  phase: DayPhase = 'asleep';
  rushElapsed = 0;
  lateBus = false;
  backpackGrabbed = false;
  leftHouse = false;
  atStop = false;
  readonly classCorrect: Record<Subject, number> = { math: 0, science: 0, history: 0 };
  gymScore = 0;
  events: DayEvents = {};
  private lastTimerSecond = -1;

  constructor(
    readonly progress: Progress,
    private readonly t: MovementTuning = tuning,
  ) {}

  private goto(to: DayPhase): void {
    const from = this.phase;
    if (from === to) return;
    this.phase = to;
    this.events.phase?.(from, to);
  }

  /** The alarm is silenced or the player moved: the rush begins. */
  wake(): void {
    if (this.phase === 'asleep') this.goto('rush');
  }

  tick(dt: number): void {
    if (this.phase !== 'rush') return;
    this.rushElapsed += dt;
    const remaining = Math.max(0, Math.ceil(this.t.rushTimerS - this.rushElapsed));
    if (remaining !== this.lastTimerSecond) {
      this.lastTimerSecond = remaining;
      this.events.timer?.(remaining);
    }
    if (!this.lateBus && this.rushElapsed >= this.t.rushTimerS) {
      this.lateBus = true;
      this.events.lateBus?.();
    }
  }

  grabBackpack(): void {
    if (this.backpackGrabbed) return;
    this.backpackGrabbed = true;
    this.progress.award('backpack', 0);
    this.events.backpack?.();
  }

  markLeftHouse(): void {
    if (this.leftHouse) return;
    this.leftHouse = true;
    this.events.leftHouse?.();
  }

  markAtStop(): void {
    if (this.atStop) return;
    this.atStop = true;
    this.events.atStop?.();
  }

  /** Aboard when the bus departs (late or not). */
  boardBus(): void {
    if (this.phase === 'asleep') this.wake();
    if (this.phase === 'rush') {
      this.progress.award('bus', 0);
      this.goto('ride');
    }
  }

  /** At the school drop-off (by bus or on foot). */
  arriveSchool(): void {
    if (this.phase === 'asleep') this.wake();
    if (this.phase === 'rush' || this.phase === 'ride') this.goto('school');
  }

  classPassed(subject: Subject): boolean {
    return this.progress.completed.has(subject);
  }

  answer(subject: Subject, correct: boolean): void {
    if (this.classPassed(subject)) return;
    this.events.questionResult?.(subject, correct);
    if (!correct) return;
    this.classCorrect[subject] += 1;
    if (this.classCorrect[subject] >= this.t.passCorrect) {
      this.progress.award(subject, this.t.classPayout);
      this.events.classPassed?.(subject);
      this.checkDone();
    }
  }

  score(): void {
    if (this.progress.completed.has('gym')) return;
    this.gymScore += 1;
    this.events.gymScore?.(this.gymScore);
    if (this.gymScore >= this.t.passScores) {
      this.progress.award('gym', this.t.gymPayout);
      this.events.gymPassed?.();
      this.checkDone();
    }
  }

  private checkDone(): void {
    const c = this.progress.completed;
    if (c.has('math') && c.has('science') && c.has('history') && c.has('gym')) this.goto('done');
  }
}
