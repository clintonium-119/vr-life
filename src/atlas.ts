import * as THREE from 'three';

// The town's one texture: a 4×4 grid of 512 px tiles drawn procedurally on
// a canvas at startup, sampled through a single Lambert material with
// vertex colours (the baked occlusion). Tile rects are fixed so a painted
// atlas can replace the generator later at the same layout.

export const ATLAS_SIZE = 2048;
export const TILE_PX = 512;
/** Texel inset per side so bilinear/mip sampling never bleeds into a neighbour. */
export const TILE_INSET_PX = 8;

export const TILES = {
  brick: { x: 0, y: 0 },
  siding: { x: 1, y: 0 },
  shingles: { x: 2, y: 0 },
  planks: { x: 3, y: 0 },
  grass: { x: 0, y: 1 },
  asphalt: { x: 1, y: 1 },
  concrete: { x: 2, y: 1 },
  plaster: { x: 3, y: 1 },
  floorboards: { x: 0, y: 2 },
  window: { x: 1, y: 2 },
  door: { x: 2, y: 2 },
  trim: { x: 3, y: 2 },
  metal: { x: 0, y: 3 },
  gravel: { x: 1, y: 3 },
} as const;

export type TileName = keyof typeof TILES;
export const TILE_NAMES = Object.keys(TILES) as TileName[];

export interface UvRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** UV rect of a tile (v measured from the bottom, three.js convention). */
export function tileRect(name: TileName): UvRect {
  const { x, y } = TILES[name];
  const px0 = x * TILE_PX + TILE_INSET_PX;
  const px1 = (x + 1) * TILE_PX - TILE_INSET_PX;
  // Canvas y grows downward; texture v grows upward (flipY on CanvasTexture).
  const py0 = y * TILE_PX + TILE_INSET_PX;
  const py1 = (y + 1) * TILE_PX - TILE_INSET_PX;
  return {
    u0: px0 / ATLAS_SIZE,
    u1: px1 / ATLAS_SIZE,
    v0: 1 - py1 / ATLAS_SIZE,
    v1: 1 - py0 / ATLAS_SIZE,
  };
}

// ---- generation ------------------------------------------------------------

/** Deterministic PRNG so the atlas is identical on every device. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = CanvasRenderingContext2D;

function rgb(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** Flat base with light per-pixel-ish grain (small random rects). */
function grain(
  ctx: Ctx,
  rnd: () => number,
  base: [number, number, number],
  amount: number,
  count: number,
): void {
  const [r, g, b] = base;
  ctx.fillStyle = rgb(r, g, b);
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  for (let i = 0; i < count; i++) {
    const d = (rnd() - 0.5) * amount;
    ctx.fillStyle = rgb(r + d, g + d, b + d);
    ctx.fillRect(rnd() * TILE_PX, rnd() * TILE_PX, 3 + rnd() * 10, 3 + rnd() * 10);
  }
}

