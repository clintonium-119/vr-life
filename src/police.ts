import * as THREE from 'three';
import type { CollisionWorld } from './collision';
import type { Grab } from './grab';
import { arrestCosts, type Heat } from './heat';
import type { Locomotion } from './locomotion';
import type { MovementAudio } from './movementAudio';
import { tuning, type MovementTuning } from './movementTuning';
import { Npc, type NpcManager } from './npc';
import { PlayerBody } from './playerBody';
import type { PlayerRig } from './placeholderPlayer';
import { PrisonState, setPrisonLocked, type PrisonDistrict } from './prison';
import type { Progress } from './progress';
import { PLACES } from './townPlan';

// The police: officer gorillas on the player's sphere mover. Dispatched
// from the station when heat crosses the threshold, they steer toward the
// player, climb when blocked below a higher player, and catch by proximity.
// An arrest is an on-foot escort to the prison cell; costs are recoverable.

export type OfficerState = 'toPlayer' | 'escort' | 'return' | 'idle';

/** Horizontal steering velocity toward `to`, zero inside `stopRadius`. */
export function steer(
  from: THREE.Vector3,
  to: THREE.Vector3,
  speed: number,
  stopRadius: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= stopRadius || dist < 1e-6) return out.set(0, 0, 0);
  return out.set((dx / dist) * speed, 0, (dz / dist) * speed);
}

export const CLIMB_RATE = 3; // m/s

/** Upward speed to add when blocked below a higher player. */
export function climbAssist(blocked: boolean, playerHigher: boolean): number {
  return blocked && playerHigher ? CLIMB_RATE : 0;
}

const STUCK_S = 0.3;
const _steer = new THREE.Vector3();
const _feet = new THREE.Vector3();

export class Officer {
  readonly npc: Npc;
  readonly body: PlayerBody;
  state: OfficerState = 'toPlayer';
  holdTimer = 0;
  private stuckTimer = 0;
  private readonly lastPos = new THREE.Vector3();
  readonly escortPoint = new THREE.Vector3();

  constructor(
    world: CollisionWorld,
    start: THREE.Vector3,
    readonly home: THREE.Vector3,
    private readonly t: MovementTuning = tuning,
  ) {
    this.npc = new Npc({
      role: 'police',
      appearance: { bodyColor: 5, accessories: ['cap', 'band'] },
      position: start.clone(),
    });
    this.body = new PlayerBody(world, t);
    this.body.teleportTo(new THREE.Vector3(start.x, start.y + t.bodyRadius, start.z));
    this.lastPos.copy(this.body.position);
  }

  /** Feet position (bottom of the body sphere). */
  feet(out: THREE.Vector3): THREE.Vector3 {
    return out.set(
      this.body.position.x,
      this.body.position.y - this.t.bodyRadius,
      this.body.position.z,
    );
  }

  private moveToward(target: THREE.Vector3, speed: number, dt: number, stop: number): boolean {
    const t = this.t;
    steer(this.body.position, target, speed, stop, _steer);
    this.body.velocity.x = _steer.x;
    this.body.velocity.z = _steer.z;
    const progress = this.body.position.distanceTo(this.lastPos);
    this.stuckTimer =
      progress < speed * dt * 0.3 && _steer.lengthSq() > 0 ? this.stuckTimer + dt : 0;
    const blocked = this.stuckTimer >= STUCK_S;
    const climb = climbAssist(blocked, target.y > this.body.position.y - t.bodyRadius + 1.0);
    if (climb > 0) this.body.velocity.y = climb;
    this.lastPos.copy(this.body.position);
    this.body.step(dt, climb > 0);
    this.feet(_feet);
    this.npc.position.copy(_feet);
    if (_steer.lengthSq() > 0) this.npc.yaw = Math.atan2(_steer.x, _steer.z) + Math.PI;
    this.npc.velocity.copy(_steer);
    return _steer.lengthSq() === 0;
  }

  update(dt: number, playerFeet: THREE.Vector3): void {
    const t = this.t;
    switch (this.state) {
      case 'toPlayer': {
        this.moveToward(playerFeet, t.policeSpeed, dt, t.arrestRadius * 0.6);
        const d = this.feet(_feet).distanceTo(playerFeet);
        this.holdTimer = d <= t.arrestRadius ? this.holdTimer + dt : 0;
        break;
      }
      case 'escort': {
        this.moveToward(this.escortPoint, t.escortSpeed, dt, 0.8);
        break;
      }
      case 'return': {
        if (this.moveToward(this.home, t.policeSpeed, dt, 1.0)) this.state = 'idle';
        break;
      }
      case 'idle':
        this.body.step(dt, false);
        this.feet(_feet);
        this.npc.position.copy(_feet);
        this.npc.velocity.set(0, 0, 0);
        break;
    }
  }
}

