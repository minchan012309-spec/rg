export const keyMap = Object.fromEntries(
  ['QWERT', 'ASDFG'].flatMap((keys, player) =>
    [...keys].map((key, lane) => ['Key' + key, [player, lane]]))
);
export const hitWindow = 0.145;

export function createRound(song) {
  const maxScores = [0, 0];
  const turns = song.turns.map((turn, index) => {
    const player = index % 2;
    const response = turn.start + 4 * turn.beat;
    maxScores[player] += turn.hits.length * 1000;
    return {
      ...turn, player, response, end: response + 4 * turn.beat,
      notes: turn.hits.map(([step, lane]) => ({ lane, time: response + step * turn.beat, result: null })),
    };
  });
  return { turns, maxScores, scores: [0, 0], end: turns.at(-1).end + 0.35 };
}

export function advance(round, time) {
  let count = 0;
  for (const turn of round.turns) {
    for (const note of turn.notes) {
      if (!note.result && time > note.time + hitWindow) {
        note.result = 'MISS';
        count++;
      }
    }
  }
  return count;
}

export function press(round, player, lane, time) {
  const turn = round.turns.find(turn =>
    time >= turn.response - hitWindow && time < turn.end && turn.player === player);
  if (!turn) return null;
  const note = turn.notes.find(note =>
    !note.result && note.lane === lane && Math.abs(note.time - time) <= hitWindow);
  if (!note) return null;
  const perfect = Math.abs(note.time - time) <= 0.063;
  round.scores[player] += perfect ? 1000 : 650;
  note.result = perfect ? 'PERFECT' : 'GOOD';
  return note.result;
}
