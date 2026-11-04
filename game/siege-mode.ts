export type SiegeMode = "endless" | "timed";
export const SIEGE_TIME_LIMIT = 60;
export const siegeModes = {
  endless: {
    label: "Endless",
    description: "Survive as many waves as you can.",
  },
  timed: {
    label: "60-second arcade",
    description:
      "Score as much as you can in one minute. Hull limits still apply.",
  },
} as const;
/** Runs saved before timed arcade existed belong to Endless. */
export function normalizeSiegeMode(value: unknown): SiegeMode {
  return value === "timed" ? "timed" : "endless";
}
