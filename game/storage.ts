import { normalizeCosmetics, type CosmeticSave } from "./siege-cosmetics";
import { normalizeAppearance, type Theme, type Accent } from "./appearance";
import { normalizeCustomDraft, type CustomDraft } from "./custom-practice";
import {
  normalizeSiegeBests,
  normalizeSiegeDifficulty,
  type SiegeBests,
  type SiegeDifficulty,
} from "./siege-difficulty";
import { normalizeCombatSettings } from "./combat-audio";
import type { MissedWord } from "./siege";
import { normalizeSiegeMode, type SiegeMode } from "./siege-mode";
import { get, set, del } from "idb-keyval";
import { normalizeSoundSettings, type SoundPackId } from "./sounds";
import type { KeyStroke, Metrics } from "./typing";
export type Run = {
  id: string;
  missionId: string;
  title: string;
  expedition: string;
  mode: string;
  date: string;
  completed: boolean;
  xp: number;
  metrics: Metrics;
  events: KeyStroke[];
  arcade?: {
    mode?: SiegeMode;
    endReason?: "time" | "hull" | "ended";
    score: number;
    wave: number;
    kills: number;
    difficulty?: SiegeDifficulty;
    maxCombo?: number;
    missedWords?: MissedWord[];
  };
};
export type Settings = {
  theme: Theme;
  accent: Accent;
  calm: boolean;
  sound: boolean;
  soundPack: SoundPackId;
  soundVolume: number;
  combatSound: boolean;
  combatVolume: number;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
};
export type Save = {
  version: 1;
  runs: Run[];
  settings: Settings;
  customDraft?: CustomDraft;
  siegeDifficulty?: SiegeDifficulty;
  arcadeBests?: SiegeBests;
  timedArcadeBests?: SiegeBests;
  siegeMode?: SiegeMode;
  siegeCosmetics?: CosmeticSave;
  arcadeBest?: { score: number; wave: number };
};
export const defaultSettings: Settings = {
  theme: "dark",
  accent: "amber",
  calm: false,
  sound: false,
  soundPack: "soft",
  soundVolume: 45,
  combatSound: true,
  combatVolume: 35,
  reducedMotion: false,
  highContrast: false,
  largeText: false,
};
const key = "keybound-save-v1";
export async function loadSave(): Promise<Save> {
  const value = await get<Save>(key);
  return value?.version === 1 && Array.isArray(value.runs)
    ? {
        version: 1,
        runs: value.runs,
        siegeCosmetics: normalizeCosmetics(
          value.siegeCosmetics,
          value.runs,
          normalizeSiegeBests(value.arcadeBests, value.arcadeBest),
        ),
        siegeDifficulty: normalizeSiegeDifficulty(value.siegeDifficulty),
        siegeMode: normalizeSiegeMode(value.siegeMode),
        timedArcadeBests: normalizeSiegeBests(value.timedArcadeBests),
        arcadeBests: normalizeSiegeBests(value.arcadeBests, value.arcadeBest),
        ...(value.customDraft
          ? { customDraft: normalizeCustomDraft(value.customDraft) }
          : {}),
        ...(value.arcadeBest
          ? {
              arcadeBest: {
                score: Number.isFinite(value.arcadeBest.score)
                  ? Math.max(0, Math.round(value.arcadeBest.score))
                  : 0,
                wave: Number.isFinite(value.arcadeBest.wave)
                  ? Math.max(0, Math.round(value.arcadeBest.wave))
                  : 0,
              },
            }
          : {}),
        settings: {
          ...defaultSettings,
          ...value.settings,
          ...normalizeSoundSettings(value.settings),
          ...normalizeCombatSettings(value.settings),
          ...normalizeAppearance(value.settings),
        },
      }
    : { version: 1, runs: [], settings: defaultSettings };
}
export async function saveProgress(save: Save) {
  await set(key, save);
}
export async function clearProgress() {
  await del(key);
}
