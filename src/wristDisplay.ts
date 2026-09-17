import * as THREE from 'three';
import type { PlayerRig } from './placeholderPlayer';
import type { Progress } from './progress';
import { buildTextQuad, type TextQuad } from './textQuad';

// The only player-facing UI: two small canvas quads that hover just above
// each hand and face the player's eyes, so a glance at either hand reads
// them however the wrist is turned. Left: money, right: level. Redrawn on
// change only; repositioned every frame.

export interface WristDisplays {
  update(): void;
  dispose(): void;
}

const ABOVE_HAND_M = 0.09;
const _hand = new THREE.Vector3();
const _head = new THREE.Vector3();

export function buildWristDisplays(rig: PlayerRig, progress: Progress): WristDisplays {
  const make = (): TextQuad => {
    const quad = buildTextQuad({
      width: 256,
      height: 128,
      worldWidth: 0.08,
      worldHeight: 0.04,
      background: 'rgba(12, 16, 22, 0.9)',
      border: '#3d4a5a',
    });
    quad.mesh.name = 'wristDisplay';
    quad.mesh.renderOrder = 10;
    (rig.root.parent ?? rig.root).add(quad.mesh);
    return quad;
  };
  const left = make();
  const right = make();
  const quads: [THREE.Object3D, TextQuad][] = [
    [rig.handLeft, left],
    [rig.handRight, right],
  ];
  const drawMoney = (): void =>
    left.draw([{ text: `$ ${progress.money}`, size: 64, align: 'center' }]);
  const drawLevel = (): void =>
    right.draw([{ text: `LV ${progress.level}`, size: 64, align: 'center' }]);
  drawMoney();
  drawLevel();

  const previous = progress.events;
  progress.events = {
    ...previous,
    money: (total, delta) => {
      previous.money?.(total, delta);
      drawMoney();
    },
    level: (level) => {
      previous.level?.(level);
      drawLevel();
    },
  };

  return {
    update(): void {
      rig.head.getWorldPosition(_head);
      for (const [hand, quad] of quads) {
        hand.getWorldPosition(_hand);
        quad.mesh.position.set(_hand.x, _hand.y + ABOVE_HAND_M, _hand.z);
        quad.mesh.lookAt(_head);
      }
    },
    dispose(): void {
      left.dispose();
      right.dispose();
    },
  };
}
