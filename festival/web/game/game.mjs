import { createRound, press, advance } from './rhythm.mjs';
import { FestivalCloud } from '../shared/cloud.mjs';
import { title } from './title.mjs';
import { moves, course, approachProgress, railProgress } from './course.mjs';
import { Playback } from './playback.mjs';
import { levels, sceneProp } from './remix.mjs';
import { Arena } from './arena.mjs';
import { MenuMusic } from './menu-music.mjs';
import { physicalButtons, defaultBindings, bindingMap, readBindings, assignBinding, buttonIcon, describeCode } from './controls.mjs';

const bindingStorage = 'festival-controller-bindings';
const modeStorage = 'festival-button-mode';
let buttonMode = localStorage.getItem(modeStorage) === 'domes' ? 'domes' : 'five';
let bindings = readBindings(localStorage.getItem(bindingStorage));
let keyMap = bindingMap(bindings);
let bindingDraft, captureTarget;
const offsetStorage = 'festival-input-offset';
let inputOffset = Math.max(-200, Math.min(200, Number(localStorage.getItem(offsetStorage)) || 0));
const get = id => document.getElementById(id);
const screen = get('screen');
const guide = get('guide');
const cloud = new FestivalCloud('festival-station');
const menuMusic = new MenuMusic();
const musicMenus = ['home', 'songs', 'levels', 'characters'];
addEventListener('pointerdown', () => menuMusic.unlock(), { capture: true });
addEventListener('keydown', () => menuMusic.unlock(), { capture: true });
const loadTrack = source => fetch(source).then(response => {
  if (!response.ok) throw new Error('음원 파일을 찾을 수 없습니다.');
  return response.arrayBuffer();
});
const clock = time => Math.floor(time / 60) + ':' + String(Math.floor(time % 60)).padStart(2, '0');
const roster = { team: '', names: [] };
const characters = ['스파크', '젤리', '비트봇', '모모'];
const records = JSON.parse(localStorage.getItem('festival-scores') || '[]');
const songs = await fetch('./songs.json').then(response => response.json());
const avatar = id => '<span aria-hidden="true" class="avatar" data-avatar="' + id + '"><i></i></span>';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const playerName = side => currentNames[side] || 'PLAYER ' + (side + 1);

function fitDisplay() {
  document.documentElement.style.setProperty('--fit', Math.min(innerWidth / 1600, innerHeight / 900));
}
addEventListener('resize', fitDisplay);
fitDisplay();

document.title = title;
document.querySelector('[data-title]').textContent = title;

let level = levels.findIndex(item => item.id === localStorage.getItem('festival-level'));
if (level < 0) level = 0;
let currentScene, arena, visibleSide = 0;
let page, focus = 0, selected = 0, choosing = 0, chosen = [0, 1];
let round, matchId, paused = false, starting = false, currentNames = [], receipt, playback;
let pauseFocus = 0, confirmingQuit = false;
let beatGuide = localStorage.getItem('festival-beat-guide') !== 'off';
let autoPlay = localStorage.getItem('festival-autoplay') === 'on';
let autoSince = 0, exhibition = false;
let lastPhase = '', lastCueNote, lastTurnIndex = -1, judgementTimer, recentInput = -Infinity;
let visibleTimingNotes = new Set();
let obstacles = [], demos = [], responses = [], nextSound = 0, nextMove = 0, nextBeatSound = 0, nextBeatPulse = 0;
const padTimers = new Map();

let boardEntries = [], rosterAtStart = '', projectAtStart = '';
const savedScores = () => localStorage.setItem('festival-scores', JSON.stringify(records));
const pane = (heading, content) => '<section class="pane"><h1>' + heading + '</h1>' + content + '</section>';
const back = '<div class="actions"><button data-action="back">뒤로</button></div>';
const audioError = message => { guide.textContent = message; };

function show(next, index = 0) {
  page = next;
  focus = index;
  menuMusic.update(musicMenus.includes(next));
  render();
}

