import { FestivalCloud } from './cloud.mjs';

const get = id => document.getElementById(id);
const cloud = new FestivalCloud('festival-admin');
const login = get('login');
const roster = get('roster');
const scores = get('scores');
const status = get('status');
const buttons = [...document.querySelectorAll('[data-command]')];
let station, live = false, games = [], knownMatch, savingCommand = false;
const screens = {
  home: '메인화면', songs: '곡 선택', characters: '캐릭터 선택',
  play: '게임 진행', result: '결과', board: '팀 점수판',
};
const songs = { bgm1: 'Remix 10', bgm2: 'Remix 6', bgm3: 'Remix 4' };

function visibility() {
  login.hidden = !!cloud.session;
  get('console').hidden = !cloud.session;
  get('logout').hidden = !cloud.session;
  if (!cloud.session) {
    status.textContent = '관리자 로그인이 필요합니다.';
    cloud.fill(login);
  }
}

function render() {
  live = !!station?.seen && Date.now() - new Date(station.seen).getTime() < 6000;
  status.textContent = live ? '게임 PC 연결됨' : '게임 PC 연결 대기';
  get('game-state').textContent = station ?
    [screens[station.screen], songs[station.song], station.paused && '일시정지'].filter(Boolean).join(' · ') : '';
  const pending = station?.command && new Date(station.command.expires).getTime() > Date.now();
  const playing = station?.screen === 'play';
  buttons.forEach(button => {
    const kind = button.dataset.command;
    const valid = kind === 'pause' ? playing && !station?.paused :
      kind === 'resume' ? playing && station?.paused : !playing;
    button.disabled = savingCommand || !live || pending || !valid;
  });
  get('receipt').textContent = pending ? '게임 PC 응답 대기 중…' :
    station?.receipt ? station.receipt.error || '게임 PC에서 실행했습니다.' :
    station?.command ? '명령 시간이 만료되었습니다.' : '';
}

function fillRoster(value) {
  roster.elements.team.value = value.team || '';
  for (let i = 0; i < 2; i++) {
    roster.elements['name' + (i + 1)].value = value.names[i] || '';
    roster.elements['student' + (i + 1)].value = value.students[i] || '';
  }
}

function fillScores() {
  const row = games.find(item => item.id === scores.elements.match.value);
  scores.elements.score1.value = row?.score1 ?? '';
  scores.elements.score2.value = row?.score2 ?? '';
  scores.querySelector('[type=submit], button:not([type])').disabled = !row;
}

async function recent() {
  const match = scores.elements.match;
  const previous = match.value;
  games = await cloud.rpc('recent');
  match.replaceChildren(...games.map(row => new Option(
    (row.team || '참가팀') + ' · ' + songs[row.song] + ' · ' +
    new Date(row.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), row.id)));
  if (!games.length) match.append(new Option('완료된 경기가 없습니다', ''));
  if (games.some(row => row.id === previous)) match.value = previous;
  fillScores();
}

async function poll() {
  if (cloud.session) {
    try {
      station = await cloud.rpc('status');
      render();
      if (station.screen === 'result' && station.match_id !== knownMatch) {
        await recent();
        if (games.some(game => game.id === station.match_id)) knownMatch = station.match_id;
      }
    } catch {
      live = false;
      status.textContent = 'Supabase 연결 오류';
      buttons.forEach(button => { button.disabled = true; });
    }
  }
  setTimeout(poll, 1200);
}

login.onsubmit = async event => {
  event.preventDefault();
  const form = new FormData(login);
  login.elements.password.value = '';
  status.textContent = '로그인 중…';
  try {
    await cloud.login(form.get('url'), form.get('key').trim(), form.get('email'), form.get('password'),
      async () => { station = await cloud.rpc('status'); });
    visibility();
    render();
    fillRoster(station.roster);
    await recent();
  } catch (error) {
    visibility();
    status.textContent = error.message;
  }
};
get('logout').onclick = () => { cloud.logout(); visibility(); };
buttons.forEach(button => {
  button.onclick = async () => {
    savingCommand = true;
    render();
    try {
      station = await cloud.rpc('command', { kind: button.dataset.command, song: get('song').value });
      render();
    } catch (error) {
      savingCommand = false;
      render();
      get('receipt').textContent = error.message;
    } finally {
      savingCommand = false;
    }
  };
});
roster.onsubmit = async event => {
  event.preventDefault();
  const form = new FormData(roster);
  try {
    await cloud.rpc('save_roster', {
      team: form.get('team'), names: [form.get('name1'), form.get('name2')],
      students: [form.get('student1'), form.get('student2')],
    });
    get('roster-info').textContent = '참가자 정보를 저장했습니다.';
  } catch (error) {
    get('roster-info').textContent = error.message;
  }
};
scores.elements.match.onchange = fillScores;
get('refresh').onclick = () => void recent().catch(error => { get('score-info').textContent = error.message; });
scores.onsubmit = async event => {
  event.preventDefault();
  const form = new FormData(scores);
  try {
    await cloud.rpc('edit_score', {
      id: form.get('match'), score1: Number(form.get('score1')), score2: Number(form.get('score2')),
    });
    get('score-info').textContent = '수정한 점수를 저장했습니다.';
    await recent();
  } catch (error) {
    get('score-info').textContent = error.message;
  }
};
visibility();
if (cloud.session) {
  try {
    station = await cloud.rpc('status');
    fillRoster(station.roster);
    await recent();
  } catch (error) {
    status.textContent = error.message;
  }
}
render();
void poll();
