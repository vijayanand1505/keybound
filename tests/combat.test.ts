import { describe, expect, it } from "vitest";
import { CombatAudio, normalizeCombatSettings } from "../game/combat-audio";
import { SiegeGame } from "../game/siege";
import { siegeComparison, siegeSummary } from "../game/siege-report";
class Parameter {
  value = 0;
  setValueAtTime(value: number) {
    this.value = value;
  }
  exponentialRampToValueAtTime(value: number) {
    this.value = value;
  }
  setTargetAtTime(value: number) {
    this.value = value;
  }
}
class Node {
  gain = new Parameter();
  frequency = new Parameter();
  threshold = new Parameter();
  ratio = new Parameter();
  starts = 0;
  stops = 0;
  disconnected = false;
  type = "sine";
  buffer: unknown;
  onended: unknown;
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
  start() {
    this.starts++;
  }
  stop() {
    this.stops++;
  }
}
function context() {
  const sources: Node[] = [];
  const ctx = {
    state: "running",
    currentTime: 0,
    sampleRate: 8000,
    destination: new Node(),
    createGain: () => new Node(),
    createDynamicsCompressor: () => new Node(),
    createBiquadFilter: () => new Node(),
    createBuffer: (_c: number, n: number) => ({
      getChannelData: () => new Float32Array(n),
    }),
    createOscillator: () => {
      const node = new Node();
      sources.push(node);
      return node;
    },
    createBufferSource: () => {
      const node = new Node();
      sources.push(node);
      return node;
    },
  };
  return { ctx: ctx as unknown as AudioContext, sources };
}
describe("combat effects and report comparisons", () => {
  it("migrates old audio preferences and validates independent combat volume", () => {
    expect(normalizeCombatSettings({})).toEqual({
      combatSound: true,
      combatVolume: 35,
    });
    expect(
      normalizeCombatSettings({ combatSound: false, combatVolume: 150 }),
    ).toEqual({ combatSound: false, combatVolume: 100 });
    expect(normalizeCombatSettings({ combatVolume: NaN }).combatVolume).toBe(
      35,
    );
  });
  it("schedules distinct effects, limits polyphony and stops every active voice", () => {
    const { ctx, sources } = context();
    const audio = new CombatAudio(ctx);
    for (const kind of [
      "hit",
      "armor",
      "kill",
      "wave",
      "boss",
      "pulse",
      "damage",
      "error",
    ] as const)
      audio.play(kind, 40);
    expect(sources.length).toBeGreaterThan(10);
    expect(sources.every((source) => source.starts === 1)).toBe(true);
    expect(audio.master.gain.value).toBeCloseTo(0.128);
    for (let i = 0; i < 100; i++) audio.play("hit", 40);
    expect(audio.activeVoices).toBeLessThanOrEqual(24);
    audio.stop();
    expect(audio.activeVoices).toBe(0);
    expect(
      sources.every((source) => source.stops >= 1 && source.disconnected),
    ).toBe(true);
    const before = sources.length;
    audio.play("kill", 0);
    expect(sources).toHaveLength(before);
  });
  it("compares against the pre-run record and previous run of the same difficulty", () => {
    const game = new SiegeGame(42, 5, "expert");
    game.start();
    const enemy = game.enemies[0];
    for (const c of enemy.word) game.press(c);
    game.tick(1);
    game.end();
    const result = game.result();
    const comparison = siegeComparison(result, {
      bestScore: result.score - 1,
      previous: {
        score: result.score - 20,
        wpm: result.metrics.wpm + 2,
        accuracy: 98,
      },
    });
    expect(comparison).toEqual({
      newBest: true,
      score: 20,
      wpm: -2,
      accuracy: 2,
    });
    expect(siegeSummary(result)).toContain("Expert");
    expect(siegeSummary(result)).toContain("Best combo 1");
    expect(siegeComparison(result, { bestScore: 9999 }).score).toBeNull();
  });
});

import { siegeLabels } from "../game/siege-labels";
it("keeps crowded mobile labels separate, including large text and targets at the perimeter", () => {
  for (const size of [14, 20]) {
    const enemies = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      word:
        i === 0
          ? "interstellar"
          : ["crystal", "meteor", "beacon", "circuit"][i - 1],
      progress: 0,
      x: [0.5, 0.22, 0.78, 0.24, 0.76][i],
      y: 0.25 + i * 0.012,
      speed: 0.02,
      armor: i === 0 ? 2 : 1,
      kind: i === 0 ? ("boss" as const) : ("scout" as const),
      dirty: false,
    }));
    for (const height of [240, 388]) {
      const labels = siegeLabels(enemies, 234, height, size, 0);
      for (const a of labels) {
        expect(a.left).toBeGreaterThanOrEqual(0);
        expect(a.top).toBeGreaterThanOrEqual(0);
        expect(a.left + a.width).toBeLessThanOrEqual(234);
        expect(a.top + a.height).toBeLessThanOrEqual(height);
        for (const b of labels.filter((b) => b.id !== a.id))
          expect(
            a.left + a.width <= b.left ||
              b.left + b.width <= a.left ||
              a.top + a.height <= b.top ||
              b.top + b.height <= a.top,
          ).toBe(true);
      }
    }
    enemies[0].y = 0.87;
    const last = siegeLabels(enemies, 234, 240, size, 0).find(
      (label) => label.id === 0,
    )!;
    expect(last.top + last.height).toBeLessThanOrEqual(240);
  }
});
