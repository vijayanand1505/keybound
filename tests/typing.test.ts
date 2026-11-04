import { describe, expect, it } from "vitest";
import {
  TypingSession,
  seededRandom,
  trainingText,
  utcDay,
  weakKeys,
} from "../game/typing";
import missions from "../content/missions.json";
describe("typing session", () => {
  it("starts only on the first key, even at timestamp zero", () => {
    const s = new TypingSession("ab");
    expect(s.metrics(9000).duration).toBe(0);
    s.press("a", 0);
    s.press("b", 1000);
    expect(s.metrics(1000).duration).toBe(1000);
  });
  it("stops on a wrong key and includes corrected mistakes in accuracy", () => {
    const s = new TypingSession("ab");
    s.press("a", 1000);
    s.press("x", 1100);
    expect(s.cursor).toBe(1);
    s.press("b", 1200);
    expect(s.complete).toBe(true);
    expect(s.metrics(1200).accuracy).toBeCloseTo(200 / 3);
    expect(s.metrics(1200).errors).toBe(1);
  });
  it("measures useful WPM from committed characters and raw WPM from attempts", () => {
    const s = new TypingSession("abcde");
    for (const [i, c] of [..."abcde"].entries()) s.press(c, 1000 + i * 15000);
    expect(s.metrics(61000).wpm).toBe(1);
    expect(s.metrics(61000).grossWpm).toBe(1);
  });
  it("excludes paused time and rejects typing while paused", () => {
    const s = new TypingSession("ab");
    s.press("a", 1000);
    s.pause(2000);
    s.press("b", 3000);
    expect(s.cursor).toBe(1);
    s.resume(12000);
    s.press("b", 13000);
    expect(s.metrics(13000).duration).toBe(2000);
    expect(s.events.at(-1)?.latency).toBe(0);
  });
  it("does not create elapsed time when paused before first input", () => {
    const s = new TypingSession("ab");
    s.pause(1000);
    s.resume(11000);
    s.press("a", 12000);
    s.press("b", 13000);
    expect(s.metrics(13000).duration).toBe(1000);
  });
  it("freezes completed metrics", () => {
    const s = new TypingSession("ab");
    s.press("a", 1000);
    s.press("b", 2000);
    s.press("c", 3000);
    expect(s.events).toHaveLength(2);
    expect(s.metrics(10000).duration).toBe(1000);
  });
  it("awards combos only to clean completed words", () => {
    const s = new TypingSession("a b c d");
    for (const [i, c] of [..."a b xc d"].entries()) s.press(c, 1000 + i * 100);
    expect(s.maxCombo).toBe(2);
    expect(s.complete).toBe(true);
  });
  it("backspace reduces progress without erasing recorded mistakes", () => {
    const s = new TypingSession("abc");
    s.press("a", 1000);
    s.press("x", 1100);
    s.backspace();
    expect(s.cursor).toBe(0);
    expect(s.metrics(1200).errors).toBe(1);
  });
  it("rewards steady rhythm and reduces flow on error", () => {
    const s = new TypingSession("a".repeat(50));
    for (let i = 0; i < 20; i++) s.press("a", 1000 + i * 100);
    expect(s.metrics(2900).flow).toBe(100);
    s.press("b", 3000);
    expect(s.metrics(3000).flow).toBeLessThan(50);
  });
});
describe("coach and deterministic routes", () => {
  it("ranks a repeatedly incorrect key above a clean fast key", () => {
    const s = new TypingSession("aaaabbbb");
    for (let i = 0; i < 4; i++) s.press("a", 1000 + i * 100);
    for (let i = 0; i < 4; i++) {
      s.press("x", 2000 + i * 200);
      s.press("b", 2100 + i * 200);
    }
    expect(weakKeys(s.events)[0].key).toBe("b");
  });
  it("has deterministic randomness and daily content", () => {
    const a = seededRandom("2026-10-28"),
      b = seededRandom("2026-10-28");
    expect(Array.from({ length: 20 }, a)).toEqual(
      Array.from({ length: 20 }, b),
    );
    expect(trainingText([], "daily-v1-2026-10-28")).toBe(
      trainingText([], "daily-v1-2026-10-28"),
    );
    expect(trainingText([], "daily-v1-2026-10-29")).not.toBe(
      trainingText([], "daily-v1-2026-10-28"),
    );
  });
  it("uses UTC rather than the browser locale for the daily boundary", () => {
    expect(utcDay(new Date("2026-10-29T00:30:00+05:30"))).toBe("2026-10-28");
  });
  it("gives selected weak keys materially more exposure", () => {
    const base = trainingText([], "test", 500)
      .split(" ")
      .filter((w) => w.includes("q")).length;
    const biased = trainingText(["q"], "test", 500)
      .split(" ")
      .filter((w) => w.includes("q")).length;
    expect(biased).toBeGreaterThan(base + 200);
  });
});
describe("campaign content", () => {
  it("has unique ids, complete sequences, and eight missions per live expedition", () => {
    expect(new Set(missions.map((m) => m.id)).size).toBe(missions.length);
    for (const id of ["coast", "ascent"])
      expect(
        missions.filter((m) => m.expedition === id).map((m) => m.number),
      ).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("keeps calibration genuinely on the home row", () => {
    expect(missions.find((m) => m.id === "coast-02")?.text).toMatch(
      /^[asdfjkl; ]+$/,
    );
  });
  it("contains no missing mission fields or impossible timers", () => {
    for (const m of missions) {
      expect(m.text.length).toBeGreaterThan(60);
      expect(m.briefing.length).toBeGreaterThan(20);
      expect(m.seconds).toBeGreaterThanOrEqual(60);
      expect(m.reward).toBeGreaterThan(0);
      expect(m.text).toBe(m.text.trim());
    }
  });
});
