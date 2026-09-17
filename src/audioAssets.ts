import type { SurfaceTag } from './collision';

// Sound-effect assets: CC0 clips under public/audio/sfx (Kenney impact
// sounds, the OpenGameArt RPG pack), decoded once into the shared
// AudioContext after the first gesture. Each name has numbered variants;
// play() picks one at random. Anything not loaded yet falls back to the
// synthesized cue in movementAudio.

export type SfxName =
  | 'slap_grass'
  | 'slap_wood'
  | 'slap_stone'
  | 'slap_metal'
  | 'slap_leaves'
  | 'thud'
  | 'punch'
  | 'bell'
  | 'plank'
  | 'bounce_wood'
  | 'bounce_soft'
  | 'glass'
  | 'tin'
  | 'swing'
  | 'giant'
  | 'coin'
  | 'ui'
  | 'cartoon'
  | 'bubble'
  | 'burp'
  | 'door'
  | 'wood_small';

/** Variant counts per name (files are `<name>_<i>.ogg`). */
export const SFX_VARIANTS: Record<SfxName, number> = {
  slap_grass: 5,
  slap_wood: 5,
  slap_stone: 5,
  slap_metal: 5,
  slap_leaves: 5,
  thud: 5,
  punch: 5,
  bell: 5,
  plank: 5,
  bounce_wood: 5,
  bounce_soft: 5,
  glass: 5,
  tin: 5,
  swing: 3,
  giant: 3,
  coin: 3,
  ui: 6,
  cartoon: 6,
  bubble: 2,
  burp: 1,
  door: 1,
  wood_small: 1,
};

export const SLAP_BY_SURFACE: Record<SurfaceTag, SfxName> = {
  ground: 'slap_grass',
  stone: 'slap_stone',
  wood: 'slap_wood',
  metal: 'slap_metal',
  leaves: 'slap_leaves',
};

export interface SfxLibrary {
  /** Start decoding everything on this context (idempotent). */
  load(ctx: AudioContext): void;
  /** True once at least one variant of the name is decoded. */
  has(name: SfxName): boolean;
  /** Play a random variant; returns false when nothing is loaded yet. */
  play(name: SfxName, gain?: number, rate?: number): boolean;
}

const MAX_VOICES = 12;

export function buildSfxLibrary(baseUrl: string): SfxLibrary {
  const buffers = new Map<SfxName, AudioBuffer[]>();
  let ctx: AudioContext | null = null;
  let voices = 0;
  let loading = false;

  async function fetchOne(c: AudioContext, name: SfxName, i: number): Promise<void> {
    try {
      const res = await fetch(`${baseUrl}audio/sfx/${name}_${i}.ogg`);
      if (!res.ok) return;
      const data = await res.arrayBuffer();
      const buffer = await c.decodeAudioData(data);
      const list = buffers.get(name) ?? [];
      list.push(buffer);
      buffers.set(name, list);
    } catch {
      /* the synthesized fallback stays in place */
    }
  }

  return {
    load(c): void {
      if (loading) return;
      loading = true;
      ctx = c;
      for (const [name, count] of Object.entries(SFX_VARIANTS) as [SfxName, number][]) {
        for (let i = 0; i < count; i++) void fetchOne(c, name, i);
      }
    },
    has: (name) => (buffers.get(name)?.length ?? 0) > 0,
    play(name, gain = 1, rate = 1): boolean {
      const list = buffers.get(name);
      if (ctx === null || list === undefined || list.length === 0 || voices >= MAX_VOICES)
        return false;
      const source = ctx.createBufferSource();
      source.buffer = list[Math.floor(Math.random() * list.length)];
      source.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.value = gain;
      source.connect(g).connect(ctx.destination);
      voices++;
      source.onended = () => {
        voices--;
        source.disconnect();
        g.disconnect();
      };
      source.start();
      return true;
    },
  };
}
