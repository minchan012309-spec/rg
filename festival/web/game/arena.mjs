import { sceneProp } from './remix.mjs';

const W = 480;
const H = 192;
const ink = '#151329';
const paper = '#fff4d9';
const mix = (a, b, t) => a + (b - a) * t;
const rows = (x, ...ys) => ys.map(y => [x, y]);
const columns = (y, ...xs) => xs.map(x => [x, y]);

export const arenas = {
  hurdles: { actor: [124, 151], targets: rows(128, 146, 138, 117), path: 'side', palette: ['#7acee8', '#336d53', '#f18b62'] },
  grill: { actor: [108, 145], targets: columns(139, 201, 271, 341), path: 'drop', palette: ['#3e2940', '#ce634e', '#ffd893'] },
  parcel: { actor: [352, 116], targets: rows(312, 129, 75, 103), path: 'orbit', palette: ['#191a42', '#554882', '#9ce4f5'] },
  baseball: { actor: [250, 157], targets: [[233, 139], [258, 132], [235, 158]], path: 'pitch', palette: ['#6cb6d7', '#59915c', '#d39b64'] },
  camera: { actor: [408, 159], targets: [[191, 119], [275, 68], [245, 98]], path: 'frame', palette: ['#4f728f', '#233d54', '#ffb9d4'] },
  drums: { actor: [241, 90], targets: columns(132, 148, 240, 332), path: 'ring', palette: ['#351d43', '#9e4354', '#ffcd72'] },
  diving: { actor: [174, 90], targets: [[208, 112], [211, 69], [255, 92]], path: 'float', palette: ['#155675', '#183a69', '#74e3cc'] },
  farm: { actor: [82, 140], targets: columns(150, 168, 253, 340), path: 'plant', palette: ['#86cadb', '#528348', '#dfac64'] },
  ghosts: { actor: [237, 141], targets: [[214, 112], [247, 96], [271, 116]], path: 'haunt', palette: ['#22233f', '#463958', '#d5b6fa'] },
  fireworks: { actor: [104, 166], targets: [[151, 61], [243, 43], [340, 66]], path: 'fuse', palette: ['#21183d', '#4d325a', '#ffd088'] },
  train: { actor: [272, 165], targets: columns(143, 144, 237, 330), path: 'rail', palette: ['#d59068', '#7c4f62', '#ffdf9a'] },
  robot: { actor: [101, 143], targets: columns(109, 193, 265, 337), path: 'assembly', palette: ['#283f53', '#486b73', '#a8e7db'] },
};

export function signalPosition(scene, slot, progress) {
  const { targets, path } = arenas[scene];
  const [x, y] = targets[slot];
  if (progress === 1) return [x, y, 1];
  const p = progress;
  const rest = 1 - p;
  switch (path) {
    case 'side': return [x + 340 * rest, y, 1];
    case 'drop': return [x + (slot - 1) * 48 * rest, y - 139 * rest, 1];
    case 'orbit': return [x - 257 * rest, y - Math.sin(p * Math.PI) * (74 - slot * 22), 1];
    case 'pitch': return [mix(242, x, p) + Math.sin(p * Math.PI) * slot * 49, mix(55, y, p * p), .32 + .68 * p];
    case 'frame': return [mix(slot % 2 ? 460 : 18, x, p), y + Math.sin(p * Math.PI * 2) * 24, 1];
    case 'ring': return [x, y, 1 + 1.7 * rest];
    case 'float': return [x + 112 * rest + Math.sin(p * Math.PI * 4) * 19, y + 108 * rest, .62 + .38 * p];
    case 'plant': return [x - 71 * rest, y - 117 * Math.sin(rest * Math.PI / 2), 1];
    case 'haunt': return [mix([32, 237, 456][slot], x, p), y - 80 * rest + 20 * Math.sin(4 * Math.PI * p), .6 + .4 * p];
    case 'fuse': return [x, mix(185, y, p), .6 + .4 * p];
    case 'rail': return [mix(238, x, p * p), mix(60, y, p * p), .26 + .74 * p];
    case 'assembly': return [x + 112 * rest, y - Math.min(60, 123 * rest), 1];
  }
}

