---
note_type: knowledge
template_version: 1
contract_version: 1
knowledge_id: "KNOW-0001"
category: architecture
title: "System Overview"
status: in_progress
owner: ""
created: '2026-09-16'
updated: '2026-09-16'
reviewed_on: ""
related_notes: []
tags: [apovault, knowledge, architecture]
---

# System Overview

## Purpose

A VR gorilla game for Meta Quest 3, delivered via Meta Quest Browser (WebXR). The player moves entirely by pushing hands against surfaces — climbing, swinging, running on all fours. No thumbsticks, no teleport, no artificial locomotion.

**Source:** `DESIGN_BRIEF.md §1, §2` (read 2026-09-16)

## High-Level Architecture

> **(verify)** — Architecture not defined in brief; planning agent's responsibility.
>
> Expected answers when this section is filled:
>
> - [ ] Client-server model or single-player only? (OQ-1 unresolved)
> - [ ] How is multiplayer handled if chosen? (GitHub Pages is static-only; OQ-15)
> - [ ] Where does game logic live vs. rendering?
> - [ ] State persistence: local storage, cloud save, or none?
>
> Look at: `DESIGN_BRIEF.md §1` (platform/hosting), `DESIGN_BRIEF.md §7` (objectives/progression)

## Key Components

Only one file exists in the project:

- `DESIGN_BRIEF.md` — complete design brief (v0.6), defines all game design intent

No source code, no dependencies, no build configuration yet.

**Source:** `ls -F` (read 2026-09-16)

## Technology Stack

| Category | Technology | Source |
| --- | --- | --- |
| Target device | Meta Quest 3, standalone | `DESIGN_BRIEF.md §1` |
| Delivery | Meta Quest Browser, WebXR | `DESIGN_BRIEF.md §1` |
| Renderer | Three.js | `DESIGN_BRIEF.md §1` |
| Language | TypeScript, strict | `DESIGN_BRIEF.md §1` |
| Build | Vite | `DESIGN_BRIEF.md §1` |
| Hosting | GitHub Pages (static) | `DESIGN_BRIEF.md §1` |
| Performance target | 72 fps sustained, both eyes, Quest 3 standalone | `DESIGN_BRIEF.md §1` |

## Performance Constraints

The 72 fps floor rules out heavy materials, dense geometry, and large numbers of dynamic lights. Art direction must be built around this constraint.

**Source:** `DESIGN_BRIEF.md §1` (read 2026-09-16)

## Open Questions (Architecture-Blocking)

| ID | Question | Impact |
| --- | --- | --- |
| OQ-1 | Multiplayer or single-player? | Determines hosting model, world design, state management |
| OQ-3 | Asset pipeline | Authored assets (models, texture atlases) needed — tooling decision |
| OQ-12 | Hand tracking as well as controllers? | Input system design |
| OQ-15 | Multiplayer and the school | If OQ-1 = multiplayer, classroom objective design changes |

All TBD in brief; surfaced for planning.

**Sources:** `DESIGN_BRIEF.md §9` (read 2026-09-16)
