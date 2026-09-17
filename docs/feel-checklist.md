# Movement feel checklist

The Phase 1 acceptance is feel, judged on a Meta Quest 3 against the GitHub
Pages build with `?dev=perf,tools`. Nothing here is checked until it has
been felt on the headset; a desktop pass counts for nothing. Tune with
`tune=` URL overrides (no redeploy), then write the winners back into
`src/movementTuning.ts` and record the final URL at the bottom.

## Checklist (brief §4 "what good feels like", roadmap Phase 1)

| #   | Item                                                                                             | Pass | Notes / measured on device                   |
| --- | ------------------------------------------------------------------------------------------------ | ---- | -------------------------------------------- |
| 1   | Weighty: a heavy thing, not a balloon; momentum builds over a few strides                        | [ ]  |                                              |
| 2   | Landings feel solid (body thud, no bounce, no float)                                             | [ ]  |                                              |
| 3   | Sloppy vs. clean push is obvious in the body, not in a number                                    | [ ]  |                                              |
| 4   | Turning by physically turning; nothing else turns the view                                       | [ ]  |                                              |
| 5   | No float: gravity always on when no hand holds; no mid-air drag                                  | [ ]  |                                              |
| 6   | No mush: hand hold is crisp, release is immediate                                                | [ ]  |                                              |
| 7   | Wall at speed → slide along it, not a dead stop, never a pass-through                            | [ ]  |                                              |
| 8   | Ground-slap running: alternating slaps read as a stride                                          | [ ]  |                                              |
| 9   | Climbing: haul up ledges and faces; hands stick where they land                                  | [ ]  |                                              |
| 10  | Wall launch: push off a face and fly, momentum carried                                           | [ ]  |                                              |
| 11  | Alternating single-hand stride ≈ two-handed leap distance                                        | [ ]  | stride: __ m, leap: __ m, `twoHandScale`: __ |
| 12  | A first-timer shuffles around within ~30 s, no instruction                                       | [ ]  |                                              |
| 13  | Surface-aware audio: ground, stone, wood, metal all sound different; wind at speed; landing thud | [ ]  |                                              |
| 14  | Frame floor sustained at top speed for ≥60 s (harness shows no warning)                          | [ ]  | session rate: __ Hz                          |
| 15  | Eye height reads as a gorilla: relaxed downward swing slaps the ground; ledges within reach      | [ ]  | `eyeHeightOffset`: __                        |

## Phase 2: grab and objects

| #   | Item                                                                                                                                  | Pass | Notes / measured on device |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------- |
| 16  | Grab is positional: reach, touch, squeeze; `grabRadius` feels generous but never grabs through walls                                  | [ ]  | `grabRadius`: __           |
| 17  | Running one-armed with the barrel or backpack is noticeably slower, unbalanced, and fun; the backpack feels lugged                    | [ ]  |                            |
| 18  | The body lean toward the loaded side is visible and never moves the camera or hands                                                   | [ ]  | `carryLeanDeg`: __         |
| 19  | Stowing a small item behind the back frees both hands completely; reaching back returns it                                            | [ ]  | `stowRadius`: __           |
| 20  | Throws leave the hand at the speed of the swing; catching feels crisp                                                                 | [ ]  | `throwVelocityScale`: __   |
| 21  | Abuse session: fling everything, jam props into corners, throw them off the world; nothing is lost, the backpack comes home           | [ ]  |                            |
| 22  | Balls arc believably and bounce correctly on ground, ledges, overhangs, the angled face and the metal platforms, with distinct sounds | [ ]  |                            |

## Phase 3: character

| #   | Item                                                                                                                          | Pass | Notes / measured on device                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| 23  | At 2 m and at speed (crowd gorillas), the read is unmistakably "gorilla" within a second                                      | [ ]  |                                             |
| 24  | Weight sells: lean into motion, sag in the air, dip on landing, gait bob are visible in the body                              | [ ]  | `leanPerMps`, `sagAirborne`, `gaitBobM`: __ |
| 25  | The player's own body never obstructs the view in normal play, including one-armed carrying; nothing within 0.2 m of the eyes | [ ]  | `torsoBelowHeadM`, `torsoBehindHeadM`: __   |
| 26  | Arms read as attached: elbows bend down/out/back, forearms reach the hands (or point at them when out of reach)               | [ ]  | `upperArmM`, `forearmM`: __                 |
| 27  | Frame floor with `?dev=perf,crowd` (five gorillas), 60 s idle and 60 s moving; record the CALLS line                          | [ ]  | calls both eyes: __                         |

