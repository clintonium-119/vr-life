import { tuning, type MovementTuning } from './movementTuning';

// Music: real tracks (Kevin MacLeod, CC BY 4.0, see CREDITS.md) as looping
// media elements, one per mood, crossfaded by what the player is doing:
// the town by day, the school between classes, the chase while wanted.
// Nothing plays before the first gesture; volume is a tuning knob.

export type Mood = 'town' | 'school' | 'chase';

export interface Music {
  /** Call from a user gesture: unlocks playback. */
  resume(): void;
  setMood(mood: Mood): void;
  update(dt: number): void;
  readonly mood: Mood;
}

const FADE_PER_S = 0.6;

export function buildMusic(baseUrl: string, t: MovementTuning = tuning): Music {
  const tracks: Record<Mood, HTMLAudioElement> = {
    town: new Audio(`${baseUrl}audio/music/town.mp3`),
    school: new Audio(`${baseUrl}audio/music/school.mp3`),
    chase: new Audio(`${baseUrl}audio/music/chase.mp3`),
  };
  for (const a of Object.values(tracks)) {
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
  }
  let mood: Mood = 'town';
  let unlocked = false;
  const level: Record<Mood, number> = { town: 0, school: 0, chase: 0 };

  return {
    get mood() {
      return mood;
    },
    resume(): void {
      if (unlocked) return;
      unlocked = true;
      for (const a of Object.values(tracks)) {
        void a.play().catch(() => {
          /* autoplay policy: the next gesture retries via resume() */
          unlocked = false;
        });
      }
    },
    setMood(next): void {
      mood = next;
    },
    update(dt): void {
      if (!unlocked) return;
      for (const key of Object.keys(tracks) as Mood[]) {
        const target = key === mood ? 1 : 0;
        level[key] +=
          Math.sign(target - level[key]) * Math.min(Math.abs(target - level[key]), FADE_PER_S * dt);
        tracks[key].volume = Math.min(1, Math.max(0, level[key] * t.musicGain));
      }
    },
  };
}
