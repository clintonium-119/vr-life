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

- Linter: ESLint 10 flat config (`eslint.config.js`): `@eslint/js` recommended + `typescript-eslint` recommended; `no-unused-vars` with `^_` arg ignore.
- Formatter: Prettier 3 (`.prettierrc`: single quotes, trailing commas, print width 100). `npx prettier --check src` is part of the pre-commit routine; not yet a CI step.
- TypeScript 6, `strict: true`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax`, `moduleResolution: bundler`, types `vite/client` + `webxr` (`tsconfig.json`).

**Source:** `package.json`, `eslint.config.js`, `.prettierrc`, `tsconfig.json` (read 2026-09-16)

## Theme Tokens

No centralized token system detected. This is a Three.js/WebXR game — visual design is driven by Three.js materials, textures, and scene graphs rather than a token-based theming system.

**Source:** `DESIGN_BRIEF.md §1` (read 2026-09-16)

## Build / Run Commands

- `npm run dev` — Vite dev server (add `-- --host` for LAN / `adb reverse` use).
- `npm run build` — static build to `dist/` with `base: '/vr-life/'` (GitHub Pages sub-path).
- `npm run preview` — serve the production build locally.
- `npm run typecheck` / `npm run lint` / `npm test` (Vitest, `vitest run`) / `npm run test:watch`.
- `npm run launch` — `adb shell am start -a android.intent.action.VIEW -d https://clintonium-119.github.io/vr-life/`.
- CI: `.github/workflows/deploy-pages.yml` on push to `main`: typecheck, lint, test, build, deploy to Pages.

**Source:** `package.json:scripts`, `vite.config.ts`, `.github/workflows/deploy-pages.yml` (read 2026-09-16)

## Naming Conventions (Observed) — vr-life

- Files: camelCase modules under `src/` (`perfStats.ts`, `perfHud.ts`, `placeholderPlayer.ts`, `testSpace.ts`, `devTools.ts`, `config.ts`).
- Tests: `*.test.ts` colocated next to the source (`src/config.test.ts`, `src/perfStats.test.ts`).
- Scene-side modules export a `buildX(...)` factory returning a plain object with `update`/`dispose` (`buildPerfHud`, `buildPlayer`, `buildDevTools`, `buildTestSpace`); pure-logic modules export classes or functions (`PerfSampler`, `parseDevFlags`).
- Scene graph: every `Object3D` gets a `name` (`playerRoot`, `handLeft`, `perfHudQuad`, `testSpace`, `wallA`).
- Constants: `SCREAMING_SNAKE` module-level with a unit suffix where physical (`EYE_HEIGHT_OFFSET_M`, `HAND_RAY_LENGTH_M`).
- Docs: `docs/*.md` kebab-case.

**Source:** `src/*.ts` (read 2026-09-16)

## API-Usage Patterns (Observed) — vr-life

- Three.js: `import * as THREE from 'three'` everywhere; three 0.186 with `@types/three`.
- Game loop: `renderer.setAnimationLoop((time) => ...)` (the XR-aware loop); the `time` argument feeds the perf sampler.
- WebXR: `navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local-floor'] })` from a user gesture; `renderer.xr.setSession`; controllers via `renderer.xr.getControllerGrip(i)` / `getController(i)`; XR events reached through an `EventTarget` cast with a `SAFETY:` comment.
- State: plain objects and module-level frozen config (`devFlags`); no state library.
- Pure logic vs. scene split: math/state modules are three-free or `three`-math-only so Vitest runs them in Node; anything touching the renderer/DOM stays on-device-validated.
- Dev tooling: gated by `?dev=` URL flags in every build (never `import.meta.env`); `globalThis.location?.search ?? ''` so modules import under Node.
- Physics: custom kinematic controller (decided in the Phase 1 plan); no engine.

**Source:** `src/main.ts`, `src/config.ts`, `src/placeholderPlayer.ts` (read 2026-09-16)

## File Organization (Observed) — vr-life

- Flat `src/` — one module per concern, no sub-folders yet (`main.ts` bootstrap; `config.ts` flags; `testSpace.ts` world; `placeholderPlayer.ts` rig; `perfStats.ts`/`perfHud.ts` harness; `devTools.ts` dev tools). Add folders only when a concern grows past a handful of files.
- Scene-side modules build a `THREE.Group` and return it (or a `buildX` object); `main.ts` is the only place that composes them and owns the animation loop.
- Pure logic (math, state machines, parsers) is kept in its own three-free module so Vitest can import it; rendering stays in the scene-side module.
- No asset directory yet (primitives + procedural materials); `docs/` holds runbooks; `.github/workflows/` holds CI; `dist/` is build output (git-ignored).

**Source:** `src/`, `docs/`, `.gitignore` (read 2026-09-16)

## Test Conventions (Observed)

- Framework: Vitest (`npm test` → `vitest run`, Node environment, no jsdom). Tests import pure modules only; anything needing `window`/WebGL is on-device validated.
- Location/naming: `*.test.ts` colocated with the source (`src/config.test.ts`, `src/perfStats.test.ts`).
- Style: `describe`/`it` with `expect`; small helpers inside the test file (e.g. a `feed()` that drives a sampler); assert on behaviour, one concern per `it`.
- What is tested: dev-flag parsing, frame-time window math and the warning state machine (the frame floor is the core constraint), and from Phase 1 the movement math (collision, body dynamics, hand anchors, tuning overrides).
- Boundaries: unit tests for pure logic; a documented headless-Chromium smoke command for host integration; the Quest 3 Definition-of-Done checklist for everything visual/feel. No e2e framework.

**Source:** `package.json`, `src/*.test.ts` (read 2026-09-16)
