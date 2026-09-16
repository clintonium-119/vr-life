import * as THREE from 'three';
import { PALETTE, type Accessory, type Appearance } from './appearance';
import { buildGorilla, type GorillaParts } from './gorilla';
import { advancePose, makePose, type MotionState, type Pose } from './gorillaPose';
import { applyGorillaPose, yawFromForward } from './gorillaRig';
import { tuning, type MovementTuning } from './movementTuning';

// Dev flag `crowd`: a handful of third-person gorillas walking small circles
// and idling, driven by the same pose module as the player, so the frame
// cost of several bodies in scene is measurable. Scripted motion only: no
// behaviour, no shared state between gorillas.

const RING_RADIUS_M = 3;
const WALK_SPEED = 1.5;
const WALK_SECONDS = 4;
const IDLE_SECONDS = 2;
const CIRCLE_RADIUS_M = 1.2;
const ACCESSORY_CYCLE: Accessory[] = ['none', 'cap', 'band', 'scarf'];

interface CrowdGorilla {
  parts: GorillaParts;
  pose: Pose;
  state: MotionState;
  clock: number;
  centre: THREE.Vector3;
  angle: number;
  hands: [THREE.Vector3, THREE.Vector3];
}

export interface GorillaCrowd {
  group: THREE.Group;
  update(dt: number): void;
}

const _fwd = new THREE.Vector3();
const _yaw = new THREE.Quaternion();
const _shoulder = new THREE.Vector3();
const _swing = new THREE.Vector3();

export function buildGorillaCrowd(
  scene: THREE.Scene,
  count = 5,
  t: MovementTuning = tuning,
): GorillaCrowd {
  const group = new THREE.Group();
  group.name = 'gorillaCrowd';
  scene.add(group);

  const members: CrowdGorilla[] = [];
  for (let i = 0; i < count; i++) {
    const appearance: Appearance = {
      bodyColor: i % PALETTE.length,
      accessories: [ACCESSORY_CYCLE[i % 4], ACCESSORY_CYCLE[(i + 2) % 4]],
    };
    const parts = buildGorilla(appearance);
    parts.root.name = `crowdGorilla${i}`;
    group.add(parts.root);
    for (const h of parts.hand) parts.root.add(h); // hands are scripted, so they live under the root
    const a = (i / count) * Math.PI * 2;
    members.push({
      parts,
      pose: makePose(),
      state: { velocity: new THREE.Vector3(), grounded: true, landingImpulse: 0 },
      clock: i * 1.3,
      centre: new THREE.Vector3(Math.cos(a) * RING_RADIUS_M, 0, Math.sin(a) * RING_RADIUS_M - 4),
      angle: a,
      hands: [new THREE.Vector3(), new THREE.Vector3()],
    });
  }

  const torsoHeight = t.torsoBelowHeadM + 0.45; // shoulder line above the floor, standing hunched

  return {
    group,
    update(dt: number): void {
      for (const m of members) {
        m.clock = (m.clock + dt) % (WALK_SECONDS + IDLE_SECONDS);
        const walking = m.clock < WALK_SECONDS;
        const omega = WALK_SPEED / CIRCLE_RADIUS_M;
        if (walking) m.angle += omega * dt;
        const root = m.parts.root;
        root.position.set(
          m.centre.x + Math.cos(m.angle) * CIRCLE_RADIUS_M,
          torsoHeight,
          m.centre.z + Math.sin(m.angle) * CIRCLE_RADIUS_M,
        );
        // Tangent of the circle is the facing and the velocity.
        _fwd.set(-Math.sin(m.angle), 0, Math.cos(m.angle));
        m.state.velocity.copy(_fwd).multiplyScalar(walking ? WALK_SPEED : 0);
        root.quaternion.copy(yawFromForward(_fwd, _yaw));
        advancePose(m.pose, m.state, dt, t);

        // Knuckle-walk hand targets: below and ahead of each shoulder, swinging
        // in anti-phase with the legs.
        root.updateWorldMatrix(true, false);
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          const phase = m.pose.gaitPhase + (i === 0 ? Math.PI : 0);
          const stride = walking ? Math.sin(phase) * 0.25 : 0;
          _swing
            .set(side * (t.shoulderWidthM / 2 + 0.05), -0.62, -0.35 + stride)
            .applyQuaternion(root.quaternion);
          _shoulder.copy(root.position).add(_swing);
          // Hands rest on the floor (world y ≈ mitt radius) while walking.
          _shoulder.y = Math.max(
            0.07,
            _shoulder.y + (walking ? Math.max(0, Math.cos(phase)) * 0.12 : 0),
          );
          m.hands[i].copy(_shoulder);
          m.parts.hand[i].position
            .copy(_shoulder)
            .sub(root.position)
            .applyQuaternion(_yaw.copy(root.quaternion).invert());
          m.parts.hand[i].quaternion.copy(root.quaternion).invert().multiply(root.quaternion); // identity in root space
        }
        applyGorillaPose(m.parts, m.pose, m.hands, t);
      }
    },
  };
}
