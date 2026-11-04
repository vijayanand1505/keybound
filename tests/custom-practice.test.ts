import { describe, it, expect } from "vitest";
import {
  prepareCustomText,
  normalizeCustomDraft,
  customTextStats,
  textCharacters,
  textWindowStart,
} from "../game/custom-practice";
import { TypingSession } from "../game/typing";
describe("custom passages", () => {
  it("preserves capitalization, punctuation, and paragraph breaks while normalizing pasted line endings and tabs", () => {
    expect(
      prepareCustomText("  Hello, World!\r\n\r\n\tKeep going.\u00a0 \n"),
    ).toBe("Hello, World!\n\n  Keep going.");
  });
  it("rejects blank content and removes non-typeable control characters", () => {
    expect(prepareCustomText(" \n\t ")).toBe("");
    expect(prepareCustomText("Hello\u0000 world")).toBe("Hello world");
  });
  it("bounds restored drafts and validates timer choices", () => {
    expect(
      normalizeCustomDraft({
        title: "a".repeat(90),
        text: "x".repeat(13000),
        seconds: 999,
      }),
    ).toEqual({ title: "a".repeat(60), text: "x".repeat(12000), seconds: 0 });
    expect(normalizeCustomDraft(null)).toEqual({
      title: "",
      text: "",
      seconds: 0,
    });
  });
  it("counts paragraph and word content including punctuation", () => {
    expect(customTextStats("👩‍🚀 Café").characters).toBe(6);
    expect(customTextStats("Hello, world!\n\nKeep going.")).toMatchObject({
      words: 4,
      paragraphs: 2,
    });
  });
  it("treats accented characters and composed emoji as individual typing units", () => {
    expect(textCharacters("e\u0301🧭👩‍🚀")).toEqual(["é", "🧭", "👩‍🚀"]);
    const session = new TypingSession("Café 🧭");
    for (const [i, c] of textCharacters("Cafe\u0301 🧭").entries())
      session.press(c, 1000 + i * 100);
    expect(session.complete).toBe(true);
    expect(session.metrics(2000).accuracy).toBe(100);
    expect(session.metrics(2000).progress).toBe(1);
  });
  it("does not award extra clean-word combos for blank paragraphs or repeated spaces", () => {
    const session = new TypingSession("Hello\n\n  world");
    for (const [i, c] of textCharacters(session.text).entries())
      session.press(c, 1000 + i * 100);
    expect(session.maxCombo).toBe(2);
    expect(session.complete).toBe(true);
  });
  it("keeps the active character visible in long unbroken strings and many blank lines", () => {
    const long = textCharacters("a".repeat(2000));
    const start = textWindowStart(long, 1300);
    expect(1300 - start).toBeLessThanOrEqual(60);
    const lines = textCharacters("Hello\n\n\n\n\n\n\n\nworld");
    const begin = textWindowStart(lines, lines.length - 1);
    expect(
      lines.slice(begin, lines.length - 1).filter((c) => c === "\n").length,
    ).toBeLessThanOrEqual(2);
  });
});
