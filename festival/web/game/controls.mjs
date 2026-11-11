export const physicalButtons = [
  { size: 'big', name: '큰 빨강', color: '#e43b52' },
  { size: 'big', name: '큰 흰색', color: '#fff7e8' },
  { size: 'small', name: '작은 빨강', color: '#e43b52' },
  { size: 'small', name: '작은 초록', color: '#45c375' },
  { size: 'small', name: '작은 파랑', color: '#488fec' },
];

export const defaultBindings = [
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'],
];

export function bindingMap(bindings) {
  return Object.fromEntries(bindings.flatMap((row, player) =>
    row.map((code, lane) => [code, [player, lane]])));
}

function usableCode(code) {
  return typeof code === 'string' &&
    /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right)|Space|Enter|NumpadEnter|Backspace|Semicolon|Quote|Comma|Period|Slash|BracketLeft|BracketRight|Minus|Equal|Backslash|Backquote)$/.test(code);
}

export function readBindings(serialized) {
  try {
    const rows = JSON.parse(serialized);
    if (rows?.length === 2 && rows.every(row => Array.isArray(row) && row.length === 5 && row.every(usableCode)) &&
        new Set(rows.flat()).size === 10) return rows;
  } catch {
    // Fall back if a saved configuration is malformed.
  }
  return defaultBindings;
}

export function assignBinding(bindings, player, lane, code) {
  if (!usableCode(code)) throw new Error('이 키는 등록할 수 없습니다. 다른 버튼을 누르세요.');
  const rows = bindings.map(row => [...row]);
  const previous = bindingMap(bindings)[code];
  if (previous) rows[previous[0]][previous[1]] = rows[player][lane];
  rows[player][lane] = code;
  return rows;
}

export function buttonIcon(lane) {
  const { size, color, name } = physicalButtons[lane];
  return '<span class="button-icon ' + size + '" style="--cap:' + color +
    '" role="img" aria-label="' + name + '"></span>';
}

export function describeCode(code) {
  return code.replace(/^Key|^Digit/, '').replace('Arrow', '방향키 ').replace('Numpad', '숫자패드 ');
}
