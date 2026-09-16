import * as THREE from 'three';
import { PALETTE } from './appearance';
import type { DayState, Subject } from './dayState';
import { buildGorilla } from './gorilla';
import { advancePose, makePose } from './gorillaPose';
import { applyGorillaPose } from './gorillaRig';
import { tuning, type MovementTuning } from './movementTuning';
import type { PlayerRig } from './placeholderPlayer';
import { QuestionDeck, type Question } from './questions';
import { CLASSROOMS, type ClassroomSpec } from './school';
import { buildTextQuad, wrapText, type TextQuad } from './textQuad';

// Class: a teacher gorilla at the front, a board with the subject; raise a
// hand above your head for half a second while in the room and the board
// shows a question with four answer panels; touch one to answer. Three
// correct passes the class. Wrong answers just bring another question.
// Nothing is sealed: the bookshelves stay climbable.

type RoomState = 'idle' | 'asked' | 'flash' | 'passed';

/** True once when a hand has been above the head for the hold time. */
export function handRaised(
  hands: readonly THREE.Vector3[],
  head: THREE.Vector3,
  hold: { seconds: number },
  dt: number,
  t: MovementTuning = tuning,
): boolean {
  const up = hands.some((h) => h.y > head.y + t.handRaiseHeight);
  if (!up) {
    hold.seconds = 0;
    return false;
  }
  const before = hold.seconds;
  hold.seconds += dt;
  return before < t.handRaiseHoldS && hold.seconds >= t.handRaiseHoldS;
}

/** Index of a newly touched panel (edge-triggered), or -1. */
export function touchedPanel(
  hands: readonly THREE.Vector3[],
  panels: readonly THREE.Vector3[],
  radius: number,
  touching: boolean[],
): number {
  let hit = -1;
  for (let i = 0; i < panels.length; i++) {
    const now = hands.some((h) => h.distanceTo(panels[i]) <= radius);
    if (now && !touching[i] && hit === -1) hit = i;
    touching[i] = now;
  }
  return hit;
}

export interface Classrooms {
  group: THREE.Group;
  update(dt: number): void;
}

const SUBJECT_LABEL: Record<Subject, string> = {
  math: 'MATH',
  science: 'SCIENCE',
  history: 'HISTORY',
};
const PANEL_COLORS = ['#c53030', '#2b6cb0', '#2f855a', '#b7791f'];
const FLASH_SECONDS = 1.0;

interface Room {
  spec: ClassroomSpec;
  board: TextQuad;
  panels: TextQuad[];
  panelCentres: THREE.Vector3[];
  touching: boolean[];
  hold: { seconds: number };
  deck: QuestionDeck;
  question: Question | null;
  state: RoomState;
  flashUntil: number;
  clock: number;
}

const _head = new THREE.Vector3();
const _hands = [new THREE.Vector3(), new THREE.Vector3()];