function render() {
  get('pause-button').hidden = page !== 'play';
  get('pause-button').textContent = '일시정지';
  get('settings').hidden = page === 'play';
  get('button-settings').hidden = page === 'play';
  get('auto-indicator').hidden = !autoPlay;
  const song = songs[selected];
  if (page === 'home') {
    screen.innerHTML = '<section class="home"><div><span class="kicker">2인 리듬 대결</span><h1>' + escape(title) +
      '</h1><p>네 박자를 듣고 따라 쳐!<br>번갈아 플레이해서 게이지를 채워라.</p><div class="actions">' +
      '<button class="primary" data-action="play">게임 시작</button><button data-action="board">팀 점수판</button></div></div>' +
      '<div class="mascots" aria-hidden="true">' + avatar(0) + avatar(1) + '</div></section>';
  }
  if (page === 'songs') {
    screen.innerHTML = pane('곡 선택', '<p>플레이할 리믹스를 고르세요.</p><div class="tiles">' +
      songs.map((item, index) => '<button class="tile" data-action="song" data-index="' + index + '"><b>' +
        escape(item.name) + '</b><span>' + item.bpm + ' BPM · ' + clock(item.duration) + ' · ' + item.turns.length + '턴</span></button>').join('') + '</div>' + back);
  }
  if (page === 'levels') {
    screen.innerHTML = pane('난이도 선택', '<p>' + escape(song.name) + ' · ' + clock(song.duration) + '</p><div class="tiles level-tiles">' +
      levels.map((item, index) => '<button class="tile level-tile" data-action="level" data-index="' + index + '"><b>' +
        item.name + '</b><span>' + item.description + '</span></button>').join('') + '</div>' + back);
  }
  if (page === 'characters') {
    screen.innerHTML = pane('PLAYER ' + (choosing + 1) + ' 캐릭터 선택', '<p>' + escape(song.name) + ' · ' + levels[level].name +
      '</p><div class="tiles characters">' + characters.map((name, index) =>
        '<button class="tile" data-action="character" data-index="' + index + '">' + avatar(index) + name + '</button>').join('') +
        '</div>' + back);
  }
  if (page === 'play') {
    const meters = [0, 1].map(side => '<div class="meter"><span>' + escape(playerName(side)) +
      '</span><strong id="score' + side + '">0</strong><progress aria-label="플레이어 ' + (side + 1) +
      ' 점수" id="bar' + side + '" max="' + round.maxScores[side] + '" value="0"></progress></div>').join('');
    const pads = moves.map((_, lane) => '<span class="pad" id="pad' + lane +
      '">' + buttonIcon(lane) + '<small></small></span>').join('');
    screen.innerHTML = '<section class="game"><div class="hud">' + meters +
      '</div><div class="stage course-stage" id="stage"><div class="stage-top"><strong id="scene-name"></strong><div id="phase"></div><span id="clock"></span></div>' +
      '<div class="timing-rail" id="timing-rail" aria-label="버튼 타이밍"><span class="timing-target" id="timing-target"></span><div id="timing-notes"></div></div>' +
      '<canvas class="arena" id="arena"></canvas><div id="handoff" class="handoff" hidden></div><div id="prep-callout" class="prep-callout" hidden></div><div class="stage-bottom"><span id="cue"></span><strong id="judgement"></strong>' +
      '</div><section class="pause-overlay" id="pause-overlay" hidden aria-label="일시정지"></section></div><div class="control-deck"><div class="console" id="pads">' + pads + '</div><span id="last-input"></span></div></section>';
    arena = new Arena(get('arena'));
    const timingNotes = get('timing-notes');
    obstacles = course(round).map(obstacle => {
      const marker = document.createElement('span');
      marker.className = 'timing-note';
      marker.dataset.demo = obstacle.demo;
      marker.innerHTML = buttonIcon(obstacle.lane);
      marker.hidden = true;
      timingNotes.append(marker);
      return { ...obstacle, marker };
    });
    visibleTimingNotes.clear();
    demos = obstacles.filter(obstacle => obstacle.demo);
    responses = obstacles.filter(obstacle => !obstacle.demo);
    nextSound = nextMove = nextBeatSound = nextBeatPulse = 0;
    currentScene = null;
    visibleSide = 0;
    changeScene(round.turns[0].scene);
    padTimers.clear();
  }
  if (page === 'result') {
    const [one, two] = round.scores;
    const winner = one === two ? '무승부' : playerName(one > two ? 0 : 1) + ' 승리!';
    screen.innerHTML = pane('결과 집계 중…', '<p>' + escape(song.name) + ' · ' + round.profile.name + (exhibition ? ' · 전시 자동 플레이' : '') +
      '</p><div class="stats result-stats">' + round.scores.map((_, side) =>
        '<div>' + avatar(chosen[side]) + '<span>' + escape(playerName(side)) + '</span><strong id="final-score' +
        side + '">0</strong><div class="result-meter"><i id="final-bar' + side + '"></i></div></div>').join('') +
      '</div><p id="team-total"></p><div class="actions" id="result-actions" hidden><button class="primary" data-action="back">메인화면</button>' +
      '<button data-action="board">팀 점수판</button></div>');
    revealResult(winner);
  }
  if (page === 'board') {
    screen.innerHTML = pane('팀 점수판', '<p>두 플레이어의 점수를 합산합니다.</p><ol class="ranks">' +
      (boardEntries.length ? boardEntries.slice(0, 30).map((record, i) => '<li><span>' + (i + 1) +
        '</span><span>' + escape(record.team || '참가팀') + ' · ' + escape(songs.find(s => s.id === record.song)?.name) +
        '</span><strong>' + (record.score1 + record.score2).toLocaleString() + '</strong></li>').join('') :
        '<li>아직 기록이 없습니다.</li>') + '</ol>' + back);
  }
  guide.innerHTML = page === 'play'
    ? '버튼 아이콘이 판정 원에 겹칠 때 같은 버튼을 누르세요.'
    : '<span>플레이어 1</span><span>' + buttonIcon(0) + buttonIcon(1) + ' 이동</span><span>' +
      buttonIcon(2) + ' 선택</span><span>' + buttonIcon(3) + ' 뒤로</span><span>' + buttonIcon(4) + ' 점수판</span>';
  highlight();
}

