export const themes = ["dark", "light", "system"] as const;
export const accents = ["amber", "sage", "ocean"] as const;
export type Theme = (typeof themes)[number];
export type Accent = (typeof accents)[number];
export function normalizeAppearance(
  value: { theme?: unknown; accent?: unknown } | null | undefined,
) {
  return {
    theme: themes.includes(value?.theme as Theme)
      ? (value!.theme as Theme)
      : "dark",
    accent: accents.includes(value?.accent as Accent)
      ? (value!.accent as Accent)
      : "amber",
  };
}
