export class Playback {
  constructor() {
    this.context = new AudioContext({ latencyHint: 'interactive' });
    this.offset = 0;
    this.music = this.context.createGain();
    this.music.gain.value = .63;
    this.music.connect(this.context.destination);
  }

  async load(bytes) {
    const unlock = this.context.resume();
    try {
      await Promise.race([unlock, new Promise((_, reject) => setTimeout(() =>
        reject(new Error('게임 PC에서 선택 버튼을 눌러 음원을 시작하세요.')), 1500))]);
      this.buffer = await this.context.decodeAudioData(await bytes());
    } catch (error) {
      throw new Error('음원을 시작할 수 없습니다. ' + error.message);
    }
    this.offset = 0;
    this.resume();
  }

  resume() {
    this.startAt = this.context.currentTime + .09;
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.music);
    this.source.start(this.startAt, this.offset);
    this.demoGain = this.context.createGain();
    this.demoGain.connect(this.context.destination);
  }

  pause() {
    if (!this.source) return;
    this.offset = Math.max(0, this.time);
    this.source.stop();
    this.source = null;
    this.demoGain.disconnect();
  }

  get time() {
    return this.timeAt(performance.now());
  }

  timeAt(eventTime) {
    if (!this.source) return this.offset;
    const stamp = this.context.getOutputTimestamp?.();
    const audible = stamp?.performanceTime > 0
      ? Math.min(this.context.currentTime, stamp.contextTime + (eventTime - stamp.performanceTime) / 1000)
      : this.context.currentTime - (this.context.outputLatency || this.context.baseLatency || 0);
    return this.offset + audible - this.startAt;
  }

  get scheduleThrough() {
    return this.offset + this.context.currentTime - this.startAt + .09;
  }

  cueTime(songTime) {
    return this.startAt + songTime - this.offset;
  }
}
