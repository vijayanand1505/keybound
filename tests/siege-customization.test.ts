import { describe, expect, it } from "vitest";
import {
  normalizeCosmetics,
  recordCosmetics,
  cosmeticOptions,
  cosmeticUnlocked,
  cosmeticLook,
  defaultCosmetics,
  shipHullPoints,
} from "../game/siege-cosmetics";
import { SiegeCountdown } from "../game/siege-countdown";
import { SiegeGame } from "../game/siege";
import type { Run } from "../game/storage";

describe("free cosmetic progress", () => {
  it("migrates old three-part selections and validates new frames and lasers against earned progress", () => {
    const old = normalizeCosmetics({
      selection: { ship: "aurora", trail: "comet", target: "orbit" },
      progress: { runs: 3, kills: 50, bestWave: 5, bestCombo: 10 },
    });
    expect(old.selection).toEqual({
      ...defaultCosmetics,
      ship: "aurora",
      trail: "comet",
      target: "orbit",
    });
    const locked = normalizeCosmetics({
      selection: {
        ...defaultCosmetics,
        hull: "twinfin",
        beam: "prism",
        trail: "stardust",
      },
    });
    expect(locked.selection).toEqual(defaultCosmetics);
    const earned = normalizeCosmetics({
      selection: {
        ...old.selection,
        hull: "twinfin",
        beam: "prism",
        trail: "stardust",
      },
      progress: { ...old.progress, kills: 75 },
    });
    expect(earned.selection).toMatchObject({
      hull: "twinfin",
      beam: "prism",
      trail: "stardust",
      ship: "aurora",
      target: "orbit",
    });
    expect(
      normalizeCosmetics({ selection: { hull: "unknown", beam: "invalid" } })
        .selection,
    ).toEqual(defaultCosmetics);
  });
  it("keeps the same firing nose for every distinct frame and preserves legacy rendering defaults", () => {
    const shapes = ["vector", "dart", "twinfin"].map((hull) =>
      shipHullPoints(hull),
    );
    expect(new Set(shapes.map((shape) => JSON.stringify(shape))).size).toBe(3);
    for (const shape of shapes) {
      expect(shape[0]).toEqual([0, -25]);
      expect(
        shape.every(([x, y]) => Math.abs(x) <= 25 && y >= -25 && y <= 12),
      ).toBe(true);
    }
    expect(
      cosmeticLook({ ship: "relay", trail: "ion", target: "brackets" }),
    ).toMatchObject({ hull: "vector", beam: "pulse-beam" });
    expect(
      cosmeticLook({
        ...defaultCosmetics,
        hull: "dart",
        beam: "tracer",
        trail: "stardust",
      }),
    ).toMatchObject({
      hull: "dart",
      beam: "tracer",
      laser: "#ffd38a",
      engine: [166, 231, 255],
    });
  });
  it("starts with free choices in all five categories and rejects locked or unknown selections", () => {
    const value = normalizeCosmetics({
      selection: { ship: "ember", trail: "comet", target: "unknown" },
      progress: { runs: -5, kills: NaN, bestWave: 0, bestCombo: 0 },
    });
    expect(value.selection).toEqual({
      ship: "relay",
      trail: "ion",
      target: "brackets",
      hull: "vector",
      beam: "pulse-beam",
    });
    expect(
      cosmeticOptions.filter((option) =>
        cosmeticUnlocked(option, value.progress),
      ),
    ).toHaveLength(7);
  });
  it("credits previous runs and bests, then retains totals beyond the journal cap", () => {
    const run = { arcade: { kills: 30, wave: 4, maxCombo: 10 } } as Run;
    const migrated = normalizeCosmetics(undefined, [run], {
      standard: { wave: 5, score: 1000 },
    });
    expect(migrated.progress).toEqual({
      runs: 1,
      kills: 30,
      bestWave: 5,
      bestCombo: 10,
    });
    expect(
      cosmeticOptions
        .filter((option) => cosmeticUnlocked(option, migrated.progress))
        .map((option) => option.id),
    ).toEqual(expect.arrayContaining(["aurora", "ember", "comet", "solar"]));
    const durable = normalizeCosmetics(
      {
        ...migrated,
        progress: { ...migrated.progress, runs: 150, kills: 5000 },
      },
      [],
    );
    expect(durable.progress.runs).toBe(150);
    expect(durable.progress.kills).toBe(5000);
  });
  it("credits legacy records even when old runs have left the history", () => {
    expect(
      normalizeCosmetics(undefined, [], { standard: { score: 4000, wave: 6 } })
        .progress,
    ).toMatchObject({ runs: 1, bestWave: 6 });
    const old = {
      arcade: { kills: 2, wave: 2 },
      metrics: { maxCombo: 12 },
    } as Run;
    expect(normalizeCosmetics(undefined, [old]).progress.bestCombo).toBe(12);
  });
  it("records completed arcade reports once through the caller and excludes tutorials", () => {
    const current = normalizeCosmetics(undefined),
      g = new SiegeGame(42);
    g.start();
    for (const c of g.enemies[0].word) g.press(c);
    g.end();
    const earned = recordCosmetics(current, g.result());
    expect(earned.progress.runs).toBe(1);
    expect(earned.progress.kills).toBe(1);
    const selected = normalizeCosmetics({
      ...earned,
      selection: { ship: "aurora", trail: "ion", target: "brackets" },
    });
    expect(selected.selection.ship).toBe("aurora");
    const tutorial = new SiegeGame(42, 5, "training", true);
    tutorial.start();
    tutorial.end();
    expect(recordCosmetics(selected, tutorial.result())).toBe(selected);
  });
  it("rejects invalid progress and gives alternate styles distinct colors", () => {
    const value = normalizeCosmetics({
      progress: { runs: Infinity, kills: -4, bestWave: "5", bestCombo: null },
      selection: { ship: "ember" },
    });
    expect(value.progress).toEqual({
      runs: 0,
      kills: 0,
      bestWave: 0,
      bestCombo: 0,
    });
    const standard = cosmeticLook({
      ship: "relay",
      trail: "ion",
      target: "brackets",
    });
    const variant = cosmeticLook({
      ship: "aurora",
      trail: "comet",
      target: "diamond",
    });
    expect(variant.fill).not.toBe(standard.fill);
    expect(variant.engine).not.toEqual(standard.engine);
  });
});
describe("launch countdown", () => {
  it("shows 3, 2, 1 before becoming ready and does not skip on a long frame", () => {
    const countdown = new SiegeCountdown();
    expect(countdown.value).toBe(3);
    for (let i = 0; i < 10; i++) expect(countdown.advance(0.1)).toBe(false);
    expect(countdown.value).toBe(2);
    for (let i = 0; i < 10; i++) countdown.advance(0.1);
    expect(countdown.value).toBe(1);
    for (let i = 0; i < 9; i++) expect(countdown.advance(0.1)).toBe(false);
    expect(countdown.advance(0.1)).toBe(true);
    const throttled = new SiegeCountdown();
    expect(throttled.advance(50)).toBe(false);
    expect(throttled.value).toBe(3);
  });
  it("ignores invalid time and starts fresh after cancelling a launch", () => {
    const first = new SiegeCountdown();
    first.advance(NaN);
    first.advance(-1);
    expect(first.value).toBe(3);
    for (let i = 0; i < 20; i++) first.advance(0.1);
    expect(first.value).toBe(1);
    const restarted = new SiegeCountdown();
    expect(restarted.value).toBe(3);
    expect(restarted.advance(0)).toBe(false);
  });
});
