import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultBindings, assignBinding, bindingMap, physicalButtons } from '../web/game/controls.mjs';

test('the controller has two large and three small buttons with distinct red icons', () => {
  assert.deepEqual(physicalButtons.map(button => [button.size, button.name]), [
    ['big','큰 빨강'], ['big','큰 흰색'], ['small','작은 빨강'], ['small','작은 초록'], ['small','작은 파랑'],
  ]);
});

test('reassigning an occupied code swaps it without sharing a key between players', () => {
  const bindings = assignBinding(defaultBindings, 0, 0, 'KeyG');
  const mapped = bindingMap(bindings);
  assert.deepEqual(mapped.KeyG, [0, 0]);
  assert.deepEqual(mapped.KeyQ, [1, 4]);
  assert.equal(Object.keys(mapped).length, 10);
  assert.equal(defaultBindings[0][0], 'KeyQ');
});

test('a free keyboard key maps to the chosen physical button', () => {
  const bindings = assignBinding(defaultBindings, 1, 2, 'Digit7');
  assert.deepEqual(bindingMap(bindings).Digit7, [1, 2]);
  assert.equal(bindingMap(bindings).KeyD, undefined);
  assert.throws(() => assignBinding(bindings, 1, 2, 'Escape'));
});
