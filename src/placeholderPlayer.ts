import * as THREE from 'three';
import { DEFAULT_APPEARANCE, type Appearance } from './appearance';
import { buildGorilla, setAppearance, type GorillaParts } from './gorilla';
import { tuning } from './movementTuning';

// The player rig: one root that owns the XR camera, both controller grips,
// and the gorilla body (first person: no head). The gorilla's hands are
// parented to the grip-space objects, which the WebXRManager updates from
// the input-source pose every frame: 1:1 passthrough, no smoothing. The
// body answers the hands through gorillaRig.ts (IK, lean, sag, gait).

export interface PlayerRig {
  /** The one movable root: owns the camera, both grips, and the body. */
  root: THREE.Group;
  /** The XR camera (head), child of root. */
  head: THREE.Camera;
  /** Carry wrapper at the torso position; grab.ts rolls it when lugging. */
  group: THREE.Group;
  gorilla: GorillaParts;
  appearance: Appearance;
  handLeft: THREE.Group;
  handRight: THREE.Group;
}

/** Change the player's look at runtime (purchases, unlocks). */
export function applyPlayerAppearance(rig: PlayerRig, appearance: Appearance): void {
  setAppearance(rig.gorilla, appearance);
  rig.appearance = appearance;
}

export function buildPlayer(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  appearance: Appearance = DEFAULT_APPEARANCE,
): PlayerRig {
  // Rig root ("dolly"): the XR manager composes the headset/controller poses
  // under the camera's parent, so one transform here moves everything.
  const root = new THREE.Group();
  root.name = 'playerRoot';
  root.position.y = -tuning.eyeHeightOffset; // virtual floor above the physical one
  root.add(camera);
  scene.add(root);

  const gorilla = buildGorilla(appearance, { firstPerson: true });
  const group = new THREE.Group();
  group.name = 'playerBody';
  group.add(gorilla.root);
  root.add(group);

  const [handLeft, handRight] = gorilla.hand;

  // Attach each hand group to its controller's grip space object.
  const grips: THREE.Object3D[] = [
    renderer.xr.getControllerGrip(0),
    renderer.xr.getControllerGrip(1),
  ];
  let unassigned = 0;
  for (let i = 0; i < grips.length; i++) {
    const grip = grips[i];
    // SAFETY: at runtime WebXRManager dispatches a plain { type, data: XRInputSource }
    // object on these exact Object3D instances (three 0.186, WebXRManager.js), so
    // routing through the EventTarget shape is sound; TS cannot check it because
    // Object3DEventMap omits 'connected'.
    (grip as unknown as EventTarget).addEventListener('connected', (event) => {
      const source = (event as unknown as { data: XRInputSource }).data;
      const hand =
        source.handedness === 'left'
          ? handLeft
          : source.handedness === 'right'
            ? handRight
            : unassigned++ === 0
              ? handRight // index-0 convention when handedness is missing
              : handLeft;
      hand.removeFromParent();
      grip.add(hand);
    });
    root.add(grip);
  }

  return { root, head: camera, group, gorilla, appearance, handLeft, handRight };
}
