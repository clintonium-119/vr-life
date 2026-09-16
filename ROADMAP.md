# VR Gorilla Game — Development Roadmap

**Version:** 1.0
**Companion document:** `DESIGN_BRIEF.md` (v0.6) — the source of design intent. This roadmap turns that intent into an ordered sequence of development phases. It deliberately does not define architecture, file structure, or APIs — that is the job of each phase's planning session.

---

## 1. How to use this roadmap

- **Each phase is one workstream.** In a new session, run `/apo:plan` for the phase (e.g. `Phase 1 — Locomotion Core`), then execute its steps in sequence.
- **Phases are sequential.** A phase starts only when the previous phase's Definition of Done is met on-device. Skipping or reordering is a deliberate decision, not a default.
- **Definitions of Done are acceptance tests**, most of which are verified on a Meta Quest 3 in the Quest Browser. A phase is not done because the code works; it is done because it *feels* right on the headset.
- **Working assumptions in §3 are overridable.** If a phase plan discovers an assumption is wrong, correct it in that phase's plan and update this file.
- The roadmap ends at "polished, no-compromises single-player day loop". Multiplayer (Phase 10) is stretch and explicitly after the single-player game is finished.

---

## 2. Phase overview

| # | Phase | One-liner |
| --- | ------- | ----------- |
| 0 | Foundations | Tooling, test space, performance harness |
| 1 | Locomotion Core | Hand-push movement — the heart of the game |
| 2 | Grab & Objects | Grabbing, carrying costs, live ball physics |
| 3 | Character | The gorilla: silhouette, procedural animation, customisation |
| 4 | Art Pipeline & Home | Lock the look; the player's house and first street block |
| 5 | The Full World | Town, farm, forest, rooftop layer, verticality |
| 6 | The School Day | Morning rush, classes, gym, wrist displays |
| 7 | Town Life | NPCs, shops, economy |
| 8 | Conflict & Pursuit | Slapstick crime, police chase, prison escape |
| 9 | Polish | The no-compromises pass: visual, feel, audio, performance |
| 10 | Multiplayer *(stretch)* | Shared world after single-player is solid |

Dependency note: Phases 0–3 are system phases (movement must exist before anything to move *in*). Phases 4–9 are content and polish phases that layer onto it. Phase 9 revisits every previous phase with a final pass.

---

## 3. Decisions

### 3.1 Settled (user-decided, do not re-litigate)

1. **Single-player first, multiplayer later** (resolves OQ-1). The game ships as a single-player experience populated by NPCs. The world is *architected* to tolerate other players from the start — no global singleton state, entities designed to be network-ready — but multiplayer itself is Phase 10 and needs a separate signalling/relay service on top of the static GitHub Pages hosting.
2. **Cartoon slapstick** (resolves OQ-16; brief option 1). Nobody dies. NPCs get comically knocked over, sit up dazed, and dust themselves off. The gun is a toy that pops people backwards. Police and prison stay. The whole thing plays as chaos, consistent with the gorillas and the school day.

### 3.2 Working assumptions (creative licence; override in a phase plan if wrong)

