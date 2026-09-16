import * as THREE from 'three';
import { devFlags } from './config';
import { buildTestSpace } from './testSpace';
import { buildPlayer } from './placeholderPlayer';
import { PerfSampler } from './perfStats';
import { buildPerfHud, type PerfHud } from './perfHud';
import { buildDevTools, type DevTools } from './devTools';
import { CollisionWorld, collidersFromGroup } from './collision';
import { buildLocomotion } from './locomotion';
import { buildMovementAudio } from './movementAudio';
import { buildDesktopDrive, type DesktopDrive } from './desktopDrive';
import { PropWorld } from './props';
import { buildTestProps } from './testProps';
import { buildGrab } from './grab';
import { tuning } from './movementTuning';
import { parseLook } from './appearance';
import { buildGorillaRig } from './gorillaRig';
import { buildGorillaCrowd, type GorillaCrowd } from './gorillaCrowd';

const container = document.getElementById('app') as HTMLDivElement;
const overlay = document.getElementById('entry-overlay') as HTMLDivElement;
const enterButton = document.getElementById('enter-vr') as HTMLButtonElement;
const statusLine = document.getElementById('entry-status') as HTMLParagraphElement;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);

// One camera for both desktop and XR. In XR the headset pose drives this
// camera, so it is positioned only for the pre-session desktop view.
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 1.6, 2);

// Debug climbing volume (ground, walls, ledges, overhangs, launch gap);
// lighting lives inside the group.
const testSpace = buildTestSpace(scene);
scene.add(testSpace);

// Placeholder player rig: one root owning the camera, both grips, and the
// body. Hands are parented to the XR grip-space objects, which the
// WebXRManager updates from the input-source pose every frame — that is the
// whole "driving": 1:1 passthrough, no per-frame pose code here.
const player = buildPlayer(scene, renderer, camera, parseLook(location.search));

// Movement: the collision world is every surface-tagged mesh; locomotion
// moves the rig root from hand pushes, gravity and contact.
const world = new CollisionWorld();
world.add(...collidersFromGroup(testSpace));
// Props: rigid spheres in the same collision world; the grab system holds,
// stows and throws them, and a holding hand cannot push.
const propWorld = new PropWorld();
const testProps = buildTestProps(scene, propWorld);
const grab = buildGrab(player, propWorld, tuning, renderer.xr);
const locomotion = buildLocomotion(player, world, tuning, (hand) => grab.handHolding(hand));
const audio = buildMovementAudio(locomotion);
// The gorilla answers the hands: IK arms, lean, sag, gait (after audio so
// its landed hook chains onto audio's).
const gorillaRig = buildGorillaRig(player, locomotion);
grab.events.grab = () => audio.catch();
const propEvents = {
  bounce: (_prop: unknown, speed: number, surface: Parameters<typeof audio.bounce>[1]) =>
    audio.bounce(speed, surface),
};
const playerPos = new THREE.Vector3();
renderer.domElement.addEventListener('pointerdown', () => audio.resume(), { once: true });

// Crowd (dev flag `crowd`): scripted gorillas for the frame-cost check.
const crowd: GorillaCrowd | null = devFlags.crowd ? buildGorillaCrowd(scene) : null;

// Dev tools (dev flag `tools`): teleport + hand rays. Never constructed
// without the flag.
const devTools: DevTools | null = devFlags.tools
  ? buildDevTools(renderer, camera, player, testSpace, () => locomotion.teleportReset())
  : null;
// Desktop drive (dev flag `tools`, desktop only): emulated hand strides so
// the movement model can be exercised in a browser without a headset.
const desktopDrive: DesktopDrive | null =
  devFlags.tools && !renderer.xr.isPresenting
    ? buildDesktopDrive(renderer, camera, player, locomotion, grab, propWorld)
    : null;

// Perf harness (dev flag `perf`): the sampler samples before the frame's
// work, the HUD updates after render so renderer.info is fresh. Present in
// every build; the URL flag is the only gate.
let perfSampler: PerfSampler | null = null;
let perfHud: PerfHud | null = null;
function startPerfHarness(sessionRateHz: number | undefined): void {
  perfHud?.dispose();
  // The camera-attached HUD quad reaches the render list because the camera
  // is in the scene graph via the player rig.
  perfSampler =
    sessionRateHz === undefined ? new PerfSampler() : new PerfSampler({ floorFps: sessionRateHz });
  perfHud = buildPerfHud(scene, camera, perfSampler, sessionRateHz, () => [
    `VEL ${locomotion.velocity.length().toFixed(1)} m/s ${
      locomotion.anchored ? 'HOLD' : locomotion.grounded ? 'GROUND' : 'AIR'
    }`,
  ]);
}
if (devFlags.perf) startPerfHarness(undefined);

let lastTime = 0;
renderer.setAnimationLoop((time: number) => {
  const dt = lastTime === 0 ? 0 : (time - lastTime) / 1000;
  lastTime = time;
  if (perfSampler !== null) perfSampler.sample(time);
  if (devTools !== null) devTools.update();
  if (desktopDrive !== null) desktopDrive.update(dt);
  grab.update(dt);
  locomotion.update(dt);
  gorillaRig.update(dt);
  if (crowd !== null) crowd.update(dt);
  propWorld.step(dt, world, tuning, propEvents, camera.getWorldPosition(playerPos));
  testProps.update(dt);
  audio.update();
  renderer.render(scene, camera);
  if (perfHud !== null) perfHud.update(time, renderer);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- WebXR session bootstrap -------------------------------------------------
// requestSession must run from a user gesture, hence the DOM entry overlay.

async function refreshSupportStatus(): Promise<boolean> {
  if (!navigator.xr) {
    statusLine.textContent =
      'WebXR is not available in this browser. Open the app in a headset browser (e.g. Quest Browser).';
    enterButton.disabled = true;
    return false;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-vr');
  if (!supported) {
    statusLine.textContent =
      'No immersive VR device found. Put on the headset (or open the app on the headset) and reload.';
    enterButton.disabled = true;
    return false;
  }
  statusLine.textContent = 'Headset ready.';
  enterButton.disabled = false;
  return true;
}

async function enterVR(): Promise<void> {
  try {
    if (!navigator.xr) throw new Error('WebXR not available');
    audio.resume(); // same gesture as the session request
    const session = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
    });
    overlay.classList.add('hidden');
    await renderer.xr.setSession(session);
    // The session's negotiated refresh rate is the real frame floor; rebuild
    // the sampler around it (undefined -> the default floor, HUD says so).
    if (devFlags.perf) startPerfHarness(session.frameRate ?? undefined);
    session.addEventListener('end', () => {
      overlay.classList.remove('hidden');
      void refreshSupportStatus();
    });
  } catch (error) {
    statusLine.textContent = `Could not start VR session: ${String(error)}`;
  }
}

enterButton.addEventListener('click', () => {
  void enterVR();
});

void refreshSupportStatus();

if (devFlags.perf || devFlags.tools) {
  console.info('[vr-life] dev flags enabled:', devFlags);
}
