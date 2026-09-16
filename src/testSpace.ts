import * as THREE from 'three';
import type { SurfaceTag } from './collision';

// Debug climbing volume for development: ground, walls at varied heights,
// ledges, overhangs, an angled face, and a launch gap. Built from primitives
// with a small set of shared flat materials — it exists to be moved in, not
// looked at. Every surface is a future push-interaction candidate, so there
// is no decorative-only geometry. No collision bodies here (dynamics land in
// Phase 1); this is scene-graph geometry only.

// One material per surface category. Shared instances keep the material
// count (and draw-call batching behaviour) small; the 72 fps floor is
// measured in this space. Every mesh carries a `userData.surface` tag: that
// is what makes it collidable (collision.ts) and gives it a slap sound.
const GROUND_COLOR = 0x4a5568;
const WALL_COLOR = 0x718096;
const LEDGE_COLOR = 0x2f855a;
const GAP_EDGE_COLOR = 0xc05621;

function box(
  name: string,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  surface: SurfaceTag,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.userData.surface = surface;
  return mesh;
}

export function buildTestSpace(scene: THREE.Scene): THREE.Group {
  void scene; // signature kept for future scene-context needs; group is self-contained
  const group = new THREE.Group();
  group.name = 'testSpace';

  const groundMaterial = new THREE.MeshLambertMaterial({ color: GROUND_COLOR });
  const wallMaterial = new THREE.MeshLambertMaterial({ color: WALL_COLOR });
  const ledgeMaterial = new THREE.MeshLambertMaterial({ color: LEDGE_COLOR });
  const gapEdgeMaterial = new THREE.MeshLambertMaterial({ color: GAP_EDGE_COLOR });

  // Lighting lives with the space: one directional key plus a modest fill so
  // no face reads as black from any approach angle.
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.name = 'testSpaceKeyLight';
  keyLight.position.set(4, 8, 6);
  group.add(keyLight, new THREE.AmbientLight(0xffffff, 0.45));

  // Ground: large flat plane at y=0.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMaterial);
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.userData.surface = 'ground';
  group.add(ground);

  // Wall bank at varied heights (2–6 m), arranged around the spawn area
  // (spawn faces -z from the origin).
  const wallA = box('wallA', 5, 3, 0.4, wallMaterial, -3, 1.5, -8, 'stone');
  const wallB = box('wallB', 4, 5, 0.4, wallMaterial, 2.5, 2.5, -11, 'stone');
  const wallC = box('wallC', 6, 2, 0.4, wallMaterial, 8, 1, -6, 'stone');
  const wallTall = box('wallTall', 4, 6, 0.4, wallMaterial, -8, 3, -4, 'stone');
  group.add(wallA, wallB, wallC, wallTall);

  // Ledges: protruding boxes at varied heights on the walls.
  const ledge1 = box('ledge1', 1.6, 0.25, 0.7, ledgeMaterial, -4, 1.2, -7.7, 'wood');
  const ledge2 = box('ledge2', 1.6, 0.25, 0.7, ledgeMaterial, -2, 2.2, -7.7, 'wood');
  const ledge3 = box('ledge3', 1.4, 0.25, 0.6, ledgeMaterial, 2.5, 3.2, -10.6, 'wood');
  const ledge4 = box('ledge4', 1.4, 0.25, 0.6, ledgeMaterial, -7.6, 2.0, -2.5, 'wood');
  group.add(ledge1, ledge2, ledge3, ledge4);

  // Overhangs: inverted/tilted boxes — the top face points partly at the
  // sky, so a climber works the underside lip.
  const overhang1 = box('overhang1', 2.4, 0.3, 1.8, wallMaterial, 0.5, 2.6, -6, 'stone');
  overhang1.rotation.x = Math.PI / 2 - 0.5; // ~29° past horizontal, lip toward spawn
  const overhang2 = box('overhang2', 2.0, 0.3, 1.6, wallMaterial, -6, 4.2, -6, 'stone');
  overhang2.rotation.x = Math.PI / 2 - 0.35;
  group.add(overhang1, overhang2);

  // Angled face: a steep slab to test diagonal footing.
  const angleFace = box('angleFace', 3, 0.25, 2.2, wallMaterial, 6, 2.2, -10, 'stone');
  angleFace.rotation.x = -1.05; // ~60° from flat
  group.add(angleFace);

  // Launch gap: two platforms with a ~1.5 m clear gap between inner edges
  // (a real vault, not a step); the right side sits slightly higher.
  const gapLeft = box('gapLeft', 2.2, 0.9, 2.2, gapEdgeMaterial, -1.85, 0.45, -3.5, 'metal');
  const gapRight = box('gapRight', 2.2, 1.1, 2.2, gapEdgeMaterial, 1.85, 0.55, -3.5, 'metal');
  group.add(gapLeft, gapRight);

  return group;
}