| OQ | Decision | Rationale (short) |
| ---- | ---------- | ------------------- |
| **OQ-3** Asset pipeline | Parametric geometry builders written in TypeScript (houses, trees, furniture, props), AI-generated seamless texture atlases, a small shared set of materials, trim-sheet props, baked lighting. No per-object textures. | The brief demands "textured, not flat-coloured" under a hard draw-call budget, and this is the only pipeline that satisfies both without an external artist. |
| **OQ-4** Carrying costs | Small items stow to the back (both hands free); large or awkward items are carried in one hand, visibly costing a hand — slower, lopsided, a real skill challenge. The backpack is a carried item. | The brief's "middle path"; carrying a hand is the interesting answer and it feeds the one-armed-gone-to-prison tension in Phase 8. |
| **OQ-5** Fail states | Soft. Miss the bus → walk to school the slow way (or a late bus arrives); fail a class → the teacher lets you try again. No run-ending fails, no progress wipes. | First impression of a movement game must be mastery, not punishment. Stakes come from the timer and the fun of the slow walk, not from failure. |
| **OQ-6** Question content | Three subjects: **Math, Science, History**, at roughly grade 4–5 level. Each bank ~40 questions mixing light joke questions with genuinely real ones. Passing a class needs 3 correct. | A kid's school day is the joke; the mix keeps it funny without feeling like flashcards. |
| **OQ-7** Levelling unlocks | Level gates cosmetics: new body colours and small accessory slots unlock at level thresholds. | Cheapest meaningful consequence; keeps the right wrist display from feeling decorative without inventing progression systems. |
| **OQ-8** Repeatable loop | The day is repeatable. Progress (level, money, cosmetics, completed flags) persists via `localStorage` in the Quest Browser. Question banks shuffle per day. | Gives the economy and customisation purpose across sessions; `localStorage` is available in the Quest Browser and needs no server. |
| **OQ-9** Buttons | No buttons for movement, ever. Grabbing uses proximity + a "close your hand" assist (fingers curl near the object); the grip button works as a fallback only. | Positional input matches the philosophy; the fallback exists because controller-only hands sometimes fumble. |
| **OQ-10** World scale | Human scale. | The comedy and the readability of the brief lean on human-scale furniture and doorways; gorilla-scale interiors would flatten the gags. |
| **OQ-11** Haunted cabin | A one-off spooky easter egg with a small hidden secret. Not the first thread of a darker setting. | Keeps the tonal fork closed for this version; the cabin can grow later without retroactively breaking the town's mood. |
| **OQ-12** Hand tracking | Controllers only for this version. Hand tracking is deferred. | Tracking loss at speed would betray the movement model; reliability wins. |
| **OQ-13** Audio | Movement audio (hand slaps, surface contact, wind at speed, landings) ships *with* the movement phases (1–2), not as a later layer — silent movement feels wrong. Full ambience, town sound, and music land in Phase 9. | The brief flags audio as underrated; feel and sound are one system here. |
| **OQ-14** The bus | A real ride: the player stands aboard and travels to school. | A breather after the rush, a comic beat, and a natural moment to show the town. |
| **OQ-15** Multiplayer & school | Resolved by the single-player-first decision. The shared-classroom problem belongs to Phase 10. | — |
| **OQ-17** Age rating | Browser delivery, all-ages slapstick: no rating concerns for this version. | A consequence of decision 2. |
| **OQ-18** Prison | Escape is the mechanic: the prison is designed around climbing out. A soft timer/release is the fallback if the player cannot escape. | The strongest possible use of the movement model (brief 7.6). |
| **OQ-19** Crime × school day | They interact lightly: you can be arrested on the way to the bus; a class missed while in prison is retriable after escape. | Deliberate connection rather than two games sharing a map, at minimum scope. |

---

## 4. Cross-phase rails (every phase obeys these)

These come from the brief and apply to every phase, not just the ones they originated in:

1. **The 72 fps floor is measured, not promised.** The performance harness (Phase 0) runs in every phase. A district, interior, or effect that cannot sustain the floor is redesigned or cut — never "fixed later".
2. **Movement feel wins.** Any technical decision that trades away movement feel for convenience loses (brief §0). If a phase threatens the feel, the phase changes, not the feel.
3. **Nothing between the player and the world.** No screen-space HUD, no floating UI, no menus if avoidable. All information lives in the world or on the player's body (wrist displays are the model).
4. **Every surface that looks pushable is pushable.** Decorative geometry the player bounces off is a bug, filed as such, in any phase.
5. **Art discipline:** atlas-based texturing, baked lighting, detail in silhouette/colour/texture rather than polygon count, simple collision geometry under detailed visuals.
6. **Multiplayer tolerance:** no global singleton state; entities (player, NPCs, objects) are designed to be synchronisable even while the game is single-player.
7. **No forbidden inputs.** No thumbstick, no teleport, no snap turn, no camera movement the player did not cause with hands, head, or gravity. Dev-only tools are flag-gated and never ship.

---

## 5. Phases

### Phase 0 — Foundations

**Purpose.** Stand up the toolchain, the device test loop, and the performance harness before any game code exists. Everything from here on is developed against the real headset.