Draw-call convention: the HUD and the smoke log count what the renderer
drew last frame. On device that is both eyes; the headless smoke is a
single view and culls whatever is behind the camera, so its number is a
sanity bound (`smoke:crowd` fails above 400), not the device number.

Silhouette tuning lives in `GORILLA_PROPORTIONS` (`src/gorilla.ts`); pose
knobs are in the table below.

## Phase 4: art pipeline and home

| #   | Item                                                                                                                | Pass | Notes / measured on device |
| --- | ------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------- |
| 28  | Bedroom → bus stop in 30–60 s at the frame floor (harness on, no warning)                                           | [ ]  | time: __ s                 |
| 29  | First-look reaction (fresh eyes, first load): "this looks good"                                                     | [ ]  |                            |
| 30  | Every surface in the block answers "can I push off this?" (fences, trees, posts, crates, shelter, porch, furniture) | [ ]  |                            |
| 31  | The block sits inside `docs/district-budget.md` (device draw calls, texture, geometry recorded)                     | [ ]  | calls both eyes: __        |
| 32  | Interiors are traversable at speed: 3.2 m ceilings, 1.4 m doorways, the shelf climb to the ceiling                  | [ ]  |                            |

## Phase 5: the full world

| #   | Item                                                                                              | Pass | Notes / measured on device |
| --- | ------------------------------------------------------------------------------------------------- | ---- | -------------------------- |
| 33  | Farm → forest → town centre → farm: one continuous space, no transitions, always solid            | [ ]  |                            |
| 34  | Frame floor in every district and interior, at speed, and from the office and hospital roofs      | [ ]  | `viewDistanceM`: __        |
| 35  | Rooftop route usable end to end (house → water tower → office → hospital) and fun                 | [ ]  |                            |
| 36  | No interior feels like a confined misery at speed (school hallway, hospital wards, office floors) | [ ]  |                            |
| 37  | The cabin is found unaided, or its hiding place is documented and defensible (`docs/town-map.md`) | [ ]  |                            |

## Phase 6: the school day

| #   | Item                                                                                                                       | Pass | Notes / measured on device                 |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| 38  | Full arc alarm → backpack → bus → three classes → gym playable end to end with zero instruction                            | [ ]  |                                            |
| 39  | A first-timer catches the bus the majority of attempts (`rushTimerS`, `busWaitS`)                                          | [ ]  | timer: __ s                                |
| 40  | Standing on the bus: the floor carries you, the rails hold, the ride is a breather not a fade                              | [ ]  | `busSpeed`, `busAccel`: __                 |
| 41  | Answering feels like part of the game: hand raise is a real gesture, touching a panel feels like reaching, not a form fill | [ ]  | `handRaiseHeight`, `answerTouchRadius`: __ |
| 42  | Gym balls feel right in the hand; a hoop shot or a goal scores exactly once                                                | [ ]  |                                            |
| 43  | Wrist displays legible at a glance, invisible otherwise                                                                    | [ ]  |                                            |
| 44  | Frame floor inside the school moving at speed between classes (teachers and boards in view)                                | [ ]  | calls both eyes: __                        |

## Phase 7: town life

| #   | Item                                                                                                                   | Pass | Notes / measured on device                  |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------- |
| 45  | The town feels inhabited: pedestrians stroll the sidewalks in view without breaking the frame floor                    | [ ]  | `npcViewDistanceM`: __, calls both eyes: __ |
| 46  | Sprinting past or bumping a pedestrian knocks it over with a whoop; it sits up dazed and dusts off; funny, never cruel | [ ]  | `npcReactRadius`, `npcReactSpeed`: __       |
| 47  | Shopping reads without words: take, carry, release on the counter; cash chime vs. refusal buzz understood              | [ ]  |                                             |
| 48  | Earn → spend → equip works end to end: a dye recolours your arms, an accessory shows on your neck                      | [ ]  |                                             |
| 49  | A player who never punches anyone can complete everything                                                              | [ ]  |                                             |

## Phase 8: conflict and pursuit

