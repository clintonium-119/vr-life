import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { buildCivic } from './civic';
import { buildResidential } from './homeBlock';
import {
  addCatwalk,
  addWaterTower,
  horizontalGap,
  planRoofConnectors,
  roofGraph,
  roofRouteConnected,
} from './rooftops';
import { buildSchool } from './school';
import { buildTownCentre } from './townCentre';
import { Chunk } from './chunk';
import type { Roof } from './townPlan';

const roof = (id: string, x: number, z: number, w: number, d: number, y: number): Roof => ({
  id,
  bounds: new Box3(new Vector3(x - w / 2, y, z - d / 2), new Vector3(x + w / 2, y + 1, z + d / 2)),
  y,
});

describe('roof graph', () => {
  it('links roofs within the gap and rise limits, dropping down freely', () => {
    const a = roof('a', 0, 0, 10, 10, 4);
    const b = roof('b', 13, 0, 10, 10, 6); // 3 m gap, +2 rise
    const c = roof('c', 30, 0, 10, 10, 2); // too far
    const g = roofGraph([a, b, c], 4, 2.5);
    expect(horizontalGap(a.bounds, b.bounds)).toBeCloseTo(3);
    expect(g.edges.get('a')?.has('b')).toBe(true);
    expect(g.edges.get('b')?.has('a')).toBe(true);
    expect(g.edges.get('a')?.has('c')).toBe(false);
    const high = roof('h', 0, 13, 10, 10, 9); // +5 rise from a: not reachable up, reachable down
    const g2 = roofGraph([a, high], 4, 2.5);
    expect(g2.edges.get('a')?.has('h')).toBe(false);
    expect(g2.edges.get('h')?.has('a')).toBe(true);
    expect(roofRouteConnected(g, 'a', 'b')).toBe(true);
    expect(roofRouteConnected(g, 'a', 'c')).toBe(false);
  });

  it('plans catwalks that connect the residential roofs to the office and hospital peaks', () => {
    const districts = [buildResidential(), buildTownCentre(), buildCivic(), buildSchool()];
    const hub = new Chunk('hub');
    const tower = addWaterTower(hub, 40, -40);
    const roofs = [...districts.flatMap((d) => d.roofs), tower];
    const graph = roofGraph(roofs, 4, 2.5);
    const connectors = [
      ...planRoofConnectors(graph, 'home', 'office', 45),
      ...planRoofConnectors(graph, 'office', 'hospital', 45),
    ];
    expect(roofRouteConnected(graph, 'home', 'office')).toBe(true);
    expect(roofRouteConnected(graph, 'office', 'hospital')).toBe(true);
    expect(connectors.length).toBeGreaterThan(0);
    expect(connectors.length).toBeLessThan(20);
    const sky = new Chunk('sky');
    for (const c of connectors) addCatwalk(sky, c);
    expect(sky.parts.filter((p) => p.name === 'catwalk').length).toBe(connectors.length);
    for (const d of districts) expect(d.climbAids.length, d.name).toBeGreaterThan(0);
  });
});