function highlight() {
  screen.querySelectorAll('[data-action]').forEach((button, i) => {
    button.classList.toggle('selected', focus === i);
  });
}

async function showBoard() {
  if (page === 'play') return;
  boardEntries = [...records].sort((a, b) => b.score1 + b.score2 - a.score1 - a.score2);
  show('board');
  if (!cloud.session) return;
  try {
    const entries = await cloud.rpc('leaderboard');
    const merged = new Map(boardEntries.map(entry => [entry.id, entry]));
    for (const entry of entries) merged.set(entry.id, entry);
    boardEntries = [...merged.values()].sort((a, b) => b.score1 + b.score2 - a.score1 - a.score2);
    if (page === 'board') render();
  } catch {
    if (page === 'board') guide.textContent = '서버 연결이 끊겼습니다. PC에 저장된 점수를 표시합니다.';
  }
}

function action(type, index) {
  if (starting || page === 'play') return;
  switch (type) {
    case 'play': show('songs', selected); break;
    case 'board': void showBoard(); break;
    case 'song':
      selected = index;
      show('levels', level);
      break;
    case 'level':
      level = index;
      localStorage.setItem('festival-level', levels[level].id);
      choosing = 0;
      show('characters', chosen[0]);
      break;
    case 'character':
      chosen[choosing] = index;
      if (choosing === 0) {
        choosing = 1;
        show('characters', chosen[1]);
      } else void start().catch(error => audioError(error.message));
      break;
    case 'back':
      if (page === 'characters' && choosing === 1) {
        choosing = 0;
        show('characters', chosen[0]);
      } else if (page === 'characters') show('levels', level);
      else if (page === 'levels') show('songs', selected);
      else show('home');
      break;
  }
}

screen.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) action(button.dataset.action, Number(button.dataset.index));
  const pauseButton = event.target.closest('[data-pause-action]');
  if (pauseButton && paused) pauseAction(pauseButton.dataset.pauseAction);
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  if (get('button-dialog').open) {
    captureBinding(event);
    return;
  }
  if (get('connection').open) return;
  const mapped = keyMap[event.code];
  const menuLane = mapped?.[0] === 0 ? mapped[1] : -1;
  if (page === 'play') {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (paused && confirmingQuit) pauseAction('cancel');
      else void setPause(!paused).catch(error => audioError(error.message));
      return;
    }
    if (paused) {
      if (menuLane === 0 || menuLane === 1) {
        const count = get('pause-overlay').querySelectorAll('button').length;
        pauseFocus = (pauseFocus + (menuLane === 0 ? count - 1 : 1)) % count;
        renderPause();
      } else if (menuLane === 2) {
        get('pause-overlay').querySelectorAll('button')[pauseFocus]?.click();
      } else if (menuLane === 3 && confirmingQuit) {
        pauseAction('cancel');
      } else return;
      event.preventDefault();
      return;
    }
    if (!mapped) return;
    event.preventDefault();
    const [side, lane] = mapped;
    if (round.buttonMode === 'domes' && lane > 1) return;
    const now = performance.now();
    const eventTime = event.timeStamp >= 0 && event.timeStamp <= now ? event.timeStamp : now;
    hitButton(side, lane, playback.timeAt(eventTime) - inputOffset / 1000);
    return;
  }
  if (page === 'result' && get('result-actions')?.hidden) return;
  const buttons = [...screen.querySelectorAll('[data-action]')];
  switch (menuLane) {
    case 0: focus = (focus + buttons.length - 1) % buttons.length; break;
    case 1: focus = (focus + 1) % buttons.length; break;
    case 2: buttons[focus]?.click(); break;
    case 3: if (page !== 'home') action('back'); break;
    case 4: if (page === 'board') show('home'); else void showBoard(); break;
    default: return;
  }
  event.preventDefault();
  highlight();
});