**Inputs:** none (fresh repo).

**Deliverables:**

- Vite + TypeScript (strict) + Three.js + WebXR (`immersive-vr`, 6DoF) scaffold.
- GitHub Pages static deployment; a launch workflow that gets the game onto the headset quickly (QR / link sharing).
- Device debugging loop using Meta's tooling (`npx metavr` CLI and/or Chrome remote debugging) — console, network, and frame inspection on-device.
- **Performance harness:** on-device FPS and frame-time readout (dev flag), draw-call count, texture/scene memory estimate, and a warning state when below 72 fps sustained. This is the project's single most important tool.
- **Test space:** an unadorned climbing volume — ground, walls, ledges, overhangs, a gap to launch across — built from debug materials. It exists to be moved in, not looked at.
- **Placeholder player:** a simple body with always-visible hands and forearms following the controllers 1:1.
- Dev-only tools (flag-gated, off in production): a fly/teleport rig for test placement, surface-normal and hand-ray visualisation, a velocity readout.

**Risks:** Quest Browser quirks (input timing, memory limits, shader features) discovered late. Mitigation is habit: the headset is the primary test surface from day one, never desktop.

**Definition of Done:**

- [ ] 72 fps sustained in the test space on Quest 3.
- [ ] Hands and forearms visible, tracking 1:1, never obstructing the view.
- [ ] Deploy → launch on headset → debug loop completes in under ~2 minutes.
- [ ] Performance harness reports frame time, draw calls, and memory on-device.

---

### Phase 1 — Locomotion Core

**Purpose.** Build the heart of the game (brief §4): when a hand touches a surface, that hand sticks to the world, and the player moves by pushing. This is the largest feel-iteration phase in the project. Everything else in the roadmap is content placed in service of movement; this phase *is* the movement.

**Inputs:** Phase 0 test space, harness, placeholder player.

**Deliverables:**

- **Hand-surface stick:** short ray from each hand; on contact the hand anchors at the contact point (spring-damper hold); pulling the hand back moves the body; releasing at speed inherits the push as momentum.
- **Body dynamics:** heavy gorilla mass — momentum builds over a few strides, never arriving instantly; gravity always on when no hand holds; momentum carries in the air with no artificial drag; a high speed cap that feels like an achievement to reach.
- **Push scaling:** two-handed pushes are scaled down so that alternating single-hand strides stay competitive with double-armed leaping (brief §4).
- **Core verbs:** ground-slap running (alternating slaps = stride), climbing (haul up ledges and faces), wall launching, and **wall slide** — hitting a wall at speed slides along it: not a dead stop, not a pass-through. Continuous collision handling so the player never tunnels a wall at speed.
- **Movement audio** (OQ-13, first half): hand-slap impacts with surface-dependent character (wood, stone, metal, leaves), body contact thuds, wind at speed, solid landings.
- **Feel-tuning pass** against a written checklist: weighty (heavy thing, not a balloon), solid landings, the difference between a sloppy push and a clean one obvious *in the body*, turning by physically turning, no float, no mush.

**Risks:** the project's biggest risk, and the one where "good enough" is a trap. Budget the longest iteration of any phase. Reference feel: Gorilla Tag locomotion — mechanical reference only. Do not advance to Phase 2 until the checklist passes; a beautiful world with soft movement is a failed world.

**Definition of Done:**

- [ ] Run, climb, launch, and wall-slide at speed in the test space — no dead stops, no tunneling, no float.
- [ ] Alternating single-hand stride ≈ two-handed leap distance (tuning documented).
- [ ] Feel checklist passes, including "sloppy vs. clean push is obvious in the body".
- [ ] A first-timer can shuffle around within ~30 seconds with no instruction.
- [ ] Movement audio present and surface-aware; silence is gone.
- [ ] 72 fps sustained while moving at top speed.

---

### Phase 2 — Grab & Objects

**Purpose.** Resolve the brief's "most interesting question" (carrying) as gameplay, and provide the live physics objects the school day needs.

**Inputs:** Phase 1 movement.

**Deliverables:**