| #   | Item                                                                                                           | Pass | Notes / measured on device                        |
| --- | -------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------- |
| 50  | A skilled player escapes the police a majority of pursuits; a cautious one is caught sometimes                 | [ ]  | `policeSpeed`, `arrestRadius`, `heatDispatch`: __ |
| 51  | Officers follow onto roofs believably (climb assist reads as climbing, not floating)                           | [ ]  |                                                   |
| 52  | Arrest → drag to prison → climb out is fun, not punishing; the soft release is never noticed by a good climber | [ ]  | `prisonReleaseS`, `escortSpeed`: __               |
| 53  | The rooftop chase is the moment playtesters describe afterwards                                                | [ ]  |                                                   |
| 54  | Tone 100% slapstick: strikes, pops, falls and sirens read as chaos, never violence                             | [ ]  |                                                   |
| 55  | Frame floor during a pursuit with three officers and sirens                                                    | [ ]  | calls both eyes: __                               |

## Phase 9: polish

| #   | Item                                                                                                          | Pass | Notes / measured on device      |
| --- | ------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------- |
| 56  | The first 30 s (shuffle around) and the first 5 minutes (catch the bus) are as tight as the rest              | [ ]  |                                 |
| 57  | Sleep in the bed after a done day: the next day starts with the alarm; money, level and look survive a reload | [ ]  |                                 |
| 58  | Audio bed balance: ambience under the movement sounds, pad barely there, bus engine aboard                    | [ ]  | `ambienceGain`, `musicGain`: __ |
| 59  | Fixed afternoon light and fog read well; distant chunks fade, never pop                                       | [ ]  |                                 |
| 60  | A stranger completes a full day unassisted at the frame floor; zero known floor violations anywhere           | [ ]  |                                 |

## Knobs (`src/movementTuning.ts`)

| Knob                  | Unit | Default | Turn it…                                                                     |
| --------------------- | ---- | ------- | ---------------------------------------------------------------------------- |
| `gravity`             | m/s² | 9.81    | up for snappier falls; probably leave                                        |
| `bodyRadius`          | m    | 0.3     | up if the body clips ledges; down if it snags doorways                       |
| `eyeHeightOffset`     | m    | 0.5     | up to sit lower / reach the ground more easily; down if ledges feel too high |
| `handRadius`          | m    | 0.07    | up if slaps miss thin geometry; down if hands stick early                    |
| `handStiffness`       | 1/s  | 30      | up for a crisper, lighter hold; down for more weight and lag                 |
| `handReleaseDistance` | m    | 0.03    | up if hands drop off too easily; down if release feels late                  |
| `handSlipBreak`       | m    | 0.25    | up if long pulls break the hold; down if hands drag through geometry         |
| `twoHandScale`        | –    | 0.6     | up if leaps feel weak next to strides; down if leaps dominate                |
| `speedCap`            | m/s  | 14      | up if the cap is reached too easily                                          |
| `groundFriction`      | 1/s  | 2.5     | up if the body coasts on the ground; down if it stops dead                   |
| `velocitySmoothing`   | s    | 0.2     | up if release speed is jittery; down if release feels laggy                  |
| `maxSubstepDistance`  | m    | 0.15    | leave; lower only if tunneling ever appears                                  |
| `landingThudSpeed`    | m/s  | 2.5     | up if every step thuds; down if landings are silent                          |
| `windStartSpeed`      | m/s  | 4       | up if wind is constant; down if it never appears                             |

Example: `https://clintonium-119.github.io/vr-life/?dev=perf,tools&tune=handStiffness=40,eyeHeightOffset=0.6`

## On-device procedure

1. `npm run launch` with the flags and `tune=` appended (see `docs/device-debugging.md` §5).
2. Run items 8–10 in the test space: ground run to the wall bank, climb `wallA` via `ledge1`/`ledge2`, launch off `wallTall`, slide along `wallB` at speed.
3. Item 11: teleport (grip squeeze with the tools flag) to the gap edge. Ten alternating strides from rest; read the HUD `VEL` and the console `rig at` log for distance. Repeat with ten two-handed leaps. Adjust `twoHandScale` until the two are comparable.
4. Item 14: idle 60 s and then sprint 60 s with the harness on; no warning state.
5. Record every measured value in the table, write the tuned defaults into `src/movementTuning.ts`, and paste the final URL below.

## Host smoke test (no headset)

```sh
npm run build && npm run preview &   # serves the production build on :4173
npm run smoke                        # headless Chromium, 9 s of auto strides
```

Passes when the rig moved more than 1 m, the props settled (all but the thrown ball at rest), and nothing threw. This proves the
code path runs; it says nothing about feel.

## Final tuned URL

_Not yet tuned on device._
