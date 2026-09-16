---
note_type: knowledge
template_version: 1
contract_version: 1
knowledge_id: "KNOW-0005"
category: architecture
title: "Agent Workflow"
status: in_progress
owner: ""
created: '2026-09-16'
updated: '2026-09-16'
reviewed_on: ""
related_notes: []
tags: [apovault, knowledge, architecture]
---

# Agent Workflow

## Agent Roles

> **(verify)** — No agent rails (CLAUDE.md, AGENTS.md, .cursorrules) found in project.
>
> Expected answers when this section is filled:
>
> - [ ] Is there an existing agent workflow or playbook for this project?
> - [ ] What role does the planning agent play vs. the execution agent?
> - [ ] Are there project-specific agent conventions?
>
> Look at: `DESIGN_BRIEF.md §0` (references "planning agent" and "planning agent to work within")

## Workflow Patterns

The DESIGN_BRIEF.md §0 establishes a planning-agent workflow:

- The brief defines **intent**, not architecture/phasing/file structure/APIs — that is the planning agent's job.
- TBD sections in the brief are genuinely undecided; agent should surface them as questions, not invent content.
- Movement feel (Section 4) is the highest priority — trade movement feel for convenience only with explicit justification.
- Where the brief states a constraint, treat as fixed. Where it states intent, propose alternatives that serve the intent better.

**Source:** `DESIGN_BRIEF.md §0` (read 2026-09-16)

## Tooling

> **(verify)** — No tooling configuration found (no package.json, tsconfig.json, etc.).
>
> Expected answers when this section is filled:
>
> - [ ] What build tools, linters, and formatters will be used?
> - [ ] What testing framework?
> - [ ] CI/CD configuration?
>
> Look at: Project setup when `vite`, `typescript`, and `three` are added
