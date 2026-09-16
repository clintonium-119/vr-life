# VR Gorilla Game — Design Brief

**Version:** 0.7
**Purpose:** Captures what the game *is* — concept, movement rules, characters, world, objectives. This is the source of design intent, not an implementation plan.

**Changelog:** 0.7 (2026-09-16) — gorilla eye height and the body collider added to §4; play posture added to §1; frame floor tied to the session refresh rate; "Phase One" renamed "Version 1" to stop colliding with the roadmap's numbered phases; chunked-world rule added to §6.4; bus-as-moving-platform note added to §7.2; OQ-9 corrected for controller hardware; §9 now points at the roadmap for decisions.

---

## 0. For the planning agent

This document defines intent. It does not define architecture, phasing, file structure, or APIs — that is your job.

Rules for working from it:

- Sections marked **TBD** are genuinely undecided. Do not invent content for them. Surface them as questions.
- Section 4 (Movement) is the heart of the game. If any technical decision trades away movement feel for convenience, movement feel wins.
- Where this brief states a constraint, treat it as fixed. Where it states intent, you may propose alternatives that serve that intent better.

---

## 1. Platform and stack

Decided. Not open for re-litigation.

| | |
|---|---|
| **Target device** | Meta Quest 3, standalone |
| **Delivery** | Meta Quest Browser, WebXR — no app install, no store |
| **Renderer** | Three.js |
| **Language** | TypeScript, strict |
| **Build** | Vite |
| **Hosting** | GitHub Pages (static only — see OQ-1) |
| **Performance floor** | The WebXR session's refresh rate sustained, both eyes, on Quest 3 standalone. 72 Hz is the assumed rate; the real negotiated rate is what is measured against. |
| **Play posture** | Standing, room-scale, with clearance to swing both arms. Turning is physical (see §4), so there is no seated mode and no artificial turn. |

The performance floor is a design constraint, not just an engineering one. It rules out heavy materials, dense geometry, and large numbers of dynamic lights. Art direction must be built around it rather than fighting it.

---

## 2. Core concept

The player is a gorilla in a world built for climbing, swinging, and running on all fours.

There are no thumbsticks, no teleport, and no artificial locomotion of any kind. The player moves entirely by pushing their hands against the world — slapping the ground to run, hauling on a rock face to climb, launching off a wall to fly. **Movement skill is the game.** Everything else — objectives, world design, other players — exists to give that movement somewhere to go.

The skill ceiling should be high and the floor should be low. A first-timer should be able to shuffle around within thirty seconds. A practised player should move in ways a first-timer can't parse.

**Reference point:** locomotion should feel like *Gorilla Tag*. That is the mechanical reference only. Characters, world, art direction, and naming are original work — nothing from that game is reproduced.

---

## 3. Design pillars

Use these to break ties.

1. **Momentum is earned.** Speed comes from good technique, never from a button or an upgrade. The player should always be able to explain why they went fast.
2. **The world is a climbing frame.** Every surface answers the question "can I push off this?" Geometry exists to be grabbed, not just looked at.
3. **Readable at speed.** Players will be moving fast and looking around wildly. Silhouettes, landmarks, and colour must survive that.
4. **No comfort crutches.** No vignetting, no snap turn, no teleport. The movement model is the comfort model — physical, grounded, driven by the player's own body.
5. **Nothing between the player and the world.** No floating HUD, no screen-space overlays, no menus if they can be avoided. Information lives in the world or on the player's body — the wrist displays in 7.4 are the model for how every piece of information should be delivered.

---

## 4. Movement — design rules

### The principle

When a hand touches a surface, that hand is **stuck to the world at that point**. Pull the hand backwards and the hand stays where it is — the world doesn't move, so the player does. Push off hard and let go, and the player keeps that momentum and flies.

That's the whole mechanic. Everything else is tuning.

### Rules

- **The player's eye sits at gorilla height.** The virtual eye is placed lower above the virtual floor than the player's physical eye is above the real floor, so that a natural downward swing slaps the ground. This one offset is what makes ground-running possible; it is tuned for feel, and it means a human-scale town (§6.5) is seen from a low, wide-shouldered viewpoint.
- **The body is one simple collider.** A single sphere or capsule hung from the head. It rests on the ground when standing, is pushed out of walls, and never tunnels geometry at speed. If the player physically leans their head into a wall, the body is nudged back; the camera is never moved independently of the head.
- Gravity is always on. The player falls whenever no hand is holding a surface.
- Both hands push independently. Using two at once is more powerful than one, but not double — two-handed pushes are scaled down so alternating single-hand strides stay competitive with double-armed leaping.
- Momentum carries. Releasing a push at speed launches the player; there's no drag applied mid-air beyond gravity.
- Hitting a wall at speed causes a slide along it, not a dead stop and not a pass-through. Losing all momentum on contact feels punishing and should be avoided.
- Speed is capped, but the cap should be high enough that reaching it feels like an achievement.

