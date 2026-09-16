import * as THREE from 'three';
import type { Grab } from './grab';
import type { Locomotion } from './locomotion';
import type { PlayerRig } from './placeholderPlayer';
import type { PropWorld } from './props';

// Dev-only desktop drive (dev flag `tools`, no XR session): pointer-lock mouse
// look stands in for turning your body, and keys swing the real hand groups
// through a scripted stride so the stroke goes through the real anchors and
// body. J/K = left/right stride, Space = both (leap), W/S = stride length,
// F/G = hold the left/right grip (release throws), a held grab key reaches
// the hand forward. `?drive=auto` runs alternating strides and then grabs
// and throws the basketball (the host smoke test). Inert once an XR session
// starts. One deletable module.

// Right hand at rest, camera-yaw space: hanging at hip height (the eye sits
// ~1.6 m above the physical floor on the desktop camera).
const REST_LOCAL = new THREE.Vector3(0.25, -0.6, -0.3);
const REACH_FORWARD_M = 0.3;
const REACH_DOWN_M = 0.6; // from hip to below the virtual floor (eye offset 0.5)
const LIFT_M = 0.15;
const PHASE_REACH_S = 0.12;
const REACH_GRACE_S = 0.05; // one more beat for the anchor to register
const PHASE_DRAG_S = 0.25;
const PHASE_LIFT_S = 0.08;
const LOOK_SENSITIVITY = 0.002;
const AUTO_STRIDE_PERIOD_S = 0.5;
const AUTO_DURATION_S = 5;
const AUTO_GRAB_AT_S = 6;
const AUTO_THROW_AT_S = 6.6;
const REACH_GRAB_M = 0.45;
const LOG_PERIOD_S = 1;

type Phase = 'rest' | 'reach' | 'drag' | 'lift' | 'grabReach' | 'grabTo' | 'throw';

interface Hand {
  group: THREE.Object3D;
  side: number; // -1 left, +1 right
  phase: Phase;
  elapsed: number;
  dragDir: THREE.Vector3;
  strideLength: number;
  /** World-space target for the auto grab. */
  grabTarget: THREE.Vector3 | null;
}

export interface DesktopDrive {
  update(dt: number): void;
  /** HUD text: velocity and contact state. */
  statusLine(): string;
}

const _yaw = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _rest = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _step = new THREE.Vector3();

