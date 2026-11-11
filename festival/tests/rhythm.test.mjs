import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRound, press, advance, keyMap } from '../web/game/rhythm.mjs';

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
  assert.equal(press(round, 1, 0, 7.08), 'GOOD');
  assert.deepEqual(round.scores, [1000, 650]);
});

test('an overdue hit becomes a miss once and both gauges have equal capacity', () => {
  const round = createRound(chart);
  assert.equal(advance(round, 3.2), 1);
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
  assert.equal(press(round, 0, 0, 3), null);
  assert.equal(press(round, 0, 4, 3.2), null);
  assert.equal(press(round, 0, 0, 3.2), 'PERFECT');
  assert.equal(press(round, 0, 2, 3.975), 'PERFECT');
  assert.equal(round.scores[0], 16000);
  assert.equal(round.end, 6);
});
