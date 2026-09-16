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

### Running on the headset

Open the dev server URL in a browser on the Quest (or on the LAN from the
headset), tap **Enter VR**, and grant the WebXR permission. A session
requests `immersive-vr` with the `local-floor` reference space (6DoF,
floor-anchored). On a desktop without an XR device the entry overlay shows
an unsupported-device fallback instead.

Headset launch and on-device debugging workflows land in a later phase
step (GitHub Pages deploy + QR launch; metavr + Chrome remote debugging).

### Dev flags

Append `?dev=1` (all dev flags) or `?dev=perf`, `?dev=tools` (individual)
to the URL. Flags work in every build, including the GitHub Pages deploy,
so the deployed artifact can be measured; they are off unless the URL asks.
