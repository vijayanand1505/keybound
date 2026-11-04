export const siegeDifficulties = ["training", "standard", "expert"] as const;
export type SiegeDifficulty = (typeof siegeDifficulties)[number];
export type SiegeBest = { score: number; wave: number };
export type SiegeBests = Partial<Record<SiegeDifficulty, SiegeBest>>;
export const siegeProfiles = {
  training: {
    label: "Training",
    description: "Slower enemies and shorter words.",
    hull: 5,
    pulses: 2,
    recharge: 3,
    speed: 0.55,
    spawnScale: 1.5,
    maxActive: 4,
    waveBase: 2,
    maxSwarm: 10,
    breakTime: 4,
  },
  standard: {
    label: "Standard",
    description: "Balanced speed and word length.",
    hull: 3,
    pulses: 1,
    recharge: 5,
    speed: 1,
    spawnScale: 1,
    maxActive: 7,
    waveBase: 4,
    maxSwarm: 15,
    breakTime: 2.8,
  },
  expert: {
    label: "Expert",
    description: "Faster enemies and longer words.",
    hull: 3,
    pulses: 1,
    recharge: 5,
    speed: 1.4,
    spawnScale: 0.8,
    maxActive: 7,
    waveBase: 5,
    maxSwarm: 17,
    breakTime: 2.2,
  },
} as const;
export function normalizeSiegeDifficulty(value: unknown): SiegeDifficulty {
  return value === "training" || value === "expert" ? value : "standard";
}
/** Older arcade records were all played on Standard. */
export function normalizeSiegeBests(
  value: unknown,
  legacy?: unknown,
): SiegeBests {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const result: SiegeBests = {};
  for (const difficulty of siegeDifficulties) {
    const entry =
      source[difficulty] ?? (difficulty === "standard" ? legacy : undefined);
    if (!entry || typeof entry !== "object") continue;
    const { score, wave } = entry as SiegeBest;
    result[difficulty] = {
      score: Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0,
      wave: Number.isFinite(wave) ? Math.max(0, Math.round(wave)) : 0,
    };
  }
  return result;
}
