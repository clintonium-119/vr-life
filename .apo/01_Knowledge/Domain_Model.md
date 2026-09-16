---
note_type: knowledge
template_version: 1
contract_version: 1
knowledge_id: "KNOW-0003"
category: architecture
title: "Domain Model"
status: in_progress
owner: ""
created: '2026-09-16'
updated: '2026-09-16'
reviewed_on: ""
related_notes: []
tags: [apovault, knowledge, architecture]
---

# Domain Model

## Entities

> **(verify)** — No code or schema files exist yet. Entities described in DESIGN_BRIEF.md are design-level, not implementation-level.
>
> Expected answers when this section is filled:
>
> - [ ] Player entity — what state does it track? (position, velocity, momentum, hand states)
> - [ ] World entities — buildings, surfaces, objects — how are they represented?
> - [ ] NPCs — walking NPCs, store staff, teachers, police
> - [ ] Inventory/objects — backpack, basketballs, carried items
> - [ ] Economy — money tracking, level/XP tracking
> - [ ] Game state — active objectives, class progress, time state
>
> Look at: `DESIGN_BRIEF.md §4` (movement/player), `DESIGN_BRIEF.md §5` (characters), `DESIGN_BRIEF.md §6` (world), `DESIGN_BRIEF.md §7` (objectives/progression)

### Player (from brief)

- Gorilla character, stylized
- Has two hands (primary interaction mechanism), forearms visible
- Body: barrel chest, sloped shoulders, long forearms, short legs
- Carries momentum; can grab and carry objects
- Wrist displays: left = money, right = level

**Source:** `DESIGN_BRIEF.md §5` (read 2026-09-16)

### World Locations (from brief)

- Town core (residential streets, player's house)
- Commercial (grocery store, convenience store, office building)
- Civic (police station, fire department, hospital, school, prison)
- Transit (bus stop, school bus)
- Outskirts (farm)
- Wilderness (forest, haunted cabin)
- All in one continuous connected space, no loadable maps

**Source:** `DESIGN_BRIEF.md §6.3` (read 2026-09-16)

## Relationships

> **(verify)** — Relationships between entities not specified in brief.
>
> Expected answers when this section is filled:
>
> - [ ] How does the player relate to the world? (movement, collision, interaction)
> - [ ] How do NPCs relate to the player and each other?
> - [ ] What is the relationship between objectives and game state?
> - [ ] How does the economy work? (money earned → spent → cosmetics)
>
> Look at: `DESIGN_BRIEF.md §4` (movement), `DESIGN_BRIEF.md §7` (objectives/progression)

## Invariants

> **(verify)** — Invariants described in brief are design constraints, not code-level invariants.
>
> Expected answers when this section is filled:
>
> - [ ] Performance invariant: 72 fps sustained, both eyes, Quest 3 standalone
> - [ ] Movement invariant: no thumbstick, teleport, snap turn, double-jump, dash, grapple
> - [ ] UI invariant: no floating HUD, no screen-space overlays
> - [ ] World invariant: every significant surface is pushable
> - [ ] Recovery invariant: carried objects never lost in unrecoverable state
>
> Look at: `DESIGN_BRIEF.md §1` (performance), `DESIGN_BRIEF.md §3` (pillars), `DESIGN_BRIEF.md §4` (forbidden), `DESIGN_BRIEF.md §6.4` (world rules)