export function buildClassrooms(
  scene: THREE.Scene,
  rig: PlayerRig,
  day: DayState,
  seed: number,
  t: MovementTuning = tuning,
): Classrooms {
  const group = new THREE.Group();
  group.name = 'classrooms';
  scene.add(group);

  const rooms: Room[] = CLASSROOMS.map((spec, i) => {
    // Teacher: a third-person gorilla facing the desks.
    const teacher = buildGorilla({
      bodyColor: (i + 2) % PALETTE.length,
      accessories: ['band', 'none'],
    });
    teacher.root.position.set(spec.teacherSpot[0], 0.85, spec.teacherSpot[2]);
    teacher.root.rotation.y = Math.PI; // face +z (toward the desks)
    for (const h of teacher.hand) teacher.root.add(h);
    teacher.hand[0].position.set(-0.3, -0.85, 0.35);
    teacher.hand[1].position.set(0.3, -0.85, 0.35);
    group.add(teacher.root);
    const pose = makePose();
    advancePose(
      pose,
      { velocity: new THREE.Vector3(), grounded: true, landingImpulse: 0 },
      1 / 60,
      t,
    );
    const handsWorld: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(), new THREE.Vector3()];
    teacher.root.updateWorldMatrix(true, true);
    teacher.hand[0].getWorldPosition(handsWorld[0]);
    teacher.hand[1].getWorldPosition(handsWorld[1]);
    applyGorillaPose(teacher, pose, handsWorld, t);

    // Board and four answer panels on the back wall, facing +z.
    const board = buildTextQuad({
      width: 1024,
      height: 512,
      worldWidth: 3.2,
      worldHeight: 1.6,
      background: '#1f3d2f',
      border: '#8b6f47',
    });
    board.mesh.position.set(spec.boardCentre[0], spec.boardCentre[1] + 0.2, spec.boardCentre[2]);
    group.add(board.mesh);
    const panels: TextQuad[] = [];
    const panelCentres: THREE.Vector3[] = [];
    for (let p = 0; p < 4; p++) {
      const panel = buildTextQuad({
        width: 512,
        height: 160,
        worldWidth: 1.4,
        worldHeight: 0.44,
        background: PANEL_COLORS[p],
        border: '#e8edf2',
      });
      const px = spec.boardCentre[0] + (p % 2 === 0 ? -0.8 : 0.8);
      const py = p < 2 ? 0.95 : 0.45;
      panel.mesh.position.set(px, py, spec.boardCentre[2] + 0.01);
      panel.draw([]);
      group.add(panel.mesh);
      panels.push(panel);
      panelCentres.push(panel.mesh.position.clone());
    }
    const room: Room = {
      spec,
      board,
      panels,
      panelCentres,
      touching: [false, false, false, false],
      hold: { seconds: 0 },
      deck: new QuestionDeck(spec.subject, seed),
      question: null,
      state: 'idle',
      flashUntil: 0,
      clock: 0,
    };
    drawIdle(room);
    return room;
  });

  function drawIdle(room: Room): void {
    room.board.draw([
      { text: SUBJECT_LABEL[room.spec.subject], size: 96, align: 'center', color: '#f7fafc' },
      {
        text: `${day.classCorrect[room.spec.subject]} / ${t.passCorrect}`,
        size: 56,
        align: 'center',
        color: '#c6f6d5',
      },
    ]);
    for (const p of room.panels) p.draw([], 'rgba(0,0,0,0)');
  }

  function drawQuestion(room: Room, q: Question): void {
    const lines = wrapText(q.prompt, 26).map((text) => ({
      text,
      size: 60,
      align: 'center' as const,
    }));
    room.board.draw([
      { text: SUBJECT_LABEL[room.spec.subject], size: 40, align: 'center', color: '#c6f6d5' },
      ...lines,
    ]);
    q.options.forEach((option, i) =>
      room.panels[i].draw([{ text: option, size: 44, align: 'center' }], PANEL_COLORS[i]),
    );
  }

  function ask(room: Room): void {
    room.question = room.deck.next();
    room.state = 'asked';
    drawQuestion(room, room.question);
  }

  // Teachers and boards are only drawn while the player is in the school
  // block (the interior chunk rule), so they never cost from outside.
  const schoolBounds = new THREE.Box3();
  for (const spec of CLASSROOMS) schoolBounds.union(spec.bounds);
  schoolBounds.expandByScalar(12);

  return {
    group,
    update(dt: number): void {
      rig.head.getWorldPosition(_head);
      rig.handLeft.getWorldPosition(_hands[0]);
      rig.handRight.getWorldPosition(_hands[1]);
      group.visible = schoolBounds.containsPoint(_head);
      for (const room of rooms) {
        room.clock += dt;
        if (day.classPassed(room.spec.subject)) {
          if (room.state !== 'passed') {
            room.state = 'passed';
            room.board.draw([
              { text: SUBJECT_LABEL[room.spec.subject], size: 56, align: 'center' },
              { text: 'PASSED', size: 110, align: 'center', color: '#68d391' },
            ]);
            for (const p of room.panels) p.draw([], 'rgba(0,0,0,0)');
          }
          continue;
        }
        const inside = room.spec.bounds.containsPoint(_head);
        if (!inside) {
          room.hold.seconds = 0;
          continue;
        }
        switch (room.state) {
          case 'idle':
            if (handRaised(_hands, _head, room.hold, dt, t)) ask(room);
            break;
          case 'asked': {
            const hit = touchedPanel(_hands, room.panelCentres, t.answerTouchRadius, room.touching);
            if (hit >= 0 && room.question !== null) {
              const correct = hit === room.question.answer;
              day.answer(room.spec.subject, correct);
              room.panels[hit].draw(
                [{ text: room.question.options[hit], size: 44, align: 'center' }],
                correct ? '#38a169' : '#742a2a',
              );
              room.state = 'flash';
              room.flashUntil = room.clock + FLASH_SECONDS;
            }
            break;
          }
          case 'flash':
            if (room.clock >= room.flashUntil) {
              if (day.classPassed(room.spec.subject)) break; // handled next frame
              ask(room); // another question, right away
            }
            break;
          case 'passed':
            break;
        }
      }
    },
  };
}
