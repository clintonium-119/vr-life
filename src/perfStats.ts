// Pure performance-sampling logic for the dev-only perf harness. Deliberately
// free of three.js and the DOM so it can be unit-tested directly (test lands
// in the Vitest step). The sampler is allocation-free at steady state: all
// buffers are pre-allocated in the constructor and sample() does arithmetic
// and ring-slot writes only. It must not pollute what it measures.

export type PerfState = 'ok' | 'warning';

export interface PerfSamplerOptions {
  /** Rolling window length in frames (default 60). */
  windowSize?: number;
  /** Sustained fps floor; the state machine trips while the window average
   * stays below it (default 72, the project frame floor). */
  floorFps?: number;
  /** Consecutive window evaluations below the floor required to enter
   * warning (default 2 — a single-window dip must not trip). */
  sustainWindows?: number;
  /** Consecutive window evaluations at/above the floor required to clear
   * warning (default 1 — recover as soon as the floor is sustained again).
   * Asymmetric with sustainWindows: that is the hysteresis. */
  clearWindows?: number;
}

export const DEFAULT_WINDOW_SIZE = 60;
export const DEFAULT_FLOOR_FPS = 72;
export const DEFAULT_SUSTAIN_WINDOWS = 2;
export const DEFAULT_CLEAR_WINDOWS = 1;

// Floor for frame deltas in ms: collapses zero/negative deltas (two samples
// in the same clock tick) to a finite, sane value.
const MIN_FRAME_MS = 0.0001;

export class PerfSampler {
  readonly windowSize: number;
  readonly floorFps: number;

  /** Rolling-window stats; updated once per full window evaluation. */
  windowMinMs = 0;
  windowAvgMs = 0;
  windowP95Ms = 0;

  /** Total frames sampled (window fills from 0 to windowSize). */
  samples = 0;

  /** Most recent frame delta in ms (0 until the second sample). */
  lastFrameMs = 0;

  private readonly ring: Float32Array;
  private readonly sortScratch: Float32Array;
  private readonly sustainWindows: number;
  private readonly clearWindows: number;
  private head = 0;
  private lastNowMs: number | null = null;
  private framesSinceEval = 0;
  private belowStreak = 0;
  private okStreak = 0;
  private currentState: PerfState = 'ok';

  constructor(options: PerfSamplerOptions = {}) {
    this.windowSize = Math.max(1, Math.floor(options.windowSize ?? DEFAULT_WINDOW_SIZE));
    this.floorFps = options.floorFps ?? DEFAULT_FLOOR_FPS;
    this.sustainWindows = Math.max(
      1,
      Math.floor(options.sustainWindows ?? DEFAULT_SUSTAIN_WINDOWS),
    );
    this.clearWindows = Math.max(1, Math.floor(options.clearWindows ?? DEFAULT_CLEAR_WINDOWS));
    this.ring = new Float32Array(this.windowSize);
    this.sortScratch = new Float32Array(this.windowSize);
  }

  get state(): PerfState {
    return this.currentState;
  }

  /** fps equivalent of the window average (0 before the first evaluation). */
  get windowAvgFps(): number {
    return this.windowAvgMs > 0 ? 1000 / this.windowAvgMs : 0;
  }

  /** fps equivalent of the most recent frame (0 before the second sample). */
  get instantFps(): number {
    return this.lastFrameMs > 0 ? 1000 / this.lastFrameMs : 0;
  }

  /**
   * Call once per frame with a monotonic millisecond timestamp — the
   * rAF / XR onAnimationFrame `time` argument is exactly that. Stores the
   * frame delta and, once per full window, refreshes the window stats and
   * advances the warning state machine.
   */
  sample(nowMs: number): void {
    const last = this.lastNowMs;
    this.lastNowMs = nowMs;
    if (last === null) return; // first sample anchors the clock; no delta yet

    const deltaMs = nowMs - last > 0 ? nowMs - last : MIN_FRAME_MS;
    this.lastFrameMs = deltaMs;
    this.ring[this.head] = deltaMs;
    this.head = (this.head + 1) % this.windowSize;
    this.samples += 1;
    this.framesSinceEval += 1;

    if (this.framesSinceEval < this.windowSize) return;
    this.framesSinceEval = 0;
    this.evaluateWindow();
  }

  private evaluateWindow(): void {
    // Copy the ring into the pre-allocated scratch and sort ascending
    // (typed arrays sort numerically by default). Runs once per window,
    // never per frame.
    const n = this.windowSize;
    for (let i = 0; i < n; i++) this.sortScratch[i] = this.ring[i];
    this.sortScratch.sort();

    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.sortScratch[i];
    this.windowMinMs = this.sortScratch[0];
    this.windowAvgMs = sum / n;
    const p95Index = Math.min(n - 1, Math.ceil(n * 0.95) - 1);
    this.windowP95Ms = this.sortScratch[p95Index];

    // Hysteresis: N consecutive window evaluations on one side of the floor
    // before the state flips, with different N per direction — slow to
    // alarm, prompt to recover.
    const below = this.windowAvgFps < this.floorFps;
    if (below) {
      this.belowStreak += 1;
      this.okStreak = 0;
    } else {
      this.okStreak += 1;
      this.belowStreak = 0;
    }

    if (this.currentState === 'ok' && this.belowStreak >= this.sustainWindows) {
      this.currentState = 'warning';
    } else if (this.currentState === 'warning' && this.okStreak >= this.clearWindows) {
      this.currentState = 'ok';
    }
  }
}
