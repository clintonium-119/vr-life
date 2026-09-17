import * as THREE from 'three';
import { PALETTE, buildAccessory, type Appearance } from './appearance';
import { loadSurfaceTexture } from './atlas';

// The gorilla, built from parametric primitives: barrel chest, heavy sloped
// shoulders, long thick forearms, a small rounded lower body and no legs
// (head, torso and arms, the way the reference game does it), brow ridge and
// sagittal crest, knuckle-walking posture. Silhouette first: nothing here
// that does not change the outline. Two materials per gorilla (fur, skin).
// Arms are pivot chains (shoulder → elbow → wrist) that the pose module
// rotates; the hand groups are built here but parented elsewhere (to the XR
// grips for the player), so their origin is the palm.

/** Proportions in metres; one table so the silhouette can be tuned. */
export const GORILLA_PROPORTIONS = {
  chestRadius: 0.3, // barrel chest, before the (1, 0.85, 0.9) squash
  bellyRadius: 0.22,
  shoulderWidth: 0.5,
  shoulderRadius: 0.13,
  upperArmRadius: 0.075,
  upperArmLength: 0.32,
  forearmRadius: 0.085, // thicker than the upper arm on purpose
  forearmLength: 0.38,
  handMitt: 0.065,
  hipsRadius: 0.17,
  hipsBelowChest: 0.42,
  headRadius: 0.14,
  headAboveChest: 0.24,
  headForward: 0.12,
};

export interface GorillaParts {
  /** Placed at the torso position; yaw applied here. */
  root: THREE.Group;
  /** Pivot at the shoulder line; lean and sag rotate this. */
  torso: THREE.Group;
  chest: THREE.Mesh;
  belly: THREE.Mesh;
  hips: THREE.Mesh;
  /** Null in first person (the camera is the head). */
  head: THREE.Group | null;
  /** Where head accessories attach (hidden in first person). */
  headAnchor: THREE.Object3D;
  /** Where the scarf attaches; visible to the player. */
  neckAnchor: THREE.Object3D;
  shoulder: [THREE.Object3D, THREE.Object3D];
  upperArm: [THREE.Mesh, THREE.Mesh];
  elbow: [THREE.Object3D, THREE.Object3D];
  forearm: [THREE.Mesh, THREE.Mesh];
  /** Palm-origin hand groups (mitt, knuckles, thumb). */
  hand: [THREE.Group, THREE.Group];
  furMaterial: THREE.MeshLambertMaterial;
  skinMaterial: THREE.MeshLambertMaterial;
}

export interface GorillaOptions {
  /** Omit the head: the player's camera is there. */
  firstPerson?: boolean;
}

const SKIN_COLOR = 0x3a302a;
const P = GORILLA_PROPORTIONS;

// One fur map and one skin map shared by every gorilla; the material colour
// tints them. Loaded lazily so unit tests never touch the loader.
let furMap: THREE.Texture | null = null;
let skinMap: THREE.Texture | null = null;
function maps(): { fur: THREE.Texture | null; skin: THREE.Texture | null } {
  if (typeof document === 'undefined') return { fur: null, skin: null };
  furMap ??= loadSurfaceTexture('fur', 2);
  skinMap ??= loadSurfaceTexture('skin', 2);
  return { fur: furMap, skin: skinMap };
}

function buildHand(name: string, side: number, skin: THREE.Material): THREE.Group {
  const hand = new THREE.Group();
  hand.name = name;
  // Mitt: flattened sphere reads as a fist from every angle.
  const mitt = new THREE.Mesh(new THREE.SphereGeometry(P.handMitt, 12, 10), skin);
  mitt.name = `${name}Mitt`;
  mitt.scale.set(1.15, 0.75, 1.3);
  hand.add(mitt);
  // Four knuckle bumps along the leading edge (-Z is the aim direction).
  for (let k = 0; k < 4; k++) {
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), skin);
    knuckle.name = `${name}Knuckle${k}`;
    knuckle.position.set((k - 1.5) * 0.028, 0.02, -P.handMitt * 1.15);
    hand.add(knuckle);
  }
  // Thumb: short capsule on the inner side.
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.04, 3, 6), skin);
  thumb.name = `${name}Thumb`;
  thumb.position.set(-side * P.handMitt * 1.1, -0.01, -0.02);
  thumb.rotation.z = side * 0.9;
  thumb.rotation.x = -0.6;
  hand.add(thumb);
  return hand;
}

function buildHead(fur: THREE.Material, skin: THREE.Material): THREE.Group {
  const head = new THREE.Group();
  head.name = 'head';
  const skull = new THREE.Mesh(new THREE.SphereGeometry(P.headRadius, 14, 12), fur);
  skull.name = 'skull';
  skull.scale.set(0.95, 1, 1.1);
  head.add(skull);
  // Sagittal crest: a ridge along the top.
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, P.headRadius * 1.6), fur);
  crest.name = 'crest';
  crest.position.set(0, P.headRadius * 0.85, -0.02);
  head.add(crest);
  // Brow ridge: a bar across the front, above the face.
  const brow = new THREE.Mesh(new THREE.BoxGeometry(P.headRadius * 1.5, 0.05, 0.09), fur);
  brow.name = 'brow';
  brow.position.set(0, 0.04, -P.headRadius * 0.95);
  head.add(brow);
  // Muzzle: skin, low and forward.
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(P.headRadius * 0.55, 10, 8), skin);
  muzzle.name = 'muzzle';
  muzzle.scale.set(1.2, 0.8, 0.9);
  muzzle.position.set(0, -0.05, -P.headRadius * 0.95);
  head.add(muzzle);
  return head;
}

