import * as THREE from 'three';

// Landing puffs: a small pool of camera-facing quads spawned where the body
// lands hard or a hand slaps hard; dust on the ground, leaf-green in the
// canopy. In the world, never on the screen.

export interface Puff {
  position: THREE.Vector3;
  age: number;
  life: number;
  size: number;
  tint: number;
  active: boolean;
}

export class PuffPool {
  readonly puffs: Puff[] = [];

  constructor(readonly capacity = 8) {
    for (let i = 0; i < capacity; i++)
      this.puffs.push({
        position: new THREE.Vector3(),
        age: 0,
        life: 0.5,
        size: 0.4,
        tint: 0xc9b79c,
        active: false,
      });
  }

  get active(): number {
    return this.puffs.filter((p) => p.active).length;
  }

  /** Spawn at a position; when full, the oldest puff is recycled. */
  spawn(position: THREE.Vector3, tint: number, size = 0.4, life = 0.5): Puff {
    let slot = this.puffs.find((p) => !p.active);
    if (slot === undefined)
      slot = this.puffs.reduce((oldest, p) => (p.age > oldest.age ? p : oldest), this.puffs[0]);
    slot.position.copy(position);
    slot.age = 0;
    slot.life = life;
    slot.size = size;
    slot.tint = tint;
    slot.active = true;
    return slot;
  }

  update(dt: number): void {
    for (const p of this.puffs) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) p.active = false;
    }
  }
}

export const DUST_TINT = 0xc9b79c;
export const LEAF_TINT = 0x6b9d45;

export interface Puffs {
  pool: PuffPool;
  update(dt: number): void;
}

function radialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildPuffs(scene: THREE.Scene, pool = new PuffPool()): Puffs {
  const texture = radialTexture();
  const sprites = pool.puffs.map(() => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = 'puff';
    sprite.visible = false;
    scene.add(sprite);
    return sprite;
  });
  return {
    pool,
    update(dt: number): void {
      pool.update(dt);
      pool.puffs.forEach((p, i) => {
        const sprite = sprites[i];
        sprite.visible = p.active;
        if (!p.active) return;
        const k = p.age / p.life;
        sprite.position.copy(p.position);
        const s = p.size * (0.6 + k * 1.2);
        sprite.scale.set(s, s * 0.7, 1);
        const material = sprite.material;
        material.opacity = 0.7 * (1 - k);
        material.color.set(p.tint);
      });
    },
  };
}
