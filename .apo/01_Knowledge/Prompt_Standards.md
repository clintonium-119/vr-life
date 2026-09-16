---
note_type: knowledge
template_version: 1
contract_version: 1
knowledge_id: "KNOW-0007"
category: standards
title: "Prompt Standards"
status: in_progress
owner: ""
created: '2026-09-16'
updated: '2026-09-16'
reviewed_on: ""
related_notes: []
tags: [apovault, knowledge, standards]
---

# Prompt Standards

## From Agent Guidelines

> **(verify)** — No project-specific agent guidelines found (no CLAUDE.md, AGENTS.md, .cursorrules).
>
> Expected answers when this section is filled:
>
> - [ ] Are there project-specific agent rails?
> - [ ] How should the planning agent structure phases?
> - [ ] What are the agent's constraints on proposing changes to DESIGN_BRIEF.md?
>
> Look at: `DESIGN_BRIEF.md §0` (planning agent guidelines)

## Vault-Artifact Citations in Generated Content

Do not embed vault artifact IDs (`DEC-NNNN`, `OBS-NNNN`, `PHASE-NN`, `STEP-NN-NN`, `SESSION-*`, `02_Work/**`, `01_Knowledge/_pending/**`, `01_Knowledge/_archive/**`) as wikilinks or bare references in code comments, test titles, runtime strings, or `01_Knowledge/*` rail bodies. Keep vault IDs in their structural homes: file names, frontmatter, and `02_Work/**` cross-references. Domain item IDs (`TASK-NNNN` / `BUG-NNNN`) referenced as kanban items are allowed.

Cross-reference: the lint check (Check for vault-artifact citations) enforces this rule.

## Modernity Preferences (User-Confirmed)

> No multi-approach areas detected — no source code exists yet. This section will be populated during `/apo:plan` or `/apo:refine` once code exists and dual-presence patterns are found.

## Theme Tokens

No centralized token system detected. Visual design is driven by Three.js materials, textures, and scene graphs. Do not invent token names or assume a design token system exists.

**Source:** `DESIGN_BRIEF.md §1` (read 2026-09-16)

## Movement Priority (from DESIGN_BRIEF.md)

The brief establishes movement feel as the highest priority. When trade-offs arise:

- **Do** prioritize movement feel over convenience.
- **Do not** introduce thumbstick locomotion, teleport, snap turn, double-jump, dash, or grapple — these are explicitly forbidden.
- **Do** justify any trade-off against movement feel with explicit reasoning.

**Source:** `DESIGN_BRIEF.md §3, §4` (read 2026-09-16)

## Performance Constraint

72 fps sustained on both eyes, Quest 3 standalone — this is a hard constraint, not a target. Every design decision must be evaluated against this constraint.

**Source:** `DESIGN_BRIEF.md §1` (read 2026-09-16)