function hitButton(side, lane, time, automated = false) {
  recentInput = performance.now();
  const result = press(round, side, lane, time);
  const actionLane = result ? round.lastHit.actionLane : lane;
  flash(side, lane, true, actionLane);
  sound(actionLane);
  arena.strike(side, actionLane, !!result, recentInput);
  const responding = round.turns.some(turn =>
    turn.player === side && time >= turn.response && time < turn.end);
  feedback(result || (responding ? 'MISS' : '입력'), lane);
  if (!result) return;
  if (automated) exhibition = true;
  updateScores();
}

function sound(lane, at, destination) {
  const context = playback.context;
  const move = moves[lane];
  const now = Math.max(context.currentTime, at ?? context.currentTime);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lane === 2 ? 850 : 2900;
  oscillator.type = move.type;
  oscillator.frequency.setValueAtTime(move.from, now);
  oscillator.frequency.exponentialRampToValueAtTime(move.to, now + move.length * .65);
  gain.gain.setValueAtTime(.001, now);
  gain.gain.exponentialRampToValueAtTime(lane === 2 || lane === 4 ? .10 : .24, now + .011);
  gain.gain.exponentialRampToValueAtTime(.001, now + move.length);
  oscillator.connect(filter).connect(gain).connect(destination ?? context.destination);
  oscillator.start(now);
  oscillator.stop(now + move.length + .015);
}

function guideClick(at) {
  const context = playback.context;
  const when = Math.max(at, context.currentTime);
  const click = context.createOscillator();
  const volume = context.createGain();
  click.type = 'sine';
  click.frequency.setValueAtTime(950, when);
  click.frequency.exponentialRampToValueAtTime(680, when + .027);
  volume.gain.setValueAtTime(.001, when);
  volume.gain.linearRampToValueAtTime(.15, when + .002);
  volume.gain.exponentialRampToValueAtTime(.001, when + .043);
  click.connect(volume).connect(playback.demoGain);
  click.start(when);
  click.stop(when + .045);
}

async function start() {
  if (starting || page === 'play') throw new Error('이미 게임을 진행 중입니다.');
  starting = true;
  menuMusic.update(false);
  try {
    playback ??= new Playback();
    await playback.load(() => loadTrack(songs[selected].audio));
    currentNames = [...roster.names];
    rosterAtStart = roster.team;
    projectAtStart = cloud.session ? cloud.config.url : null;
    matchId = crypto.randomUUID();
    round = createRound(songs[selected], levels[level].id, buttonMode);
    paused = false;
    autoSince = 0;
    exhibition = false;
    lastPhase = '';
    lastCueNote = undefined;
    lastTurnIndex = -1;
    recentInput = -Infinity;
    clearTimeout(judgementTimer);
    show('play');
    requestAnimationFrame(tick);
  } finally {
    starting = false;
    menuMusic.update(musicMenus.includes(page));
  }
}

function updateScores() {
  round.scores.forEach((score, side) => {
    get('score' + side).textContent = score.toLocaleString();
    get('bar' + side).value = score;
  });
}

function feedback(text, lane = null) {
  const judgement = get('judgement');
  judgement.innerHTML = lane == null ? text : buttonIcon(lane) + '<span>' + text + '</span>';
  judgement.dataset.result = text;
  clearTimeout(judgementTimer);
  judgementTimer = setTimeout(() => { judgement.textContent = ''; }, 480);
}

