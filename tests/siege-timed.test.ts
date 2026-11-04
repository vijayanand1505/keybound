import { describe, expect, it } from "vitest";
import { SiegeGame } from "../game/siege";
import { normalizeSiegeMode } from "../game/siege-mode";
import { normalizeSiegeBests } from "../game/siege-difficulty";
import { siegeSummary } from "../game/siege-report";

describe("60-second arcade", () => {
  it.each(["training", "standard", "expert"] as const)(
    "replaces empty fields and advances waves immediately on %s, including boss waves",
    (difficulty) => {
      const g = new SiegeGame(42, 5, difficulty, false, "timed");
      g.start();
      let sawBoss = false;
      for (let i = 0; g.wave < 6 && i < 100; i++) {
        const enemy = g.enemies[0];
        expect(enemy).toBeDefined();
        if (enemy.kind === "boss") sawBoss = true;
        for (const letter of enemy.word) g.press(letter);
        expect(g.enemies.length).toBeGreaterThan(0);
        expect(g.snapshot()).toMatchObject({
          intermission: false,
          nextWaveIn: 0,
        });
      }
      expect(g.wave).toBe(6);
      expect(sawBoss).toBe(true);
      expect(g.elapsed).toBe(0);
      expect(g.timeRemaining).toBe(60);
    },
  );
  it("refills after a pulse without adding fresh targets to that pulse", () => {
    const g = new SiegeGame(42, 5, "training", false, "timed");
    g.start();
    const first = g.enemies[0].id;
    g.pulse();
    expect(g.kills).toBe(1);
    expect(g.enemies).toHaveLength(1);
    expect(g.enemies[0].id).not.toBe(first);
    expect(
      g.events
        .find((e) => e.kind === "pulse")
        ?.pulseTargets?.map((t) => t.drone.id),
    ).toEqual([first]);
    g.pulse();
    expect(g.kills).toBe(2);
    expect(g.enemies).toHaveLength(1);
    for (const letter of g.enemies[0].word) g.press(letter);
    expect(g.wave).toBe(2);
    expect(g.kills).toBe(3);
    expect(g.enemies.length).toBeGreaterThan(0);
    expect(g.elapsed).toBe(0);
  });
  it("advances after a surviving breach, but never spawns a new wave after hull loss", () => {
    for (const hull of [1, 5]) {
      const g = new SiegeGame(42, 5, "training", false, "timed");
      g.start();
      for (let i = 0; i < 2; i++)
        for (const letter of g.enemies[0].word) g.press(letter);
      expect(g.snapshot().remaining).toBe(0);
      g.hull = hull;
      g.enemies[0].y = 0.879;
      g.enemies[0].speed = 0.2;
      g.tick(0.05);
      expect(g.hull).toBe(hull - 1);
      expect(g.wave).toBe(hull === 1 ? 1 : 2);
      expect(g.enemies.length).toBe(hull === 1 ? 0 : 1);
      expect(g.status).toBe(hull === 1 ? "over" : "running");
    }
  });
  it("retains the normal sector break in Endless", () => {
    const g = new SiegeGame(42, 5, "training");
    g.start();
    for (let i = 0; i < 100; i++) {
      for (const enemy of [...g.enemies])
        for (const letter of enemy.word) g.press(letter);
      if (g.snapshot().intermission) break;
      g.tick(0.1);
    }
    expect(g.snapshot()).toMatchObject({
      wave: 1,
      intermission: true,
      nextWaveIn: 4,
    });
    for (let i = 0; i < 3; i++) g.tick(1);
    expect(g.wave).toBe(1);
    expect(g.enemies).toHaveLength(0);
    g.tick(1);
    g.tick(0.1);
    expect(g.wave).toBe(2);
    expect(g.enemies.length).toBeGreaterThan(0);
  });
  it("stops exactly at one minute, including a fractional final frame, and rejects further input", () => {
    const g = new SiegeGame(42, 5, "training", false, "timed");
    g.tick(10); // Ready time and the UI launch countdown do not count.
    expect(g.timeRemaining).toBe(60);
    g.start();
    for (const letter of g.enemies[0].word) g.press(letter);
    for (let i = 0; i < 59; i++) g.tick(1);
    g.tick(0.99);
    expect(g.status).toBe("running");
    expect(g.timeRemaining).toBeCloseTo(0.01);
    g.tick(0.05);
    expect(g.status).toBe("over");
    expect(g.elapsed).toBe(60);
    expect(g.timeRemaining).toBe(0);
    const result = g.result();
    expect(result).toMatchObject({
      mode: "timed",
      endReason: "time",
      kills: 1,
      metrics: { duration: 60000 },
    });
    expect(result.score).toBeGreaterThan(0);
    g.end();
    g.press("a");
    g.pulse();
    g.releaseTarget();
    g.tick(100);
    expect(g.result()).toEqual(result);
  });
  it("freezes its clock on pause, resumes the same remaining time, and caps a long frame", () => {
    const g = new SiegeGame(42, 5, "training", false, "timed");
    g.start();
    g.tick(0.75);
    g.pause();
    const paused = g.snapshot();
    g.tick(500);
    expect(g.snapshot()).toEqual(paused);
    g.resume();
    g.tick(500);
    expect(g.elapsed).toBeCloseTo(1.75);
    expect(g.timeRemaining).toBeCloseTo(58.25);
  });
  it("can end early from hull loss or an explicit end, with an accurate reason and duration", () => {
    for (const reason of ["hull", "ended"] as const) {
      const g = new SiegeGame(42, 5, "expert", false, "timed");
      g.start();
      g.tick(1);
      if (reason === "hull") {
        g.hull = 1;
        g.enemies[0].y = 0.879;
        g.enemies[0].speed = 0.2;
        g.tick(0.05);
      } else {
        g.pause();
        g.end();
      }
      expect(g.result().endReason).toBe(reason);
      expect(g.status).toBe("over");
      expect(g.elapsed).toBeLessThan(60);
      expect(siegeSummary(g.result())).toContain("60-second arcade · Expert");
      expect(siegeSummary(g.result())).not.toContain("60 seconds complete");
    }
  });
  it("keeps old runs and records in Endless, and does not impose a timer on the tutorial", () => {
    expect(normalizeSiegeMode(undefined)).toBe("endless");
    expect(normalizeSiegeMode("invalid")).toBe("endless");
    expect(normalizeSiegeMode("timed")).toBe("timed");
    const legacy = { score: 9000, wave: 8 };
    expect(normalizeSiegeBests(undefined, legacy)).toEqual({
      standard: legacy,
    });
    expect(normalizeSiegeBests(undefined)).toEqual({});
    const endless = new SiegeGame(42, 5, "training");
    endless.start();
    for (let i = 0; i < 65; i++) endless.tick(1);
    expect(endless.timeRemaining).toBeNull();
    expect(endless.status).toBe("running");
    const tutorial = new SiegeGame(42, 5, "training", true, "timed");
    tutorial.start();
    tutorial.tick(60);
    expect(tutorial.elapsed).toBe(0);
    expect(tutorial.timeRemaining).toBeNull();
    expect(tutorial.status).toBe("running");
  });
});