- **Grabbing:** proximity grab with the close-your-hand assist (OQ-9), grip button as fallback only. Grabbing is positional — reach, touch, close.
- **Carrying costs** (OQ-4): small items stow to the back and free both hands; large or awkward items are carried in one hand and visibly cost it — slower stride, lopsided body lean, a genuine skill challenge to run one-armed. The **backpack** (Phase 6) is a carried item.
- **Object safety:** no carried object can ever be lost in an unrecoverable state — no falling through floors, no landing on unreachable roofs, no loss between sessions. Items have a stow floor, a despawn/recall rule, and persistence.
- **Live ball physics:** a minimal rigid-body for spheres — impulse launch, arc, bounce, roll, surface sound. This exists for gym class (Phase 6) but is validated here with a basketball and a soccer ball in the test space.
- A small set of generic props (boxes, barrels, a ball) to tune grab feel and carry weight.

**Definition of Done:**

- [ ] Running one-armed with a large item is noticeably slower, unbalanced, and *fun* — the backpack feels lugged, not attached.
- [ ] Stowed small items free both hands completely.
- [ ] An abuse session (flinging everything) cannot lose the backpack or any prop unrecoverably.
- [ ] Balls fly with believable arcs and bounce correctly on every test-space surface.

---

### Phase 3 — Character

**Purpose.** The gorilla. Stylized, not realistic, and deliberately better than the blocky primitive look of the reference game — players will be inches from it (Phase 10) and it must hold up close and at speed.

**Inputs:** Phase 1–2 (movement and carrying exist so the body can be tested under real use).

**Deliverables:**

- **Model, silhouette-first** (brief §5): broad barrel chest, heavy sloped shoulders, long thick forearms, small hips, short legs, pronounced brow ridge, sagittal crest, knuckle-walking posture. Strong silhouette at distance and at speed before any surface detail.
- **Hands and forearms** are the highest-fidelity part of the model — always visible, the player's connection to the world.
- **Procedural animation:** arms follow the hands (IK), the torso leans with momentum, the body sags under gravity, the knuckle-walk gait emerges from movement. No baked clips required for locomotion — the movement model is hand-driven, so the body must answer continuously.
- **View discipline:** the body is present but never obstructs the view — head-relative rigging and body offset/crouch tuned so the gorilla's own geometry is out of the way during normal play.
- **Customisation:** body colour with several options plus one or two small accessory slots (the OQ-7 unlock currency from Phase 7 onward).

**Risks:** the no-compromises quality bar lands hardest here. Prototype the silhouette with primitives early in the phase and iterate the *shape* before any detail work; "detailed mush" is the failure mode the brief warns about.

**Definition of Done:**

- [ ] At 2 m and at speed, the read is unmistakably "gorilla" within a second.
- [ ] The body sells weight: lean, sag, and momentum are visible in the model, not just the motion.
- [ ] The player's own body never obstructs the view in normal play, including one-armed carrying.
- [ ] 72 fps with a handful of placeholder gorillas in scene (multiplayer tolerance check).

---

### Phase 4 — Art Pipeline & Home

**Purpose.** Lock the look *before* the world is built (brief §6.2): textured, not flat-coloured; the player's first look-around should land as a genuine "oh, this looks good". The player's house is the first real location and the game's opening space.

**Inputs:** Phase 3 character.

**Deliverables:**

- **Asset pipeline established and proven** (OQ-3): parametric TypeScript geometry builders (houses, fences, trees, street furniture, props), AI-generated seamless texture atlases, a small shared material set, trim-sheet props, and a chosen baked-lighting approach (e.g. lightmap or pre-combined/vertex AO) demonstrated on real buildings. The pipeline's output — draw calls, texture memory, look — is measured and documented as the district budget.
- **The player's house** (brief 6.3): a real interior — bedroom (the game opens here, alarm clock in scene), a route to the front door, an entrance where the backpack lives. Human-scale, but with the interior-traversal rules of 6.4 applied: high ceilings, wide doorways, climbable interior structure.
- **First street block:** two or three small houses, road, sidewalk, front yards, fences, driveways, and the **bus stop** — one or two streets from the house.
- Every surface in the block pushable; the block is a movement space as much as a place.

