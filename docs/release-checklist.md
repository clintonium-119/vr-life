# Release checklist: the final headset session

Everything in this project was built and validated on the host (unit tests
and headless smoke runs) without a Quest 3. This is the script for the one
on-device session that judges it. Work top to bottom; each block names the
roadmap phase, what to check, the knobs to turn (via `tune=` in the URL, no
redeploy), and where to write the evidence. Nothing here is done until it
has been felt on the headset.

## 0. Setup (10 min)

1. Headset on ADB (`docs/device-debugging.md` §0). `npm run launch` opens
   `https://clintonium-119.github.io/vr-life/` in Quest Browser.
2. Outer-loop measurement URL: append `?dev=perf,tools`. Inner loop for
   quick iteration: `npm run dev -- --host`, `adb reverse tcp:5173 tcp:5173`,
   open `http://localhost:5173/?dev=perf,tools`.
3. Attach Chrome DevTools via `chrome://inspect/#devices` for console and
   frame inspection; `adb exec-out screencap -p > shot.png` for evidence.
4. Fresh profile: add `&reset=1` once at the start.
5. Record: `XRSession.frameRate` (the HUD's RATE line), whether
   `performance.memory` appears (HEAP line), and the HUD CALLS/MEM at spawn.

## 1. Phase 0: foundations (10 min)

| Check                                                                                       | Knob                                  | Evidence            |
| ------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| Frame floor sustained in the bedroom at idle 60 s and under head-look 60 s (no HUD warning) | `viewDistanceM`                       | HUD screenshot      |
| Hands and forearms visible, 1:1, never obstructing                                          | `torsoBelowHeadM`, `torsoBehindHeadM` | note                |
| Inner loop edit → visible < 10 s; outer loop push → live → launched → DevTools < 2 min      |                                       | two timings         |
| Dev teleport (trigger with `tools`) moves camera, hands, body together                      |                                       | note                |
| HMR through `adb reverse`; `am start` opens Quest Browser without a package                 |                                       | note in the runbook |

## 2. Phase 1: locomotion (30 min, `world=test` first)

`docs/feel-checklist.md` items 1–15. Start in `world=test`:

| Check                                                                                                                                  | Knobs                                         |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Ground-slap running, climbing, wall launch, wall slide at speed; no dead stops, tunneling, float                                       | `handStiffness`, `speedCap`, `groundFriction` |
| Alternating single-hand stride ≈ two-handed leap distance (teleport to the gap, 10 strides vs 10 leaps, read the HUD/console `rig at`) | `twoHandScale`                                |
| Eye height: relaxed swing slaps the ground, ledges within reach                                                                        | `eyeHeightOffset`                             |
| Surface audio: ground, stone, wood, metal distinct; wind at speed; landing thud                                                        | `windStartSpeed`, `landingThudSpeed`          |
| Frame floor at top speed 60 s                                                                                                          |                                               |

Write the winning `tune=` URL into `docs/feel-checklist.md` § Final tuned
URL, then copy the values into `src/movementTuning.ts`.

## 3. Phase 2: grab and objects (15 min)

Items 16–22: grab reach, one-armed carry of the barrel or backpack, stow a
small item behind the back, throws, the abuse session (fling everything,
throw off the world: nothing lost, the backpack comes home), ball arcs and
bounces on every test-space surface. Knobs: `grabRadius`, `stowRadius`,
`throwVelocityScale`, `carryLeanDeg`, `propRestThreshold`.

## 4. Phase 3: character (10 min)

Items 23–27: `?dev=perf,crowd` in `world=test`. Gorilla read at 2 m and at
speed; lean, sag, landing dip, gait bob visible; view discipline including
one-armed carry; frame floor with five gorillas; record CALLS both eyes.
Knobs: `GORILLA_PROPORTIONS` (code), pose knobs.

## 5. Phase 4: art and home (15 min, default world)

Items 28–32: bedroom → bus stop in 30–60 s at the floor; first-look
reaction from a fresh pair of eyes; every surface in the block pushable;
interior traversal; device draw calls, texture and geometry into
`docs/district-budget.md`.

## 6. Phase 5: the town (30 min)

Items 33–37 with `spawn=` for measurement: `officeRoof`, `hospitalRoof`,
`school`, `farm`, `forest`, `prison`. Frame floor in every district and
interior and from the peaks (worst views: office roof looking south, forest
edge looking in); continuity farm → forest → town → farm on foot; the roof
route house → water tower → office → hospital; interiors at speed; whether
the cabin can be found unaided. Knob: `viewDistanceM`. Check the farm yard
for snags (the auto run moved only 1 m there).

## 7. Phase 6: the school day (30 min)

Items 38–44 from a fresh profile: alarm → backpack → door → bus → ride →
classes → gym with zero instruction. Time the first-timer bus rate; the
bus ride (floor carries, rails hold); hand raise and touch answers; gym
ball feel and single scoring; wrist displays; floor inside the school.
Knobs: `rushTimerS`, `busWaitS`, `busSpeed`, `busAccel`, `handRaiseHeight`,
`answerTouchRadius`. Confirm the AudioContext stays running after Enter VR
(alarm audible immediately).

## 8. Phase 7: town life (15 min)

Items 45–49: inhabited town at the floor (`npcViewDistanceM`), knock-over
comedy (`npcReactRadius`, `npcReactSpeed`), wordless shopping at the
grocery with `day=done` money, earn → spend → equip (dye on the arms, scarf
on the neck), non-violent completion.

## 9. Phase 8: conflict and pursuit (30 min)

Items 50–55 with `spawn=busStop&heat=1` and by punching a pedestrian: a
skilled player escapes most pursuits, a cautious one is caught sometimes
(`policeSpeed`, `arrestRadius`, `heatDispatch`); officers climbing reads
as climbing; arrest → drag → prison → climb out (`prisonReleaseS`,
`escortSpeed`); the rooftop chase; slapstick tone; floor with three officers
and sirens.

## 10. Phase 9: polish (20 min)

Items 56–60: the first 30 s (shuffle) and first 5 min (catch the bus) as
tight as the rest; sleep in the bed after a done day and confirm money,
level and look persist across the reload; audio bed balance
(`ambienceGain`, `musicGain`); fog and afternoon light; a full day by a
stranger at 72 fps; zero known floor violations anywhere.

## 11. Close out

- Copy every tuned value into `src/movementTuning.ts` (and
  `GORILLA_PROPORTIONS` if changed), fill the measured columns in
  `docs/feel-checklist.md` and `docs/district-budget.md`, commit.
- Run each phase's blocked "On-device acceptance" step through
  `/apo:execute` so the vault records the results.
- Anything that fails the floor is redesigned or cut, never deferred.
