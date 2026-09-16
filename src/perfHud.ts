import * as THREE from 'three';
import type { PerfSampler, PerfState } from './perfStats';

// In-scene perf readout, gated behind the `perf` dev flag (URL, every build).
// A canvas-texture quad parented to the camera: during an immersive XR
// session the DOM is not composited into the headset display, so the
// readout must live in-scene. That is a design constraint, not a preference.
//
// Cadence: the sampler runs per frame (perfStats.ts, allocation-free), but
// this HUD redraws its canvas only a few times per second and scans scene
// memory once per second, so the readout never dominates what it measures.

const REDRAW_INTERVAL_MS = 150;
const MEMORY_SCAN_INTERVAL_MS = 1000;
const WARN_REPEAT_MS = 5000;

const CANVAS_W = 448;
const CANVAS_H = 296;
const FONT = '600 24px ui-monospace, Menlo, monospace';
const LINE_H = 38;

const BG_OK = 'rgba(10, 14, 18, 0.82)';
const BG_WARNING = 'rgba(64, 16, 8, 0.88)';
const FG = '#e8edf2';
const FG_DIM = '#93a1af';
const FG_WARN = '#ff5f45';

const MIB = 1024 * 1024;

export interface PerfHud {
  /**
   * Call once per frame, after renderer.render(): draw calls are read from
   * renderer.info (fresh until the next render resets it), and the canvas
   * redraws on its own cadence.
   */
  update(nowMs: number, renderer: THREE.WebGLRenderer): void;
  /** Detach the quad and free its GPU resources. */
  dispose(): void;
}

/**
 * Build the HUD quad, parent it to the camera, and return the per-frame
 * updater. The caller must already have added the camera to the scene: the
 * render list is built by traversing the scene, so a camera-attached object
 * only draws when the camera itself is in the scene graph.
 */
