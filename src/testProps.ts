import * as THREE from 'three';
import { Prop, type PropSpec, type PropWorld } from './props';

// The test-space props: a basketball, a soccer ball, two small boxes, a
// barrel and a placeholder backpack near spawn, each with a home. Meshes
// simply mirror prop state every frame (position + visual spin); the grab
// system drives held and stowed positions, so no parent swapping here.

interface PropPlacement {
  spec: PropSpec;
  home: THREE.Vector3;
  mesh: THREE.Mesh;
}

const ballMaterial = new THREE.MeshLambertMaterial({ color: 0xd9822b });
const soccerMaterial = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xa0784a });
const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x5a6b7a });
const backpackMaterial = new THREE.MeshLambertMaterial({ color: 0x9b2c2c });

function placements(): PropPlacement[] {
  const out: PropPlacement[] = [];
  const add = (spec: PropSpec, mesh: THREE.Mesh, x: number, z: number): void => {
    mesh.name = spec.id;
    out.push({ spec, mesh, home: new THREE.Vector3(x, spec.radius, z) });
  };
  add(
    {
      id: 'basketball',
      radius: 0.12,
      mass: 0.6,
      restitution: 0.75,
      rollingFriction: 0.8,
      sizeClass: 'small',
      surface: 'wood',
    },
    new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), ballMaterial),
    0.8,
    0.6,
  );
  add(
    {
      id: 'soccerBall',
      radius: 0.11,
      mass: 0.43,
      restitution: 0.65,
      rollingFriction: 0.6,
      sizeClass: 'small',
      surface: 'leaves',
    },
    new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), soccerMaterial),
    -0.8,
    0.6,
  );
  add(
    {
      id: 'boxA',
      radius: 0.15,
      mass: 1.5,
      restitution: 0.2,
      rollingFriction: 6,
      sizeClass: 'small',
      surface: 'wood',
    },
    new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), boxMaterial),
    1.4,
    1.2,
  );
  add(
    {
      id: 'boxB',
      radius: 0.15,
      mass: 1.5,
      restitution: 0.2,
      rollingFriction: 6,
      sizeClass: 'small',
      surface: 'wood',
    },
    new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), boxMaterial),
    -1.4,
    1.2,
  );
  add(
    {
      id: 'barrel',
      radius: 0.3,
      mass: 8,
      restitution: 0.3,
      rollingFriction: 3,
      sizeClass: 'large',
      surface: 'metal',
    },
    new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 14), barrelMaterial),
    2.0,
    0.2,
  );
  add(
    {
      id: 'backpack',
      radius: 0.22,
      mass: 3,
      restitution: 0.15,
      rollingFriction: 8,
      sizeClass: 'large',
      important: true,
      surface: 'leaves',
    },
    new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.18), backpackMaterial),
    -2.0,
    0.2,
  );
  return out;
}

export interface TestProps {
  group: THREE.Group;
  /** Mirror prop state onto the meshes. Call after the props step. */
  update(dt: number): void;
}

const _spinAxis = new THREE.Vector3();
const _spinQuat = new THREE.Quaternion();

export function buildTestProps(scene: THREE.Scene, props: PropWorld): TestProps {
  const group = new THREE.Group();
  group.name = 'testProps';
  scene.add(group);
  const entries = placements().map(({ spec, mesh, home }) => {
    const prop = new Prop(spec, home);
    props.add(prop);
    group.add(mesh);
    mesh.position.copy(home);
    return { prop, mesh };
  });

  return {
    group,
    update(dt: number): void {
      for (const { prop, mesh } of entries) {
        mesh.position.copy(prop.position);
        const spin = prop.angularVelocity.length();
        if (prop.state === 'free' && spin > 1e-4) {
          _spinAxis.copy(prop.angularVelocity).divideScalar(spin);
          _spinQuat.setFromAxisAngle(_spinAxis, spin * dt);
          mesh.quaternion.premultiply(_spinQuat);
        }
      }
    },
  };
}