function flash(side, lane, input = false, actionLane = lane) {
  if (side === visibleSide) {
    const pad = get('pad' + lane);
    pad.classList.add('lit');
    clearTimeout(padTimers.get(pad));
    padTimers.set(pad, setTimeout(() => pad.classList.remove('lit'), 180));
  }
  if (!input) return;
  const indicator = get('last-input');
  const label = sceneProp(currentScene, actionLane)?.[2] ??
    (round.buttonMode === 'domes' ? physicalButtons[lane].name : moves[lane].name);
  indicator.innerHTML = '<span>P' + (side + 1) + '</span>' + buttonIcon(lane) + '<span>' + label + '</span>';
  clearTimeout(padTimers.get(indicator));
  padTimers.set(indicator, setTimeout(() => { indicator.textContent = ''; }, 700));
}

function updatePads() {
  const console = get('pads');
  console.dataset.side = visibleSide;
  console.dataset.mode = round.buttonMode;
  for (let lane = 0; lane < moves.length; lane++) {
    const pad = get('pad' + lane);
    const prop = sceneProp(currentScene, lane);
    const domes = round.buttonMode === 'domes';
    pad.hidden = domes && lane > 1;
    pad.classList.toggle('unused', !domes && !prop);
    pad.classList.remove('lit');
    pad.querySelector('small').textContent = domes ? physicalButtons[lane].name : prop?.[2] ?? '';
  }
}

function phase(id, side, label, cue) {
  if (lastPhase === id) return;
  lastPhase = id;
  get('stage').dataset.side = side ?? '';
  get('phase').textContent = label;
  get('cue').textContent = cue;
  if (side != null && visibleSide !== side) {
    visibleSide = side;
    updatePads();
  }
}

function changeScene(scene) {
  if (currentScene === scene) return;
  currentScene = scene;
  const stage = get('stage');
  stage.dataset.scene = scene.id;
  stage.style.setProperty('--scene', scene.color);
  get('scene-name').textContent = scene.name;
  arena.setScene(scene);
  updatePads();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    arena.canvas.animate([{ filter: 'brightness(.7)' }, { filter: 'brightness(1)' }],
      { duration: 180, easing: 'ease-out' });
  }
}

function drawArena(time, turn) {
  const preview = round.profile.preview;
  const cues = [];
  const nextMarkers = new Set();
  const travel = turn?.response - turn?.prepare || (turn?.beat ?? round.turns[0].beat) * 2;
  for (const obstacle of obstacles) {
    if (obstacle.scene !== currentScene || obstacle.side !== visibleSide) continue;
    if (turn && obstacle.demo && time >= turn.prepare) continue;
    if (turn && !obstacle.demo && time < turn.prepare) continue;
    if (obstacle.note?.result && obstacle.note.result !== 'MISS') continue;
    const progress = approachProgress(obstacle, time, preview);
    if (progress !== null) cues.push({ obstacle, progress });
    const rail = railProgress(obstacle.at, time, travel);
    if (rail === null) continue;
    const marker = obstacle.marker;
    marker.hidden = false;
    marker.style.left = (96 - rail * 84) + '%';
    nextMarkers.add(marker);
  }
  // Draw the closest scene cue last so the next input remains readable.
  cues.sort((a, b) => a.progress - b.progress);
  for (const marker of visibleTimingNotes) {
    if (!nextMarkers.has(marker)) marker.hidden = true;
  }
  visibleTimingNotes = nextMarkers;
  arena.draw(time, visibleSide, chosen[visibleSide], cues, performance.now());
}