export interface PoliceEvents {
  dispatched?(count: number): void;
  arrested?(): void;
  jailed?(fine: number): void;
  released?(): void;
}

export interface Police {
  officers: Officer[];
  prisonState: PrisonState;
  events: PoliceEvents;
  update(dt: number, playerFeet: THREE.Vector3): void;
}

const _drag = new THREE.Vector3();
const _dir = new THREE.Vector3();

export function buildPolice(
  world: CollisionWorld,
  npcs: NpcManager,
  heat: Heat,
  locomotion: Locomotion,
  rig: PlayerRig,
  grab: Grab,
  prison: PrisonDistrict,
  progress: Progress,
  confiscate: () => void,
  audio: MovementAudio,
  t: MovementTuning = tuning,
): Police {
  const officers: Officer[] = [];
  const prisonState = new PrisonState(t);
  const events: PoliceEvents = {};
  const station = new THREE.Vector3(PLACES.police[0], 0, PLACES.police[2] + 3);
  let escorting: Officer | null = null;
  const mover = { position: new THREE.Vector3() };
  let jailed = false;

  const previousDispatch = heat.events.dispatch;
  heat.events.dispatch = () => {
    previousDispatch?.();
    while (officers.length < t.maxOfficers) {
      const o = new Officer(
        world,
        new THREE.Vector3(station.x + officers.length * 1.2, 0, station.z),
        station,
        t,
      );
      officers.push(o);
      npcs.add(o.npc);
    }
    for (const o of officers) if (o.state !== 'escort') o.state = 'toPlayer';
    audio.siren(true);
    console.info(`[vr-life] officers dispatched: ${officers.length}`);
    events.dispatched?.(officers.length);
  };
  const previousCleared = heat.events.cleared;
  heat.events.cleared = () => {
    previousCleared?.();
    for (const o of officers) if (o.state === 'toPlayer') o.state = 'return';
    audio.siren(false);
  };

  function arrest(officer: Officer): void {
    grab.dropAll();
    escorting = officer;
    officer.state = 'escort';
    officer.escortPoint.copy(prison.cellCentre);
    locomotion.setOverride(mover);
    for (const o of officers) if (o !== officer && o.state === 'toPlayer') o.state = 'return';
    audio.chime('whoop');
    console.info('[vr-life] arrested');
    events.arrested?.();
  }

  function jail(): void {
    locomotion.setOverride(null);
    escorting = null;
    mover.position.copy(prison.cellCentre);
    rig.root.position.set(
      prison.cellCentre.x - rig.head.position.x,
      prison.cellCentre.y - t.eyeHeightOffset,
      prison.cellCentre.z - rig.head.position.z,
    );
    locomotion.teleportReset();
    setPrisonLocked(world, prison, true);
    prisonState.enter();
    jailed = true;
    const { fine } = arrestCosts(progress, t);
    confiscate();
    heat.reset();
    for (const o of officers) o.state = 'return';
    audio.chime('bell');
    console.info(`[vr-life] jailed: fine ${fine}`);
    events.jailed?.(fine);
  }

  function release(): void {
    setPrisonLocked(world, prison, false);
    audio.chime('bell');
    console.info('[vr-life] released');
    events.released?.();
  }

  return {
    officers,
    prisonState,
    events,
    update(dt, playerFeet): void {
      const chasing = officers.some((o) => o.state === 'toPlayer');
      heat.tick(dt, chasing);
      for (const o of officers) o.update(dt, playerFeet);

      if (escorting !== null) {
        // Dragged one metre behind the officer, on the ground.
        escorting.feet(_drag);
        _dir.copy(prison.cellCentre).sub(_drag).setY(0);
        if (_dir.lengthSq() > 1e-6) _dir.normalize();
        mover.position.copy(_drag).addScaledVector(_dir, -1.0);
        if (_drag.distanceTo(prison.cellCentre) < 1.0) jail();
      } else if (!prisonState.inside) {
        const catcher = officers.find(
          (o) => o.state === 'toPlayer' && o.holdTimer >= t.arrestHoldS,
        );
        if (catcher !== undefined) arrest(catcher);
      }

      if (prisonState.inside) {
        if (prisonState.tick(dt)) release();
        if (jailed && !prison.prisonBounds.containsPoint(playerFeet)) {
          // Escaped (or walked out after the release): everything opens again.
          prisonState.leave();
          jailed = false;
          if (!prisonState.released) release();
        }
      }
    },
  };
}
