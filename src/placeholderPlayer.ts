import * as THREE from 'three';

// Placeholder player: a knuckle-walker body stub plus always-visible hands
// and forearms that follow the XR controllers 1:1. Pose is pure passthrough
// — hand/forearm transforms come straight from the input-source grip pose
// each frame; no smoothing, no lerp, no offsets. No animation, no IK, no
// physics here (Phase 1 / Phase 3 own those).

export interface PlayerRig {
  /** Body root, static at spawn; the teleport rig (dev tools) moves this. */
  group: THREE.Group;
  handLeft: THREE.Group;
  handRight: THREE.Group;
}

const SKIN_COLOR = 0x2b2620;
const MATT_COLOR = 0x3a332a;

// One shared material per part category — draw-call discipline.
const skinMaterial = new THREE.MeshLambertMaterial({ color: SKIN_COLOR });
const matMaterial = new THREE.MeshLambertMaterial({ color: MATT_COLOR });

function buildHand(name: string): THREE.Group {
  const hand = new THREE.Group();
  hand.name = name;

  // Mitt: a flattened sphere reads as a fist from every angle. No finger
  // fidelity — the real hands arrive in Phase 3.
  const mitt = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMaterial);
  mitt.name = `${name}Mitt`;
  mitt.scale.set(1.15, 0.8, 1.35);
  hand.add(mitt);

  // Forearm: capsule from the wrist back toward the body along local +Z
  // (the grip pose points its -Z down the aim direction), so the hand
  // reads as attached to an arm rather than floating.
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.28, 4, 8), matMaterial);
  forearm.name = `${name}Forearm`;
  forearm.rotation.x = Math.PI / 2; // capsule axis (Y) -> Z
  forearm.position.z = 0.24;
  hand.add(forearm);

  return hand;
}

function buildBody(): THREE.Group {
  const body = new THREE.Group();
  body.name = 'playerBody';

  // Broad chest, low and forward of the camera (head sits at ~1.6 m), so the
  // stub reads as the player's own hunched torso and never covers the
  // forward view.
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.5), skinMaterial);
  chest.name = 'chest';
  chest.position.set(0, 0.95, -0.3);
  body.add(chest);

  // Small head stub, hunched forward — well below camera height.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinMaterial);
  head.name = 'headStub';
  head.scale.set(1.1, 0.9, 1.15);
  head.position.set(0, 1.22, -0.42);
  body.add(head);

  return body;
}

export function buildPlayer(scene: THREE.Scene, renderer: THREE.WebGLRenderer): PlayerRig {
  const group = buildBody();
  group.name = 'player';
  scene.add(group);

  const handLeft = buildHand('handLeft');
  const handRight = buildHand('handRight');

  // Attach each hand group to its controller's grip space object: the
  // WebXRManager updates those Object3Ds directly from the input-source
  // pose every frame, which is exactly the 1:1 passthrough this step owns.
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
    scene.add(grip);
  }

  return { group, handLeft, handRight };
}