export function buildPerfHud(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  sampler: PerfSampler,
  sessionRateHz?: number,
): PerfHud {
  const rateLine =
    sessionRateHz === undefined
      ? `RATE ${sampler.floorFps} assumed (no session rate)`
      : `RATE ${sessionRateHz} Hz (session)`;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('perf HUD: 2D canvas context unavailable');
  const ctx: CanvasRenderingContext2D = context;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(0.35, 0.23);
  const quad = new THREE.Mesh(geometry, material);
  quad.name = 'perfHudQuad';
  quad.position.set(-0.4, -0.28, -0.5); // lower-left of view, ~0.5 m out
  quad.renderOrder = 999;
  quad.frustumCulled = false; // camera-attached; skip the XR union-frustum cull
  camera.add(quad);

  let lastRedrawMs = -Infinity;
  let lastMemoryScanMs = -Infinity;
  let lastWarnMs = 0;
  let lastState: PerfState = sampler.state;
  let memoryLine = 'MEM ...';
  let heapLine: string | null = null;

  function warn(transition: boolean): void {
    console.warn(
      `[vr-life] perf ${transition ? 'fell below' : 'still below'} the ` +
        `${sampler.floorFps} fps floor: window avg ${sampler.windowAvgFps.toFixed(1)} fps, ` +
        `p95 ${sampler.windowP95Ms.toFixed(2)} ms`,
    );
  }

  function draw(drawCalls: number, state: PerfState): void {
    const warning = state === 'warning';
    ctx.fillStyle = warning ? BG_WARNING : BG_OK;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = warning ? FG_WARN : FG_DIM;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CANVAS_W - 4, CANVAS_H - 4);

    ctx.font = FONT;
    ctx.textBaseline = 'top';
    let y = 16;
    const line = (text: string, color: string): void => {
      ctx.fillStyle = color;
      ctx.fillText(text, 16, y);
      y += LINE_H;
    };

    line(
      `FPS ${sampler.instantFps.toFixed(1)}  avg ${sampler.windowAvgFps.toFixed(1)}`,
      warning ? FG_WARN : FG,
    );
    line(`MS ${sampler.lastFrameMs.toFixed(2)}  p95 ${sampler.windowP95Ms.toFixed(2)}`, FG);
    line(`CALLS ${drawCalls} (both eyes)`, FG);
    line(memoryLine, FG);
    line(rateLine, FG_DIM);
    if (heapLine !== null) line(heapLine, FG_DIM);
    if (warning) line(`!! BELOW ${sampler.floorFps} FPS !!`, FG_WARN);

    texture.needsUpdate = true;
  }

  return {
    update(nowMs: number, renderer: THREE.WebGLRenderer): void {
      const state = sampler.state;
      if (state !== lastState) {
        lastState = state;
        material.color.set(state === 'warning' ? 0xff6a4d : 0xffffff);
        if (state === 'warning') {
          lastWarnMs = nowMs;
          warn(true);
        }
      } else if (state === 'warning' && nowMs - lastWarnMs >= WARN_REPEAT_MS) {
        lastWarnMs = nowMs;
        warn(false);
      }

      if (nowMs - lastMemoryScanMs >= MEMORY_SCAN_INTERVAL_MS) {
        lastMemoryScanMs = nowMs;
        memoryLine = formatMemoryLine(scanSceneMemory(scene));
        heapLine = readChromiumHeapLine();
      }

      if (nowMs - lastRedrawMs >= REDRAW_INTERVAL_MS) {
        lastRedrawMs = nowMs;
        draw(renderer.info.render.calls, state);
      }
    },

    dispose(): void {
      camera.remove(quad);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

interface MemoryEstimate {
  geometryMiB: number;
  textureMiB: number;
  totalMiB: number;
}

/**
 * Estimate GPU-side asset memory: geometry attribute/index bytes plus
 * texture bytes (dimensions x bytes-per-pixel x ~4/3 mip factor). Each
 * unique geometry/texture is counted once, so shared assets are not
 * double-counted. Runs once per second, never per frame.
 */
function scanSceneMemory(scene: THREE.Scene): MemoryEstimate {
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh !== true) return;
    geometries.add(mesh.geometry);
    if (Array.isArray(mesh.material)) {
      for (const m of mesh.material) collectTextures(m, textures);
    } else {
      collectTextures(mesh.material, textures);
    }
  });

  let geometryBytes = 0;
  for (const geometry of geometries) {
    for (const attribute of Object.values(geometry.attributes)) {
      geometryBytes += attribute.array.byteLength;
    }
    if (geometry.index !== null) geometryBytes += geometry.index.array.byteLength;
  }

  let textureBytes = 0;
  for (const texture of textures) {
    const image = texture.image as { width?: number; height?: number } | null | undefined;
    const width = image?.width ?? 0;
    const height = image?.height ?? 0;
    if (width === 0 || height === 0) continue;
    const mipFactor = texture.generateMipmaps ? 4 / 3 : 1;
    textureBytes += width * height * bytesPerPixel(texture.format) * mipFactor;
  }

  const geometryMiB = geometryBytes / MIB;
  const textureMiB = textureBytes / MIB;
  return { geometryMiB, textureMiB, totalMiB: geometryMiB + textureMiB };
}

function collectTextures(material: THREE.Material, out: Set<THREE.Texture>): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) out.add(value);
  }
}

function bytesPerPixel(format: THREE.AnyPixelFormat): number {
  switch (format) {
    case THREE.RGBAFormat:
    case THREE.RGBAIntegerFormat:
      return 4;
    case THREE.RGBFormat:
    case THREE.RGBIntegerFormat:
      return 3;
    case THREE.RGFormat:
    case THREE.RGIntegerFormat:
      return 2;
    case THREE.RedFormat:
    case THREE.RedIntegerFormat:
    case THREE.AlphaFormat:
      return 1;
    case THREE.DepthFormat:
    case THREE.DepthStencilFormat:
      return 4;
    default: // compressed / exotic formats: assume the RGBA norm
      return 4;
  }
}

function formatMemoryLine(m: MemoryEstimate): string {
  return `MEM ${m.totalMiB.toFixed(1)} MiB (geo ${m.geometryMiB.toFixed(1)} tex ${m.textureMiB.toFixed(1)})`;
}

/**
 * Chromium's non-standard performance.memory, when the browser exposes it.
 * Shown as a cross-check against the manual estimate above; the manual
 * estimate is the source of truth when the API is absent (it may be
 * stripped from Quest Browser).
 */
function readChromiumHeapLine(): string | null {
  // SAFETY: performance.memory is Chromium's non-standard extension, absent
  // from the DOM lib types; the shape below is the documented API surface.
  const memory = (performance as unknown as { memory?: ChromiumHeapMemory }).memory;
  if (memory === undefined) return null;
  return `HEAP ${(memory.usedJSHeapSize / MIB).toFixed(0)} / ${(memory.jsHeapSizeLimit / MIB).toFixed(0)} MiB`;
}

interface ChromiumHeapMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}
