import { describe, expect, it } from 'vitest';
import { Box3, Group, Matrix4, Mesh, BoxGeometry, PlaneGeometry, Vector3 } from 'three';
import {
  CollisionWorld,
  MIN_HALF_THICKNESS_M,
  collidersFromGroup,
  makeBoxCollider,
  makeContact,
  sphereBoxContact,
  updateCollider,
} from './collision';

const unitBox = (): Box3 => new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));

describe('sphereBoxContact', () => {
  const box = makeBoxCollider('b', 'stone', unitBox(), new Matrix4());
  const out = makeContact();

  it('reports no contact when the sphere is clear of the box', () => {
    expect(sphereBoxContact(new Vector3(0, 2.5, 0), 0.5, box, out)).toBe(false);
  });

  it('touching a face gives that face normal and the penetration depth', () => {
    expect(sphereBoxContact(new Vector3(0, 1.3, 0), 0.5, box, out)).toBe(true);
    expect(out.normal.y).toBeCloseTo(1);
    expect(out.depth).toBeCloseTo(0.2);
    expect(out.point.y).toBeCloseTo(1);
    expect(out.collider).toBe(box);
  });

  it('a centre inside the box exits through the nearest face', () => {
    expect(sphereBoxContact(new Vector3(0.9, 0.2, -0.1), 0.3, box, out)).toBe(true);
    expect(out.normal.x).toBeCloseTo(1);
    expect(out.depth).toBeCloseTo(0.3 + 0.1);
    expect(out.point.x).toBeCloseTo(1);
  });

  it('rotates the normal with the box', () => {
    const m = new Matrix4().makeRotationY(Math.PI / 2).setPosition(5, 0, 0);
    const rotated = makeBoxCollider(
      'r',
      'stone',
      new Box3(new Vector3(-2, -1, -0.5), new Vector3(2, 1, 0.5)),
      m,
    );
    // The box's local Z (thin axis) now points along world -X; probe from world +X? Local +Z -> world +X.
    expect(sphereBoxContact(new Vector3(5.7, 0, 0), 0.3, rotated, out)).toBe(true);
    expect(out.normal.x).toBeCloseTo(1);
    expect(Math.abs(out.normal.z)).toBeLessThan(1e-6);
    expect(out.depth).toBeCloseTo(0.1);
  });

  it('folds object scale into the half extents', () => {
    const m = new Matrix4().makeScale(2, 1, 1);
    const scaled = makeBoxCollider('s', 'stone', unitBox(), m);
    expect(scaled.halfExtents.x).toBeCloseTo(2);
    expect(sphereBoxContact(new Vector3(2.2, 0, 0), 0.3, scaled, out)).toBe(true);
    expect(out.depth).toBeCloseTo(0.1);
  });
});

describe('plane colliders', () => {
  it('gives a plane a back-side thickness so the visible face is the contact face', () => {
    const ground = new Mesh(new PlaneGeometry(10, 10));
    ground.rotation.x = -Math.PI / 2; // face up
    ground.userData.surface = 'ground';
    const group = new Group();
    group.add(ground);
    const [c] = collidersFromGroup(group);
    expect(c.halfExtents.z).toBeCloseTo(MIN_HALF_THICKNESS_M);
    const out = makeContact();
    expect(sphereBoxContact(new Vector3(1, 0.29, -2), 0.3, c, out)).toBe(true);
    expect(out.normal.y).toBeCloseTo(1);
    expect(out.depth).toBeCloseTo(0.01);
    expect(out.point.y).toBeCloseTo(0);
  });
});

describe('collidersFromGroup', () => {
  it('collects tagged meshes only and reads the surface tag', () => {
    const group = new Group();
    const wall = new Mesh(new BoxGeometry(2, 4, 0.4));
    wall.position.set(0, 2, -5);
    wall.userData.surface = 'wood';
    const untagged = new Mesh(new BoxGeometry(1, 1, 1));
    const badTag = new Mesh(new BoxGeometry(1, 1, 1));
    badTag.userData.surface = 'jelly';
    group.add(wall, untagged, badTag, new Group());
    const colliders = collidersFromGroup(group);
    expect(colliders).toHaveLength(1);
    expect(colliders[0].surface).toBe('wood');
    expect(colliders[0].halfExtents.y).toBeCloseTo(2);
    const out = makeContact();
    expect(sphereBoxContact(new Vector3(0, 4.2, -5), 0.3, colliders[0], out)).toBe(true);
    expect(out.normal.y).toBeCloseTo(1);
  });
});

describe('moving colliders and the world', () => {
  it('moves the contact point when the world matrix changes and updateCollider runs', () => {
    const m = new Matrix4();
    const c = makeBoxCollider('m', 'metal', unitBox(), m);
    const out = makeContact();
    const world = new CollisionWorld();
    world.addDynamic(c);
    expect(world.nearest(new Vector3(0, 1.2, 0), 0.3, out)).toBe(true);
    expect(sphereBoxContact(new Vector3(0, 1.2, 0), 0.3, c, out)).toBe(true);
    expect(out.point.x).toBeCloseTo(0);
    m.setPosition(3, 0, 0);
    updateCollider(c);
    expect(sphereBoxContact(new Vector3(0, 1.2, 0), 0.3, c, out)).toBe(false);
    expect(world.nearest(new Vector3(3, 1.2, 0), 0.3, out)).toBe(true);
    expect(out.point.x).toBeCloseTo(3);
  });

  it('nearest returns the deepest contact and forEachContact visits all', () => {
    const world = new CollisionWorld();
    world.add(
      makeBoxCollider('a', 'stone', unitBox(), new Matrix4()),
      makeBoxCollider('b', 'wood', unitBox(), new Matrix4().setPosition(1.5, 0, 0)),
    );
    const out = makeContact();
    // Sphere between the boxes, closer into 'b'.
    expect(world.nearest(new Vector3(1.0, 1.2, 0), 0.3, out)).toBe(true);
    const seen: string[] = [];
    world.forEachContact(new Vector3(1.0, 1.2, 0), 0.3, (c) => seen.push(c.collider!.id));
    expect(seen.sort()).toEqual(['a', 'b']);
    expect(world.nearest(new Vector3(0, 5, 0), 0.3, out)).toBe(false);
  });
});
