import { levels, remixTurn } from './remix.mjs';

function beatTime(beats, step) {
  const i = Math.floor(step);
  return beats[i] + (beats[i + 1] - beats[i]) * (step - i);
}

export function createRound(song, level = 'soft', buttonMode = 'five') {
  const standard = levels.find(item => item.id === level) ?? levels[0];
  const denseHard = song.id === 'bgm3' && standard.id === 'hard';
  const profile = denseHard ? { ...standard, good: .082, perfect: .038, preview: 1.55 } : standard;
  const rawMax = [0, 0];
  const turns = song.turns.map((turn, index) => {
    const player = index % 2;
    const beats = turn.beats ?? Array.from({ length: 9 }, (_, i) => turn.start + i * turn.beat);
    const repeats = turn.demoRepeats ?? song.demoRepeats ?? 1;
    const lead = turn.demoLead ?? 0;
    const prepBeats = song.prepBeats ?? 0;
    const phraseBeats = (beats.length - 1 - lead - prepBeats) / (repeats + 1);
    const prepareBeat = lead + phraseBeats * repeats;
    const responseBeat = prepareBeat + prepBeats;
    const demonstrations = Array.from({ length: repeats }, (_, i) => beats[lead + phraseBeats * i]);
    const arranged = remixTurn(song.sharedDemo ? index - player : index, phraseBeats, profile.id, song.sceneOffset, denseHard);
    const hits = turn.hits ?? arranged.hits;
    rawMax[player] += hits.length * 1000;
    return {
      ...turn, player, scene: arranged.scene, hits, demonstrations, prepare: beats[prepareBeat], prepTicks: beats.slice(prepareBeat, responseBeat),
      response: beats[responseBeat], end: beats.at(-1),
      notes: hits.map(([step, actionLane], noteIndex) => ({
        lane: buttonMode === 'domes' ? noteIndex % 2 : actionLane, actionLane, time: beatTime(beats, responseBeat + step),
        demoTimes: demonstrations.map((_, i) => beatTime(beats, lead + phraseBeats * i + step)),
        result: null,
      })),
    };
  });
  const maxScores = song.scoreCap ? [song.scoreCap, song.scoreCap] : [...rawMax];
  return {
    turns, profile, buttonMode, maxScores, rawMax, raw: [0, 0], scores: [0, 0],
    end: song.duration ?? turns.at(-1).end + .35,
  };
}

export function advance(round, time) {
  let count = 0;
  for (const turn of round.turns) {
    for (const note of turn.notes) {
      if (!note.result && time > note.time + round.profile.good) {
        note.result = 'MISS';
        count++;
      }
    }
  }
  return count;
}

export function press(round, player, lane, time) {
  const turn = round.turns.find(turn =>
    time >= turn.response - round.profile.good && time < turn.end && turn.player === player);
  if (!turn) return null;
  let note = null;
  let distance = round.profile.good;
  for (const candidate of turn.notes) {
    const delta = Math.abs(candidate.time - time);
    if (!candidate.result && candidate.lane === lane && delta <= distance) {
      note = candidate;
      distance = delta;
    }
  }
  if (!note) return null;
  const perfect = distance <= round.profile.perfect;
  round.raw[player] += perfect ? 1000 : 650;
  round.scores[player] = Math.round(round.raw[player] * round.maxScores[player] / round.rawMax[player]);
  note.result = perfect ? 'PERFECT' : 'GOOD';
  round.lastHit = note;
  return note.result;
}
