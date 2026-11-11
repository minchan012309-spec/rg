export const playerKeys = ['QWERT', 'ASDFG'];
export const keyMap = Object.fromEntries(
  playerKeys.flatMap((keys, player) =>
    [...keys].map((key, lane) => ['Key' + key, [player, lane]]))
);
export const hitWindow = 0.145;

function beatTime(beats, step) {
  const i = Math.floor(step);
  return beats[i] + (beats[i + 1] - beats[i]) * (step - i);
}

export function createRound(song) {
  const rawMax = [0, 0];
  const turns = song.turns.map((turn, index) => {
    const player = index % 2;
    const beats = turn.beats ?? Array.from({ length: 9 }, (_, i) => turn.start + i * turn.beat);
    const half = (beats.length - 1) / 2;
    rawMax[player] += turn.hits.length * 1000;
    return {
      ...turn, player, response: beats[half], end: beats.at(-1),
      notes: turn.hits.map(([step, lane]) => ({
        lane, time: beatTime(beats, half + step), demoTime: beatTime(beats, step), result: null,
      })),
    };
  });
  const maxScores = song.scoreCap ? [song.scoreCap, song.scoreCap] : [...rawMax];
  return {
    turns, maxScores, rawMax, raw: [0, 0], scores: [0, 0],
    end: song.duration ?? turns.at(-1).end + .35,
  };
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
  let note = null;
  let distance = hitWindow;
  for (const candidate of turn.notes) {
    const delta = Math.abs(candidate.time - time);
    if (!candidate.result && candidate.lane === lane && delta <= distance) {
      note = candidate;
      distance = delta;
    }
  }
  if (!note) return null;
  const perfect = distance <= .063;
  round.raw[player] += perfect ? 1000 : 650;
  round.scores[player] = Math.round(round.raw[player] * round.maxScores[player] / round.rawMax[player]);
  note.result = perfect ? 'PERFECT' : 'GOOD';
  return note.result;
}