function tick() {
  if (page !== 'play') return;
  const time = playback.time;
  if (paused) phase('pause', null, '게임 일시정지', 'Esc 또는 관리자 화면에서 재개');
  else {
    get('clock').textContent = clock(Math.max(0, time)) + ' / ' + clock(songs[selected].duration);
    if (time >= playback.buffer.duration) {
      finish();
      return;
    }
    while (nextSound < demos.length && demos[nextSound].at <= playback.scheduleThrough) {
      const demo = demos[nextSound++];
      sound(demo.actionLane, playback.cueTime(demo.at), playback.demoGain);
    }
    while (nextBeatSound < responses.length && responses[nextBeatSound].at <= playback.scheduleThrough) {
      const beat = responses[nextBeatSound++];
      if (beatGuide) guideClick(playback.cueTime(beat.at));
    }
    while (nextBeatPulse < responses.length && responses[nextBeatPulse].at <= time) {
      const beat = responses[nextBeatPulse++];
      if (time - beat.at < .12) {
        get('timing-target').animate([{ scale: '1.16', opacity: 1 }, { scale: '1', opacity: .8 }],
          { duration: 180, easing: 'ease-out' });
      }
    }
    const index = round.turns.findIndex(turn => time >= turn.start && time < turn.end);
    const turn = round.turns[index];
    const preparing = turn && time >= turn.prepare && time < turn.response;
    get('prep-callout').hidden = !preparing;
    if (turn) {
      changeScene(turn.scene);
      if (index !== lastTurnIndex) {
        const handoff = get('handoff');
        handoff.textContent = playerName(turn.player) + ' 차례';
        handoff.hidden = false;
        lastTurnIndex = index;
        lastCueNote = undefined;
      }
      if (time - turn.start > .65) get('handoff').hidden = true;
    } else get('handoff').hidden = true;
    if (!turn) {
      const closing = time >= round.turns.at(-1).end;
      phase(closing ? 'end' : 'wait', null, closing ? '곡 마무리' : '준비!', songs[selected].name);
    } else if (preparing) {
      const count = 1 + turn.prepTicks.filter(beat => beat > time).length;
      const icon = buttonIcon(turn.notes[0].lane);
      if (lastPhase !== index + 'prep' + count) get('prep-callout').innerHTML = '첫 버튼 ' + icon;
      phase(index + 'prep' + count, turn.player, playerName(turn.player) + ' · 준비 ' + count, '첫 버튼을 준비하세요');
    } else if (time < turn.response) {
      const demo = turn.demonstrations.findLastIndex(start => start <= time);
      const label = demo < 0 ? '준비' : '시범 ' + (demo + 1) + ' / ' + turn.demonstrations.length;
      phase(index + 'call' + demo, turn.player, playerName(turn.player) + ' · ' + label, turn.scene.cue);
    } else {
      phase(index + 'response', turn.player, playerName(turn.player) + ' · 내 차례',
        '타이밍 바의 원에 버튼 아이콘이 겹치면 누르세요');
      const upcoming = turn.notes.find(note => !note.result);
      if ((upcoming ?? null) !== lastCueNote) {
        const prop = upcoming && sceneProp(turn.scene, upcoming.actionLane);
        get('cue').innerHTML = prop ? '다음 ' + buttonIcon(upcoming.lane) + '<span>' + prop[2] + '</span>' : '이번 차례 끝!';
        lastCueNote = upcoming ?? null;
      }
    }
    if (autoPlay && turn && time >= turn.response) {
      for (const note of turn.notes) {
        if (!note.result && note.time >= autoSince && note.time <= time) hitButton(turn.player, note.lane, note.time, true);
      }
    }
    if (advance(round, time - Math.max(0, inputOffset) / 1000 - .025) && performance.now() - recentInput > 450) feedback('MISS');
    while (nextMove < demos.length && demos[nextMove].at <= time) {
      const demo = demos[nextMove++];
      arena.strike(demo.side, demo.actionLane, true, performance.now());
      flash(demo.side, demo.lane);
    }
    drawArena(time, turn);
  }
  requestAnimationFrame(tick);
}

function revealResult(winner) {
  const started = performance.now();
  const match = round;
  const heading = screen.querySelector('h1');
  const scores = match.scores.map((_, side) => get('final-score' + side));
  const bars = match.scores.map((_, side) => get('final-bar' + side));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pulse = -1;
  function count(time) {
    if (page !== 'result' || round !== match || !heading.isConnected) return;
    const elapsed = time - started;
    match.scores.forEach((score, side) => {
      const fraction = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - 350 - 140 * side) / 1740));
      const shown = Math.round(score * (1 - Math.pow(1 - fraction, 1.65)));
      scores[side].textContent = shown.toLocaleString();
      bars[side].style.width = (100 * shown / match.maxScores[side]) + '%';
    });
    if (!reduced && elapsed >= 340 && elapsed < 2050) {
      const beat = Math.floor((elapsed - 340) / 440);
      if (beat !== pulse) {
        pulse = beat;
        sound(beat % 2 ? 2 : 0);
      }
    }
    if (!reduced && elapsed < 2600) {
      requestAnimationFrame(count);
      return;
    }
    heading.textContent = winner;
    heading.classList.add('winner-reveal');
    get('team-total').textContent = '팀 합계 ' + match.scores.reduce((a, b) => a + b, 0).toLocaleString();
    get('result-actions').hidden = false;
    highlight();
    if (!reduced) sound(1);
  }
  requestAnimationFrame(count);
}