export function buildGorilla(appearance: Appearance, options: GorillaOptions = {}): GorillaParts {
  const { fur, skin } = maps();
  const furMaterial = new THREE.MeshLambertMaterial({
    color: PALETTE[appearance.bodyColor] ?? PALETTE[0],
    map: fur,
  });
  const skinMaterial = new THREE.MeshLambertMaterial({ color: SKIN_COLOR, map: skin });

  const root = new THREE.Group();
  root.name = 'gorilla';
  const torso = new THREE.Group();
  torso.name = 'torso';
  root.add(torso);

  // Barrel chest hung below the shoulder line, squashed a little.
  const chest = new THREE.Mesh(new THREE.SphereGeometry(P.chestRadius, 16, 12), furMaterial);
  chest.name = 'chest';
  chest.scale.set(1, 0.85, 0.9);
  chest.position.set(0, -P.chestRadius * 0.75, 0);
  torso.add(chest);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(P.bellyRadius, 14, 10), furMaterial);
  belly.name = 'belly';
  belly.scale.set(1, 0.8, 0.9);
  belly.position.set(0, -P.hipsBelowChest * 0.7, 0.03);
  torso.add(belly);
  const hips = new THREE.Mesh(new THREE.SphereGeometry(P.hipsRadius, 12, 10), furMaterial);
  hips.name = 'hips';
  hips.scale.set(1, 0.8, 0.9);
  hips.position.set(0, -P.hipsBelowChest, 0.06);
  torso.add(hips);

  const neckAnchor = new THREE.Object3D();
  neckAnchor.name = 'neckAnchor';
  neckAnchor.position.set(0, 0.02, -0.02);
  torso.add(neckAnchor);
  const headAnchor = new THREE.Object3D();
  headAnchor.name = 'headAnchor';
  headAnchor.position.set(0, P.headAboveChest, -P.headForward);
  torso.add(headAnchor);

  let head: THREE.Group | null = null;
  if (options.firstPerson !== true) {
    head = buildHead(furMaterial, skinMaterial);
    head.rotation.x = 0.25; // hunched, looking slightly down
    headAnchor.add(head);
  } else {
    headAnchor.visible = false;
  }

  const shoulder: THREE.Object3D[] = [];
  const upperArm: THREE.Mesh[] = [];
  const elbow: THREE.Object3D[] = [];
  const forearm: THREE.Mesh[] = [];
  const hand: THREE.Group[] = [];
  for (const [i, side] of [-1, 1].entries()) {
    const label = side < 0 ? 'Left' : 'Right';
    const pivot = new THREE.Object3D();
    pivot.name = `shoulder${label}`;
    pivot.position.set((side * P.shoulderWidth) / 2, 0, 0);
    torso.add(pivot);
    // Heavy sloped shoulder mass sits on the torso, not on the pivot chain.
    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(P.shoulderRadius, 12, 10), furMaterial);
    deltoid.name = `deltoid${label}`;
    deltoid.scale.set(1, 0.85, 1);
    deltoid.position.copy(pivot.position).add(new THREE.Vector3(side * 0.02, 0.03, 0));
    torso.add(deltoid);

    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(P.upperArmRadius, P.upperArmLength - P.upperArmRadius, 4, 8),
      furMaterial,
    );
    upper.name = `upperArm${label}`;
    upper.position.y = -P.upperArmLength / 2;
    pivot.add(upper);

    const elbowPivot = new THREE.Object3D();
    elbowPivot.name = `elbow${label}`;
    elbowPivot.position.y = -P.upperArmLength;
    pivot.add(elbowPivot);

    const lower = new THREE.Mesh(
      new THREE.CapsuleGeometry(P.forearmRadius, P.forearmLength - P.forearmRadius, 4, 8),
      furMaterial,
    );
    lower.name = `forearm${label}`;
    lower.position.y = -P.forearmLength / 2;
    elbowPivot.add(lower);

    hand.push(buildHand(`hand${label}`, side, skinMaterial));

    shoulder.push(pivot);
    upperArm.push(upper);
    elbow.push(elbowPivot);
    forearm.push(lower);
    void i;
  }

  const parts: GorillaParts = {
    root,
    torso,
    chest,
    belly,
    hips,
    head,
    headAnchor,
    neckAnchor,
    shoulder: [shoulder[0], shoulder[1]],
    upperArm: [upperArm[0], upperArm[1]],
    elbow: [elbow[0], elbow[1]],
    forearm: [forearm[0], forearm[1]],
    hand: [hand[0], hand[1]],
    furMaterial,
    skinMaterial,
  };
  setAppearance(parts, appearance);
  return parts;
}

/** Recolour the fur and rebuild the two accessory slots. */
export function setAppearance(parts: GorillaParts, appearance: Appearance): void {
  parts.furMaterial.color.set(PALETTE[appearance.bodyColor] ?? PALETTE[0]);
  for (const anchor of [parts.headAnchor, parts.neckAnchor]) {
    for (const child of [...anchor.children]) {
      if (child.userData.accessory === true) anchor.remove(child);
    }
  }
  for (const kind of appearance.accessories) {
    const built = buildAccessory(kind);
    if (built === null) continue;
    built.object.userData.accessory = true;
    (built.attachesTo === 'head' ? parts.headAnchor : parts.neckAnchor).add(built.object);
  }
}

/** Every mesh in the gorilla, including the detached hands. */
export function gorillaMeshes(parts: GorillaParts): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const collect = (o: THREE.Object3D): void => {
    o.traverse((c) => {
      if ((c as THREE.Mesh).isMesh === true) out.push(c as THREE.Mesh);
    });
  };
  collect(parts.root);
  for (const h of parts.hand) collect(h);
  return out;
}
