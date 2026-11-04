/** Sound-profile parameters observed in MechKeys 2.0.2; independently implemented playback. */
export const mechKeysPacks = [
  {
    id: "mechkeys-tactile",
    name: "MechKeys · Tactile",
    tag: "ORIGINAL RECORDINGS · CC0",
    description:
      "The extension’s tactile recordings, including real key releases, Enter, and Backspace.",
  },
  {
    id: "mechkeys-classic",
    name: "MechKeys · Classic",
    tag: "ORIGINAL RECORDINGS · CC0",
    description:
      "The extension’s sixteen muted office-keyboard recordings, with its derived key-release sound.",
  },
  {
    id: "mechkeys-clicky",
    name: "MechKeys · Clicky",
    tag: "MATCHED SYNTHESIS · CLICKY",
    description:
      "The extension’s sharp switch-click profile, on both press and release.",
  },
  {
    id: "mechkeys-linear",
    name: "MechKeys · Linear",
    tag: "MATCHED SYNTHESIS · LINEAR",
    description:
      "The extension’s smooth, deep press sound, without a release click.",
  },
  {
    id: "mechkeys-typewriter",
    name: "MechKeys · Typewriter",
    tag: "MATCHED SYNTHESIS · RETRO",
    description:
      "The extension’s hammer-strike profile, key returns, and Enter bell.",
  },
] as const;
export type MechKeysPackId = (typeof mechKeysPacks)[number]["id"];
export type KeyPhase = "down" | "up";
export function isMechKeysPack(pack: string): pack is MechKeysPackId {
  return mechKeysPacks.some((p) => p.id === pack);
}
const paths = (pack: string, n: number, extension: string) =>
  Array.from(
    { length: n },
    (_, i) =>
      `/audio/mechkeys/${pack}/down-${String(i + 1).padStart(2, "0")}.${extension}`,
  );
export const recordedProfiles = {
  "mechkeys-tactile": {
    down: paths("tactile", 12, "mp3"),
    up: ["/audio/mechkeys/tactile/up-01.mp3"],
    enter: ["/audio/mechkeys/tactile/enter-down-01.mp3"],
    backspace: ["/audio/mechkeys/tactile/backspace-down-01.mp3"],
    gain: 1,
    upGain: 0.35,
  },
  "mechkeys-classic": { down: paths("classic", 16, "wav"), gain: 1 },
} as const;
export type RecordedPackId = keyof typeof recordedProfiles;
export function isRecordedPack(pack: string): pack is RecordedPackId {
  return Object.hasOwn(recordedProfiles, pack);
}
export type BurstSpec = {
  frequency: number;
  q: number;
  gain: number;
  seconds: number;
};
export type BodySpec = {
  frequency: number;
  gain: number;
  seconds: number;
  wave: OscillatorType;
};
export const synthProfiles: Record<
  Exclude<MechKeysPackId, RecordedPackId>,
  {
    press: BurstSpec;
    body: BodySpec;
    release: BurstSpec | null;
    bell?: boolean;
  }
> = {
  "mechkeys-clicky": {
    press: { frequency: 4200, q: 4, gain: 1, seconds: 0.016 },
    body: { frequency: 190, gain: 0.45, seconds: 0.045, wave: "triangle" },
    release: { frequency: 3600, q: 4, gain: 0.55, seconds: 0.012 },
  },
  "mechkeys-linear": {
    press: { frequency: 1600, q: 1, gain: 0.35, seconds: 0.022 },
    body: { frequency: 120, gain: 0.85, seconds: 0.075, wave: "sine" },
    release: null,
  },
  "mechkeys-typewriter": {
    press: { frequency: 3000, q: 2.5, gain: 1.1, seconds: 0.03 },
    body: { frequency: 95, gain: 0.9, seconds: 0.09, wave: "square" },
    release: { frequency: 2200, q: 2, gain: 0.25, seconds: 0.02 },
    bell: true,
  },
};
export const bigKeys = new Set([
  "Space",
  "Enter",
  "NumpadEnter",
  "Backspace",
  "ShiftLeft",
  "ShiftRight",
  "Tab",
  "CapsLock",
]);
const rows = [
  "Escape F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12",
  "Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal Backspace",
  "Tab KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Backslash",
  "CapsLock KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote Enter",
  "ShiftLeft KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash ShiftRight",
  "ControlLeft MetaLeft AltLeft Space AltRight MetaRight ContextMenu ControlRight",
];
const panMap = new Map(
  rows.flatMap((row) =>
    row
      .split(" ")
      .map(
        (code, i, keys) =>
          [code, ((i / (keys.length - 1)) * 2 - 1) * 0.35] as const,
      ),
  ),
);
export function keyPan(code: string) {
  return (
    panMap.get(code) ??
    (/Arrow|Numpad|Page|Home|End|Insert|Delete/.test(code) ? 0.4 : 0)
  );
}
export function keyCodeForCharacter(character: string) {
  if (character === "\n") return "Enter";
  if (character === " ") return "Space";
  if (character === "\t") return "Tab";
  if (character === "\b") return "Backspace";
  const letter = character.normalize("NFD")[0]?.toUpperCase();
  if (letter && /^[A-Z]$/.test(letter)) return `Key${letter}`;
  if (/^\d$/.test(character)) return `Digit${character}`;
  return (
    (
      {
        ",": "Comma",
        ".": "Period",
        "/": "Slash",
        ";": "Semicolon",
        ":": "Semicolon",
        "'": "Quote",
        '"': "Quote",
        "[": "BracketLeft",
        "]": "BracketRight",
        "{": "BracketLeft",
        "}": "BracketRight",
        "-": "Minus",
        "=": "Equal",
        "\\": "Backslash",
        "`": "Backquote",
      } as Record<string, string>
    )[character] ?? "Unidentified"
  );
}
export function sampleAnalysis(channel: Float32Array, sampleRate: number) {
  let peak = 0;
  for (const n of channel) peak = Math.max(peak, Math.abs(n));
  const threshold = peak * 0.08;
  let offset = 0;
  for (let i = 0; i < channel.length; i++)
    if (Math.abs(channel[i]) > threshold) {
      offset = Math.max(0, i / sampleRate - 0.002);
      break;
    }
  return { offset, normalization: peak > 0 ? Math.min(20, 0.6 / peak) : 1 };
}
