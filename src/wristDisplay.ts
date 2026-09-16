import * as THREE from 'three';
import type { PlayerRig } from './placeholderPlayer';
import type { Progress } from './progress';
import { buildTextQuad, type TextQuad } from './textQuad';

// The only player-facing UI: two small canvas quads on the inner forearms.
// Left wrist shows money, right wrist shows level. Redrawn on change only.

export interface WristDisplays {
  dispose(): void;
}

export function buildWristDisplays(rig: PlayerRig, progress: Progress): WristDisplays {
  const make = (hand: THREE.Object3D): TextQuad => {
    const quad = buildTextQuad({
      width: 256,
      height: 128,
      worldWidth: 0.08,
      worldHeight: 0.04,
      background: 'rgba(12, 16, 22, 0.9)',
      border: '#3d4a5a',
    });
    quad.mesh.name = 'wristDisplay';
    // On top of the wrist, just behind the mitt, facing up the forearm.
    quad.mesh.position.set(0, 0.035, 0.11);
    quad.mesh.rotation.set(-Math.PI / 2 + 0.35, 0, 0);
    hand.add(quad.mesh);
    return quad;
  };
  const left = make(rig.handLeft);
  const right = make(rig.handRight);
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
    dispose(): void {
      left.dispose();
      right.dispose();
    },
  };
}
