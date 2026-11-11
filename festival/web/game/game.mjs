import { createRound, press, advance, keyMap, playerKeys } from './rhythm.mjs';
import { FestivalCloud } from '../shared/cloud.mjs';
import { title } from './title.mjs';
import { moves, course, obstaclePosition } from './course.mjs';
import { Playback } from './playback.mjs';

const get = id => document.getElementById(id);
const screen = get('screen');
const guide = get('guide');
const cloud = new FestivalCloud('festival-station');
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

document.title = title;
document.querySelector('[data-title]').textContent = title;

let page, focus = 0, selected = 0, choosing = 0, chosen = [0, 1];
let round, matchId, paused = false, starting = false, currentNames = [], receipt, playback;
let lastPhase = '', judgementTimer, recentInput = -Infinity;
let obstacles = [], demos = [], nextSound = 0, nextMove = 0;
const padTimers = new Map();
const runnerAnimations = new Map();
let boardEntries = [], rosterAtStart = '', projectAtStart = '';
const savedScores = () => localStorage.setItem('festival-scores', JSON.stringify(records));
const pane = (heading, content) => '<section class="pane"><h1>' + heading + '</h1>' + content + '</section>';
const back = '<div class="actions"><button data-action="back">뒤로</button></div>';
const audioError = message => { guide.textContent = message; };

function show(next, index = 0) {
  page = next;
  focus = index;
  render();
}

function render() {
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
  if (page === 'characters') {
    screen.innerHTML = pane('PLAYER ' + (choosing + 1) + ' 캐릭터 선택', '<p>' + escape(song.name) +
      '</p><div class="tiles characters">' + characters.map((name, index) =>
        '<button class="tile" data-action="character" data-index="' + index + '">' + avatar(index) + name + '</button>').join('') +
        '</div>' + back);
  }
  if (page === 'play') {
    const meters = [0, 1].map(side => '<div class="meter"><span>' + escape(playerName(side)) +
      '</span><strong id="score' + side + '">0</strong><progress aria-label="플레이어 ' + (side + 1) +
      ' 점수" id="bar' + side + '" max="' + round.maxScores[side] + '" value="0"></progress></div>').join('');
    const pads = playerKeys.map((keys, side) => '<div class="console" id="pads' + side + '">' +
      [...keys].map((key, lane) => '<span class="pad" id="pad' + side + lane + '"><b>' + key +
        '</b><small>' + moves[lane].name + '</small></span>').join('') + '</div>').join('');
    const tracks = chosen.map((character, side) => '<div class="track" id="track' + side + '">' +
      '<span class="track-name">P' + (side + 1) + '</span><div class="hit-line"><span>판정선</span></div>' +
      '<div class="obstacles" id="obstacles' + side + '"></div><div class="runner"><div class="runner-body" id="runner' +
      side + '">' + avatar(character) + '</div></div><span class="pressed" id="pressed' + side + '"></span></div>').join('');
    screen.innerHTML = '<section class="game"><div class="hud">' + meters +
      '</div><div class="stage course-stage" id="stage"><div class="stage-top"><div id="phase"></div><span id="clock"></span></div>' +
      '<div class="tracks">' + tracks + '</div><div class="stage-bottom"><span id="cue"></span><strong id="judgement"></strong>' +
      '</div></div><div class="pads">' + pads + '</div></section>';
    obstacles = course(round).map(obstacle => {
      const element = document.createElement('div');
      const move = moves[obstacle.lane];
      element.className = 'obstacle ' + move.id;
      element.hidden = true;
      element.dataset.demo = obstacle.demo;
      const key = document.createElement('kbd');
      key.textContent = playerKeys[obstacle.side][obstacle.lane];
      element.append(key, document.createElement('i'));
      get('obstacles' + obstacle.side).append(element);
      return { ...obstacle, element };
    });
    demos = obstacles.filter(obstacle => obstacle.demo);
    nextSound = nextMove = 0;
    padTimers.clear();
    runnerAnimations.clear();
  }
  if (page === 'result') {
    const [one, two] = round.scores;
    const winner = one === two ? '무승부' : playerName(one > two ? 0 : 1) + ' 승리!';
    screen.innerHTML = pane(escape(winner), '<p>' + escape(song.name) + ' · 팀 합계 ' + (one + two).toLocaleString() +
      '</p><div class="stats">' + round.scores.map((score, side) => '<div>' + escape(playerName(side)) +
      '<strong>' + score.toLocaleString() + '</strong></div>').join('') +
      '</div><div class="actions"><button class="primary" data-action="back">메인화면</button><button data-action="board">팀 점수판</button></div>');
  }
  if (page === 'board') {
    screen.innerHTML = pane('팀 점수판', '<p>두 플레이어의 점수를 합산합니다.</p><ol class="ranks">' +
      (boardEntries.length ? boardEntries.slice(0, 30).map((record, i) => '<li><span>' + (i + 1) +
        '</span><span>' + escape(record.team || '참가팀') + ' · ' + escape(songs.find(s => s.id === record.song)?.name) +
        '</span><strong>' + (record.score1 + record.score2).toLocaleString() + '</strong></li>').join('') :
        '<li>아직 기록이 없습니다.</li>') + '</ol>' + back);
  }
  guide.textContent = page === 'play' ? 'P1 Q W / E R T　·　P2 A S / D F G　·　Esc 일시정지' :
    'PLAYER 1　Q / W 이동　·　E 선택　·　R 뒤로　·　T 점수판';
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
      } else if (page === 'characters') show('songs', selected);
      else show('home');
      break;
  }
}

