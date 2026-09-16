import type { MovementAudio } from './movementAudio';
import { tuning, type MovementTuning } from './movementTuning';

// The audio bed: outdoor wind and bird chirps, a town hum near roads, an
// indoor room tone, the bus engine while aboard, and a slow four-chord pad
// underneath. All synthesized on the shared context; gains ease by where
// the player is. Nothing plays before the first gesture.

export interface AmbienceCues {
  outdoors: boolean;
  /** Distance to the nearest road centre line, m. */
  roadDistance: number;
  aboardBus: boolean;
}

export interface Ambience {
  update(dt: number, cues: AmbienceCues): void;
}

const CHORDS: number[][] = [
  [261.63, 329.63, 392.0], // C
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [196.0, 246.94, 293.66], // G
];
const CHORD_SECONDS = 6;

export function buildAmbience(audio: MovementAudio, t: MovementTuning = tuning): Ambience {
  let built = false;
  let wind: GainNode | null = null;
  let hum: GainNode | null = null;
  let room: GainNode | null = null;
  let engine: GainNode | null = null;
  let padGain: GainNode | null = null;
  let padOscs: OscillatorNode[] = [];
  let chirpTimer = 3;
  let chordTimer = 0;
  let chord = 0;

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

  function layer(c: AudioContext, type: BiquadFilterType, freq: number, q: number): GainNode {
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = c.createGain();
    gain.gain.value = 0;
    noiseSource(c).connect(filter).connect(gain).connect(c.destination);
    return gain;
  }

  function build(c: AudioContext): void {
    built = true;
    wind = layer(c, 'bandpass', 400, 0.4);
    hum = layer(c, 'lowpass', 120, 0.8);
    room = layer(c, 'lowpass', 300, 0.5);
    // Engine: a low sawtooth with a slow wobble.
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    engine = c.createGain();
    engine.gain.value = 0;
    osc.connect(lp).connect(engine).connect(c.destination);
    osc.start();
    // Pad: three triangle oscillators through a soft lowpass.
    const padFilter = c.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padGain = c.createGain();
    padGain.gain.value = 0;
    padFilter.connect(padGain).connect(c.destination);
    padOscs = CHORDS[0].map((f) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(padFilter);
      o.start();
      return o;
    });
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
      ease(wind, cues.outdoors ? g : g * 0.15, c);
      ease(hum, cues.outdoors ? g * 0.6 * Math.max(0, 1 - cues.roadDistance / 30) : 0, c);
      ease(room, cues.outdoors ? 0 : g * 0.5, c);
      ease(engine, cues.aboardBus ? g * 1.2 : 0, c, 0.4);
      ease(padGain, t.musicGain, c, 2);

      chordTimer += dt;
      if (chordTimer >= CHORD_SECONDS) {
        chordTimer = 0;
        chord = (chord + 1) % CHORDS.length;
        padOscs.forEach((o, i) =>
          o.frequency.setTargetAtTime(CHORDS[chord][i], c.currentTime, 0.5),
        );
      }
      if (cues.outdoors) {
        chirpTimer -= dt;
        if (chirpTimer <= 0) {
          chirpTimer = 2 + Math.random() * 4;
          const f = 1800 + Math.random() * 1400;
          audio.tone(f, 0.08, g * 0.5);
          audio.tone(f * 1.25, 0.06, g * 0.4);
        }
      }
    },
  };
}
