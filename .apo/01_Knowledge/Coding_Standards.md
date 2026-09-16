---
note_type: knowledge
template_version: 1
contract_version: 1
knowledge_id: "KNOW-0006"
category: standards
title: "Coding Standards"
status: in_progress
owner: ""
created: '2026-09-16'
updated: '2026-09-16'
reviewed_on: ""
related_notes: []
tags: [apovault, knowledge, standards]
---

# Coding Standards

## Lint / Format

> **(verify)** — No lint/format config files exist yet (no .eslintrc, biome.json, .prettierrc, etc.).
>
> Expected answers when this section is filled:
>
> - [ ] Which linter? (ESLint, Biome, Oxlint, etc.)
> - [ ] Which formatter? (Prettier, Biome, dprint, etc.)
> - [ ] EditorConfig settings?
> - [ ] TypeScript strict mode? (brief says "strict" but need to confirm)
>
> Look at: `package.json`, `tsconfig.json` when project is initialized

## Theme Tokens

No centralized token system detected. This is a Three.js/WebXR game — visual design is driven by Three.js materials, textures, and scene graphs rather than a token-based theming system.

**Source:** `DESIGN_BRIEF.md §1` (read 2026-09-16)

## Build / Run Commands

> **(verify)** — No build configuration exists yet.
>
> Expected answers when this section is filled:
>
> - [ ] `npm run dev` / `npm run build` / `npm run preview`?
> - [ ] Any custom scripts for asset processing?
> - [ ] Development server configuration?
>
> Look at: `package.json:scripts` when project is initialized

## Naming Conventions (Observed) — vr-life

> **(verify)** — No source code exists; naming conventions TBD during planning.
>
> Expected answers when this section is filled:
>
> - [ ] File naming: PascalCase, camelCase, kebab-case?
> - [ ] Component naming: `*Dialog`, `*Modal`, `*Card`? (see DESIGN_BRIEF.md §2 for UI primitives)
> - [ ] Test file naming: `*.test.ts`, `*.spec.ts`, `__tests__/`?
> - [ ] Three.js convention: scene graph naming, material naming
>
> Look at: Source code once `vite`, `typescript`, and `three` are added

## API-Usage Patterns (Observed) — vr-life

> **(verify)** — No source code exists; API usage patterns TBD during planning.
>
> Expected answers when this section is filled:
>
> - [ ] Three.js import style: ESM `import * as THREE` or named imports?
> - [ ] State management: plain objects, Redux, Zustand, Jotai, or None?
> - [ ] Game loop: `requestAnimationFrame`, `THREE.Clock`, or custom?
> - [ ] Physics: custom, Cannon.js, Ammo.js, or Three.js built-in?
>
> Look at: `DESIGN_BRIEF.md §4` (movement), `DESIGN_BRIEF.md §1` (tech stack)

## File Organization (Observed) — vr-life

> **(verify)** — No source code exists; file organization TBD during planning.
>
> Expected answers when this section is filled:
>
> - [ ] Top-level `src/` structure?
> - [ ] How will Three.js scenes be organized?
> - [ ] Where will assets live?
> - [ ] How will game logic be separated from rendering?
>
> Look at: `DESIGN_BRIEF.md §4` (movement), `DESIGN_BRIEF.md §6` (world)

## Test Conventions (Observed)

> **(verify)** — No test framework or test files exist yet.
>
> Expected answers when this section is filled:
>
> - [ ] Testing framework: Vitest, Jest, Playwright?
> - [ ] Test file location: `__tests__/`, `*.test.ts`, `*.spec.ts`?
> - [ ] What should be tested? (movement logic, physics, UI components)
> - [ ] Unit vs. integration vs. E2E boundaries?
>
> Look at: `package.json:devDependencies` when project is initialized
