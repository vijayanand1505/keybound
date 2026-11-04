import type { SoundKind, LegacySoundPackId } from "./sounds";
const TAU = Math.PI * 2;
const notes: Record<string, number> = {
  coast: 440,
  ascent: 330,
  daily: 587,
  coach: 392,
  code: 660,
  practice: 294,
  trial: 349,
};
/** Original deterministic PCM synthesis, shared by playback and signal-level tests. */
export function synthesizeSound(
  pack: LegacySoundPackId,
  kind: SoundKind,
  sampleRate: number,
  seed = 1,
  character = "",
  theme = "coast",
): Float32Array {
  const rate = Math.max(8000, Math.min(96000, sampleRate));
  const baseDuration = {
    soft: 0.085,
    mechanical: 0.105,
    thock: 0.16,
    typewriter: 0.19,
    telegraph: 0.115,
    arcade: 0.1,
  }[pack];
  const duration =
    kind === "complete"
      ? 0.62
      : kind === "error"
        ? 0.15
        : pack === "typewriter" && character === "\n"
          ? 0.36
          : kind === "word" && (pack === "soft" || pack === "arcade")
            ? 0.16
            : baseDuration;
  const samples = new Float32Array(Math.ceil(rate * duration));
  let state = (seed + 1) * 16807,
    low = 0,
    mid = 0,
    peak = 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return ((state >>> 0) / 4294967296) * 2 - 1;
  };
  const variation = 1 + Math.sin(seed * 13.7) * 0.035;
  const weight = character === " " ? 0.81 : character === "\n" ? 0.72 : 1;
  const note = (notes[theme] ?? 440) * variation;
  const lowA = 1 - Math.exp((-TAU * 650) / rate),
    midA = 1 - Math.exp((-TAU * 2600) / rate);
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate,
      n = random();
    low += lowA * (n - low);
    mid += midA * (n - mid);
    const attack = 1 - Math.exp(-t / 0.0005);
    const hit = (frequency: number, decay: number, offset = 0) => {
      const u = t - offset;
      return u < 0
        ? 0
        : Math.sin(TAU * frequency * variation * weight * u) *
            (1 - Math.exp(-u / 0.0004)) *
            Math.exp(-u / decay);
    };
    let value = 0;
    if (kind === "complete") {
      value =
        0.3 * hit(note, 0.13) +
        0.27 * hit(note * 1.25, 0.16, 0.09) +
        0.24 * hit(note * 1.5, 0.2, 0.18);
    } else if (kind === "error") {
      value =
        0.38 * hit(pack === "thock" ? 85 : 125, 0.035) +
        low * 0.4 * attack * Math.exp(-t / 0.018);
    } else if (pack === "soft") {
      value =
        0.4 *
        hit(
          note * (kind === "word" ? 1 : 1.5),
          kind === "word" ? 0.035 : 0.016,
        );
    } else if (pack === "mechanical") {
      value =
        (n - mid) * 0.57 * attack * Math.exp(-t / 0.0048) +
        (mid - low) * 0.4 * attack * Math.exp(-t / 0.013) +
        0.24 * hit(1850, 0.006) +
        0.2 * hit(410, 0.014) +
        0.12 * hit(2650, 0.004, 0.026);
    } else if (pack === "thock") {
      value =
        0.55 * hit(125, 0.025) +
        0.3 * hit(245, 0.016) +
        low * 0.65 * attack * Math.exp(-t / 0.018) +
        (mid - low) * 0.11 * attack * Math.exp(-t / 0.004);
    } else if (pack === "typewriter") {
      const returnAge = t - 0.048;
      value =
        (mid - low) * 0.65 * attack * Math.exp(-t / 0.013) +
        0.26 * hit(930, 0.018) +
        0.18 * hit(2160, 0.008) +
        0.16 * hit(370, 0.023) +
        (returnAge > 0
          ? (n - mid) *
            0.23 *
            (1 - Math.exp(-returnAge / 0.001)) *
            Math.exp(-returnAge / 0.012)
          : 0);
      if (character === "\n")
        value +=
          0.24 * hit(1750, 0.08, 0.08) +
          (t > 0.1 ? mid * 0.15 * Math.exp(-(t - 0.1) / 0.07) : 0);
    } else if (pack === "telegraph") {
      const hold = character === " " ? 0.065 : 0.038;
      const gate =
        (1 - Math.exp(-t / 0.002)) * Math.exp(-Math.max(0, t - hold) / 0.004);
      value =
        0.32 * Math.sin(TAU * 690 * variation * t) * gate +
        (n - mid) * 0.15 * attack * Math.exp(-t / 0.002) +
        0.12 * hit(1300, 0.004, hold);
    } else {
      const frequency =
        note *
        (kind === "word"
          ? t < 0.045
            ? 1
            : t < 0.09
              ? 1.25
              : 1.5
          : 2 ** ((seed % 5) / 12));
      const wave = Math.tanh(Math.sin(TAU * frequency * t) * 2.8);
      value =
        0.26 * wave * attack * Math.exp(-t / (kind === "word" ? 0.065 : 0.022));
    }
    // Fade both boundaries; avoid discontinuities on short percussion and chiptune tails.
    value *= Math.min(1, (duration - t) / 0.008);
    samples[i] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  // Only attenuate; preserve the relative body/transient character of each pack.
  if (peak > 0.75) {
    const scale = 0.75 / peak;
    for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  }
  return samples;
}