function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function polygon(g, points, color) {
  g.fillStyle = color;
  g.beginPath();
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.closePath();
  g.fill();
}
function disc(g, x, y, radius, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, radius, 0, 2 * Math.PI);
  g.fill();
}
function ring(g, x, y, radius, color, width = 2) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.arc(x, y, radius, 0, 2 * Math.PI);
  g.stroke();
}
function line(g, x, y, x2, y2, color, width = 2) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x2, y2);
  g.stroke();
}
function dots(g, color, height, count = 35) {
  for (let i = 0; i < count; i++) rect(g, (i * 109 + 21) % W, (i * 47 + 7) % height, i % 4 ? 1 : 3, 2, color);
}
function mountains(g, color, base, step) {
  for (let x = -step; x < W; x += step) {
    polygon(g, [[x, base], [x + step, base - 58], [x + step * 2, base]], color);
  }
}

const backdrops = {
  hurdles(g, [, land, track]) {
    disc(g, 382, 38, 22, '#ffecad');
    mountains(g, '#7db897', 122, 64);
    rect(g, 0, 106, W, 36, land);
    for (let x = 0; x < W; x += 21) rect(g, x, 105, 17, 12, '#b8df85');
    rect(g, 0, 142, W, 50, track);
    rect(g, 0, 145, W, 3, paper);
    for (let x = 3; x < W; x += 30) rect(g, x, 172, 17, 3, '#ffceb2');
  },
  grill(g, [, tile, light]) {
    for (let y = 8; y < 126; y += 21) for (let x = 0; x < W; x += 36) {
      rect(g, x + (y % 2) * 15, y, 33, 18, '#543747');
    }
    rect(g, 112, 0, 283, 20, tile);
    rect(g, 139, 20, 231, 3, light);
    rect(g, 0, 137, W, 55, '#7f5055');
    rect(g, 0, 142, W, 10, '#c88d6e');
    rect(g, 164, 126, 214, 41, ink);
    rect(g, 167, 126, 208, 31, '#3f5261');
    for (const x of [201, 271, 341]) ring(g, x, 139, 17, '#a9a6a3', 1);
  },
  parcel(g, [, panel, light]) {
    dots(g, '#b6c6ff', H);
    disc(g, 91, 130, 44, '#5e64a2');
    ring(g, 91, 130, 53, '#a5a6df', 2);
    rect(g, 306, 49, 139, 106, panel);
    rect(g, 312, 55, 125, 94, '#28304e');
    for (const y of [84, 110, 139]) rect(g, 306, y, 137, 3, light);
    rect(g, 332, 151, 85, 9, '#a4a9d3');
  },
  baseball(g, [, grass, sand]) {
    rect(g, 0, 36, W, 26, '#57788d');
    for (let x = 0; x < W; x += 14) rect(g, x, 41 + x % 11, 9, 10, '#b2d3dc');
    rect(g, 0, 62, W, 130, grass);
    polygon(g, [[242, 51], [429, 105], [249, 188], [47, 105]], sand);
    polygon(g, [[242, 59], [367, 103], [247, 164], [113, 103]], '#7fa760');
    line(g, 0, 81, 247, 180, paper); line(g, 480, 80, 247, 180, paper);
    polygon(g, [[230, 166], [262, 166], [262, 172], [245, 183], [230, 172]], paper);
    rect(g, 228, 58, 28, 4, paper);
  },
  camera(g) {
    mountains(g, '#7a8da8', 139, 91);
    mountains(g, '#4c6873', 158, 47);
    rect(g, 0, 159, W, 33, '#2b4958');
    g.strokeStyle = paper;
    g.lineWidth = 2;
    g.strokeRect(124, 31, 228, 120);
    line(g, 239, 77, 239, 103, paper); line(g, 227, 90, 252, 90, paper);
    rect(g, 28, 21, 8, 8, '#ff8b9f');
    rect(g, 381, 153, 52, 28, '#24263b');
  },
  drums(g, [, curtain, light]) {
    for (let x = 0; x < W; x += 32) {
      rect(g, x, 0, 26, 124, curtain);
      rect(g, x + 3, 0, 3, 116, '#c96b73');
    }
    rect(g, 0, 159, W, 33, '#51283b');
    for (const [i, x] of [148, 240, 332].entries()) {
      rect(g, x - 19, 135, 38, 25, i === 2 ? '#e0a857' : '#ae4650');
      disc(g, x, 131, 24, ink); disc(g, x, 130, 20, light);
      disc(g, x, 130, 13, i === 2 ? '#ffefab' : '#db7870');
    }
  },
  diving(g, [, seabed, light]) {
    dots(g, '#60a1b0', H);
    for (let i = 0; i < 6; i++) polygon(g, [[i * 96, 0], [i * 96 + 26, 0], [i * 96 - 52, 153]], '#28708c');
    rect(g, 0, 159, W, 33, seabed);
    for (let x = 15; x < W; x += 46) {
      line(g, x, 183, x + 11, 144 + x % 17, light, 2);
      line(g, x + 4, 169, x - 9, 158, '#69ab9d', 3);
    }
    rect(g, 97, 76, 75, 27, '#e8b95e');
    disc(g, 111, 88, 7, '#3f6888'); disc(g, 133, 88, 7, '#3f6888');
  },
  farm(g, [, field, soil]) {
    disc(g, 77, 34, 21, '#fff0af');
    mountains(g, '#abc777', 121, 87);
    rect(g, 0, 115, W, 77, field);
    rect(g, 353, 72, 67, 46, '#dd7768');
    polygon(g, [[346, 74], [387, 47], [426, 74]], '#8e4a52');
    rect(g, 378, 93, 19, 25, '#513849');
    for (const x of [168, 253, 340]) {
      polygon(g, [[x - 26, 126], [x + 25, 126], [x + 35, 181], [x - 39, 181]], soil);
      for (let y = 135; y < 181; y += 9) line(g, x - 26, y, x + 27, y, '#a66d55', 2);
    }
  },
  ghosts(g, [, floor, light]) {
    dots(g, '#928bad', 91);
    for (const x of [27, 354]) {
      rect(g, x, 23, 94, 100, '#523f65');
      rect(g, x + 5, 28, 84, 90, '#283250');
      line(g, x + 47, 26, x + 47, 118, '#79628b', 4);
      line(g, x, 72, x + 94, 72, '#79628b', 4);
      disc(g, x + 67, 48, 11, light);
    }
    rect(g, 0, 150, W, 42, floor);
    for (let x = -160; x < 590; x += 53) line(g, 240 + (x - 240) * .52, 149, x, 192, '#5c486b', 2);
  },
  fireworks(g, [, town, light]) {
    dots(g, '#b7aad0', 137, 51);
    for (let x = 0; x < W; x += 23) {
      const h = 26 + x * 13 % 48;
      rect(g, x, 192 - h, 20, h, town);
      if (x % 3) rect(g, x + 6, 200 - h, 3, 4, light);
    }
    for (const x of [151, 243, 340]) rect(g, x - 13, 175, 26, 17, '#8a5873');
  },
  train(g, [, hills, sunset]) {
    disc(g, 248, 41, 22, sunset);
    mountains(g, hills, 89, 74);
    polygon(g, [[203, 59], [278, 59], [475, 192], [0, 192]], '#a06f73');
    for (let i = 0; i < 8; i++) {
      const y = 63 + i * i * 2.4;
      line(g, 226 - i * 26, y, 253 + i * 26, y, '#493846', 2);
    }
    for (const x of [44, 154, 325, 433]) line(g, 239, 58, x, 192, '#efcc9a', 2);
    rect(g, 16, 31, 10, 109, '#493846'); rect(g, 15, 25, 39, 20, '#493846');
    disc(g, 42, 35, 6, '#ff977b');
  },
  robot(g, [, machine, light]) {
    for (let x = 24; x < W; x += 89) {
      rect(g, x, 13, 73, 54, machine);
      rect(g, x + 7, 20, 59, 39, '#253044');
      for (let i = 0; i < 4; i++) rect(g, x + 12 + i * 12, 45 - (i * 7 + x) % 17, 6, 8, light);
    }
    rect(g, 123, 111, W - 123, 41, '#426573');
    rect(g, 123, 111, W - 123, 4, light);
    for (let x = 144; x < W; x += 30) disc(g, x, 137, 7, '#273b52');
    rect(g, 58, 150, 91, 27, '#557f82');
  },
};

