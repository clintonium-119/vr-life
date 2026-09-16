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

Append `?dev=1` (all dev flags) or `?dev=perf`, `?dev=tools` (individual)
to the URL. Flags work in every build, including the GitHub Pages deploy,
so the deployed artifact can be measured; they are off unless the URL asks.
