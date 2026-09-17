# District budget

The frame floor is measured, not promised. This is the per-visible-set
budget the town must sit inside, with the numbers the first block
actually costs. "Visible set" means everything the renderer draws in one
frame from where the player stands: world chunks, props, the player's own
body, and any other gorillas.

## What is counted

- **Draw calls:** `renderer.info.render.calls` after render. On device this
  is both eyes (three.js renders the stereo pair); the perf HUD's CALLS line
  and the desktop drive's `calls N` log use the same number. The headless
  smoke is a single view and culls everything behind the camera, so its
  number is a sanity bound, not the device number.
- **Texture memory:** width × height × 4 bytes × 4/3 for mips (the perf
  HUD's MEM estimate uses the same rule).
- **Geometry memory:** attribute + index bytes (the HUD's `geo` figure).
- **Parts:** box parts per chunk; each part is one collider and one set of
  tiled faces in the merged mesh.

## Budget (proposal until the device measures it)

| Quantity                           | Budget   | Why                                                                                   |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| Draw calls, both eyes, visible set | ≤ 150    | leaves room for props, NPCs and effects under the Quest 3 browser's comfortable range |
| Texture memory, visible set        | ≤ 40 MiB | one 2048² atlas is 21 MiB with mips; a second atlas or a 4096² fits once              |
| Geometry memory, visible set       | ≤ 8 MiB  | merged boxes are cheap; this caps subdivision creep                                   |
| Parts per chunk                    | ≤ 400    | keeps the AO bake and collider scan trivial                                           |
| Chunk meshes visible               | ≤ 12     | Phase 5 culls chunks by distance; one material each                                   |

## First block: host measurements (2026-09-16, headless Chromium, single view)

| Quantity                                   | Measured   | Notes                                                        |
| ------------------------------------------ | ---------- | ------------------------------------------------------------ |
| Parts (house + block)                      | 215        | logged at startup by `world.ts`                              |
| Vertices (merged)                          | 44 100     | one chunk, one mesh, one material; ≈ 44 100 × 44 B ≈ 1.9 MiB |
| Colliders                                  | 197        | every solid part; decals excluded                            |
| Atlas                                      | 2048² RGBA | 16 MiB, ≈ 21 MiB with mips                                   |
| Draw calls at spawn (bedroom, single view) | 8          | chunk mesh + visible gorilla parts + props                   |
| Draw calls after the door run              | 3–5        | most of the block is behind the camera                       |

## Full town: host measurements per spawn (2026-09-16, headless single view)

Startup: 21 chunks (11 districts/skyways + 10 interiors); see the console
line `[vr-life] world home: …` for parts, vertices, colliders and catwalks.

| Spawn        | Chunks visible / total | Draw calls (single view) |
| ------------ | ---------------------- | ------------------------ |
| bedroom      | 12 / 21                | 8                        |
| officeRoof   | 10 / 21                | 6                        |
| hospitalRoof | 7 / 21                 | 5                        |

`npm run smoke:town` re-measures these and fails above 400 calls.

## Finished town: host measurements (2026-09-16, headless single view, `smoke:town`)

23 chunks (12 districts/skyways + 11 interiors), ~2700 parts, ~400k vertices,
~2600 colliders, 15 catwalks, 29 props, 19 NPCs (14 pedestrians, 2
shopkeepers, 3 teachers) plus up to 3 officers.

| Spawn              | Draw calls (single view) | NPCs visible |
| ------------------ | ------------------------ | ------------ |
| bedroom            | 26                       | 2            |
| officeRoof         | 34                       | 6            |
| hospitalRoof       | 6                        | 1            |
| school             | 15                       | 1            |
| farm               | 36                       | 2            |
| forest             | 44                       | 0            |
| grocery (day done) | 55                       | 3            |

Both eyes on device is roughly double, before frustum differences; the
budget is 150.

## Device measurements (final headset session)

| Quantity                                             | Measured | Notes                               |
| ---------------------------------------------------- | -------- | ----------------------------------- |
| Draw calls, both eyes, porch looking at the bus stop | __       | the worst view of the block         |
| Draw calls, both eyes, bedroom                       | __       |                                     |
| HUD MEM (geo / tex)                                  | __       |                                     |
| Frame floor sustained bedroom → bus stop             | __       | harness warning state must stay off |

## Rules that follow

- A district that breaks the budget is redesigned or cut, never "fixed later".
- Every new builder emits parts, not meshes; a new material is a budget decision.
- Interiors count against the budget only when visible (Phase 5's visibility strategy).
