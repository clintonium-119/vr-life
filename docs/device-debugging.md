# Device debugging runbook

Two loops, both against a real Meta Quest 3. The inner loop is for
iteration (seconds per edit). The outer loop is for measurement: the frame
floor is judged on the GitHub Pages build, never on the dev server.

Two tool halves: plain ADB plus Chrome remote debugging for console,
network, and frame inspection; and metavr (Meta's Quest CLI) for device
management, screenshots, and Perfetto traces on hosts it supports. On Linux
metavr has no binary, so the ADB equivalents below are the primary path.

## 0. One-time setup

1. Enable Developer Mode on the headset (Meta Horizon phone app → the
   headset → Headset settings → Developer Mode) and accept the USB debugging
   prompt inside the headset the first time a host connects.
2. Install Android platform tools (`adb`). Verify:

   ```sh
   adb devices          # the headset serial should be listed as "device"
   ```

3. Optional WiFi ADB (after one USB connection):

   ```sh
   adb tcpip 5555
   adb connect <headset-ip>:5555
   ```

   `adb reverse` works over a WiFi ADB connection as well as USB (verify on
   first use; if it does not, fall back to USB for the inner loop).

## 1. Inner loop: dev server on the headset

```sh
npm run dev -- --host          # Vite dev server, default port 5173
adb reverse tcp:5173 tcp:5173  # headset's localhost:5173 -> this machine
```

Open `http://localhost:5173/?dev=perf,tools` in Quest Browser. `localhost`
is a secure context, so WebXR works over plain http here. Vite's hot-reload
websocket uses the same port as the dev server, so it passes through the
same reversal; an edit should appear on the headset in a few seconds without
a manual reload. If it does not, set `server.hmr.port` in `vite.config.ts`
to the reversed port.

## 2. Chrome DevTools against Quest Browser

1. On the PC, open `chrome://inspect/#devices` in Chrome (or Chromium).
2. The headset appears with its open Quest Browser tabs; click **inspect**
   on the app's tab.
3. Console, Network, Performance, and Memory panels all work against the
   running WebXR page. The perf HUD's fps line should agree with the
   Performance panel's frame timing.

`renderer.info.render.calls` (the HUD's CALLS line) counts the stereo pair,
so every draw-call number in this project is per frame, both eyes. Later
phases' budgets use the same convention.

## 3. Logs, screenshots, and traces over ADB (Linux primary path)

```sh
# Console + browser logs (Quest Browser logs through chromium's tag)
adb logcat -v time chromium:I '*:S'

# Everything, when hunting a crash
adb logcat -v time

# Screenshot to the current directory
adb exec-out screencap -p > shot.png

# Screen recording (max ~3 min), then pull it
adb shell screenrecord /sdcard/rec.mp4
adb pull /sdcard/rec.mp4

# Perfetto trace, 10 s, scheduling + gfx + frequency; open in ui.perfetto.dev
adb shell perfetto -o /data/misc/perfetto-traces/trace.pftrace -t 10s sched freq gfx
adb pull /data/misc/perfetto-traces/trace.pftrace
```

Take a screenshot while the headset is worn (or with the proximity sensor
covered), otherwise the display is asleep and the capture is black.

## 4. metavr (macOS and Windows hosts)

`@meta-quest/metavr` 1.3.2 publishes binaries for `darwin-arm64`,
`darwin-x64`, and `win32-x64` only. On those hosts:

```sh
npx metavr --help
```

Its top-level command groups (from the package README at 1.3.2): `device`,
`app`, `capture`, `files`, `log`, `shell`, `perf`, `docs`, `asset`, `adb`,
`mcp`. Subcommand syntax was not verified in this project because the CLI
does not run on the Linux development machine. Copy exact invocations from
`metavr <group> --help` on a supported host before adding them here.

## 5. Outer loop: Pages build (measurement)

```sh
git push origin main            # CI: typecheck, lint, test, build, deploy
npm run launch                  # opens https://clintonium-119.github.io/vr-life/ in Quest Browser
```

For the harness on the shipped build, launch with the flag appended:

```sh
adb shell am start -a android.intent.action.VIEW -d 'https://clintonium-119.github.io/vr-life/?dev=perf'
```

If the headset asks which app should open the link, or nothing opens, add
the browser package to the intent and record it here:

```sh
adb shell am start -a android.intent.action.VIEW -d <url> com.oculus.browser
```

Attach DevTools as in section 2. This is the build the Phase 0 Definition of
Done is measured on.

## 6. Host smoke test (no headset)

```sh
npm run build
npm run preview &          # production build on http://localhost:4173/vr-life/
npm run smoke              # node scripts/smoke.mjs <url> 9
npm run smoke:crowd        # same with ?dev=crowd and a --max-calls 400 budget
```

`scripts/smoke.mjs` opens the URL in headless Chromium over the DevTools
protocol, streams the console for nine real seconds (virtual-time budgets do
not drive `requestAnimationFrame` under SwiftShader), and exits non-zero if
the rig did not move at least 1 m or anything threw. It exercises the
movement code path with the desktop drive's auto strides; it is not a feel
test.

## Timing targets

| Loop  | Target                                              | Measured         |
| ----- | --------------------------------------------------- | ---------------- |
| Inner | < ~10 s edit → visible on headset                   | not yet measured |
| Outer | < ~2 min push → live → launched → DevTools attached | not yet measured |
