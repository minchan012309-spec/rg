import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRound, press, advance } from '../web/game/rhythm.mjs';
import { bindingMap, defaultBindings } from '../web/game/controls.mjs';
const keyMap = bindingMap(defaultBindings);

const chart = { turns: [
  { start: 1, beat: 0.5, hits: [[0, 0], [1, 1], [2, 3], [3, 4]] },
  { start: 5, beat: 0.5, hits: [[0, 0], [1, 1], [2, 3], [3, 4]] },
] };

test('the demonstration accepts no hits and only the active player can score', () => {
  const round = createRound(chart);
  assert.equal(press(round, 0, 0, 1), null);
  assert.equal(press(round, 1, 0, 3), null);
  assert.equal(press(round, 0, 0, 3), 'PERFECT');
  assert.equal(press(round, 0, 0, 3), null);
  assert.equal(press(round, 0, 0, 7), null);
  assert.equal(press(round, 1, 0, 7.14), 'GOOD');
  assert.deepEqual(round.scores, [1000, 650]);
});

test('an overdue hit becomes a miss once and both gauges have equal capacity', () => {
  const round = createRound(chart);
  assert.equal(advance(round, 3.25), 1);
  assert.equal(advance(round, 3.3), 0);
  assert.deepEqual(round.maxScores, [4000, 4000]);
});

test('physical key codes preserve all ten ESP32 mappings', () => {
  assert.deepEqual(keyMap.KeyQ, [0, 0]);
  assert.deepEqual(keyMap.KeyT, [0, 4]);
  assert.deepEqual(keyMap.KeyA, [1, 0]);
  assert.deepEqual(keyMap.KeyG, [1, 4]);
});

test('each supplied song has an even number of turns with equal scoring opportunities', () => {
  const songs = JSON.parse(readFileSync(new URL('../web/game/songs.json', import.meta.url)));
  assert.equal(songs.length, 3);
  for (const song of songs) {
    const round = createRound(song);
    assert.ok(song.turns.length > 8 && song.turns.length % 2 === 0);
    assert.equal(round.rawMax[0], round.rawMax[1]);
    assert.deepEqual(round.maxScores, [16000, 16000]);
    assert.equal(round.end, song.duration);
    assert.ok(round.turns.at(-1).end > song.duration - 4);
    for (const turn of round.turns) {
      assert.ok(turn.notes.every(note => note.time >= turn.response && note.time < turn.end));
    }
  }
});

test('scoring follows measured beat timestamps instead of an average beat period', () => {
  const round = createRound({
    duration: 6, scoreCap: 16000,
    turns: [{
      start: 1, beat: .5, beats: [1, 1.5, 2, 2.5, 3.2, 3.7, 4.25, 4.75, 5.25],
      hits: [[0, 0], [1.5, 2]],
    }],
  });
  assert.equal(press(round, 0, 0, 2.9), null);
  assert.equal(press(round, 0, 4, 3.2), null);
  assert.equal(press(round, 0, 0, 3.2), 'PERFECT');
  assert.equal(press(round, 0, 2, 3.975), 'PERFECT');
  assert.equal(round.scores[0], 16000);
  assert.equal(round.end, 6);
});

test('festival players can hit a note 200 ms late and still score GOOD', () => {
  const round = createRound(chart);
  assert.equal(advance(round, 3.2), 0);
  assert.equal(press(round, 0, 0, 3.2), 'GOOD');
  assert.equal(press(round, 0, 1, 3.59), 'PERFECT');
});

test('all levels use full beats, equal opportunities, and different density', () => {
  const songs = JSON.parse(readFileSync(new URL('../web/game/songs.json', import.meta.url)));
  for (const song of songs) {
    const rounds = ['soft', 'medium', 'hard'].map(level => createRound(song, level));
    const [soft, medium, hard] = rounds;
    assert.ok(soft.rawMax[0] < medium.rawMax[0] && medium.rawMax[0] < hard.rawMax[0]);
    assert.ok(soft.turns.every(turn => turn.hits.length === 2 && turn.hits[1][0] === 2));
    for (const round of rounds) {
      assert.equal(round.rawMax[0], round.rawMax[1]);
      assert.ok(round.turns.every(turn => turn.hits.every(([step]) => Number.isInteger(step))));
      assert.ok(round.turns.every((turn, index) => turn.scene === round.turns[index ^ 1].scene));
    }
  }
  const used = songs.flatMap(song => createRound(song).turns.map(turn => turn.scene.id));
  assert.equal(new Set(used).size, 20);
});

test('hard rejects a late key that soft accepts', () => {
  const hard = createRound(chart, 'hard');
  const soft = createRound(chart, 'soft');
  assert.equal(press(hard, 0, 0, 3.2), null);
  assert.equal(press(soft, 0, 0, 3.2), 'GOOD');
});

test('every recording has a hell level and Remix 4 hard starts at full density', () => {
  const songs = JSON.parse(readFileSync(new URL('../web/game/songs.json', import.meta.url)));
  for (const song of songs) {
    const hard = createRound(song, 'hard');
    const hell = createRound(song, 'hell');
    assert.equal(hell.profile.id, 'hell');
    assert.ok(hell.profile.good < hard.profile.good);
    assert.ok(hell.profile.preview < hard.profile.preview);
    assert.ok(hell.turns.every(turn => turn.hits.length === 4 && new Set(turn.hits.map(hit => hit[1])).size === 3));
    assert.equal(hell.rawMax[0], hell.rawMax[1]);
  }
  const remix4 = createRound(songs[2], 'hard');
  assert.ok(remix4.turns.every(turn => turn.hits.length === 4));
  assert.ok(remix4.profile.good < createRound(songs[0], 'hard').profile.good);
});

test('big-only play keeps the scene actions but judges only the two dome buttons', () => {
  const round = createRound(chart, 'soft', 'domes');
  const turn = round.turns[0];
  assert.deepEqual(turn.notes.map(note => [note.lane, note.actionLane]), [[0,0],[1,1],[0,3],[1,4]]);
  assert.equal(press(round, 0, 3, 4), null);
  assert.equal(press(round, 0, 0, 4), 'PERFECT');
  assert.equal(round.lastHit.actionLane, 3);
  assert.deepEqual(round.rawMax, [4000, 4000]);
});

test('each minigame teaches a shared pattern before player one and skips player two’s demonstration', () => {
  const songs = JSON.parse(readFileSync(new URL('../web/game/songs.json', import.meta.url)));
  for (const song of songs) for (const level of ['soft','medium','hard','hell']) {
    const { turns } = createRound(song, level);
    for (let i = 0; i < turns.length; i += 2) {
      const [one, two] = turns.slice(i, i + 2);
      assert.equal(one.demonstrations.length, 2);
      assert.equal(two.demonstrations.length, 0);
      assert.deepEqual(one.hits, two.hits);
      assert.equal(two.prepTicks.length, 3);
      assert.equal(one.end, two.start);
    }
  }
});
