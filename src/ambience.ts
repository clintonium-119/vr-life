import type { MovementAudio } from './movementAudio';
import { tuning, type MovementTuning } from './movementTuning';

// The audio bed: a recorded forest/birds loop outdoors (CC0, see
// CREDITS.md), a soft synthesized room tone indoors, and the bus engine
// while aboard. Music lives in music.ts. Gains ease by where the player is;
// nothing plays before the first gesture.

export interface AmbienceCues {
  outdoors: boolean;
  /** Distance to the nearest road centre line, m. */
  roadDistance: number;
  aboardBus: boolean;
}

export interface Ambience {
  update(dt: number, cues: AmbienceCues): void;
}

export function buildAmbience(audio: MovementAudio, t: MovementTuning = tuning): Ambience {
  let built = false;
  let room: GainNode | null = null;
  let engine: GainNode | null = null;
  const outdoorLoop = new Audio(`${import.meta.env.BASE_URL}audio/ambience/forest.mp3`);
  outdoorLoop.loop = true;
  outdoorLoop.preload = 'auto';
  outdoorLoop.volume = 0;
  let outdoorLevel = 0;
  let outdoorStarted = false;

  function noiseSource(c: AudioContext): AudioBufferSourceNode {
    const buffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return src;
  }

  function build(c: AudioContext): void {
    built = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    room = c.createGain();
    room.gain.value = 0;
    noiseSource(c).connect(lp).connect(room).connect(c.destination);
    // Engine: a low sawtooth through a lowpass.
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const elp = c.createBiquadFilter();
    elp.type = 'lowpass';
    elp.frequency.value = 220;
    engine = c.createGain();
    engine.gain.value = 0;
    osc.connect(elp).connect(engine).connect(c.destination);
    osc.start();
  }

  function ease(node: GainNode | null, target: number, c: AudioContext, tau = 0.8): void {
    node?.gain.setTargetAtTime(target, c.currentTime, tau);
  }

  return {
    update(dt, cues): void {
      const c = audio.context();
      if (c === null) return;
      if (!built) build(c);
      const g = t.ambienceGain;
      if (!outdoorStarted) {
        outdoorStarted = true;
        void outdoorLoop.play().catch(() => {
          outdoorStarted = false;
        });
      }
      const target = cues.outdoors ? g : g * 0.15;
      outdoorLevel +=
        Math.sign(target - outdoorLevel) * Math.min(Math.abs(target - outdoorLevel), 0.5 * dt);
      outdoorLoop.volume = Math.min(1, Math.max(0, outdoorLevel));
      ease(room, cues.outdoors ? 0 : g * 0.3, c);
      ease(engine, cues.aboardBus ? g * 0.8 : 0, c, 0.4);
    },
  };
}
