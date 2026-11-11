export const moves = [
  { id: 'hop', name: '점프', type: 'triangle', from: 240, to: 580, length: .18 },
  { id: 'leap', name: '높이뛰기', type: 'sine', from: 310, to: 920, length: .27 },
  { id: 'slide', name: '슬라이드', type: 'sawtooth', from: 320, to: 90, length: .16 },
  { id: 'stomp', name: '쿵 찍기', type: 'triangle', from: 145, to: 42, length: .23 },
  { id: 'spin', name: '회전', type: 'square', from: 520, to: 265, length: .16 },
];

export function course(round) {
  return round.turns.flatMap(turn => [
    ...turn.notes.map((note, index) => ({
      at: note.demoTime, lane: note.lane, side: turn.player,
      demo: true, beat: turn.beat, note: null, index,
    })),
    ...turn.notes.map((note, index) => ({
      at: note.time, lane: note.lane, side: turn.player,
      demo: false, beat: turn.beat, note, index,
    })),
  ]);
}

export function obstaclePosition(obstacle, time) {
  const delta = (obstacle.at - time) / obstacle.beat;
  return delta > 1.55 || delta < -.5 ? null : delta;
}
