import * as THREE from 'three';
import { buildAtlasTexture, worldMaterial } from './atlas';
import { Chunk } from './chunk';
import { collidersFromGroup, type BoxCollider } from './collision';
import { addHomeBlock } from './homeBlock';
import { addHomeHouse } from './homeHouse';
import { buildTestSpace } from './testSpace';

// World selection: `world=home` (default) is the player's house and its
// street block, spawning in the bedroom; `world=test` is the debug
// climbing volume. Both build synchronously.

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
  partCount: number;
}

export function buildWorld(kind: WorldKind, scene: THREE.Scene): World {
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
      partCount: group.children.length,
    };
  }

  const chunk = new Chunk('homeBlock');
  const house = addHomeHouse(chunk, 0, 0);
  addHomeBlock(chunk, 0, 0);
  const built = chunk.build(worldMaterial(buildAtlasTexture()));
  console.info(
    `[vr-life] world home: ${built.partCount} parts, ${built.vertexCount} vertices, ` +
      `${built.colliders.length} colliders, atlas 2048² RGBA`,
  );
  const group = new THREE.Group();
  group.name = 'homeWorld';
  group.add(built.mesh);

  // Static light: one hemisphere, one shadowless sun. Occlusion is baked.
  const sky = new THREE.HemisphereLight(0xdfe9f3, 0x6b5a3e, 0.9);
  sky.name = 'sky';
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
  sun.name = 'sun';
  sun.position.set(30, 40, 20);
  group.add(sky, sun);
  scene.add(group);
  scene.background = new THREE.Color(0x9fc5e8);

  const [bx, by, bz] = house.backpackHome;
  return {
    kind,
    group,
    colliders: built.colliders,
    spawn: new THREE.Vector3(...house.spawn),
    spawnYaw: house.spawnYaw,
    propHomes: {
      backpack: [bx, by, bz],
      basketball: [-3, 0, -6.5],
      soccerBall: [3, 0, -6.5],
      boxA: [7.5, 0, -5.5],
      boxB: [7.5, 0, -4.8],
      barrel: [8.8, 0, -7.5],
    },
    doorZ: house.door[2],
    partCount: built.partCount,
  };
}