### Explicitly forbidden

- Thumbstick or trackpad movement
- Teleport
- Snap turn — the player turns by physically turning their body
- Any camera movement the player did not cause with their hands, their head, or gravity
- Double-jump, dash, grapple, or any ability that grants motion without a physical push

### What "good" feels like

Weighty. A gorilla is heavy, and pushing one should feel like moving a heavy thing — momentum builds over a few strides rather than arriving instantly. Landing should feel solid. The difference between a sloppy push and a clean one should be obvious in the body, not in a number.

### Grabbing and carrying

The player can pick objects up and carry them. Backpacks, basketballs, groceries, whatever the world offers.

This collides directly with the movement model: hands are the engine, and a hand holding something is a hand that isn't pushing. That collision is the most interesting question in the design, and it has two possible answers:

- **Carrying costs you a hand.** Running to the bus one-armed, off-balance, is a real skill challenge and makes the backpack feel like something you're actually lugging.
- **Carried items stow.** Grab the backpack and it snaps to your back, freeing both hands. Cleaner, faster, less interesting.

A likely middle path: small items stow, large or awkward items must be carried. See OQ-4.

Whatever the answer, carried objects must never be droppable into an unrecoverable state — falling through the floor, landing on an unreachable roof, or being lost between sessions.

---

## 5. Characters

**Species:** Gorilla. Stylized, not realistic.

**Quality bar:** Deliberately better than the blocky primitive look the reference game uses. Players will be inches from each other; the model must hold up close. Strong silhouette over surface detail — a distinctive shape that reads instantly at distance and at speed beats a detailed model that reads as mush.

**Anatomy that sells it:** broad barrel chest, heavy sloped shoulders, long thick forearms, small hips, short legs, pronounced brow ridge, sagittal crest on the skull. The knuckle-walking posture is central to the read.

**Customisation:** Body colour at minimum. Extent beyond that is TBD.

**What the player sees of themselves:** Hands and forearms are always visible and matter most — they're the player's connection to the world. The body is present but must never obstruct the view.

**Other players:** TBD — depends on OQ-1.

---

## 6. World and locations

### 6.1 Setting

A small town. Mundane, contemporary, recognisable — houses, streets, shops, civic buildings — with a forest at its edge and a farm on the outskirts. One deliberate tonal outlier: a haunted cabin hidden in the woods.

The world is one continuous connected space, not a set of separate loadable maps. Players should be able to travel from the farm to the forest to the town centre without a transition.

### 6.2 Visual bar

Same broad stylisation as the reference game — simple, chunky, readable forms, not realism — but executed to a much higher standard. **Textured, not flat-coloured.** The intent is for a player's first look around to land as a genuine "oh, this looks good," which is not the reaction that game's environments get.

Practical shape of that, for the planning agent to work within:

- Texturing should be atlas- or trim-sheet-based so the whole town shares a small number of materials. Per-object textures will destroy the draw-call budget long before they improve the look.
- Baked lighting over dynamic. The town is static; there is no reason to pay for real-time lights.
- Detail belongs in silhouette, colour, and texture — not polygon count.
- The 72 fps floor is not negotiable for the sake of the art. A beautiful town at 60 fps is a failed town.

### 6.3 Version 1 locations

**Town core**
- Residential streets with small single- and two-storey houses
- **The player's house** — the game opens in its bedroom. Needs a real interior: bedroom, a route to the front door, an entrance where the backpack lives.
- Roads, sidewalks, front yards, fences, driveways
- The connective tissue of the map — most travel passes through here

**Commercial**
- Grocery store — one, the larger of the two retail spaces
- Convenience store — one, small
- Office building — the "grown-up jobs" building. Multi-storey, desks, cubicles, meeting rooms, lobby. The most vertical structure in town.

**Civic**
- Police station
- Fire department — engine bay, poles, tall doors
- Hospital — the largest civic structure; wards, corridors, reception
- **School** — required by the Version 1 objectives (Section 7). Needs three classrooms, a gym, hallways, and a bus drop-off. This is the single most interior-heavy building in the game and the only one whose interior is definitely required for Version 1.
- **Prison** — required by the conflict loop (7.6). Not part of the original location list. Needs an interior and, if escape is a mechanic, climbable structure designed around it. Later phase.

