---
note_type: knowledge
template_version: 1
contract_version: 1
knowledge_id: "KNOW-0002"
category: architecture
title: "Code Map"
status: in_progress
owner: ""
created: '2026-09-16'
updated: '2026-09-16'
reviewed_on: ""
related_notes: []
tags: [apovault, knowledge, architecture]
---

# Code Map

## Subsystems

| Slug | Path | Purpose | File count | Status |
| --- | --- | --- | --- | --- |
| vr-life | (entire project) | VR gorilla game — all game design, movement, world, objectives | 1 (DESIGN_BRIEF.md) | active |

Small codebase: no source code exists yet. Entire project treated as one subsystem. Subsystem will be re-scanned once source code appears.

## Directory Structure

```
vr-life/
├── DESIGN_BRIEF.md    — Design brief (v0.6), source of game design intent
├── .git/
└── .apo/              — ApoVault (gitignored)
```

No `src/`, `app/`, or any source directories yet. Project is pre-implementation.

**Source:** `ls -F` (read 2026-09-16)

## Key Files

| File | Role |
| --- | --- |
| `DESIGN_BRIEF.md` | Complete design brief — all game design decisions, movement rules, world design, objectives, open questions |

**Source:** `ls -F` (read 2026-09-16)

## Module Boundaries (Vault-wide)

> **(verify)** — No code exists yet; module boundaries will be defined during planning.
>
> Expected answers when this section is filled:
>
> - [ ] How will the codebase be organized? (src/ structure, module boundaries)
> - [ ] What are the major subsystems? (movement, rendering, input, game logic, UI)
> - [ ] How will assets be organized? (models, textures, audio)
>
> Look at: `DESIGN_BRIEF.md §1` (tech stack), `DESIGN_BRIEF.md §4` (movement), `DESIGN_BRIEF.md §6` (world)

## Module Boundaries — vr-life

> **(verify)** — Single-subsystem fallback; boundaries TBD during planning.
>
> Expected answers when this section is filled:
>
> - [ ] What are the major modules? (e.g., movement/, world/, input/, game/)
> - [ ] How do modules communicate?
> - [ ] What is shared vs. module-private?
>
> Look at: `DESIGN_BRIEF.md §4` (movement), `DESIGN_BRIEF.md §6` (world), `DESIGN_BRIEF.md §7` (objectives)
