---
note_type: knowledge
template_version: 1
contract_version: 1
knowledge_id: "KNOW-0004"
category: architecture
title: "Integration Map"
status: in_progress
owner: ""
created: '2026-09-16'
updated: '2026-09-16'
reviewed_on: ""
related_notes: []
tags: [apovault, knowledge, architecture]
---

# Integration Map

## External Services

> **(verify)** — No external service integrations defined yet.
>
> Expected answers when this section is filled:
>
> - [ ] Is there a multiplayer backend/service? (depends on OQ-1)
> - [ ] Any analytics, telemetry, or crash reporting?
> - [ ] Asset hosting / CDN for Three.js models and textures?
>
> Look at: `DESIGN_BRIEF.md §1` (hosting), `DESIGN_BRIEF.md §9` (OQ-1, OQ-15)

## Internal APIs

> **(verify)** — No code exists; internal APIs TBD during planning.
>
> Expected answers when this section is filled:
>
> - [ ] Movement API — hand surface detection, momentum calculation, physics
> - [ ] World API — level loading, surface tagging, collision
> - [ ] Game logic API — objective tracking, state transitions
> - [ ] Input API — hand tracking, controller input, grabbing
>
> Look at: `DESIGN_BRIEF.md §4` (movement), `DESIGN_BRIEF.md §7` (objectives)

## Data Flow

> **(verify)** — Data flow architecture TBD.
>
> Expected answers when this section is filled:
>
> - [ ] How does input flow to movement to physics to rendering?
> - [ ] How does game state persist across sessions?
> - [ ] If multiplayer: how is state synced between clients?
>
> Look at: `DESIGN_BRIEF.md §1` (platform), `DESIGN_BRIEF.md §4` (movement pipeline)

## Figma

> No Figma URLs provided during init. Section will be populated when design references are added via `/apo:init` or `/apo:refine`.
