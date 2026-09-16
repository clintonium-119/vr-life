import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { handRaised, touchedPanel } from './classroom';
import { tuning } from './movementTuning';

describe('handRaised', () => {
  it('fires once after the hold time and resets when lowered', () => {
    const head = new Vector3(0, 1.1, 0);
    const up = [new Vector3(0.3, 1.4, 0), new Vector3(-0.3, 0.6, 0)];
    const down = [new Vector3(0.3, 0.9, 0), new Vector3(-0.3, 0.6, 0)];
    const hold = { seconds: 0 };
    let fired = 0;
    for (let i = 0; i < 100; i++) if (handRaised(up, head, hold, 0.02, tuning)) fired++;
    expect(fired).toBe(1);
    handRaised(down, head, hold, 0.02, tuning);
    expect(hold.seconds).toBe(0);
    for (let i = 0; i < 100; i++) if (handRaised(up, head, hold, 0.02, tuning)) fired++;
    expect(fired).toBe(2);
  });
});

describe('touchedPanel', () => {
  it('edge-triggers once per touch and picks the touched panel', () => {
    const panels = [
      new Vector3(-0.8, 0.95, 0),
      new Vector3(0.8, 0.95, 0),
      new Vector3(-0.8, 0.45, 0),
      new Vector3(0.8, 0.45, 0),
    ];
    const touching = [false, false, false, false];
    const far = [new Vector3(0, 2, 2), new Vector3(0, 2, 2)];
    expect(touchedPanel(far, panels, 0.2, touching)).toBe(-1);
    const onB = [new Vector3(0.75, 1.0, 0.05), new Vector3(0, 2, 2)];
    expect(touchedPanel(onB, panels, 0.2, touching)).toBe(1);
    expect(touchedPanel(onB, panels, 0.2, touching)).toBe(-1); // still touching: no repeat
    expect(touchedPanel(far, panels, 0.2, touching)).toBe(-1);
    expect(touchedPanel(onB, panels, 0.2, touching)).toBe(1); // touched again
  });
});