export function buildDesktopDrive(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  rig: PlayerRig,
  locomotion: Locomotion,
  grab: Grab,
  props: PropWorld,
): DesktopDrive {
  let active = !renderer.xr.isPresenting;
  renderer.xr.addEventListener('sessionstart', () => {
    active = false;
  });

  // The hands only attach to the grips when a controller connects; on the
  // desktop they hang off the rig root and this module positions them.
  rig.root.add(rig.handLeft, rig.handRight);
  const hands: Hand[] = [
    {
      group: rig.handLeft,
      side: -1,
      phase: 'rest',
      elapsed: 0,
      dragDir: new THREE.Vector3(),
      strideLength: 0.6,
      grabTarget: null,
    },
    {
      group: rig.handRight,
      side: 1,
      phase: 'rest',
      elapsed: 0,
      dragDir: new THREE.Vector3(),
      strideLength: 0.6,
      grabTarget: null,
    },
  ];

  camera.rotation.order = 'YXZ';
  const canvas = renderer.domElement;
  canvas.addEventListener('click', () => {
    if (active && document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  });
  document.addEventListener('mousemove', (e) => {
    if (!active || document.pointerLockElement !== canvas) return;
    camera.rotation.y -= e.movementX * LOOK_SENSITIVITY;
    camera.rotation.x = Math.max(
      -Math.PI * 0.44,
      Math.min(Math.PI * 0.44, camera.rotation.x - e.movementY * LOOK_SENSITIVITY),
    );
  });

  function stride(hand: Hand): void {
    if (hand.phase !== 'rest') return;
    hand.phase = 'reach';
    hand.elapsed = 0;
  }
  document.addEventListener('keydown', (e) => {
    if (!active || e.repeat) return;
    if (e.code === 'KeyJ') stride(hands[0]);
    else if (e.code === 'KeyK') stride(hands[1]);
    else if (e.code === 'Space') {
      stride(hands[0]);
      stride(hands[1]);
    } else if (e.code === 'KeyF' || e.code === 'KeyG') {
      const hand = hands[e.code === 'KeyF' ? 0 : 1];
      hand.phase = 'grabReach';
      hand.elapsed = 0;
      grab.pressGrip(hand.side < 0 ? 0 : 1);
    } else if (e.code === 'KeyW' || e.code === 'KeyS') {
      const d = e.code === 'KeyW' ? 0.1 : -0.1;
      for (const h of hands) h.strideLength = Math.min(1.2, Math.max(0.2, h.strideLength + d));
      console.info(`[vr-life] stride length ${hands[0].strideLength.toFixed(1)} m`);
    }
  });

  document.addEventListener('keyup', (e) => {
    if (!active) return;
    if (e.code === 'KeyF' || e.code === 'KeyG') {
      const hand = hands[e.code === 'KeyF' ? 0 : 1];
      grab.releaseGrip(hand.side < 0 ? 0 : 1);
      hand.phase = 'rest';
    }
  });

  const auto = new URLSearchParams(globalThis.location?.search ?? '').get('drive') === 'auto';
  let autoGrabbed = false;
  let autoThrown = false;
  let autoClock = 0;
  let autoNext = 0.5;
  let autoIndex = 0;
  let logClock = 0;

  console.info(
    '[vr-life] desktop drive: click to look, J/K stride, Space leap, W/S stride length' +
      (auto ? ' (auto strides on)' : ''),
  );

  function restPosition(hand: Hand, out: THREE.Vector3): void {
    _euler.set(0, camera.rotation.y, 0);
    _yaw.setFromEuler(_euler);
    out.copy(REST_LOCAL);
    out.x *= hand.side;
    out.applyQuaternion(_yaw).add(camera.position);
  }

  function advance(hand: Hand, dt: number): void {
    const pos = hand.group.position;
    hand.elapsed += dt;
    restPosition(hand, _rest);
    _forward.set(0, 0, -1).applyQuaternion(_yaw);

    switch (hand.phase) {
      case 'rest':
        pos.copy(_rest);
        return;
      case 'reach': {
        const index = hand.side < 0 ? 0 : 1;
        if (locomotion.handAnchored(index)) {
          // Ground under the hand → stride back; a face in front → haul down.
          const hitWall = pos.y > _rest.y - REACH_DOWN_M * 0.5;
          hand.dragDir.copy(hitWall ? new THREE.Vector3(0, -1, 0) : _forward.clone().negate());
          hand.phase = 'drag';
          hand.elapsed = 0;
          return;
        }
        _step.copy(_forward).multiplyScalar(REACH_FORWARD_M);
        _step.y -= REACH_DOWN_M;
        _step.add(_rest); // reach target
        const k = Math.min(1, dt / Math.max(1e-3, PHASE_REACH_S - (hand.elapsed - dt)));
        pos.lerp(_step, k);
        if (hand.elapsed >= PHASE_REACH_S + REACH_GRACE_S) {
          hand.phase = 'lift'; // swing and a miss
          hand.elapsed = 0;
        }
        return;
      }
      case 'drag':
        pos.addScaledVector(hand.dragDir, (hand.strideLength / PHASE_DRAG_S) * dt);
        if (hand.elapsed >= PHASE_DRAG_S) {
          hand.phase = 'lift';
          hand.elapsed = 0;
        }
        return;
      case 'lift':
        pos.y += (LIFT_M / PHASE_LIFT_S) * dt;
        if (hand.elapsed >= PHASE_LIFT_S) {
          hand.phase = 'rest';
          pos.copy(_rest);
        }
        return;
      case 'grabReach':
        // Key held: hand out in front at rest height, ready to grab.
        _step.copy(_forward).multiplyScalar(REACH_GRAB_M).add(_rest);
        pos.lerp(_step, Math.min(1, dt * 12));
        return;
      case 'grabTo':
        // Auto script: reach to a world-space target (rig space = world minus root).
        if (hand.grabTarget !== null) {
          _step.copy(hand.grabTarget).sub(rig.root.position);
          pos.lerp(_step, Math.min(1, dt * 10));
        }
        return;
      case 'throw':
        // Swing forward and up fast; the release happens on the timer.
        pos.addScaledVector(_forward, 4 * dt);
        pos.y += 2 * dt;
        return;
    }
  }

  return {
    update(dt: number): void {
      if (!active) return;
      for (const h of hands) advance(h, dt);

      if (auto) {
        autoClock += dt;
        if (autoClock < AUTO_DURATION_S && autoClock >= autoNext) {
          autoNext += AUTO_STRIDE_PERIOD_S;
          stride(hands[autoIndex++ % 2]);
        }
        const right = hands[1];
        if (!autoGrabbed && autoClock >= AUTO_GRAB_AT_S - 0.4 && right.phase === 'rest') {
          const target = props.props.find((p) => p.spec.id === 'basketball');
          if (target !== undefined) {
            right.grabTarget = target.position.clone();
            right.phase = 'grabTo';
          }
        }
        if (!autoGrabbed && autoClock >= AUTO_GRAB_AT_S) {
          grab.pressGrip(1);
          autoGrabbed = true;
          console.info(`[vr-life] auto grab: ${grab.handHolding(1) ? 'holding' : 'missed'}`);
          right.phase = 'throw';
        }
        if (autoGrabbed && !autoThrown && autoClock >= AUTO_THROW_AT_S) {
          grab.releaseGrip(1);
          autoThrown = true;
          right.phase = 'rest';
          console.info('[vr-life] auto throw');
        }
      }
      logClock += dt;
      if (logClock >= LOG_PERIOD_S) {
        logClock = 0;
        const p = rig.root.position;
        console.info(
          `[vr-life] rig at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) ` +
            `vel ${locomotion.velocity.length().toFixed(2)} m/s`,
        );
        const ball = props.props.find((q) => q.spec.id === 'basketball');
        console.info(
          `[vr-life] props at rest: ${props.restingCount}/${props.props.length}` +
            (ball
              ? ` basketball ${ball.state} at (${ball.position.x.toFixed(2)}, ${ball.position.y.toFixed(2)}, ${ball.position.z.toFixed(2)})`
              : ''),
        );
      }
    },
    statusLine(): string {
      const state = locomotion.anchored ? 'HOLD' : locomotion.grounded ? 'GROUND' : 'AIR';
      return `VEL ${locomotion.velocity.length().toFixed(1)} m/s ${state}`;
    },
  };
}
