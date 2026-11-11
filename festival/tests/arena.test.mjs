import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../web/game/remix.mjs';
import { arenas, signalPosition } from '../web/game/arena.mjs';

test('all twenty scenes use distinct arena paths and meet the target exactly on the beat', () => {
  const paths = new Set();
  for (const scene of scenes) {
    const arena = arenas[scene.id];
    const positions = [.2, .6, 1].map(progress => signalPosition(scene.id, 0, progress));
    paths.add(JSON.stringify(positions));
    assert.deepEqual(positions.at(-1).slice(0, 2), arena.targets[0]);
    assert.notDeepEqual(positions[0], positions[2]);
    assert.ok(scene.props.every(([, name]) => /^[a-z-]+$/.test(name)));
  }
  assert.equal(paths.size, 20);
});

test('the drum cue contracts in place while the grill drops ingredients downwards', () => {
  const drumStart = signalPosition('drums', 1, .2);
  const drumEnd = signalPosition('drums', 1, 1);
  assert.deepEqual(drumStart.slice(0, 2), drumEnd.slice(0, 2));
  assert.ok(drumStart[2] > drumEnd[2]);
  assert.ok(signalPosition('grill', 0, .2)[1] < signalPosition('grill', 0, 1)[1]);
});