screen.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) action(button.dataset.action, Number(button.dataset.index));
});
document.addEventListener('keydown', event => {
  if (get('connection').open || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  if (page === 'play') {
    if (event.code === 'Escape') {
      event.preventDefault();
      void setPause(!paused).catch(error => audioError(error.message));
    }
    const mapped = keyMap[event.code];
    if (!mapped || paused) return;
    event.preventDefault();
    const [side, lane] = mapped;
    const time = playback.time;
    recentInput = performance.now();
    moveRunner(side, lane);
    flash(side, lane, true);
    sound(lane);
    const result = press(round, side, lane, time);
    const responding = round.turns.some(turn =>
      turn.player === side && time >= turn.response && time < turn.end);
    feedback(result || (responding ? 'MISS' : '입력'), playerKeys[side][lane]);
    if (result) updateScores();
    return;
  }
  const buttons = [...screen.querySelectorAll('[data-action]')];
  switch (event.code) {
    case 'KeyQ': focus = (focus + buttons.length - 1) % buttons.length; break;
    case 'KeyW': focus = (focus + 1) % buttons.length; break;
    case 'KeyE': buttons[focus]?.click(); break;
    case 'KeyR': if (page !== 'home') action('back'); break;
    case 'KeyT': if (page === 'board') show('home'); else void showBoard(); break;
    default: return;
  }
  event.preventDefault();
  highlight();
});

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

async function start() {
  if (starting || page === 'play') throw new Error('이미 게임을 진행 중입니다.');
  starting = true;
  try {
    playback ??= new Playback();
    await playback.load(() => loadTrack(songs[selected].audio));
    currentNames = [...roster.names];
    rosterAtStart = roster.team;
    projectAtStart = cloud.session ? cloud.config.url : null;
    matchId = crypto.randomUUID();
    round = createRound(songs[selected]);
    paused = false;
    lastPhase = '';
    recentInput = -Infinity;
    clearTimeout(judgementTimer);
    show('play');
    requestAnimationFrame(tick);
  } finally {
    starting = false;
  }
}

function updateScores() {
  round.scores.forEach((score, side) => {
    get('score' + side).textContent = score.toLocaleString();
    get('bar' + side).value = score;
  });
}

function feedback(text, key = '') {
  const judgement = get('judgement');
  judgement.textContent = key ? key + ' · ' + text : text;
  judgement.dataset.result = text;
  clearTimeout(judgementTimer);
  judgementTimer = setTimeout(() => { judgement.textContent = ''; }, 480);
}

function flash(side, lane, input = false) {
  const pad = get('pad' + side + lane);
  pad.classList.add('lit');
  clearTimeout(padTimers.get(pad));
  padTimers.set(pad, setTimeout(() => pad.classList.remove('lit'), 180));
  if (!input) return;
  const indicator = get('pressed' + side);
  indicator.textContent = playerKeys[side][lane] + ' · ' + moves[lane].name;
  clearTimeout(padTimers.get(indicator));
  padTimers.set(indicator, setTimeout(() => { indicator.textContent = ''; }, 700));
}

const movement = [
  ['translateY(0)', 'translateY(-40%) rotate(-9deg)', 'translateY(0)'],
  ['translateY(0)', 'translateY(-78%) rotate(14deg)', 'translateY(0)'],
  ['scale(1)', 'translateY(30%) skewX(-18deg) scale(1.25,.52)', 'scale(1)'],
  ['scale(1)', 'translateY(-18%) scale(.9,1.1)', 'translateY(15%) scale(1.22,.67)', 'scale(1)'],
  ['rotate(0deg)', 'translateY(-24%) rotate(200deg)', 'rotate(360deg)'],
];

function moveRunner(side, lane) {
  runnerAnimations.get(side)?.cancel();
  const runner = get('runner' + side);
  const frames = movement[lane].map(transform => ({ transform }));
  runnerAnimations.set(side, runner.animate(frames, {
    duration: [225, 335, 230, 250, 280][lane], easing: 'ease-out',
  }));
}

function phase(id, side, label, cue) {
  if (lastPhase === id) return;
  lastPhase = id;
  get('stage').dataset.side = side ?? '';
  get('phase').textContent = label;
  get('cue').textContent = cue;
  for (let i = 0; i < 2; i++) {
    get('pads' + i).classList.toggle('active', i === side);
    get('track' + i).classList.toggle('active', i === side);
  }
}

function drawObstacles(time) {
  for (const obstacle of obstacles) {
    const position = obstaclePosition(obstacle, time);
    const scored = obstacle.note?.result && obstacle.note.result !== 'MISS';
    const hidden = position === null || !!scored;
    if (obstacle.element.hidden !== hidden) obstacle.element.hidden = hidden;
    if (!hidden) obstacle.element.style.left = (27 + position * 43) + '%';
  }
}

function tick() {
  if (page !== 'play') return;
  const time = playback.time;
  if (paused) phase('pause', null, '게임 일시정지', 'Esc 또는 관리자 화면에서 재개');
  else {
    get('clock').textContent = clock(Math.max(0, time)) + ' / ' + clock(songs[selected].duration);
    if (advance(round, time) && performance.now() - recentInput > 450) feedback('MISS');
    if (time >= playback.buffer.duration) {
      finish();
      return;
    }
    while (nextSound < demos.length && demos[nextSound].at <= playback.scheduleThrough) {
      const demo = demos[nextSound++];
      sound(demo.lane, playback.cueTime(demo.at), playback.demoGain);
    }
    while (nextMove < demos.length && demos[nextMove].at <= time) {
      const demo = demos[nextMove++];
      moveRunner(demo.side, demo.lane);
      flash(demo.side, demo.lane);
    }
    const index = round.turns.findIndex(turn => time >= turn.start && time < turn.end);
    const turn = round.turns[index];
    if (!turn) {
      const closing = time >= round.turns.at(-1).end;
      phase(closing ? 'end' : 'wait', null, closing ? '곡 마무리' : '준비!', songs[selected].name);
    } else if (time < turn.response) {
      phase(index + 'call', turn.player, playerName(turn.player) + ' · 시범',
        '캐릭터의 동작과 소리를 기억하세요');
    } else {
      phase(index + 'response', turn.player, playerName(turn.player) + ' · 내 차례',
        '장애물이 판정선에 닿을 때 해당 버튼을 누르세요');
    }
    drawObstacles(time);
  }
  requestAnimationFrame(tick);
}

function finish() {
  playback.pause();
  records.push({
    id: matchId, song: songs[selected].id, team: rosterAtStart, score1: round.scores[0],
    score2: round.scores[1], synced: false, project: projectAtStart,
  });
  savedScores();
  show('result');
}

async function setPause(next) {
  if (page !== 'play') throw new Error('진행 중인 게임이 없습니다.');
  if (paused === next) return;
  if (next) {
    playback.pause();
    nextSound = nextMove;
  } else playback.resume();
  paused = next;
}

function state() {
  return { screen: page, song: songs[selected].id, paused, match_id: matchId, receipt };
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
      show('characters', chosen[0]);
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
