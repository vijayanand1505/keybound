import type { SiegeEvent } from "./siege";
export function normalizeCombatSettings(
  value?: { combatSound?: unknown; combatVolume?: unknown } | null,
) {
  return {
    combatSound:
      typeof value?.combatSound === "boolean" ? value.combatSound : true,
    combatVolume:
      typeof value?.combatVolume === "number" &&
      Number.isFinite(value.combatVolume)
        ? Math.max(0, Math.min(100, Math.round(value.combatVolume)))
        : 35,
  };
}
/** A separate, bounded effects bus. It never changes the selected keyboard pack. */
export class CombatAudio {
  readonly master: GainNode;
  private noise: AudioBuffer;
  private voices = new Set<{
    source: AudioScheduledSourceNode;
    gain: GainNode;
  }>();
  constructor(private context: AudioContext) {
    this.master = context.createGain();
    this.master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 5;
    this.master.connect(compressor);
    compressor.connect(context.destination);
    this.noise = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * 0.6),
      context.sampleRate,
    );
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  setVolume(volume: number) {
    this.master.gain.setTargetAtTime(
      (normalizeCombatSettings({ combatVolume: volume }).combatVolume / 100) *
        0.32,
      this.context.currentTime,
      0.01,
    );
  }
  private voice(
    source: AudioScheduledSourceNode,
    start: number,
    duration: number,
    level: number,
    filter?: BiquadFilterNode,
  ) {
    while (this.voices.size >= 24)
      this.remove(this.voices.values().next().value!);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (filter) {
      source.connect(filter);
      filter.connect(gain);
    } else source.connect(gain);
    gain.connect(this.master);
    const voice = { source, gain };
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
      filter?.disconnect();
    };
    source.start(start);
    source.stop(start + duration + 0.01);
  }
  private remove(voice: { source: AudioScheduledSourceNode; gain: GainNode }) {
    try {
      voice.source.stop();
    } catch {
      /* Already ended. */
    }
    voice.source.disconnect();
    voice.gain.disconnect();
    this.voices.delete(voice);
  }
  stop() {
    for (const voice of [...this.voices]) this.remove(voice);
  }
  get activeVoices() {
    return this.voices.size;
  }
  play(kind: SiegeEvent["kind"], volume: number, delay = 0) {
    this.setVolume(volume);
    if (volume <= 0 || this.context.state === "closed") return;
    const time = this.context.currentTime + Math.max(0, delay);
    const tone = (
      from: number,
      to: number,
      duration: number,
      level: number,
      offset = 0,
      type: OscillatorType = "sine",
    ) => {
      const oscillator = this.context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, time + offset);
      oscillator.frequency.exponentialRampToValueAtTime(
        to,
        time + offset + duration,
      );
      this.voice(oscillator, time + offset, duration, level);
    };
    const noise = (cutoff: number, duration: number, level: number) => {
      const source = this.context.createBufferSource();
      source.buffer = this.noise;
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      this.voice(source, time, duration, level, filter);
    };
    switch (kind) {
      case "hit":
        tone(1250, 320, 0.07, 0.25, 0, "triangle");
        break;
      case "kill":
        noise(1600, 0.22, 0.8);
        tone(130, 45, 0.25, 0.55);
        break;
      case "armor":
        [650, 975, 1300].forEach((f, i) =>
          tone(f, f * 0.7, 0.24, 0.24, i * 0.025),
        );
        break;
      case "pulse":
        noise(550, 0.55, 0.6);
        tone(95, 32, 0.65, 0.6, 0, "sine");
        tone(180, 440, 0.45, 0.18, 0.04, "triangle");
        break;
      case "damage":
        noise(400, 0.22, 0.45);
        tone(150, 55, 0.3, 0.6);
        break;
      case "wave":
        [330, 440, 660].forEach((f, i) => tone(f, f, 0.13, 0.24, i * 0.12));
        break;
      case "boss":
        [130, 165, 196].forEach((f, i) =>
          tone(f, f * 1.2, 0.28, 0.28, i * 0.1, "triangle"),
        );
        break;
      case "error":
        tone(190, 130, 0.07, 0.13);
        break;
    }
  }
}
let audio: CombatAudio | null = null;
let context: AudioContext | null = null;
let playbackEpoch = 0;
export async function unlockCombatAudio() {
  try {
    if (typeof window === "undefined" || !window.AudioContext) return;
    if (!context || context.state === "closed") {
      context = new AudioContext({ latencyHint: "interactive" });
      audio = new CombatAudio(context);
    }
    if (context.state === "suspended") await context.resume();
  } catch {
    /* Gameplay remains available when audio is unavailable. */
  }
}
export function playCombatSound(
  kind: SiegeEvent["kind"],
  volume: number,
  delay = 0,
) {
  try {
    if (context?.state === "running") audio?.play(kind, volume, delay);
  } catch {
    /* Unsupported audio must not interrupt typing. */
  }
}
export function setCombatVolume(volume: number) {
  audio?.setVolume(volume);
}
export function stopCombatSounds() {
  playbackEpoch++;
  audio?.stop();
}
export async function previewCombatSounds(volume: number) {
  stopCombatSounds();
  const epoch = playbackEpoch;
  await unlockCombatAudio();
  if (epoch !== playbackEpoch) return;
  playCombatSound("hit", volume);
  playCombatSound("armor", volume, 0.2);
  playCombatSound("kill", volume, 0.6);
}
