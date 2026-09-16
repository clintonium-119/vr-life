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
  /** The virtual floor sits this far above the physical floor, m: the eye
   * and hands ride lower over the world so a relaxed arm swing slaps the
   * ground. The one knob that makes ground-running possible. */
  eyeHeightOffset: 0.5,
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

  // ---- props (grab & objects) ----
  /** Grab reach: a free prop whose centre is within this of the hand, m. */
  grabRadius: 0.18,
  /** Held prop sits this far along the hand's forward axis, m. */
  holdOffset: 0.05,
  /** Release velocity = tracked hand velocity × this. */
  throwVelocityScale: 1.0,
  /** Releasing a small prop within this of the back socket stows it, m. */
  stowRadius: 0.3,
  /** Max body-stub roll toward a carried large prop, degrees. */
  carryLeanDeg: 12,
  /** Post-bounce normal speed below this settles to zero, m/s. */
  propRestThreshold: 0.3,
  /** Restitution used when a prop spec gives none. */
  propRestitutionDefault: 0.6,
  /** Props below this respawn at home, m. */
  worldFloorY: -5,
  /** Props farther than this from the origin on x or z respawn, m (the town ground is 420 × 320). */
  worldHalfExtent: 220,
  /** Important props resting farther than this from the player recall, m. */
  recallDistance: 6,
  /** …after this long at rest, s. */
  recallSeconds: 10,

  // ---- world ----
  /** Chunks farther than this (edge to player) are not drawn, m. */
  viewDistanceM: 120,
  /** Interiors show when the player is within this of their building, m. */
  interiorDoorMarginM: 2.5,
  /** Collision grid cell size, m. */
  collisionCellM: 8,

  // ---- school day ----
  /** Morning-rush timer before the bus leaves without you, s. Generous. */
  rushTimerS: 60,
  /** Money for passing a class / gym. */
  classPayout: 50,
  gymPayout: 50,
  /** Correct answers to pass a class; scores to pass gym. */
  passCorrect: 3,
  passScores: 3,
  /** Bus cruise speed, m/s, and acceleration, m/s². */
  busSpeed: 8,
  busAccel: 1.5,
  /** Bus dwell at each stop, s. */
  busWaitS: 20,
  /** A hand this far above the head counts as raised, m; held this long, s. */
  handRaiseHeight: 0.15,
  handRaiseHoldS: 0.5,
  /** A hand within this of an answer panel touches it, m. */
  answerTouchRadius: 0.2,

  // ---- town life ----
  /** NPCs farther than this from the player are not drawn, m. */
  npcViewDistanceM: 45,
  /** Pedestrian stroll speed, m/s. */
  npcWalkSpeed: 1.2,
  /** A player passing within this radius above npcReactSpeed knocks an NPC over, m and m/s. */
  npcReactRadius: 2.5,
  npcReactSpeed: 4,
  /** Bumping within this radius knocks an NPC over at any speed, m. */
  npcBumpRadius: 0.9,
  /** Shop prices. */
  priceSnack: 10,
  priceDye: 40,
  priceAccessory: 60,

  // ---- character pose ----
  /** Torso lean into horizontal motion, degrees per m/s. */
  leanPerMps: 3,
  /** Lean clamp, degrees. */
  leanMaxDeg: 25,
  /** Sag (crouch, 0..1) the body eases toward while airborne. */
  sagAirborne: 0.35,
  /** Extra sag per m/s of landing impact, decays after touchdown. */
  sagLanding: 0.08,
  /** Horizontal distance per knuckle-walk gait cycle, m. */
  gaitStrideM: 1.2,
  /** Hip bob amplitude at full gait, m. */
  gaitBobM: 0.04,
  /** Torso (shoulder line) below the head, m. Keeps the chest out of view. */
  torsoBelowHeadM: 0.35,
  /** Torso behind the head, m. */
  torsoBehindHeadM: 0.15,
  /** Shoulder-to-shoulder width, m. */
  shoulderWidthM: 0.5,
  /** Upper arm length, m. */
  upperArmM: 0.32,
  /** Forearm length, m. */
  forearmM: 0.38,
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