**Transit**
- Bus stop — one or two streets from the player's house
- School bus — the ride between the two

**Outskirts**
- Farm — farmhouse, barn, silo, fields, fencing, outbuildings

**Wilderness**
- Forest — dense enough to feel like a different space from the town
- Haunted cabin — hidden somewhere within the forest, not marked or signposted. Finding it should feel like a discovery.

### 6.4 Rules the world must satisfy

- **Every significant surface is pushable.** Decorative geometry the player bounces off is a betrayal of the movement model. If it looks climbable, it is.
- **Rooftops form a second traversal layer.** Players in a game about climbing will immediately try to get on top of everything. The town should be built so that roofs connect into a usable high route, with the office building and hospital as the peaks. Do not treat roofs as backdrop.
- **Verticality must be designed in, not assumed.** A town of streets and low houses is fundamentally horizontal, which is the least interesting terrain for this movement model. Every district needs deliberate climbable structure — drainpipes, fire escapes, fences, trees, silos, ladders, signage, power poles, stacked crates.
- **Interiors must be traversable at speed.** Every interior is a confined space where a player carrying momentum will hit a wall. Interiors need high ceilings, wide doorways, open floor plans, and interior climbable structure. A realistically-proportioned office corridor would be miserable to move through.
- **Landmarks readable at speed and from odd angles** — including from directly below and from mid-air. Players will be moving fast and looking in every direction.
- **Collision geometry stays simple** even where visuals are detailed.
- **Only what is near is drawn; everything is always solid.** One continuous town with ten interiors cannot be drawn whole at the frame floor. The world is built so that distant districts and closed interiors are not rendered, while the collision world stays loaded everywhere — movement must never depend on what is currently visible.

### 6.5 Open within the world

- Which buildings have full interiors versus exterior-only shells. Full interiors for all ten locations is a very large amount of work and a heavy performance cost; a subset may be enough for Version 1.
- Whether the town is scaled to humans or to gorillas. Human-scale furniture and doorways are more readable and more comic; gorilla-scale is more comfortable to move through.
- Time of day and weather. A fixed time of day is far cheaper and lets lighting be fully baked.

---

## 7. Objectives

### 7.1 Shape of the game

The game is a day in the life of a gorilla with a school to get to.

It opens with an alarm clock. The player wakes up late, has to scramble out the door, and the day proceeds from there — bus, school, classes, and whatever the world offers afterwards. Objectives are structured as a sequence of things a kid has to do, played by a gorilla with no thumbsticks, which is the joke and the appeal.

Version 1 covers the morning rush through the end of the school day.

### 7.2 The morning rush

The opening sequence, and the player's first experience of the game.

1. Player wakes in their bedroom. An alarm is going off. They are late.
2. A timer starts — target somewhere between 30 and 60 seconds, to be tuned to the actual distance.
3. The backpack is somewhere near the entrance of the house. The player must find and grab it.
4. Get out of the house.
5. Reach the bus stop, one or two streets up.
6. Board the bus. The bus takes the player to the school.

Design notes:

- This is a tutorial that never says it's a tutorial. It teaches locomotion, grabbing, and urgency in under a minute without a single instruction panel.
- The timer must be tuned generously at first. A brand-new player who has never arm-swung before will be slow, and missing the bus on the very first attempt would be a bad first impression.
- **Fail state is undecided** — see OQ-5.
- The bus ride is the natural place to hide any loading between the town and the school.
- The bus is a moving platform in a hand-anchored movement model: the player stands on it, grabs the rails, and is thrown about as it drives. Hands must stick to surfaces that move. If they cannot, the ride becomes a fade.

### 7.3 School

Four objectives, all inside the school.

**Three academic classes.** Each has an NPC teacher at the front of a classroom.

- The player raises their hand. The teacher notices and calls on them.
- The teacher asks a multiple-choice question.
- **Three correct answers passes the class.**
- Passing all three academic classes pays out money.

Raising a hand is a physical gesture, not a button, which fits the game's input philosophy exactly. Answer selection should follow the same logic — reach out and touch or grab the answer you want, rather than pointing a laser at a menu.

**Gym class.** The fourth objective, and the movement outlet in an otherwise stationary building. The player picks one:

- Shoot basketballs into a hoop, or
- Strike a soccer ball with their hands into a goal

Both are hand-driven, which keeps them consistent with everything else the hands do. Gym class needs live ball physics — bounce, roll, arc — which the earlier locations do not.

**Subjects, difficulty, and question content are TBD** — see OQ-6. This is a content problem, not a code problem, and it is larger than it looks.