const sprites = {
  hurdle(g) {
    rect(g, -10, -2, 20, 5, '#ec865f');
    rect(g, -9, 2, 3, 10, paper); rect(g, 6, 2, 3, 10, paper);
  },
  barrier(g) {
    rect(g, -13, -11, 26, 15, '#f5c86c');
    for (let x = -10; x < 12; x += 7) line(g, x - 2, 1, x + 3, -8, '#924951', 3);
    rect(g, -10, 3, 3, 10, paper); rect(g, 7, 3, 3, 10, paper);
  },
  beam(g) { rect(g, -17, -3, 34, 7, '#b0d6ee'); rect(g, -15, -3, 30, 2, paper); },
  carrot(g) {
    polygon(g, [[-12, -7], [3, -5], [10, 0], [-10, 8]], '#ff914d');
    polygon(g, [[4, -5], [8, -12], [8, -4], [16, -7], [10, 2]], '#82ce76');
    line(g, -5, -3, -4, 2, '#d9644c');
  },
  pancake(g) {
    disc(g, 0, 1, 10, '#965353'); disc(g, 0, -2, 10, '#f2b064');
    disc(g, 0, -2, 6, '#d77e52'); rect(g, -2, -6, 6, 4, '#fce38a');
  },
  plate(g) { disc(g, 0, 0, 12, '#b6d4ed'); disc(g, 0, 0, 9, paper); ring(g, 0, 0, 6, '#8cb5d4', 1); },
  crate(g) {
    rect(g, -10, -10, 20, 20, '#b67554'); rect(g, -8, -8, 16, 15, '#f4c17f');
    rect(g, -2, -10, 4, 20, '#995955'); line(g, -7, -5, 7, -5, '#ffdc9c');
  },
  satellite(g) {
    rect(g, -16, -3, 32, 7, '#76a3e0'); rect(g, -5, -9, 10, 18, paper);
    line(g, 0, -8, 6, -13, '#a5ebeb'); rect(g, -13, -2, 3, 5, '#24365d');
  },
  planet(g) { disc(g, 0, 0, 9, '#d19fe1'); line(g, -15, 5, 15, -5, '#f3d3fa', 3); },
  baseball(g) { disc(g, 0, 0, 8, paper); line(g, -4, -5, -3, 5, '#d75d5e', 1); line(g, 4, -5, 3, 5, '#d75d5e', 1); },
  curveball(g) { disc(g, 0, 0, 8, '#f7df76'); ring(g, 0, 0, 4, '#ac5a59', 1); },
  grounder(g) { line(g, -17, 5, -1, 5, '#e5ae6f', 3); disc(g, 3, 1, 7, '#fbe3bb'); },
  bird(g) { polygon(g, [[-13, 6], [-4, -8], [6, -1], [11, -5], [16, -1], [5, 4]], '#e3e6e7'); rect(g, 10, -2, 3, 2, ink); },
  butterfly(g) { disc(g, -6, -3, 7, '#f19acb'); disc(g, 6, -3, 7, '#f19acb'); rect(g, -2, -6, 4, 14, '#623f70'); },
  camera(g) { rect(g, -12, -8, 24, 17, '#29415d'); rect(g, -8, -11, 7, 4, paper); disc(g, 2, 0, 6, '#9cc8ed'); disc(g, 2, 0, 3, '#3e698f'); },
  'drum-center'(g) { disc(g, 0, 0, 9, '#f6aa86'); disc(g, 0, 0, 5, '#e65e66'); },
  'drum-edge'(g) { disc(g, 0, 0, 10, '#f5d4a0'); ring(g, 0, 0, 6, '#794858', 3); },
  bell(g) { polygon(g, [[-10, 7], [-5, -7], [5, -7], [10, 7]], '#ffdc84'); disc(g, 0, 8, 3, '#e69553'); },
  coral(g) { line(g, 0, 10, 0, -11, '#ff9caa', 4); line(g, -9, -4, 0, 4, '#f48a9e', 4); line(g, 0, 1, 8, -8, '#ff9caa', 4); },
  bubble(g) { disc(g, 0, 0, 9, '#6cbdcf'); ring(g, 0, 0, 9, '#cef2e8', 2); rect(g, -4, -5, 3, 3, paper); },
  shell(g) { polygon(g, [[0, 8], [-11, 0], [-8, -7], [0, -10], [9, -6], [12, 1]], '#f6b3bf'); for (const x of [-7, 0, 7]) line(g, 0, 7, x, -5, '#c36c9c', 1); },
  seed(g) { polygon(g, [[0, -9], [9, -2], [5, 7], [-4, 9], [-9, 0]], '#e9ac6a'); line(g, -2, 4, 4, -4, '#965653', 2); },
  drop(g) { polygon(g, [[0, -13], [8, 1], [6, 8], [-6, 8], [-8, 1]], '#8dd6ed'); rect(g, -4, 0, 3, 5, paper); },
  corn(g) { rect(g, -5, -12, 10, 22, '#ffe07c'); line(g, -7, 9, -9, -2, '#61b074', 4); line(g, 4, 9, 9, -3, '#61b074', 4); },
  ghost(g) {
    disc(g, 0, -4, 10, '#ddd6fa');
    polygon(g, [[-10, -3], [10, -3], [12, 10], [5, 6], [0, 11], [-5, 6], [-11, 10]], '#ddd6fa');
    rect(g, -5, -5, 3, 5, ink); rect(g, 3, -5, 3, 5, ink);
  },
  charm(g) { rect(g, -6, -11, 12, 22, '#f5ddac'); line(g, 0, -7, 0, 7, '#cc627a'); line(g, -3, -3, 3, -3, '#cc627a'); },
  vortex(g) { ring(g, 0, 0, 11, '#b5a3f2', 3); ring(g, 1, 0, 5, '#8b79c8', 2); },
  spark(g) { line(g, -9, 0, 9, 0, '#ffe59d', 3); line(g, 0, -9, 0, 9, '#ffe59d', 3); },
  rocket(g) { polygon(g, [[0, -12], [7, -3], [5, 8], [-5, 8], [-7, -3]], '#ff9a99'); rect(g, -2, 8, 4, 6, '#ffc46e'); rect(g, -2, -4, 4, 4, '#fff1c7'); },
  burst(g) { for (let i = 0; i < 8; i++) line(g, 0, 0, Math.cos(i * Math.PI / 4) * 12, Math.sin(i * Math.PI / 4) * 12, i % 2 ? '#e7a0e7' : '#ffdb86', 2); },
  switch(g) { line(g, -12, 0, 11, 0, '#aee0c8', 3); line(g, 11, 0, 3, -7, '#aee0c8', 3); line(g, 11, 0, 3, 7, '#aee0c8', 3); },
  stop(g) { disc(g, 0, 0, 10, '#e46572'); rect(g, -7, -2, 14, 4, paper); },
  whistle(g) { rect(g, -12, -5, 16, 10, '#b8dbd6'); disc(g, 6, 0, 8, '#e8e5be'); disc(g, 6, 0, 3, '#617984'); },
  battery(g) { rect(g, -7, -9, 14, 20, '#8dd9b0'); rect(g, -3, -12, 6, 3, paper); rect(g, -4, -5, 8, 3, '#427f82'); },
  bolt(g) { rect(g, -3, -4, 6, 15, '#96b8cb'); polygon(g, [[-8, -8], [-5, -11], [5, -11], [8, -8], [4, -4], [-4, -4]], '#e2e5db'); },
  gear(g) { disc(g, 0, 0, 9, '#b9dae1'); for (let i = 0; i < 6; i++) rect(g, Math.cos(i * Math.PI / 3) * 9 - 2, Math.sin(i * Math.PI / 3) * 9 - 2, 4, 4, '#b9dae1'); disc(g, 0, 0, 4, '#486b73'); },
};

