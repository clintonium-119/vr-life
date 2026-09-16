import * as THREE from 'three';
import { buildAtlasTexture, worldMaterial } from './atlas';
import { Chunk } from './chunk';
import { ChunkManager } from './chunkManager';
import { buildCivic } from './civic';
import { collidersFromGroup, type BoxCollider } from './collision';
import { buildCabin, buildForest } from './forest';
import { buildPrison, type PrisonDistrict } from './prison';
import { buildFarm } from './farm';
import { buildResidential } from './homeBlock';
import { addCatwalk, addWaterTower, planRoofConnectors, roofGraph } from './rooftops';
import { SCHOOL_BLOCK_Z, buildSchool } from './school';
import { buildTestSpace } from './testSpace';
import { buildTownCentre } from './townCentre';
import { PLACES, buildStreets, parseSpawn, type BuiltDistrict } from './townPlan';
import { tuning } from './movementTuning';

// World selection: `world=home` (default) is the whole town, spawning in the
// bedroom (or at `spawn=<place>` for measurement); `world=test` is the debug
// climbing volume. Districts become chunks; the chunk manager draws only
// what is near, interiors only when inside; every collider is always loaded.

export type WorldKind = 'home' | 'test';

export function parseWorld(query: string): WorldKind {
  return new URLSearchParams(query).get('world') === 'test' ? 'test' : 'home';
}

export interface World {
  kind: WorldKind;
  group: THREE.Group;
  colliders: BoxCollider[];
  /** Where the player's feet start (virtual floor point). */
  spawn: THREE.Vector3;
  spawnYaw: number;
  /** Prop id → ground point [x, y, z]; the prop rests its radius above it. */
  propHomes: Record<string, [number, number, number]>;
  /** A plane the auto-drive reports crossing (the front door), if any. */
  doorZ: number | null;
  chunks: ChunkManager;
  /** The prison (town only); its bars and gate are dynamic colliders. */
  prison: PrisonDistrict | null;
}

export const SKY_COLOR = 0x9fc5e8;

/** Fog from half the view distance to the view distance. */
export function fogDistances(viewDistanceM: number): [number, number] {
  return [viewDistanceM * 0.5, viewDistanceM];
}

const ROOF_GAP_M = 4;
const ROOF_RISE_M = 2.5;
const CATWALK_MAX_GAP_M = 45;

export function buildWorld(kind: WorldKind, scene: THREE.Scene, query = ''): World {
  if (kind === 'test') {
    const group = buildTestSpace(scene);
    scene.add(group);
    return {
      kind,
      group,
      colliders: collidersFromGroup(group),
      spawn: new THREE.Vector3(0, 0, 0),
      spawnYaw: 0,
      propHomes: {},
      doorZ: null,
      chunks: new ChunkManager(),
      prison: null,
    };
  }

  const material = worldMaterial(buildAtlasTexture());
  const residential = buildResidential();
  const prison = buildPrison();
  const districts: BuiltDistrict[] = [
    prison,
    buildStreets(),
    residential,
    buildTownCentre(),
    buildCivic(),
    buildSchool(),
    buildFarm(),
    ...buildForest(),
    buildCabin(),
  ];

  // Rooftop layer: the water tower hub plus catwalks where the route from the
  // house roofs to the office and hospital peaks is broken.
  const sky = new Chunk('skyways');
  const tower = addWaterTower(sky, 40, -40);
  const graph = roofGraph([...districts.flatMap((d) => d.roofs), tower], ROOF_GAP_M, ROOF_RISE_M);
  const connectors = [
    ...planRoofConnectors(graph, 'home', 'office', CATWALK_MAX_GAP_M),
    ...planRoofConnectors(graph, 'office', 'hospital', CATWALK_MAX_GAP_M),
  ];
  for (const c of connectors) addCatwalk(sky, c);
  const skyDistrict: BuiltDistrict = {
    name: 'skyways',
    chunk: sky,
    interiors: [],
    bounds: new THREE.Box3(),
    landmarks: {},
    roofs: [tower],
    climbAids: ['waterTower:ladder'],
  };
  districts.push(skyDistrict);

  const group = new THREE.Group();
  group.name = 'town';
  const chunks = new ChunkManager();
  const colliders: BoxCollider[] = [];
  let parts = 0;
  let vertices = 0;
  const place = (chunk: Chunk, interiorBounds?: THREE.Box3): void => {
    const built = chunk.build(material);
    group.add(built.mesh);
    colliders.push(...built.colliders);
    parts += built.partCount;
    vertices += built.vertexCount;
    const sphere = built.mesh.geometry.boundingSphere as THREE.Sphere;
    chunks.add({
      mesh: built.mesh,
      center: sphere.center.clone(),
      radius: sphere.radius,
      interiorBounds,
    });
  };
  for (const d of districts) {
    place(d.chunk);
    for (const i of d.interiors) place(i.chunk, i.bounds);
  }
  console.info(
    `[vr-life] world home: ${chunks.total} chunks, ${parts} parts, ${vertices} vertices, ${colliders.length} colliders, ${connectors.length} catwalks`,
  );

  // Fixed late afternoon: a warm low sun, a cooler sky/ground hemisphere,
  // no shadows (occlusion is baked). Fog in the sky colour hides chunk
  // culling at the view distance.
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.5);
  sun.name = 'sun';
  sun.position.set(30, 25, 40);
  group.add(new THREE.HemisphereLight(0xcfe3f5, 0x5e4b34, 0.9), sun);
  scene.add(group);
  scene.background = new THREE.Color(SKY_COLOR);
  const [near, far] = fogDistances(tuning.viewDistanceM);
  scene.fog = new THREE.Fog(SKY_COLOR, near, far);

  const spawnName = parseSpawn(query);
  const [sx, sy, sz] = PLACES[spawnName];
  const [bx, by, bz] = residential.house.backpackHome;
  return {
    kind,
    group,
    colliders,
    spawn: new THREE.Vector3(sx, sy, sz),
    spawnYaw: residential.house.spawnYaw,
    propHomes: {
      backpack: [bx, by, bz],
      basketball: [-3, 0, -6.5],
      soccerBall: [3, 0, -6.5],
      boxA: [7.5, 0, -5.5],
      boxB: [7.5, 0, -4.8],
      barrel: [8.8, 0, -7.5],
      gymBallA: [PLACES.gym[0] - 2, 0, SCHOOL_BLOCK_Z - 3],
      gymBallB: [PLACES.gym[0] - 2, 0, SCHOOL_BLOCK_Z + 3],
      gymSoccer: [PLACES.gym[0] - 6, 0, SCHOOL_BLOCK_Z],
    },
    doorZ: spawnName === 'bedroom' ? residential.house.door[2] : null,
    chunks,
    prison,
  };
}
