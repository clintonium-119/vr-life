# vr-life

VR life-sim on Quest 3. WebXR `immersive-vr` app built with Vite,
TypeScript (strict), and Three.js.

## Quickstart

```sh
npm install
npm run dev        # local dev server; open on desktop or the headset
npm run build      # static build to dist/
npm run preview    # serve the production build locally
```

Other scripts:

- `npm run typecheck` — TypeScript strict check
- `npm run lint` — ESLint (typescript-eslint recommended)
- `npm test` — Vitest unit tests for the pure logic (`*.test.ts` next to the source)
- `npm run launch` — open the deployed site in Quest Browser over ADB

### Running on the headset

Open the dev server URL in a browser on the Quest (or on the LAN from the
headset), tap **Enter VR**, and grant the WebXR permission. A session
requests `immersive-vr` with the `local-floor` reference space (6DoF,
floor-anchored). On a desktop without an XR device the entry overlay shows
an unsupported-device fallback instead.

On-device debugging (inner and outer loops, DevTools, logs, traces):
see [docs/device-debugging.md](docs/device-debugging.md).

### Deploy and launch on the headset

Every push to `main` runs `.github/workflows/deploy-pages.yml`: typecheck,
lint, build, then deploy `dist/` to GitHub Pages at
<https://clintonium-119.github.io/vr-life/> (the Vite `base` is `/vr-life/`).
Pages is configured with "GitHub Actions" as the source.

With the headset on ADB (USB or `adb connect <headset-ip>`):

```sh
npm run launch     # opens the Pages URL in Quest Browser
```

For the perf harness on the shipped build, run the same intent with
`?dev=perf` appended to the URL. There is no QR step: open the Pages URL
once in Quest Browser and bookmark it.

### Dev flags

Append `?dev=1` (all dev flags) or `?dev=perf`, `?dev=tools`, `?dev=crowd`
(individual) to the URL. `crowd` adds five scripted gorillas for the
frame-cost check; `look=<palette>,<slotA>,<slotB>` (for example
`?look=3,cap,scarf`) previews a body colour and accessories. Flags work in every build, including the GitHub Pages deploy,
so the deployed artifact can be measured; they are off unless the URL asks.

With `?dev=tools` on a desktop browser (no headset), the desktop drive is
active: click the canvas to lock the pointer and look around with the
mouse, `J`/`K` swing the left/right hand through a stride, `Space` swings
both (a leap), `W`/`S` lengthen/shorten the stride, `F`/`G` hold the
left/right grip (the hand reaches forward; releasing the key throws). The
dev teleport is on the trigger. The strokes go through
the real hand anchors and body, so this exercises the movement model
without a headset. `&drive=auto` runs alternating strides for five seconds
after load, then grabs and throws the basketball (used by the host smoke test).

Movement feel knobs can be overridden at runtime with `?tune=k=v,k2=v2`
(for example `?tune=handStiffness=40,speedCap=16`); the knob list, units
and defaults live in `src/movementTuning.ts` and are documented in
`docs/feel-checklist.md`. Applied overrides are logged once at startup.