**Risks:** this is the cheapest moment in the project to discover that the look isn't landing. If the first block doesn't produce the "oh, this looks good" reaction, iterate the pipeline here — before the entire town is built on it.

**Definition of Done:**

- [ ] The ~30–60 second run from the bedroom to the bus stop is fully playable at 72 fps.
- [ ] First-look reaction test (fresh eyes, first load): "this looks good".
- [ ] Every surface in the block answers "can I push off this?" — no decorative dead geometry.
- [ ] The district budget (draw calls, textures, memory) is documented and the block sits inside it.

---

### Phase 5 — The Full World

**Purpose.** All Phase One locations (brief §6.3) as one continuous connected space, with the rooftop layer and deliberate verticality the movement model demands.

**Inputs:** Phase 4 pipeline and budget.

**Deliverables:**

- **Commercial:** the grocery store (larger retail), the convenience store (small), and the office building — multi-storey, desks, cubicles, meeting rooms, lobby; the most vertical structure in town.
- **Civic:** police station, fire department (engine bay, poles, tall doors), the hospital (largest civic structure — wards, corridors, reception), and the **school**: three classrooms, a gym, hallways, and a bus drop-off — the most interior-heavy building in the game and the only one whose interior is definitively required in Phase One.
- **Outskirts:** the farm — farmhouse, barn, silo, fields, fencing, outbuildings.
- **Wilderness:** the forest, dense enough to feel like a different space; and the **haunted cabin**, hidden within it, unmarked and unsigned — finding it should feel like a discovery (OQ-11: one-off spooky easter egg with a small secret).
- **Rooftop layer:** roofs connect into a usable high route, with the office building and hospital as the peaks. Roofs are traversal, not backdrop (brief 6.4).
- **Verticality per district:** drainpipes, fire escapes, fences, trees, silos, ladders, signage, power poles, stacked crates — every district gets deliberate climbable structure.
- **Landmarks readable at speed** and from odd angles, including directly below and mid-air.
- **Interior rules** (6.4) everywhere: high ceilings, wide doorways, open floor plans, interior climbable structure, interiors traversable at speed.
- Simple collision geometry under all detailed visuals; every significant surface pushable.

**Definition of Done:**

- [ ] Farm → forest → town centre → farm, one continuous space, no transitions.
- [ ] 72 fps measured in every district and every full interior, including at speed with momentum.
- [ ] The rooftop route is usable end-to-end and fun.
- [ ] No interior feels like a confined misery at speed.
- [ ] A playtester finds the cabin without being told where it is (or its hiding place is documented and defensible).

---

### Phase 6 — The School Day

**Purpose.** The objective spine (brief §7): the morning rush, three academic classes, gym class, and the diegetic wrist displays. The game's structure as "a day in the life of a gorilla with a school to get to" becomes real.

**Inputs:** Phases 4–5 (the world), Phase 2 (balls, backpack).

**Deliverables:**

- **The morning rush** (7.2): the alarm goes off; a timer starts (generously tuned — a brand-new arm-swinger must not miss the bus on attempt one); find and grab the backpack at the entrance; get out; reach the bus stop; board the bus. A tutorial that never says it's a tutorial: locomotion, grabbing, and urgency in under a minute, zero instruction panels.
- **The bus** (OQ-14): a real ride — the player stands aboard, travels the route, arrives at the school drop-off. A breather and a comic beat.
- **Three academic classes** (7.3, OQ-6: Math, Science, History): the player raises a hand — a physical gesture, not a button; the teacher notices and calls on them; the teacher asks a multiple-choice question; the player reaches out and touches the answer they want. Three correct answers passes the class. Question banks of ~40 per subject, mixing light joke questions with real ones at grade 4–5 level.
- **Gym class:** the player picks basketball or soccer; both hand-driven only; live ball physics from Phase 2.
- **Wrist displays** (7.4): left wrist = money, right wrist = level. Diegetic, glanceable on demand, invisible otherwise. No other UI exists.
- **Soft fail states** (OQ-5): miss the bus → walk the slow way or take a late bus; fail a class → the teacher lets you try again. No progress wipes.
- **Comedy discipline** (7.7): classrooms are not sealed — a gorilla who wants to climb the bookshelves is let; hallways, stairwells, lockers, and between-class rushes give movement *to* class; the inherent comedy of a gorilla in a classroom is leaned into, not played straight.