function finish() {
  playback.pause();
  if (!exhibition) {
    records.push({
      id: matchId, song: songs[selected].id, team: rosterAtStart, score1: round.scores[0],
      score2: round.scores[1], synced: false, project: projectAtStart,
    });
    savedScores();
  }
  show('result');
}

function renderPause() {
  const overlay = get('pause-overlay');
  overlay.hidden = !paused;
  get('pause-button').textContent = paused ? '재개' : '일시정지';
  if (!paused) return;
  const choices = confirmingQuit
    ? [['cancel', '취소'], ['quit', '경기 포기']]
    : [['resume', '계속하기'], ['confirm', '경기 포기'], ['auto', '자동 플레이 ' + (autoPlay ? '켜짐' : '꺼짐')]];
  overlay.innerHTML = '<div class="pause-panel"><h2>' +
    (confirmingQuit ? '경기를 포기할까요?' : '일시정지') + '</h2><p>' +
    (confirmingQuit ? '이번 경기는 점수판에 저장되지 않습니다.' : buttonIcon(0) + buttonIcon(1) + ' 이동 · ' + buttonIcon(2) + ' 선택') + '</p><div class="actions">' +
    choices.map(([choice, label], index) => '<button class="' + (index === pauseFocus ? 'selected ' : '') +
      (index === 1 ? 'quit' : index === 0 ? 'primary' : '') + '" data-pause-action="' + choice + '"' +
      (choice === 'auto' ? ' role="switch" aria-checked="' + autoPlay + '"' : '') + '>' + label + '</button>').join('') +
    '</div></div>';
}

function setAutoPlay(next) {
  autoPlay = next;
  if (next && page === 'play') autoSince = playback.time;
  localStorage.setItem('festival-autoplay', next ? 'on' : 'off');
  get('auto-setting').checked = next;
  get('auto-indicator').hidden = !next;
}

function pauseAction(action) {
  if (action === 'auto') {
    setAutoPlay(!autoPlay);
    renderPause();
    return;
  }
  if (action === 'resume') {
    void setPause(false).catch(error => audioError(error.message));
    return;
  }
  if (action === 'quit') {
    playback.pause();
    paused = false;
    confirmingQuit = false;
    matchId = null;
    show('home');
    return;
  }
  confirmingQuit = action === 'confirm';
  pauseFocus = 0;
  renderPause();
}

async function setPause(next) {
  if (page !== 'play') throw new Error('진행 중인 게임이 없습니다.');
  if (paused === next) return;
  if (next) {
    playback.pause();
    nextSound = nextMove;
    nextBeatSound = nextBeatPulse;
  } else playback.resume();
  paused = next;
  confirmingQuit = false;
  pauseFocus = 0;
  renderPause();
}

function state() {
  return { screen: page === 'levels' ? 'songs' : page, song: songs[selected].id, paused, match_id: matchId, receipt };
}

async function handle(command) {
  if (!command || command.id === receipt?.id) return;
  let error = null;
  try {
    if (command.kind === 'pause' || command.kind === 'resume') await setPause(command.kind === 'pause');
    if (command.kind === 'select') {
      if (page === 'play' || starting) throw new Error('게임이 끝난 후 곡을 바꿀 수 있습니다.');
      selected = songs.findIndex(song => song.id === command.song);
      choosing = 0;
      show('levels', level);
    }
    if (command.kind === 'start') await start();
  } catch (failure) {
    error = failure.message;
  }
  receipt = { id: command.id, error };
}

async function heartbeat() {
  if (cloud.session) {
    try {
      const response = await cloud.rpc('heartbeat', state());
      roster.team = response.team;
      roster.names = response.names;
      get('network').textContent = '운영 연결됨';
      await handle(response.command);
      const record = records.find(item => !item.synced && item.project === cloud.config.url);
      if (record) {
        const { id, song, team, score1, score2 } = record;
        await cloud.rpc('result', { id, song, team, score1, score2 });
        record.synced = true;
        savedScores();
      }
    } catch {
      get('network').textContent = '운영 연결 끊김';
    }
  }
  setTimeout(heartbeat, 850);
}

const controllerDialog = get('button-dialog');

