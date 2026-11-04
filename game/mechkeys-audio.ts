import {
  bigKeys,
  isRecordedPack,
  keyPan,
  recordedProfiles,
  sampleAnalysis,
  synthProfiles,
  type BurstSpec,
  type BodySpec,
  type KeyPhase,
  type MechKeysPackId,
  type RecordedPackId,
} from "./mechkeys-profiles";
type Sample = { buffer: AudioBuffer; offset: number; normalization: number };
type SampleSet = {
  down: Sample[];
  up?: Sample[];
  enter?: Sample[];
  backspace?: Sample[];
};
type Voice = { source: AudioScheduledSourceNode; nodes: AudioNode[] };
/** Original renderer matching the extension's public sound behavior; no extension code is executed. */
export class MechKeysAudio {
  private samples = new Map<RecordedPackId, SampleSet>();
  private pending = new Map<RecordedPackId, Promise<void>>();
  private voices = new Set<Voice>();
  private epoch = 0;
  private lastIndex = -1;
  private noise: AudioBuffer | null = null;
  constructor(
    private context: AudioContext,
    private destination: AudioNode,
  ) {}
  async preload(pack: MechKeysPackId) {
    if (!isRecordedPack(pack) || this.samples.has(pack)) return;
    const existing = this.pending.get(pack);
    if (existing) return existing;
    const definition = recordedProfiles[pack];
    const decode = async (path: string): Promise<Sample> => {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Keyboard recording could not load.");
      const buffer = await this.context.decodeAudioData(
        await response.arrayBuffer(),
      );
      return {
        buffer,
        ...sampleAnalysis(buffer.getChannelData(0), buffer.sampleRate),
      };
    };
    const task = (async () => {
      const result: SampleSet = { down: [] };
      for (const category of ["down", "up", "enter", "backspace"] as const) {
        const paths = (
          definition as {
            down: readonly string[];
            up?: readonly string[];
            enter?: readonly string[];
            backspace?: readonly string[];
          }
        )[category];
        if (paths) result[category] = await Promise.all(paths.map(decode));
      }
      this.samples.set(pack, result);
    })();
    this.pending.set(pack, task);
    try {
      await task;
    } finally {
      this.pending.delete(pack);
    }
  }
  stop() {
    this.epoch++;
    for (const voice of this.voices) {
      try {
        voice.source.stop();
      } catch {}
      voice.source.disconnect();
      for (const node of voice.nodes) node.disconnect();
    }
    this.voices.clear();
  }
  private vary(value: number, amount: number) {
    return value * (1 + (Math.random() * 2 - 1) * amount);
  }
  private choose<T>(items: T[], noRepeat = false): T {
    let index = Math.floor(Math.random() * items.length);
    if (noRepeat && items.length > 1 && index === this.lastIndex)
      index =
        (index + 1 + Math.floor(Math.random() * (items.length - 1))) %
        items.length;
    if (noRepeat) this.lastIndex = index;
    return items[index];
  }
  private connect(
    source: AudioScheduledSourceNode,
    nodes: AudioNode[],
    code?: string,
  ) {
    if (
      code !== undefined &&
      typeof this.context.createStereoPanner === "function"
    ) {
      const pan = this.context.createStereoPanner();
      pan.pan.value = keyPan(code);
      nodes.push(pan);
    }
    let previous: AudioNode = source;
    for (const node of nodes) {
      previous.connect(node);
      previous = node;
    }
    previous.connect(this.destination);
    if (this.voices.size >= 64) {
      const oldest = this.voices.values().next().value!;
      try {
        oldest.source.stop();
      } catch {}
      oldest.source.disconnect();
      oldest.nodes.forEach((node) => node.disconnect());
      this.voices.delete(oldest);
    }
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
      this.voices.delete(voice);
    };
  }
  private sample(
    sample: Sample,
    code: string,
    rate: number,
    level: number,
    seconds?: number,
  ) {
    const source = this.context.createBufferSource();
    source.buffer = sample.buffer;
    source.playbackRate.value = rate;
    const gain = this.context.createGain(),
      now = this.context.currentTime,
      value = level * sample.normalization;
    gain.gain.value = value;
    if (seconds) {
      gain.gain.setValueAtTime(value, now + seconds * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    }
    this.connect(source, [gain], code);
    if (seconds) source.start(now, sample.offset, seconds + 0.01);
    else source.start(now, sample.offset);
  }
  private recorded(pack: RecordedPackId, phase: KeyPhase, code: string) {
    const samples = this.samples.get(pack)!;
    const big = bigKeys.has(code);
    if (phase === "up") {
      if (samples.up) {
        const level =
          (recordedProfiles[pack] as { upGain?: number }).upGain ?? 0.4;
        this.sample(
          this.choose(samples.up),
          code,
          this.vary(big ? 0.85 : 1, 0.05),
          this.vary(level, 0.15),
        );
      } else
        this.sample(
          this.choose(samples.down),
          code,
          this.vary(0.84, 0.04),
          0.35,
          0.035,
        );
      return;
    }
    const dedicated =
      code === "Enter" || code === "NumpadEnter"
        ? samples.enter
        : code === "Backspace"
          ? samples.backspace
          : undefined;
    const choice = dedicated ?? samples.down;
    const derivedBig = big && !dedicated;
    // Dedicated Enter/Backspace recordings play at their original rate; larger derived keys deepen.
    this.sample(
      this.choose(choice, choice === samples.down),
      code,
      this.vary(1, 0.04) * (derivedBig ? 0.82 : 1),
      this.vary(1, 0.12) * (derivedBig ? 1.1 : 1),
    );
  }
  private burst(spec: BurstSpec, pitch: number, code: string, at: number) {
    const ctx = this.context;
    if (!this.noise) {
      this.noise = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate * 0.15),
        ctx.sampleRate,
      );
      const channel = this.noise.getChannelData(0);
      for (let i = 0; i < channel.length; i++)
        channel[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.playbackRate.value = this.vary(1, 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = this.vary(spec.frequency * pitch, 0.08);
    filter.Q.value = spec.q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, this.vary(spec.gain, 0.15)), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.seconds);
    this.connect(source, [filter, gain], code);
    source.start(at, Math.random() * 0.05);
    source.stop(at + spec.seconds + 0.02);
  }
  private body(spec: BodySpec, pitch: number, code: string, at: number) {
    const source = this.context.createOscillator(),
      gain = this.context.createGain();
    source.type = spec.wave;
    const frequency = this.vary(spec.frequency * pitch, 0.06);
    source.frequency.setValueAtTime(frequency, at);
    source.frequency.exponentialRampToValueAtTime(
      frequency * 0.5,
      at + spec.seconds,
    );
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, this.vary(spec.gain, 0.12)),
      at + 0.002,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.seconds);
    this.connect(source, [gain], code);
    source.start(at);
    source.stop(at + spec.seconds + 0.02);
  }
  private bell(at: number) {
    for (const [frequency, level] of [
      [2093, 0.35],
      [4186, 0.12],
    ]) {
      const source = this.context.createOscillator(),
        gain = this.context.createGain();
      source.type = "sine";
      source.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(level, at + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
      this.connect(source, [gain]);
      source.start(at);
      source.stop(at + 1);
    }
  }
  private synthesized(
    pack: Exclude<MechKeysPackId, RecordedPackId>,
    phase: KeyPhase,
    code: string,
  ) {
    const profile = synthProfiles[pack],
      big = bigKeys.has(code),
      pitch = big ? 0.72 : 1,
      at = this.context.currentTime + 0.001;
    if (phase === "down") {
      this.burst(profile.press, pitch, code, at);
      this.body(
        big
          ? { ...profile.body, seconds: profile.body.seconds * 1.4 }
          : profile.body,
        pitch,
        code,
        at + 0.004,
      );
      if (profile.bell && (code === "Enter" || code === "NumpadEnter"))
        this.bell(at + 0.05);
    } else if (profile.release) this.burst(profile.release, pitch, code, at);
  }
  play(pack: MechKeysPackId, phase: KeyPhase, code: string) {
    if (isRecordedPack(pack)) {
      if (this.samples.has(pack)) {
        this.recorded(pack, phase, code);
        return;
      }
      const epoch = this.epoch,
        requested = performance.now();
      void this.preload(pack)
        .then(() => {
          if (epoch === this.epoch && performance.now() - requested < 150)
            this.recorded(pack, phase, code);
        })
        .catch(() => {});
    } else this.synthesized(pack, phase, code);
  }
}
