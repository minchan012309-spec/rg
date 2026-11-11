import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moves, course, obstaclePosition } from '../web/game/course.mjs';
import { createRound } from '../web/game/rhythm.mjs';

test('the same obstacle reaches the line in demonstration and response four beats apart', () => {
  const round = createRound({ turns: [{ start: 1, beat: .5, hits: [[0, 0], [1.5, 4]] }] });
  const obstacles = course(round);
  assert.deepEqual(obstacles.map(({ at, lane, demo }) => [at, lane, demo]), [
    [1, 0, true], [1.75, 4, true], [3, 0, false], [3.75, 4, false],
  ]);
  assert.equal(obstaclePosition(obstacles[2], 3), 0);
  assert.ok(obstaclePosition(obstacles[2], 2.8) > 0);
  assert.ok(obstaclePosition(obstacles[2], 3.1) < 0);
  assert.equal(obstaclePosition(obstacles[2], 1), null);
});

test('all five physical positions have a distinct obstacle action', () => {
  assert.deepEqual(moves.map(move => move.id), ['hop', 'leap', 'slide', 'stomp', 'spin']);
});

test('two full demonstrations play in order before the response can score', () => {
  const round = createRound({
    demoRepeats: 2,
    turns: [{ start: 1, beat: .5, beats: Array.from({ length: 13 }, (_, i) => 1 + i * .5),
      hits: [[0, 0], [2, 1]] }],
  });
  const turn = round.turns[0];
  assert.deepEqual(turn.demonstrations, [1, 3]);
  assert.equal(turn.response, 5);
  assert.deepEqual(course(round).map(({ at, lane }) => [at, lane]),
    [[1, 0], [2, 1], [3, 0], [4, 1], [5, 0], [6, 1]]);
});