**Definition of Done:**

- [ ] The full arc — alarm → bus → three classes → gym — is playable end-to-end with zero instruction.
- [ ] In playtesting, a first-timer catches the bus the majority of attempts.
- [ ] Answering a question feels like part of the game (gesture + reach), not a form fill.
- [ ] Gym class balls feel right in the hand.
- [ ] 72 fps inside the school while moving at speed between classes.

---

### Phase 7 — Town Life

**Purpose.** The town is populated (brief §7.5): NPCs walking the streets, staffed stores, and an economy where money earned in class is spent.

**Inputs:** Phase 6 (money, levels, wrist displays).

**Deliverables:**

- **Pedestrians:** NPCs walking the streets with simple, believable behaviour — routes, pauses, reactions to a gorilla sprinting through town (comedic, slapstick register per decision 2).
- **Shops:** the grocery and convenience stores staffed; shopping is positional — reach for an item, take it, pay the shopkeeper. Money is spent on cosmetics and small items.
- **Level unlocks** (OQ-7): level thresholds unlock new body colours and accessory slots. The right wrist display now means something.
- **Economy tuning:** class payouts versus store prices, tuned so a normal school day earns enough to tempt one or two purchases — a session should earn and spend.
- Teacher NPCs from Phase 6 expanded into the general NPC system.

**Definition of Done:**

- [ ] The town feels inhabited; NPCs behave plausibly and react to the player's presence.
- [ ] The earn → spend → equip loop works end-to-end and is fun.
- [ ] A player who never punches anyone can complete everything the game offers.

---

### Phase 8 — Conflict & Pursuit

**Purpose.** The signature moment (brief §7.6): a crime-and-consequence loop in the settled slapstick register, built around the single strongest use of the locomotion model anywhere in the brief — a rooftop police chase across town with sirens behind you.

**Inputs:** Phases 5–7 (full world, NPCs, money).

**Deliverables:**

- **Melee:** the player strikes NPCs with their hands — the universal verb extended, not a new system. Hits produce comical knockback: NPCs fly backwards, sit up dazed, dust themselves off (decision 2: nobody dies, ever). NPCs may fight back.
- **The toy gun** (purchasable from an NPC vendor with earned money): pops NPCs backwards. While drawn it costs a hand, exactly like the backpack — fleeing one-armed with the thing that got you into trouble is preserved tension, not a design flaw to remove.
- **Heat/wanted system:** a diegetic signal of police attention (sirens, flashing, presence) — no HUD number.
- **Police pursuit AI:** they pursue using the *same movement model* as the player, including the rooftop route. Beatable but not trivial: a practised player outruns them; a sloppy one gets caught. This is the hardest AI in the project — iterate with human testers at different skill levels.
- **Arrest flow:** caught → arrested → taken to **prison**, a real location with an interior, designed around climbing (brief 7.6).
- **Escape** (OQ-18): the prison is a movement challenge — climb out. A soft timer/release is the fallback so no player is stuck.
- **Recoverable consequences:** arrest costs something real — money, time, a confiscated item — and never ends the run or wipes progress.
- **School-day interaction** (OQ-19): the player can be arrested on the way to the bus; a class missed while in prison is retriable after escape.
- Sirens, chaos, and comedy audio for the pursuit.

**Risks:** fair pursuit AI at the skill ceiling is the phase's core difficulty; police that always catch (or never catch) the player kill the feature. Plan for the longest tuning loop in the phase.

**Definition of Done:**

- [ ] A skilled player escapes the police a majority of pursuits; a cautious one is caught sometimes — stakes exist and are fair.
- [ ] The arrest → prison → escape flow is fun, not punishing, and recoverable.
- [ ] The rooftop chase is the moment playtesters remember describing afterwards.
- [ ] Tone check: 100% slapstick; nothing in the loop reads as real violence.
- [ ] 72 fps during a pursuit with police, sirens, and effects active.