### 7.4 Progression

Two diegetic wrist displays. No other UI.

| | |
|---|---|
| **Left wrist** | Money |
| **Right wrist** | Level |

- **Money** is earned by completing objectives, starting with passing the academic classes. It is spent at the town's stores.
- **Level** rises as objectives are completed. What levelling actually *unlocks* is undecided — see OQ-7. A number that goes up and does nothing will be noticed.

Wrist displays are the right call: readable on demand by a glance at your own arm, invisible the rest of the time, and physical rather than floating. Everything else the game needs to communicate should look for a similar answer.

### 7.5 Shops and NPCs

The town is populated with NPCs, some walking the streets, some staffing stores. Money is spent with them on cosmetics and items.

**Deliberately deferred.** Noted here so the world and economy are designed with it in mind, but not specified for Version 1.

### 7.6 Conflict and consequences

A crime-and-consequence loop layered over the town, in the broad tradition of open-world sandbox games.

**Melee.** The player can attack NPCs with their hands. NPCs may fight back. Hands are already the game's universal verb — pushing, grabbing, shooting hoops — so striking is a natural extension rather than a new system.

**Firearms.** The player can acquire a gun, most likely purchased from an NPC vendor with money earned from objectives. Acquisition method is open.

**Police response.** Shooting an NPC brings the police. They pursue the player, and if they catch them, the player is arrested and taken to prison.

### Why this is the best idea in the design so far

A police pursuit is the single strongest use of this locomotion model anywhere in the brief. Everything the movement is good at — building momentum, taking the high route over rooftops, improvising a line through geometry under pressure — is exactly what fleeing a pursuer demands. The school section asks the player to stand still; this asks them to move as well as they possibly can, with real stakes. If any part of this game is going to be the thing players remember, it is a rooftop chase across town with sirens behind them.

The chase deserves to be designed as a first-class feature, not as punishment for misbehaving.

### Design notes

- **A gun costs you a hand**, exactly like the backpack. Fleeing the police one-armed while holding the thing that got you into trouble is good tension and should be preserved rather than designed around.
- **Prison needs to be a place**, not a fade to black. It is a new location, not currently in Section 6. Escaping it is an obvious and very strong movement challenge — arguably a better use of the mechanic than the school is.
- **Consequences should be recoverable.** Getting arrested should cost the player something real (money, time, a confiscated item) without ending the run or wiping progress. Frustration here will drive players away faster than anywhere else in the game.
- **Police need to be beatable but not trivial.** If they always catch you, nobody will risk it twice. If they never do, there are no stakes.
- **Non-violent play must stay fully viable.** A player who never punches anyone should be able to complete every objective in the game.

### Tone — a real fork

This pulls the game in two directions at once. Right now it is a school-day game: wake up late, catch the bus, answer questions in class, shoot hoops in gym. Adding guns and prison makes it a sandbox crime game that happens to have a school in it. Both are good games. They are not obviously the same game.

The open-world titles this borrows from hold together because everything in them is consistent in tone. A game that is cheerful and mundane in nine locations and violent in the tenth reads as two games sharing a map.

This is worth deciding deliberately rather than arriving at by accident. Three coherent options:

1. **Cartoon slapstick.** Nobody dies. NPCs get comically knocked over, sit up dazed, and dust themselves off. The gun is a prop that pops NPCs backwards. Police and prison stay, and the whole thing plays as chaos rather than violence. Consistent with the gorillas, the town, and the school.
2. **Full sandbox.** Commit to the crime-game tone across the whole map. The school becomes one activity among many rather than the spine of the game.
3. **Melee only.** Keep the punching and the police response, drop the firearm. Retains nearly all of the chase gameplay — which is the valuable part — at a fraction of the tonal and scope cost.

**Recommendation: option 1 or option 3.** The chase is where the value is, and the chase does not require a gun. See OQ-16.

### Scope warning

This is the largest addition to the brief so far, by a wide margin. It introduces NPC combat reactions, pursuit AI, a wanted/heat system, an arrest flow, a prison location with its own interior, and an escape or release mechanic. Each is a system, not a feature. It should be scoped as its own phase, well after the school day is playable end to end.

### 7.7 The tension worth naming

The stated pillar of this game is that movement skill *is* the game. The school section is the opposite of that — the player stands in a classroom, raises a hand, and answers questions. Sitting still is the failure mode of a movement game.

This is not an argument against the school. It is an argument that the school has to earn its stillness:

