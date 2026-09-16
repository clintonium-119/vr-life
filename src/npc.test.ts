import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_APPEARANCE } from './appearance';
import { Npc, NpcManager } from './npc';
import { SIDEWALK_OFFSET_M, randomRoute, sidewalks } from './npcRoutes';
import { distanceToRoad } from './townPlan';

const DT = 1 / 60;

describe('Npc behaviour', () => {
  it('walks to its waypoint, pauses, and continues back and forth', () => {
    const route = [new Vector3(0, 0, 0), new Vector3(6, 0, 0), new Vector3(12, 0, 0)];
    const npc = new Npc({
      role: 'pedestrian',
      appearance: DEFAULT_APPEARANCE,
      position: new Vector3(0, 0, 0),
      route,
      seed: 3,
    });
    expect(npc.state).toBe('walk');
    npc.waypoint = 1;
    for (let i = 0; i < 6 * 60; i++) npc.step(DT);
    expect(npc.position.x).toBeGreaterThan(5.5);
    expect(npc.state).toBe('pause');
    for (let i = 0; i < 4 * 60; i++) npc.step(DT);
    expect(npc.state).toBe('walk');
    expect(npc.waypoint).toBe(2);
    for (let i = 0; i < 30 * 60; i++) npc.step(DT);
    // Ping-pong keeps it inside the route span.
    expect(npc.position.x).toBeGreaterThanOrEqual(-0.5);
    expect(npc.position.x).toBeLessThanOrEqual(12.5);
  });

  it('gets knocked over, stays dazed, then recovers', () => {
    const npc = new Npc({
      role: 'pedestrian',
      appearance: DEFAULT_APPEARANCE,
      position: new Vector3(0, 0, 0),
      route: [new Vector3(0, 0, 0), new Vector3(10, 0, 0)],
    });
    npc.knockOver(new Vector3(-1, 0, 0));
    expect(npc.state).toBe('react');
    expect(npc.knockedOver).toBe(1);
    npc.knockOver(new Vector3(-1, 0, 0)); // ignored while down
    expect(npc.knockedOver).toBe(1);
    for (let i = 0; i < 1.5 * 60; i++) npc.step(DT);
    expect(npc.state).toBe('react');
    for (let i = 0; i < 1.5 * 60; i++) npc.step(DT);
    expect(npc.state === 'walk' || npc.state === 'pause').toBe(true); // back on its route
    npc.present(DT);
    expect(Number.isFinite(npc.parts.root.position.y)).toBe(true);
  });

  it('standing NPCs never move and the manager draws only near ones', () => {
    const keeper = new Npc({
      role: 'shopkeeper',
      appearance: DEFAULT_APPEARANCE,
      position: new Vector3(5, 0, 5),
    });
    expect(keeper.state).toBe('stand');
    for (let i = 0; i < 120; i++) keeper.step(DT);
    expect(keeper.position.toArray()).toEqual([5, 0, 5]);
    const m = new NpcManager();
    m.add(keeper);
    m.add(
      new Npc({
        role: 'pedestrian',
        appearance: DEFAULT_APPEARANCE,
        position: new Vector3(200, 0, 0),
      }),
    );
    m.update(DT, new Vector3(0, 1, 0));
    expect(m.visibleCount).toBe(1);
    expect(m.npcs[1].parts.root.visible).toBe(false);
  });
});

describe('sidewalk routes', () => {
  it('lie on the sidewalks and slices stay contiguous', () => {
    for (const w of sidewalks()) {
      expect(w.points.length).toBeGreaterThan(2);
      for (const p of w.points) {
        const across = w.road.axis === 'x' ? p.z - w.road.at : p.x - w.road.at;
        expect(Math.abs(across)).toBeCloseTo(SIDEWALK_OFFSET_M, 3);
        expect(distanceToRoad(p.x, p.z)).toBeLessThanOrEqual(SIDEWALK_OFFSET_M + 1e-6);
      }
    }
    let seed = 1;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const route = randomRoute(rnd, 5);
    expect(route.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < route.length; i++)
      expect(route[i].distanceTo(route[i - 1])).toBeCloseTo(12, 3);
  });
});