const avatars = ['#bafa66', '#ff77ba', '#a99bff', '#ffbc66'];
function actor(g, x, y, character, lane, energy, scene) {
  const air = [16, 29, -6, 8, 15][lane] ?? 0;
  const lean = [-.19, .22, -.36, .16, 2 * Math.PI][lane] ?? 0;
  g.save();
  g.translate(x, y - energy * air);
  g.rotate(lean * energy);
  if (lane === 2) g.scale(1 + energy * .4, 1 - energy * .48);
  const color = avatars[character];
  rect(g, -15, -29, 30, 27, ink);
  rect(g, -18, -25, 36, 20, ink);
  rect(g, -15, -26, 30, 20, color);
  rect(g, -12, -29, 24, 26, color);
  rect(g, -8, -22, 16, 3, '#fff5d988');
  rect(g, -7, -18, 4, 7, ink); rect(g, 4, -18, 4, 7, ink);
  rect(g, -2, -9, 5, 2, ink);
  rect(g, -12, -3, 8, 5, ink); rect(g, 5, -3, 8, 5, ink);
  if (scene === 'grill') {
    rect(g, -11, -34, 22, 7, paper); rect(g, -8, -39, 16, 8, paper);
  } else if (scene === 'parcel' || scene === 'diving') ring(g, 0, -17, 21, '#c9e6fa', 2);
  else if (scene === 'baseball' || scene === 'farm' || scene === 'train') {
    rect(g, -12, -34, 24, 7, '#4d6e86'); rect(g, -16, -29, 30, 3, '#e9be7d');
  }
  g.restore();
}

