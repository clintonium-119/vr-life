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
