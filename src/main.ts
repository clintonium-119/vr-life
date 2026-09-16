import * as THREE from 'three';
import { devFlags } from './config';
import { buildTestSpace } from './testSpace';

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
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  100,
);
camera.position.set(0, 1.6, 2);

// Debug climbing volume (ground, walls, ledges, overhangs, launch gap);
// lighting lives inside the group.
scene.add(buildTestSpace(scene));

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
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
    const session = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
    });
    overlay.classList.add('hidden');
    renderer.xr.setSession(session);
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