---

### Phase 9 — Polish (the no-compromises pass)

**Purpose.** Take the complete game from "works" to "polished, no-compromises". Every previous phase is revisited; nothing ships with a known rough edge.

**Inputs:** Phases 0–8 complete.

**Deliverables:**

- **Visual pass:** fixed time-of-day lighting (fully baked — brief 6.5), landmark and colour readability at speed and from odd angles, silhouette discipline, body-occlusion handling, materials and trim reviewed per district.
- **Feel pass:** landing impact, subtle physical feedback (dust, displaced leaves, soft squash on heavy landings — nothing screen-space), consistent frame pacing, comfort review (no crutches added, but nausea reducers like stable frame timing verified).
- **Onboarding pass:** the first 30 seconds (shuffle around) and the first 5 minutes (catch the bus) are as tight as the rest of the game.
- **Save & loop:** the repeatable day (OQ-8) with `localStorage` persistence of level, money, cosmetics, and completed flags; question banks shuffle per day.
- **Audio complete** (OQ-13, second half): town ambience, store and school sounds, the bus, sirens and chaos, and a light, unobtrusive musical bed.
- **Full performance audit:** 72 fps floor re-verified in every district and interior, top-speed movement, pursuit, and gym class; draw calls, texture memory, and scene memory all inside the Phase 4 budget.
- Final QA pass on the Quest 3 browser, including a fresh-profile first-run.

**Definition of Done:**

- [ ] A stranger completes a full day — wake, bus, classes, gym, and optionally a chase — unassisted, at 72 fps, on first exposure.
- [ ] An external tester's first impression of the visuals is "this looks good" (brief 6.2).
- [ ] Controls and mechanics read as tight and deliberate in external playtesting.
- [ ] Zero known violations of the performance floor anywhere in the game.

---

### Phase 10 — Multiplayer *(stretch — after the single-player game is finished)*

**Purpose.** The shared world (OQ-1, decided: later). Players who share this game with other players — the mechanical reference lives and dies on other bodies in the space — but only after the single-player game is polished and the world has proven it can hold it.

**Inputs:** Phases 0–9 shipped.

**Deliverables:**

- **Signalling/relay service** hosted separately from GitHub Pages (a small VPS or serverless WebSocket/Durable-Object relay; WebRTC for peer state where viable). The static site remains the game; the service is additive and the game degrades to single-player if it is unreachable.
- **Entity sync:** player positions and hands (the movement model must be *watchable* — hands selling the push is the whole read), carried objects, simple NPC/heat state where needed. Late join and disconnect handled without corrupting the world.
- **Shared classroom design** (OQ-15): the teacher calls on one player at a time; classmates wait, wander, or climb the bookshelves. The classroom objective must survive contact with a shared world.
- **Presence:** who is in the world, readably and without a HUD.

**Definition of Done:**

- [ ] Two or more players share the town and the school at 72 fps each.
- [ ] A shared class is coherent and fun for the player being called on and for the ones waiting.
- [ ] Single-player remains fully playable with the relay unreachable.

---

## 6. Explicitly out of scope (this version)

- **Hand tracking input** (OQ-12) — controllers only; deferred.
- **Quest 2 and other headsets** — Quest 3 standalone only, per the brief.
- **Store/PWA distribution** — browser URL only.
- **A darker setting thread** — the cabin is a one-off easter egg (OQ-11).
- **Any button-based movement, teleport, or snap turn** — forbidden by the brief, not deferred.

---

## 7. Sequencing rationale (short)

Movement first (Phases 1–3) because it is the game and everything else is content placed around it. The art pipeline is proven on the house before the town (Phase 4) because the look is the second-biggest no-compromises axis and must be validated cheaply. The world comes before the school day (Phase 5 → 6) because the day's spaces are the day's content. Town life (Phase 7) needs the day's economy to spend into. Conflict (Phase 8) is the last content phase because pursuit AI needs the full world's rooftop layer and the NPC systems to be real. Polish (Phase 9) is a full revisit, not an appendix. Multiplayer (Phase 10) last because it multiplies the cost of everything and must be built on a finished, stable single-player foundation.
