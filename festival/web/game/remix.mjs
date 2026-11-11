export const levels = [
  { id: 'soft', name: '소프트', description: '한 박 쉬고 두 번 · 넓은 판정', good: .24, perfect: .105, preview: 2.65 },
  { id: 'medium', name: '미디엄', description: '두세 번 · 기본 판정', good: .155, perfect: .072, preview: 2.2 },
  { id: 'hard', name: '하드', description: '세네 번 · 좁은 판정', good: .105, perfect: .048, preview: 1.75 },
  { id: 'hell', name: '지옥', description: '매 박 입력 · 짧은 예고', good: .062, perfect: .028, preview: 1.12 },
];

// Each scene has its own three playable actions and incoming objects.
export const scenes = [
  { id: 'hurdles', name: '허들', cue: '장애물을 넘거나 밑으로 지나가!', color: '#8fea86', props: [[0,'hurdle','낮게 점프'],[1,'barrier','높게 점프'],[2,'beam','밑으로 슬라이드']] },
  { id: 'grill', name: '철판 요리', cue: '재료가 오면 썰고, 뒤집고, 담아!', color: '#ffac66', props: [[3,'carrot','채소 썰기'],[4,'pancake','뒤집기'],[2,'plate','접시에 담기']] },
  { id: 'parcel', name: '우주 배달', cue: '박자에 맞춰 화물을 실어!', color: '#a9abff', props: [[0,'crate','소포 싣기'],[1,'satellite','화물 들어올리기'],[4,'planet','궤도 회전']] },
  { id: 'baseball', name: '야구', cue: '박자에 맞춰 날아오는 공을 받아쳐!', color: '#ffd376', props: [[0,'baseball','직구 치기'],[4,'curveball','변화구 치기'],[3,'grounder','땅볼 막기']] },
  { id: 'camera', name: '사진 촬영', cue: '박자에 맞춰 찰칵!', color: '#fbb2ee', props: [[0,'bird','낮은 앵글'],[1,'butterfly','높은 앵글'],[3,'camera','정면 촬영']] },
  { id: 'drums', name: '북치기', cue: '북의 가운데와 테두리를 번갈아 쳐!', color: '#ff7f78', props: [[0,'drum-center','북 가운데'],[3,'drum-edge','북 테두리'],[4,'bell','종 치기']] },
  { id: 'diving', name: '잠수함', cue: '산호는 내려가서 피하고 공기 방울을 모아!', color: '#78ddff', props: [[2,'coral','잠수'],[1,'bubble','수면 위로'],[4,'shell','조개 모으기']] },
  { id: 'farm', name: '농장', cue: '씨앗을 심고 물을 주고 수확해!', color: '#b5ed77', props: [[3,'seed','씨앗 심기'],[2,'drop','물 주기'],[0,'corn','수확하기']] },
  { id: 'ghosts', name: '유령 퇴치', cue: '유령이 가까워지면 조명이나 부적으로 잡아!', color: '#d8a6ff', props: [[3,'ghost','손전등'],[2,'charm','부적 던지기'],[4,'vortex','유령 흡입']] },
  { id: 'fireworks', name: '불꽃놀이', cue: '들어오는 신호에 맞춰 불꽃을 쏴!', color: '#ff9eb8', props: [[0,'spark','작은 불꽃'],[1,'rocket','큰 불꽃'],[4,'burst','회전 불꽃']] },
  { id: 'train', name: '기차', cue: '신호가 오면 선로를 바꾸거나 기적을 울려!', color: '#facb8a', props: [[2,'switch','선로 전환'],[3,'stop','브레이크'],[1,'whistle','기적 울리기']] },
  { id: 'robot', name: '로봇 조립', cue: '부품이 작업대에 오면 끼우고 조여!', color: '#a6e9eb', props: [[0,'battery','배터리 끼우기'],[3,'bolt','볼트 조이기'],[4,'gear','기어 돌리기']] },
  { id: 'fishing', name: '낚시', cue: '찌가 물결에 닿으면 낚싯대를 당겨!', color: '#9ee2dd', props: [[1,'bobber','찌 당기기'],[4,'fish','물고기 낚기'],[2,'shell','조개 건지기']] },
  { id: 'ski', name: '스키', cue: '내려오는 깃발과 경사에 맞춰 움직여!', color: '#91cfff', props: [[0,'flag','왼쪽 돌기'],[1,'snowbank','눈더미 뛰기'],[2,'beam','몸 낮추기']] },
  { id: 'magic', name: '마술', cue: '박자에 맞춰 모자에 마술을 걸어!', color: '#eb9ee1', props: [[0,'hat','토끼 꺼내기'],[3,'charm','카드 뒤집기'],[4,'vortex','모자 돌리기']] },
  { id: 'clockwork', name: '시계탑', cue: '박자에 맞춰 시계에 태엽을 감아!', color: '#ffd68b', props: [[0,'gear','작은 톱니'],[1,'bell','종 울리기'],[3,'bolt','바늘 맞추기']] },
  { id: 'basketball', name: '농구', cue: '박자에 맞춰 공을 받아 슛!', color: '#ffb47d', props: [[0,'basketball','받아 던지기'],[1,'basketball','높게 슛'],[3,'grounder','바운드 잡기']] },
  { id: 'surf', name: '서핑', cue: '파도 꼭대기와 물골에 맞춰 보드를 움직여!', color: '#80f0df', props: [[0,'wave','파도 넘기'],[2,'beam','물골 통과'],[4,'bubble','보드 돌리기']] },
  { id: 'post', name: '우편 분류', cue: '박자에 맞춰 편지와 소포를 분류해!', color: '#f3cb96', props: [[2,'letter','편지 밀기'],[3,'charm','도장 찍기'],[4,'crate','소포 돌리기']] },
  { id: 'lanterns', name: '등불 축제', cue: '박자에 맞춰 등불을 하나씩 밝혀!', color: '#ffba92', props: [[0,'lantern','작은 등불'],[1,'lantern','큰 등불'],[4,'spark','별등 켜기']] },
];

export function sceneProp(scene, lane) {
  return scene?.props.find(prop => prop[0] === lane);
}

export function remixTurn(index, beatCount, level, offset = 0, denseHard = false) {
  const pair = Math.floor(index / 2);
  const scene = scenes[(pair + offset) % scenes.length];
  const steps = level === 'soft' ? [0, 2] :
    level === 'medium' ? (pair < 2 ? [0, 2] : pair % 2 ? [0, 1, 3] : [0, 2, 3]) :
      level === 'hell' || denseHard || pair >= 2 ? [0, 1, 2, 3] : [0, 1, 3];
  const lanes = scene.props.map(([lane]) => lane);
  const hellOrders = [[0, 2, 1, 2], [2, 0, 1, 0], [1, 2, 0, 2], [2, 1, 0, 1]];
  const order = level === 'hell' ? hellOrders[(pair + index % 2) % hellOrders.length] :
    index % 2 ? [1, 0, 2, 1] : [0, 1, 2, 0];
  return { scene, hits: steps.filter(step => step < beatCount).map((step, i) => [step, lanes[order[i]]]) };
}
