import type { SurfaceTag } from './collision';
import type { Locomotion } from './locomotion';
import { tuning, type MovementTuning } from './movementTuning';

// Movement audio, synthesized with the Web Audio API: hand slaps coloured by
// the surface tag, body bumps and landings scaled by impact speed, and wind
// that rises with body speed. No asset files. The AudioContext is created on
// the first user gesture (resume()); every play call is a no-op before that.

interface Palette {
  /** Bandpass centre, Hz. */
  freq: number;
  q: number;
  /** Envelope decay, s. */
  decay: number;
  gain: number;
}

const SLAP_PALETTE: Record<SurfaceTag, Palette> = {
  ground: { freq: 180, q: 1, decay: 0.12, gain: 0.8 },
  stone: { freq: 420, q: 2, decay: 0.08, gain: 0.7 },
  wood: { freq: 300, q: 3, decay: 0.15, gain: 0.7 },
  metal: { freq: 1200, q: 8, decay: 0.35, gain: 0.6 },
  leaves: { freq: 2500, q: 0.7, decay: 0.2, gain: 0.4 },
};

const MAX_BURSTS = 8;
const NOISE_SECONDS = 1;
const WIND_MAX_GAIN = 0.5;

export interface MovementAudio {
  /** Create/resume the context. Call from a user gesture handler. */
  resume(): void;
  /** A prop hit something at `speed` m/s; coloured by its surface. */
  bounce(speed: number, surface: SurfaceTag): void;
  /** A hand closed on a prop. */
  catch(): void;
  /** Per frame: follows body speed for the wind. */
  update(): void;
  dispose(): void;
}

export function buildMovementAudio(
  locomotion: Locomotion,
  t: MovementTuning = tuning,
): MovementAudio {
  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let windGain: GainNode | null = null;
  let bursts = 0;

  /** The context when it exists and is running, else null. */
  function running(): AudioContext | null {
    return ctx !== null && ctx.state === 'running' ? ctx : null;
  }

  function makeNoise(c: AudioContext): AudioBuffer {
    const buffer = c.createBuffer(1, c.sampleRate * NOISE_SECONDS, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** One filtered noise burst with an exponential decay. */
  function burst(
    freq: number,
    q: number,
    decay: number,
    gain: number,
    type: BiquadFilterType,
  ): void {
    const c = running();
    if (c === null || noise === null || bursts >= MAX_BURSTS || gain <= 0.001) return;
    const source = c.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const env = c.createGain();
    const now = c.currentTime;
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + decay);
    source.connect(filter).connect(env).connect(c.destination);
    source.start(now, Math.random() * (NOISE_SECONDS - 0.1));
    source.stop(now + decay + 0.02);
    bursts++;
    source.onended = () => {
      bursts--;
      source.disconnect();
      filter.disconnect();
      env.disconnect();
    };
  }

  function thud(speed: number, gainScale: number): void {
    const c = running();
    if (c === null) return;
    const level = Math.min(1, speed / t.speedCap) * gainScale;
    burst(120, 0.7, 0.25, level, 'lowpass');
    // A short low sine under the noise sells the weight.
    const osc = c.createOscillator();
    osc.frequency.value = 60;
    const env = c.createGain();
    const now = c.currentTime;
    env.gain.setValueAtTime(level * 0.6, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(env).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.22);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }

  function surfaceBurst(speed: number, surface: SurfaceTag, gainScale: number): void {
    const p = SLAP_PALETTE[surface];
    burst(p.freq, p.q, p.decay, p.gain * gainScale * Math.min(1, speed / 3), 'bandpass');
  }
  locomotion.events.slap = (speed, surface) => surfaceBurst(speed, surface, 1);
  locomotion.events.bump = (speed) => thud(speed, 0.6);
  locomotion.events.landed = (speed) => thud(speed, 1);

  return {
    bounce(speed, surface): void {
      surfaceBurst(speed, surface, 0.7);
    },
    catch(): void {
      burst(500, 1.5, 0.06, 0.35, 'bandpass');
    },
    resume(): void {
      if (ctx === null) {
        ctx = new AudioContext();
        noise = makeNoise(ctx);
        const source = ctx.createBufferSource();
        source.buffer = noise;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 600;
        filter.Q.value = 0.5;
        windGain = ctx.createGain();
        windGain.gain.value = 0;
        source.connect(filter).connect(windGain).connect(ctx.destination);
        source.start();
      }
      if (ctx.state !== 'running') void ctx.resume();
    },

    update(): void {
      const c = running();
      if (c === null || windGain === null) return;
      const speed = locomotion.velocity.length();
      const target =
        Math.min(1, Math.max(0, (speed - t.windStartSpeed) / (t.speedCap - t.windStartSpeed))) *
        WIND_MAX_GAIN;
      windGain.gain.setTargetAtTime(target, c.currentTime, 0.1);
    },

    dispose(): void {
      void ctx?.close();
      ctx = null;
    },
  };
}
