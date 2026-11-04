export type CustomDraft = { title: string; text: string; seconds: number };
export const emptyCustomDraft: CustomDraft = {
  title: "",
  text: "",
  seconds: 0,
};
export const customDurations = [0, 30, 60, 120, 300] as const;
export const CUSTOM_TEXT_LIMIT = 12000;
export function prepareCustomText(text: string) {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}
export function normalizeCustomDraft(value: unknown): CustomDraft {
  if (!value || typeof value !== "object") return { ...emptyCustomDraft };
  const draft = value as Partial<CustomDraft>;
  return {
    title: typeof draft.title === "string" ? draft.title.slice(0, 60) : "",
    text:
      typeof draft.text === "string"
        ? draft.text.slice(0, CUSTOM_TEXT_LIMIT)
        : "",
    seconds: customDurations.includes(
      draft.seconds as (typeof customDurations)[number],
    )
      ? draft.seconds!
      : 0,
  };
}
export function customTextStats(text: string) {
  const prepared = prepareCustomText(text);
  return {
    words: prepared ? prepared.split(/\s+/u).length : 0,
    characters: textCharacters(prepared).length,
    paragraphs: prepared
      ? prepared.split(/\n\s*\n/u).filter(Boolean).length
      : 0,
  };
}
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export function textCharacters(text: string): string[] {
  return Array.from(
    segmenter.segment(text.normalize("NFC")),
    (item) => item.segment,
  );
}
export function textWindowStart(chars: string[], cursor: number) {
  let start = Math.max(0, cursor - 60);
  let breaks = 0;
  for (let i = cursor - 1; i >= start; i--) {
    if (chars[i] === "\n" && ++breaks === 3) {
      start = i + 1;
      break;
    }
  }
  return start;
}