function drawTarget(g, x, y, path, color, time) {
  const glow = .5 + .5 * Math.sin(time * 7);
  g.globalAlpha = .67 + .20 * glow;
  if (path === 'side') {
    line(g, x, 94, x, 161, color, 1);
    polygon(g, [[x - 5, 155], [x + 5, 155], [x, 161]], color);
  } else if (path === 'frame') {
    const size = 13;
    for (const [dx, dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      line(g, x + dx * size, y + dy * size, x + dx * 8, y + dy * size, color);
      line(g, x + dx * size, y + dy * size, x + dx * size, y + dy * 8, color);
    }
  } else ring(g, x, y, 13, color, 1);
  g.globalAlpha = 1;
}

function drawSignal(g, sprite, key, x, y, scale, color, demo, ringCue) {
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (ringCue) ring(g, 0, 0, 14 * scale, color, 2);
  g.save();
  g.scale(ringCue ? 1 : scale, ringCue ? 1 : scale);
  sprites[sprite](g);
  g.restore();
  const labelY = -21 - (ringCue ? 10 : 0);
  rect(g, -8, labelY - 7, 16, 14, demo ? ink : color);
  g.fillStyle = demo ? paper : ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 11px monospace';
  g.fillText(key, 0, labelY + 1);
  g.restore();
}

export class Arena {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = W;
    this.canvas.height = H;
    this.g = canvas.getContext('2d');
    this.background = document.createElement('canvas');
    this.background.width = W;
    this.background.height = H;
    this.action = null;
  }

  setScene(scene) {
    this.scene = scene;
    this.layout = arenas[scene.id];
    const bg = this.background.getContext('2d');
    rect(bg, 0, 0, W, H, this.layout.palette[0]);
    backdrops[scene.id](bg, this.layout.palette);
    this.action = null;
    this.canvas.setAttribute('aria-label', scene.name + ' 무대');
  }

  strike(side, lane, scored, now) {
    this.action = { side, lane, scored, now };
  }

  draw(time, side, character, cues, now) {
    const g = this.g;
    const { path, actor: [x, y], targets } = this.layout;
    g.drawImage(this.background, 0, 0);
    const current = this.action?.side === side ? this.action : null;
    const age = current ? (now - current.now) / 365 : 1;
    const energy = age < 1 ? Math.sin(Math.max(0, age) * Math.PI) : 0;
    targets.forEach(([tx, ty], slot) => {
      if (path !== 'side' || slot === 1) drawTarget(g, tx, ty, path, this.scene.color, time);
    });
    actor(g, x, y, character, current?.lane, energy, this.scene.id);
    for (const { obstacle, progress, key } of cues) {
      const prop = sceneProp(this.scene, obstacle.lane);
      if (!prop) continue;
      const slot = this.scene.props.indexOf(prop);
      const [sx, sy, scale] = signalPosition(this.scene.id, slot, progress);
      drawSignal(g, prop[1], key, sx, sy, scale, this.scene.color, obstacle.demo, path === 'ring');
    }
    if (current?.scored && age < 1) this.effect(current.lane, age);
  }

  effect(lane, age) {
    const g = this.g;
    const prop = sceneProp(this.scene, lane);
    if (!prop) return;
    const [x, y] = this.layout.targets[this.scene.props.indexOf(prop)];
    const { path } = this.layout;
    g.globalAlpha = 1 - age;
    if (path === 'frame') {
      rect(g, 125, 31, 226, 120, '#ffffff55');
      ring(g, x, y, 12 + 40 * age, paper, 2);
    } else if (path === 'fuse' || path === 'ring' || path === 'haunt') {
      for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI / 5;
        const radius = 8 + age * 42;
        rect(g, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 4, 4,
          i % 2 ? paper : this.scene.color);
      }
    } else {
      const dx = path === 'pitch' ? (lane % 2 ? -70 : 70) : path === 'side' ? -67 : 16;
      g.save();
      g.translate(x + age * dx, y - Math.sin(Math.PI * age) * 41 - age * 10);
      g.rotate(age * (lane === 4 ? 5 : .9));
      sprites[prop[1]](g);
      g.restore();
      ring(g, x, y, 7 + 23 * age, this.scene.color, 2);
    }
    g.globalAlpha = 1;
  }
}