const GENERATORS: Record<TileName, (ctx: Ctx, rnd: () => number) => void> = {
  brick(ctx, rnd) {
    grain(ctx, rnd, [168, 160, 150], 10, 400); // mortar
    const bw = 64;
    const bh = 32;
    for (let row = 0; row < TILE_PX / bh; row++) {
      const offset = row % 2 === 0 ? 0 : bw / 2;
      for (let col = -1; col < TILE_PX / bw + 1; col++) {
        const t = (rnd() - 0.5) * 30;
        ctx.fillStyle = rgb(158 + t, 74 + t * 0.6, 56 + t * 0.5);
        ctx.fillRect(col * bw + offset + 3, row * bh + 3, bw - 6, bh - 6);
      }
    }
  },
  siding(ctx, rnd) {
    grain(ctx, rnd, [214, 206, 188], 8, 300);
    for (let y = 0; y < TILE_PX; y += 40) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, y, TILE_PX, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, y + 5, TILE_PX, 3);
    }
  },
  shingles(ctx, rnd) {
    grain(ctx, rnd, [78, 72, 70], 12, 300);
    const w = 52;
    const h = 44;
    for (let row = 0; row < TILE_PX / h + 1; row++) {
      const offset = row % 2 === 0 ? 0 : w / 2;
      for (let col = -1; col < TILE_PX / w + 1; col++) {
        const t = (rnd() - 0.5) * 28;
        ctx.fillStyle = rgb(92 + t, 84 + t, 80 + t);
        ctx.fillRect(col * w + offset + 2, row * h, w - 4, h - 6);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(col * w + offset + 2, row * h + h - 8, w - 4, 4);
      }
    }
  },
  planks(ctx, rnd) {
    grain(ctx, rnd, [150, 112, 72], 14, 300);
    for (let x = 0; x < TILE_PX; x += 64) {
      const t = (rnd() - 0.5) * 24;
      ctx.fillStyle = rgb(150 + t, 112 + t * 0.8, 72 + t * 0.6);
      ctx.fillRect(x + 2, 0, 60, TILE_PX);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, 0, 3, TILE_PX);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = 'rgba(60,35,15,0.5)';
        ctx.beginPath();
        ctx.ellipse(x + 10 + rnd() * 44, rnd() * TILE_PX, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  grass(ctx, rnd) {
    grain(ctx, rnd, [96, 138, 62], 30, 1400);
  },
  asphalt(ctx, rnd) {
    grain(ctx, rnd, [64, 66, 70], 26, 1600);
  },
  concrete(ctx, rnd) {
    grain(ctx, rnd, [170, 168, 160], 16, 700);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, TILE_PX / 2 - 2, TILE_PX, 4);
    ctx.fillRect(TILE_PX / 2 - 2, 0, 4, TILE_PX);
  },
  plaster(ctx, rnd) {
    grain(ctx, rnd, [232, 224, 208], 8, 500);
  },
  floorboards(ctx, rnd) {
    grain(ctx, rnd, [176, 132, 84], 12, 300);
    for (let y = 0; y < TILE_PX; y += 48) {
      const t = (rnd() - 0.5) * 22;
      ctx.fillStyle = rgb(176 + t, 132 + t * 0.8, 84 + t * 0.6);
      ctx.fillRect(0, y + 2, TILE_PX, 44);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, y, TILE_PX, 3);
      ctx.fillRect(rnd() * TILE_PX, y, 3, 48); // end seam
    }
  },
  window(ctx) {
    ctx.fillStyle = rgb(240, 236, 226); // frame
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    const g = ctx.createLinearGradient(0, 0, 0, TILE_PX);
    g.addColorStop(0, rgb(150, 190, 225));
    g.addColorStop(1, rgb(70, 95, 125));
    ctx.fillStyle = g;
    const m = 36;
    ctx.fillRect(m, m, TILE_PX - 2 * m, TILE_PX - 2 * m);
    ctx.fillStyle = rgb(240, 236, 226);
    ctx.fillRect(TILE_PX / 2 - 12, m, 24, TILE_PX - 2 * m);
    ctx.fillRect(m, TILE_PX / 2 - 12, TILE_PX - 2 * m, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(m + 20, m + 20, 60, 140);
  },
  door(ctx, rnd) {
    grain(ctx, rnd, [96, 58, 40], 10, 200);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (const [x, y, w, h] of [
      [60, 60, 170, 180],
      [282, 60, 170, 180],
      [60, 290, 170, 180],
      [282, 290, 170, 180],
    ]) {
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
    }
    ctx.fillStyle = rgb(220, 190, 90);
    ctx.beginPath();
    ctx.arc(TILE_PX - 70, TILE_PX / 2, 14, 0, Math.PI * 2);
    ctx.fill();
  },
  trim(ctx, rnd) {
    grain(ctx, rnd, [236, 232, 222], 6, 200);
  },
  metal(ctx, rnd) {
    grain(ctx, rnd, [118, 124, 132], 14, 500);
    for (let y = 0; y < TILE_PX; y += 128) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, y, TILE_PX, 4);
      for (let x = 24; x < TILE_PX; x += 64) {
        ctx.beginPath();
        ctx.arc(x, y + 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  gravel(ctx, rnd) {
    grain(ctx, rnd, [128, 122, 112], 40, 2200);
  },
};

/** Tiles that have a photographic source under public/textures (CC0, ambientCG). */
export const IMAGE_TILES: readonly TileName[] = [
  'brick',
  'siding',
  'shingles',
  'planks',
  'grass',
  'asphalt',
  'concrete',
  'plaster',
  'floorboards',
  'metal',
  'gravel',
];

/**
 * Draw every tile procedurally into a fresh canvas and wrap it as a texture;
 * then load the photographic tiles and paint each over its slot as it
 * arrives (the texture re-uploads). The procedural tile is the fallback if
 * an image never loads, so the world is never untextured.
 */
export function buildAtlasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('atlas: 2D canvas context unavailable');
  let seed = 1;
  for (const name of TILE_NAMES) {
    const { x, y } = TILES[name];
    ctx.save();
    ctx.translate(x * TILE_PX, y * TILE_PX);
    ctx.beginPath();
    ctx.rect(0, 0, TILE_PX, TILE_PX);
    ctx.clip();
    GENERATORS[name](ctx, mulberry32(seed++ * 7919));
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  const base = import.meta.env.BASE_URL;
  for (const name of IMAGE_TILES) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const { x, y } = TILES[name];
      ctx.drawImage(img, x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      texture.needsUpdate = true;
    };
    img.onerror = () =>
      console.warn(`[vr-life] atlas: ${name}.jpg did not load; procedural tile kept`);
    img.src = `${base}textures/${name}.jpg`;
  }
  return texture;
}

/** A tiling texture for the gorillas (fur, skin), tinted by the material colour. */
export function loadSurfaceTexture(name: 'fur' | 'skin', repeat = 3): THREE.Texture {
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/${name}.jpg`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  return texture;
}

/** The one static-world material. */
export function worldMaterial(map: THREE.Texture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map, vertexColors: true });
}
