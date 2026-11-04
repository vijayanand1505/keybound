import { MechKeysAudio } from "./mechkeys-audio";
import {
  isMechKeysPack,
  isRecordedPack,
  keyCodeForCharacter,
  type KeyPhase,
} from "./mechkeys-profiles";
import { synthesizeSound } from "./sound-synthesis";
import {
  normalizeSoundSettings,
  type SoundKind,
  type SoundPackId,
} from "./sounds";
export type SoundOptions = {
  pack?: SoundPackId;
  volume?: number;
  character?: string;
};
let context: AudioContext | null = null;
let master: GainNode | null = null;
let exactMaster: GainNode | null = null;
let mechKeys: MechKeysAudio | null = null;
let playbackEpoch = 0;
let currentVolume = 45;
let serial = 0;
const buffers = new Map<string, AudioBuffer>();
const voices = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>();
const previewTimers = new Set<ReturnType<typeof setTimeout>>();
function init(resume = true) {
  if (!context || context.state === "closed") {
    context = new AudioContext({ latencyHint: "interactive" });
    buffers.clear();
    master = context.createGain();
    master.gain.value = 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 12;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.08;
    master.connect(limiter);
    limiter.connect(context.destination);
    exactMaster = context.createGain();
    exactMaster.gain.value = 0;
    exactMaster.connect(context.destination);
    mechKeys = new MechKeysAudio(context, exactMaster);
  }
  if (resume && context.state === "suspended")
    void context.resume().catch(() => {});
  return context;
}
export function stopSounds() {
  playbackEpoch++;
  mechKeys?.stop();
  for (const timer of previewTimers) clearTimeout(timer);
  previewTimers.clear();
  for (const voice of voices) {
    try {
      voice.source.stop();
    } catch {
      /* Already ended. */
    }
    voice.source.disconnect();
    voice.gain.disconnect();
  }
  voices.clear();
}
export function setSoundVolume(volume: number) {
  currentVolume = normalizeSoundSettings({ soundVolume: volume }).soundVolume;
  // MechKeys uses a direct master gain; preserve its initial click transient.
  if (exactMaster) exactMaster.gain.value = currentVolume / 100;
  if (context && master)
    master.gain.setTargetAtTime(
      (normalizeSoundSettings({ soundVolume: volume }).soundVolume / 100) *
        0.65,
      context.currentTime,
      0.01,
    );
}
export function playTone(
  kind: SoundKind,
  theme = "coast",
  options: SoundOptions = {},
) {
  const preferences = normalizeSoundSettings({
    soundPack: options.pack,
    soundVolume: options.volume,
  });
  if (!preferences.soundVolume) return;
  try {
    const ctx = init();
    setSoundVolume(preferences.soundVolume);
    if (isMechKeysPack(preferences.soundPack) && kind !== "complete") {
      const code = keyCodeForCharacter(options.character ?? "a");
      playKeyboardSound("down", code, options);
      schedule(
        () =>
          playKeyboardSound("up", code, { ...options, volume: currentVolume }),
        55,
      );
      return;
    }
    const pack = isMechKeysPack(preferences.soundPack)
      ? "soft"
      : preferences.soundPack;
    const variant = serial++ % 8;
    const character =
      options.character === "\n" ? "\n" : options.character === " " ? " " : "";
    const themed =
      preferences.soundPack === "soft" ||
      preferences.soundPack === "arcade" ||
      kind === "complete"
        ? theme
        : "";
    const key = `${preferences.soundPack}/${kind}/${variant}/${character}/${themed}`;
    let buffer = buffers.get(key);
    if (!buffer) {
      const pcm = synthesizeSound(
        pack,
        kind,
        ctx.sampleRate,
        variant,
        character,
        themed,
      );
      buffer = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
      buffer.getChannelData(0).set(pcm);
      if (buffers.size >= 200) buffers.delete(buffers.keys().next().value!);
      buffers.set(key, buffer);
    }
    // Bound overlap during fast input. A short release avoids abruptly chopping a voice.
    if (voices.size >= 24) {
      const oldest = voices.values().next().value!;
      oldest.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.002);
      oldest.source.stop(ctx.currentTime + 0.01);
      voices.delete(oldest);
    }
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = kind === "complete" ? 0.7 : 1;
    source.connect(gain);
    gain.connect(master!);
    const voice = { source, gain };
    voices.add(voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      voices.delete(voice);
    };
    source.start();
  } catch {
    /* Audio must never interrupt typing if playback is unavailable. */
  }
}
/** Load the selected recordings without resuming audio or autoplaying. */
export async function preloadSoundPack(pack: SoundPackId) {
  if (!isRecordedPack(pack) || typeof AudioContext === "undefined") return;
  init(false);
  await mechKeys!.preload(pack);
}
/** Physical-key playback is separate from correctness feedback and text input. */
export function playKeyboardSound(
  phase: KeyPhase,
  code: string,
  options: SoundOptions,
) {
  if (!options.pack || !isMechKeysPack(options.pack)) return false;
  const { soundVolume } = normalizeSoundSettings({
    soundVolume: options.volume,
  });
  if (!soundVolume) return false;
  try {
    init();
    setSoundVolume(soundVolume);
    mechKeys!.play(options.pack, phase, code);
    return true;
  } catch {
    return false;
  }
}
function schedule(run: () => void, milliseconds: number) {
  const timer = setTimeout(() => {
    previewTimers.delete(timer);
    run();
  }, milliseconds);
  previewTimers.add(timer);
}
/** Explicit, gesture-initiated sample; cancellation also covers pending downloads. */
export function previewSound(
  pack: SoundPackId,
  volume: number,
  onEnd: () => void = () => {},
  onError: () => void = () => {},
) {
  stopSounds();
  const epoch = playbackEpoch;
  // Resume inside the click gesture, before any asynchronous sample loading.
  try {
    init();
    setSoundVolume(volume);
  } catch {
    onError();
    return stopSounds;
  }
  const run = () => {
    if (epoch !== playbackEpoch) return;
    const keys = ["s", "i", "g", "n", "a", "l", " ", "h", "o", "m", "e", "\n"];
    const beats = [0, 100, 185, 280, 365, 480, 570, 700, 790, 875, 980, 1140];
    keys.forEach((character, index) => {
      const beat = () =>
        playTone("key", "coast", { pack, volume: currentVolume, character });
      if (index === 0) beat();
      else schedule(beat, beats[index]);
    });
    schedule(onEnd, pack === "mechkeys-typewriter" ? 2300 : 1800);
  };
  if (isRecordedPack(pack))
    void preloadSoundPack(pack)
      .then(run)
      .catch(() => {
        if (epoch === playbackEpoch) {
          stopSounds();
          onError();
        }
      });
  else run();
  return stopSounds;
}