function renderBindings() {
  get('binding-grid').innerHTML = bindingDraft.map((row, side) =>
    '<section class="binding-player"><h3>플레이어 ' + (side + 1) + '</h3><div class="binding-pads">' +
    row.map((code, lane) => {
      const capturing = captureTarget?.side === side && captureTarget.lane === lane;
      return '<button class="bind-button' + (capturing ? ' selected' : '') + '" data-side="' + side +
        '" data-lane="' + lane + '" aria-pressed="' + !!capturing + '">' + buttonIcon(lane) +
        '<span>' + physicalButtons[lane].name + '</span><small>' + describeCode(code) + '</small></button>';
    }).join('') + '</div></section>').join('');
}

function captureBinding(event) {
  if (!captureTarget || event.code === 'Escape') return;
  event.preventDefault();
  const { side, lane } = captureTarget;
  try {
    bindingDraft = assignBinding(bindingDraft, side, lane, event.code);
    get('binding-status').textContent = '플레이어 ' + (side + 1) + ' · ' + physicalButtons[lane].name + ' 등록됨';
    captureTarget = null;
    renderBindings();
  } catch (error) {
    get('binding-status').textContent = error.message;
  }
}

get('auto-setting').onchange = event => setAutoPlay(event.target.checked);
get('button-settings').onclick = () => {
  get('auto-setting').checked = autoPlay;
  get('button-mode').value = buttonMode;
  get('beat-guide').checked = beatGuide;
  get('timing-offset').value = inputOffset;
  get('offset-value').textContent = inputOffset + ' ms';
  bindingDraft = bindings;
  captureTarget = null;
  get('binding-status').textContent = '';
  renderBindings();
  controllerDialog.showModal();
};
get('binding-grid').onclick = event => {
  const button = event.target.closest('[data-lane]');
  if (!button) return;
  captureTarget = { side: Number(button.dataset.side), lane: Number(button.dataset.lane) };
  get('binding-status').textContent = '플레이어 ' + (captureTarget.side + 1) + ' · ' +
    physicalButtons[captureTarget.lane].name + ' 버튼을 누르세요.';
  renderBindings();
};
get('timing-offset').oninput = event => { get('offset-value').textContent = event.target.value + ' ms'; };
get('save-bindings').onclick = () => {
  beatGuide = get('beat-guide').checked;
  localStorage.setItem('festival-beat-guide', beatGuide ? 'on' : 'off');
  buttonMode = get('button-mode').value;
  localStorage.setItem(modeStorage, buttonMode);
  inputOffset = Number(get('timing-offset').value);
  localStorage.setItem(offsetStorage, String(inputOffset));
  bindings = bindingDraft;
  keyMap = bindingMap(bindings);
  localStorage.setItem(bindingStorage, JSON.stringify(bindings));
  controllerDialog.close();
};
get('reset-bindings').onclick = () => {
  bindingDraft = defaultBindings;
  get('button-mode').value = 'five';
  get('timing-offset').value = 0;
  get('offset-value').textContent = '0 ms';
  captureTarget = null;
  get('binding-status').textContent = '기본 배치로 바꿨습니다. 저장을 누르면 적용됩니다.';
  renderBindings();
};
get('cancel-bindings').onclick = () => controllerDialog.close();

get('pause-button').onclick = () => {
  if (page === 'play') void setPause(!paused).catch(error => audioError(error.message));
};
get('home').onclick = () => { if (page !== 'play' && !starting) show('home'); };
get('fullscreen').onclick = () => {
  const transition = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  void transition.catch(error => audioError(error.message));
};
const dialog = get('connection');
const login = get('station-login');
get('settings').onclick = () => {
  if (page === 'play') return;
  cloud.fill(login);
  get('connection-error').textContent = '';
  dialog.showModal();
};
get('close').onclick = () => dialog.close();
get('disconnect').onclick = () => {
  cloud.logout();
  roster.team = '';
  roster.names = [];
  get('network').textContent = '로컬 플레이';
  dialog.close();
};
login.onsubmit = async event => {
  event.preventDefault();
  const fields = new FormData(login);
  get('connection-error').textContent = '연결 중…';
  login.querySelector('[type=password]').value = '';
  try {
    await cloud.login(fields.get('url'), fields.get('key').trim(), fields.get('email'), fields.get('password'),
      () => cloud.rpc('heartbeat', state()));
    dialog.close();
  } catch (error) {
    get('connection-error').textContent = error.message;
  }
};
show('home');
void heartbeat();
