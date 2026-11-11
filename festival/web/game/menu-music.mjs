const melody = [
  64, 0, 67, 71, 69, 67, 64, 0,
  62, 0, 65, 69, 72, 69, 65, 0,
  64, 67, 71, 0, 74, 71, 67, 0,
  69, 0, 67, 65, 64, 62, 60, 0,
  64, 0, 67, 71, 76, 74, 71, 0,
  72, 0, 69, 65, 67, 69, 72, 0,
  71, 0, 74, 79, 76, 74, 71, 0,
  69, 67, 64, 0, 62, 64, 60, 0,
];
const roots = [48, 53, 52, 55, 48, 53, 55, 48];
const frequency = note => 440 * 2 ** ((note - 69) / 12);

function compose(context) {
  const rate = context.sampleRate;
  const step = Math.round(rate * 60 / 115 / 2);
  const loop = context.createBuffer(1, melody.length * step, rate);
  const samples = loop.getChannelData(0);
  for (const [index, note] of melody.entries()) {
    const offset = index * step;
    const lead = frequency(note);
    const bass = frequency(roots[Math.floor(index / 8)] + (index % 8 === 4 ? 7 : 0));
    for (let i = 0; i < step; i++) {
      const time = i / rate;
      const envelope = Math.min(1, time * 135) * Math.min(1, (step - i) / rate * 44);
      const leadPhase = time * lead % 1;
      const bassPhase = time * bass % 1;
      const upper = note ? (leadPhase < .28 ? 1 : -0.39) * .34 : 0;
      const lower = index % 2 ? 0 : (1 - 4 * Math.abs(bassPhase - .5)) * .52;
      const tick = index % 2 ? Math.sin(i * 2.81) * Math.exp(-time * 112) * .12 : 0;
      samples[offset + i] = envelope * (upper + lower + tick);
    }
  }
  return loop;
}

export class MenuMusic {
  constructor() {
    this.enabled = false;
  }

  update(enabled) {
    this.enabled = enabled;
    if (!this.context) return;
    if (enabled && this.context.state === 'running' && !this.source) {
      this.buffer ??= compose(this.context);
      this.source = this.context.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.loop = true;
      this.source.connect(this.volume);
      this.source.start();
    }
    if (!enabled && this.source) {
      this.source.stop();
      this.source = null;
    }
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.volume = this.context.createGain();
      this.volume.gain.value = .12;
      this.volume.connect(this.context.destination);
    }
    if (this.context.state !== 'running') {
      void this.context.resume().then(() => this.update(this.enabled)).catch(() => {});
    } else this.update(true);
  }
}