- The morning rush and gym class are the movement bookends. Keep them prominent.
- Getting *to* class should be as playable as the class itself. Hallways, stairwells, lockers, and a between-class rush give the player something to move through rather than a corridor to shuffle down.
- A gorilla in a classroom is inherently funny. The comedy of the situation is doing real work here and should be leaned into rather than played straight.
- Classrooms should not be sealed. If a player wants to climb the bookshelves instead of answering, the game is better for letting them.

---

## 8. Audio

**TBD**, but flagged as underrated. Hand-slap impacts, surface-dependent contact sounds, and wind at speed do a large amount of the work in making this style of movement feel physical. Silence will make good movement feel wrong.

---

## 9. Open questions

Ordered by how much they block other decisions.

**Status:** OQ-1 and OQ-16 are settled and every other question has a working assumption in `ROADMAP.md` §3. This list is kept as the record of what was asked; the roadmap holds the answers.

- **OQ-1 — Multiplayer or single-player?** The biggest structural decision in the project. It determines whether the world is designed around other players and how much of the character work matters. It also breaks the hosting model: GitHub Pages serves static files only, so multiplayer requires a second service for signalling and state sync. See also OQ-15.
- **OQ-2 — Which locations get full interiors in Version 1?** The school and the player's house are now required. The other eight are open. Full interiors everywhere is a large scope and a heavy performance cost. See 6.5.
- **OQ-3 — Asset pipeline.** Textured environments, a good-looking gorilla, NPCs, and a school full of furniture all mean authored assets — model files, texture atlases, and a tool to produce them. This is now a certainty rather than an option, and it is the largest unscoped piece of work in the project. Who or what produces the art needs an answer.
- **OQ-4 — Does carrying an object cost you a hand?** See Section 4, Grabbing and carrying. The most consequential gameplay question currently open.
- **OQ-5 — Fail states.** What happens if the player misses the bus, or fails a class? Restart the day, walk to school the slow way, lose money, or no penalty at all? This decides whether the game has stakes or is a sandbox with tasks in it.
- **OQ-6 — Question content.** Which three subjects? What grade level? How many questions per bank, and who writes them? Real educational questions and joke questions are very different games. A bank large enough to avoid repetition across replays is a substantial content job and should be scoped now rather than discovered later.
- **OQ-7 — What does levelling unlock?** Cosmetics, new areas, new objectives, nothing? A number that rises with no consequence will be noticed quickly.
- **OQ-8 — Is the day a repeatable loop?** Does the player wake up to a fresh school day, or is this a single linear run? This shapes save state, question-bank size, and the whole economy.
- **OQ-9 — Is any button input used at all?** Raising a hand and touching an answer are purely positional, which is ideal. Grabbing is the one mechanic that wants a grip button. Quest Touch Plus controllers cannot sense finger curl, so "closing your hand" is only available if hand tracking (OQ-12) is enabled; with controllers, the grip button is the hand closing.
- **OQ-10 — World scale: human or gorilla?** See 6.5. Sharper now that classrooms, desks, and school furniture are involved.
- **OQ-11 — Tone.** Nine mundane locations and one haunted cabin. Is the cabin a one-off spooky easter egg in an otherwise cheerful town, or the first hint of something darker under the whole setting?
- **OQ-12 — Hand tracking as well as controllers?** Bare hands would suit a game about pushing and grabbing, but tracking loss at speed is a real risk.
- **OQ-13 — Audio.** See Section 8.
- **OQ-14 — How does the bus work?** A real ride the player sits through, or a fade? A ride is a natural loading cover and a breather; a fade is faster on repeat playthroughs.
- **OQ-15 — Multiplayer and the school.** If OQ-1 lands on multiplayer, do all players sit the same class at once? Does one player answering spoil it for the others? The classroom objective is built around a single player being called on, and does not obviously survive contact with a shared world.
- **OQ-16 — Tone: slapstick, full sandbox, or melee-only?** See 7.6. This decides what kind of game this is and should be settled before any combat work is scoped.
- **OQ-17 — Age rating and audience.** Browser delivery means no store review, so nothing here blocks shipping. But if the game ever goes to the Meta store or App Lab, firearm violence against humanoid NPCs changes the rating significantly, and it changes who can be shown it in the meantime.
- **OQ-18 — Prison: escape, timer, or fine?** Escaping is by far the most interesting option and the best fit for the movement model. A timer is the cheapest. A fine is the least punishing.
- **OQ-19 — Does the crime loop interact with the school day?** Can the player be arrested on the way to the bus? Does missing class because you were in prison have consequences? Either the two systems connect deliberately or they sit side by side as separate games on one map.
