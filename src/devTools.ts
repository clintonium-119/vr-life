import * as THREE from 'three';
import { tuning } from './movementTuning';
import type { PlayerRig } from './placeholderPlayer';

// Dev-only tools behind the `tools` URL flag: a teleport that moves the
// player rig root, and a hand-ray visualiser. One deletable module; nothing
// here is shipped behaviour. Everything it creates lives under one group so
// removal is a single removeFromParent().

/**
 * Visual length of a hand ray when it hits nothing, in metres. Phase 1's
 * contact tests can reuse this as the "reach" length for the same visual.
 */
export const HAND_RAY_LENGTH_M = 3;

const RAY_COLOR = 0x7fd7ff;

export interface DevTools {
  /** Call once per frame before render: recasts both hand rays. */
  update(): void;
  /** Group holding everything the tools created. */
  group: THREE.Group;
}

export function buildDevTools(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  rig: PlayerRig,
  target: THREE.Object3D,
  onTeleport?: () => void,
): DevTools {
  const group = new THREE.Group();
  group.name = 'devTools';
  rig.root.add(group);

  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const rayMaterial = new THREE.LineBasicMaterial({ color: RAY_COLOR });
  const rayGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  interface HandRay {
    controller: THREE.Object3D;
    line: THREE.Line;
    hit: THREE.Vector3 | null;
    hitPoint: THREE.Vector3;
  }
  const rays: HandRay[] = [0, 1].map((index) => {
    // targetRay-space object: the XR manager writes its local pose each
    // frame, so it must sit under the rig root like the grips do.
    const controller = renderer.xr.getController(index);
    group.add(controller);
    const line = new THREE.Line(rayGeometry, rayMaterial);
    line.name = `handRay${index}`;
    line.scale.z = HAND_RAY_LENGTH_M;
    controller.add(line);
    const ray: HandRay = { controller, line, hit: null, hitPoint: new THREE.Vector3() };
    // SAFETY: WebXRManager dispatches squeezestart on this exact Object3D;
    // Object3DEventMap does not declare it, hence the EventTarget shape.
    (controller as unknown as EventTarget).addEventListener('squeezestart', () => teleport(ray));
    return ray;
  });

  function cast(ray: HandRay): void {
    ray.controller.getWorldPosition(origin);
    ray.controller.getWorldDirection(direction).negate(); // Object3D forward is +Z; rays point -Z
    raycaster.set(origin, direction);
    const hits = raycaster.intersectObject(target, true);
    if (hits.length === 0) {
      ray.hit = null;
      ray.line.scale.z = HAND_RAY_LENGTH_M;
      return;
    }
    ray.hitPoint.copy(hits[0].point);
    ray.hit = ray.hitPoint;
    ray.line.scale.z = hits[0].distance;
  }

  function teleport(ray: HandRay): void {
    cast(ray);
    if (ray.hit === null) return;
    // Land the head over the hit: the camera's local x/z is the physical
    // head offset from the reference-space origin, so subtract it. The eye
    // offset keeps the virtual floor within hand reach.
    rig.root.position.set(
      ray.hit.x - camera.position.x,
      ray.hit.y - tuning.eyeHeightOffset,
      ray.hit.z - camera.position.z,
    );
    onTeleport?.();
  }

  return {
    group,
    update(): void {
      for (const ray of rays) cast(ray);
    },
  };
}
