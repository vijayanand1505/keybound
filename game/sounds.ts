import { mechKeysPacks } from "./mechkeys-profiles";
export const legacySoundPacks = [
  {
    id: "soft",
    name: "Soft Signal",
    tag: "GENTLE · TONAL",
    description: "Soft electronic sounds for each keystroke.",
  },
  {
    id: "mechanical",
    name: "Mechanical Click",
    tag: "CRISP · CLICKY",
    description:
      "A bright switch click, spring resonance, and a snappy key return.",
  },
  {
    id: "thock",
    name: "Deep Thock",
    tag: "LOW · TACTILE",
    description: "A deep keyboard sound with a soft, low-pitched impact.",
  },
  {
    id: "typewriter",
    name: "Vintage Typewriter",
    tag: "METALLIC · RETRO",
    description:
      "Metal typebars, a second key-return clack, and a carriage sound on Enter.",
  },
  {
    id: "telegraph",
    name: "Brass Telegraph",
    tag: "RADIO · MORSE",
    description: "Short radio-key tones with a subtle brass contact click.",
  },
  {
    id: "arcade",
    name: "Pocket Arcade",
    tag: "PLAYFUL · 8-BIT",
    description: "Tiny retro notes and rising word-completion chirps.",
  },
] as const;
export type LegacySoundPackId = (typeof legacySoundPacks)[number]["id"];
export const soundPacks = [...mechKeysPacks, ...legacySoundPacks] as const;
export type SoundPackId = (typeof soundPacks)[number]["id"];
export type SoundKind = "key" | "word" | "error" | "complete";
export function normalizeSoundSettings(
  value: { soundPack?: unknown; soundVolume?: unknown } | null | undefined,
) {
  const pack = soundPacks.some((p) => p.id === value?.soundPack)
    ? (value!.soundPack as SoundPackId)
    : "soft";
  const volume =
    typeof value?.soundVolume === "number" && Number.isFinite(value.soundVolume)
      ? Math.round(Math.max(0, Math.min(100, value.soundVolume)))
      : 45;
  return { soundPack: pack, soundVolume: volume };
}
