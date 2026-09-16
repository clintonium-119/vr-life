// Every movement feel constant lives here, and nowhere else. Defaults are
// first guesses; the final headset session tunes them via `?tune=k=v,...`
// URL overrides (no redeploy) and writes the winners back into this file.
// Units in the comments. Consumers read `tuning` at use time (not at import)
// so an override applied at startup is seen everywhere.

export const tuning = {
  /** Downward acceleration, m/s². */
  gravity: 9.81,
  /** Body sphere radius, m. */
  bodyRadius: 0.3,
  /** Body sphere centre this far below the head (camera), m. */
  bodyDropFromHead: 0.45,
  /** Hand contact sphere radius, m. */
  handRadius: 0.07,
  /** Spring rate of the hand hold, 1/s: the rig closes this fraction of the
   * hand error per second (exponential approach). Higher = stiffer, less
   * slip, less weight. */
  handStiffness: 30,
  /** Lifting the hand this far off the surface (along its normal) releases, m. */
  handReleaseDistance: 0.03,
  /** Slip along the surface beyond this breaks the anchor, m. */
  handSlipBreak: 0.25,
  /** Scale on the mean correction when both hands hold (1 = two hands are
   * worth two; brief wants less than double). Dimensionless. */
  twoHandScale: 0.6,
  /** Hard speed cap, m/s. High enough that reaching it is an achievement. */
  speedCap: 14,
  /** Horizontal velocity decay while grounded with no hand down, 1/s. */
  groundFriction: 2.5,
  /** Time constant of the inherited-velocity average, s. */
  velocitySmoothing: 0.2,
  /** Max displacement per collision substep, m (about half the body radius). */
  maxSubstepDistance: 0.15,
  /** Minimum impact speed that counts as a landing (sound), m/s. */
  landingThudSpeed: 2.5,
  /** Wind starts to be audible above this speed, m/s. */
  windStartSpeed: 4,
};

export type MovementTuning = typeof tuning;

/**
 * Apply `tune=k=v,k2=v2` overrides from a query string to `target`. Only keys
 * that already exist and parse to a finite number are applied. Repeated
 * `tune=` params merge. Returns what was applied.
 */
export function applyTuneOverrides(
  query: string,
  target: Record<string, number> = tuning,
): Record<string, number> {
  const applied: Record<string, number> = {};
  for (const raw of new URLSearchParams(query).getAll('tune')) {
    for (const pair of raw.split(',')) {
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      const key = pair.slice(0, eq).trim();
      const rawValue = pair.slice(eq + 1).trim();
      const value = Number(rawValue);
      if (rawValue === '' || !(key in target) || !Number.isFinite(value)) continue;
      target[key] = value;
      applied[key] = value;
    }
  }
  return applied;
}

const overrides = applyTuneOverrides(globalThis.location?.search ?? '');
if (Object.keys(overrides).length > 0) {
  console.info('[vr-life] tuning overrides:', overrides);
}
