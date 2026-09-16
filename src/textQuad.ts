import * as THREE from 'three';

// Canvas text on a quad: the one way text appears in the world (wrist
// displays, classroom boards). Redraw only when content changes.

export interface TextLine {
  text: string;
  color?: string;
  /** Font size in canvas pixels (default 48). */
  size?: number;
  /** 'left' (default) or 'center'. */
  align?: 'left' | 'center';
}

export interface TextQuadOptions {
  /** Canvas pixels. */
  width: number;
  height: number;
  /** Quad size in metres. */
  worldWidth: number;
  worldHeight: number;
  background?: string;
  border?: string;
  depthTest?: boolean;
}

export interface TextQuad {
  mesh: THREE.Mesh;
  draw(lines: TextLine[], background?: string): void;
  dispose(): void;
}

export function buildTextQuad(options: TextQuadOptions): TextQuad {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('textQuad: 2D canvas context unavailable');
  const ctx: CanvasRenderingContext2D = context;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: options.depthTest ?? true,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(options.worldWidth, options.worldHeight);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'textQuad';

  return {
    mesh,
    draw(lines, background = options.background ?? 'rgba(10, 14, 18, 0.85)'): void {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (options.border !== undefined) {
        ctx.strokeStyle = options.border;
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      }
      ctx.textBaseline = 'top';
      let y = 24;
      for (const line of lines) {
        const size = line.size ?? 48;
        ctx.font = `600 ${size}px ui-monospace, Menlo, monospace`;
        ctx.fillStyle = line.color ?? '#e8edf2';
        ctx.textAlign = line.align ?? 'left';
        const x = line.align === 'center' ? canvas.width / 2 : 24;
        ctx.fillText(line.text, x, y, canvas.width - 48);
        y += size * 1.35;
      }
      texture.needsUpdate = true;
    },
    dispose(): void {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

/** Greedy word wrap for a canvas width at a font size (monospace estimate). */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (current.length + w.length + 1 > maxChars && current.length > 0) {
      lines.push(current);
      current = w;
    } else {
      current = current.length === 0 ? w : `${current} ${w}`;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}
