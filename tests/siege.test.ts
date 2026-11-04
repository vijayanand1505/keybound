import { describe, expect, it } from "vitest";
import { SiegeGame, type Drone } from "../game/siege";
const finishWord = (g: SiegeGame, e: Drone) => {
  for (const letter of e.word.slice(e.progress)) g.press(letter);
};
function reach(g: SiegeGame, wave: number) {
  let guard = 0;
  while (g.wave < wave && guard++ < 150) {
    for (const e of [...g.enemies]) finishWord(g, e);
    g.tick(1);
  }
  expect(g.wave).toBe(wave);
}
describe("Signal Siege simulation", () => {
  it("starts a deterministic field with distinct word initials and real movement", () => {
    const a = new SiegeGame(42),
      b = new SiegeGame(42);
    a.start();
    b.start();
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(new Set(a.enemies.map((e) => e.word[0])).size).toBe(
      a.enemies.length,
    );
    const y = a.enemies[0].y;
    a.tick(1);
    expect(a.enemies[0].y).toBeGreaterThan(y);
  });
  it("locks by first letter, keeps the lock through mistakes, and destroys only the completed target", () => {
    const g = new SiegeGame(42);
    g.start();
    const enemy = g.enemies[0],
      other = g.enemies[1];
    expect(g.press(enemy.word[0])?.correct).toBe(true);
    expect(g.target).toBe(enemy.id);
    const wrong = enemy.word[1] === "z" ? "q" : "z";
    expect(g.press(wrong)?.correct).toBe(false);
    expect(enemy.progress).toBe(1);
    expect(g.target).toBe(enemy.id);
    finishWord(g, enemy);
    expect(g.enemies.map((e) => e.id)).not.toContain(enemy.id);
    expect(g.enemies.map((e) => e.id)).toContain(other.id);
    expect(g.combo).toBe(0);
    expect(g.metrics().errors).toBe(1);
  });
  it("breaks target lock without refunding accuracy or shots", () => {
    const g = new SiegeGame(1);
    g.start();
    const enemy = g.enemies[0];
    g.press(enemy.word[0]);
    g.releaseTarget();
    expect(g.target).toBeNull();
    expect(enemy.progress).toBe(0);
    expect(g.correct).toBe(1);
    expect(g.score).toBe(0);
    expect(enemy.dirty).toBe(true);
  });
  it("never advances the wave, enemies or clock while paused and ignores non-letter input", () => {
    const g = new SiegeGame(8);
    g.start();
    g.tick(0.5);
    g.pause();
    const before = g.snapshot();
    g.tick(100);
    g.press("a");
    g.pulse();
    expect(g.snapshot()).toEqual(before);
    g.resume();
    g.press(" ");
    g.press("😀");
    expect(g.attempts).toBe(0);
    g.tick(0.5);
    expect(g.elapsed).toBeCloseTo(1, 6);
  });
  it("a charged pulse clears drones without fabricating typed letters or recharge credit", () => {
    const g = new SiegeGame(9);
    g.start();
    expect(g.pulse()).toBe(true);
    expect(g.enemies).toHaveLength(0);
    expect(g.pulses).toBe(0);
    expect(g.kills).toBe(2);
    expect(g.correct).toBe(0);
    expect(g.pulse()).toBe(false);
  });
  it("earns an additional pulse from five typed drone eliminations", () => {
    const g = new SiegeGame(17);
    g.start();
    let guard = 0;
    while (g.kills < 5 && guard++ < 30) {
      for (const e of [...g.enemies]) finishWord(g, e);
      g.tick(1);
    }
    expect(g.kills).toBeGreaterThanOrEqual(5);
    expect(g.pulses).toBe(2);
    expect(g.maxCombo).toBeGreaterThanOrEqual(5);
  });
  it("introduces a three-shield dreadnought on wave five and keeps it alive across shield breaks", () => {
    const g = new SiegeGame(123);
    g.start();
    reach(g, 5);
    const boss = g.enemies.find((e) => e.kind === "boss")!;
    expect(boss.armor).toBe(3);
    const word = boss.word;
    finishWord(g, boss);
    expect(boss.armor).toBe(2);
    expect(boss.progress).toBe(0);
    expect(g.enemies).toContain(boss);
    expect(g.target).toBe(boss.id);
    expect(boss.word).toMatch(/^[a-z]+$/);
    expect(g.correct).toBeGreaterThan(word.length);
    g.pulse();
    expect(boss.armor).toBe(1);
    expect(g.enemies).toContain(boss);
    finishWord(g, boss);
    expect(g.enemies).not.toContain(boss);
  });
  it("ends on the third hull breach and cannot keep scoring after game over", () => {
    const g = new SiegeGame(9);
    g.start();
    g.enemies.push({ ...g.enemies[0], id: 999 });
    for (const e of g.enemies) {
      e.y = 0.879;
      e.speed = 0.1;
    }
    g.tick(0.1);
    expect(g.hull).toBe(0);
    expect(g.status).toBe("over");
    const before = g.result();
    g.tick(10);
    g.press("a");
    g.pulse();
    expect(g.result()).toEqual(before);
  });
  it("results and snapshots do not expose mutable references to the live enemy state", () => {
    const g = new SiegeGame(7);
    g.start();
    const snapshot = g.snapshot();
    snapshot.enemies[0].progress = 90;
    expect(g.enemies[0].progress).toBe(0);
    g.tick(2);
    finishWord(g, g.enemies[0]);
    const result = g.result();
    expect(result.metrics.wpm).toBeGreaterThan(0);
    expect(result.metrics.accuracy).toBe(100);
    expect(result.metrics.duration).toBeGreaterThan(0);
    expect(result.events.length).toBe(g.correct);
  });
});

describe("Signal Siege difficulty and flight school", () => {
  it("keeps Standard as the default and gives Training slower, shorter, less crowded waves", () => {
    const standard = new SiegeGame(42),
      training = new SiegeGame(42, 5, "training"),
      expert = new SiegeGame(42, 5, "expert");
    for (const g of [standard, training, expert]) g.start();
    expect(standard.difficulty).toBe("standard");
    expect(training.hull).toBe(5);
    expect(training.pulses).toBe(2);
    expect(training.enemies).toHaveLength(1);
    expect(standard.enemies).toHaveLength(2);
    expect(training.enemies[0].speed).toBeLessThan(standard.enemies[0].speed);
    expect(expert.enemies[0].speed).toBeGreaterThan(standard.enemies[0].speed);
    for (let i = 0; i < 15; i++) {
      training.tick(1);
      expert.tick(1);
    }
    expect(training.enemies.length).toBeLessThanOrEqual(4);
    expect(training.enemies.every((e) => e.word.length <= 5)).toBe(true);
    expect(expert.enemies.every((e) => e.word.length >= 5)).toBe(true);
    expect(expert.result().difficulty).toBe("expert");
  });
  it("Training survives four breaches and recharges a pulse after three typed kills", () => {
    const g = new SiegeGame(17, 5, "training");
    g.start();
    g.pulse();
    expect(g.pulses).toBe(1);
    const goal = g.kills + 3;
    let guard = 0;
    while (g.kills < goal && guard++ < 40) {
      for (const e of [...g.enemies]) finishWord(g, e);
      g.tick(1);
    }
    expect(g.pulses).toBe(2);
    for (let i = 0; i < 5; i++) {
      g.enemies = [
        {
          id: 1000 + i,
          word: "arc",
          progress: 0,
          x: 0.5,
          y: 0.879,
          speed: 0.1,
          armor: 1,
          kind: "scout",
          dirty: false,
        },
      ];
      g.tick(0.1);
      expect(g.hull).toBe(4 - i);
      expect(g.status).toBe(i < 4 ? "running" : "over");
    }
  });
  it("walks through actual targeting, release, completion and pulse without moving or creating a real result", () => {
    const g = new SiegeGame(42, 3, "training", true);
    g.start();
    const before = g.snapshot();
    for (let i = 0; i < 100; i++) g.tick(1);
    expect(g.snapshot()).toEqual(before);
    expect(g.pulse()).toBe(false);
    g.releaseTarget();
    expect(g.tutorialStep).toBe("target");
    g.press("O");
    expect(g.target).not.toBeNull();
    expect(g.tutorialStep).toBe("release");
    expect(g.press("r")).toBeNull();
    g.pause();
    g.releaseTarget();
    expect(g.tutorialStep).toBe("release");
    g.resume();
    g.releaseTarget();
    expect(g.tutorialStep).toBe("finish");
    expect(g.target).toBeNull();
    expect(g.score).toBe(0);
    for (const letter of "orbit") g.press(letter);
    expect(g.tutorialStep).toBe("pulse");
    expect(g.enemies).toHaveLength(2);
    expect(g.pulse()).toBe(true);
    expect(g.enemies).toHaveLength(0);
    expect(g.status).toBe("over");
    expect(g.tutorialStep).toBe("complete");
    expect(g.result().tutorial).toBe(true);
    expect(g.press("a")).toBeNull();
  });
});

describe("boss phases, readable feedback and useful reports", () => {
  it("moves shields, telegraphs carrier escorts, freezes during pause and accelerates its exposed core", () => {
    const g = new SiegeGame(123);
    g.start();
    reach(g, 5);
    const boss = g.enemies.find((e) => e.kind === "boss")!;
    expect(boss.boss?.phase).toBe("shielded");
    const x = boss.x;
    g.tick(1);
    expect(boss.x).not.toBe(x);
    finishWord(g, boss);
    expect(boss.boss?.phase).toBe("carrier");
    expect(boss.boss?.escortsLeft).toBe(2);
    const ids = g.enemies.map((e) => e.id);
    g.pause();
    const paused = g.snapshot();
    g.tick(1);
    expect(g.snapshot()).toEqual(paused);
    g.resume();
    for (let i = 0; i < 4; i++) g.tick(1);
    expect(
      g.enemies.some((e) => !ids.includes(e.id) && e.kind === "interceptor"),
    ).toBe(true);
    const carrierY = boss.y;
    g.tick(1);
    const carrierDistance = boss.y - carrierY;
    finishWord(g, boss);
    expect(boss.boss?.phase).toBe("overdrive");
    const coreY = boss.y;
    g.tick(1);
    expect(boss.y - coreY).toBeGreaterThan(carrierDistance * 3);
    expect(boss.boss?.escortsLeft).toBe(0);
    const snapshot = g.snapshot();
    snapshot.enemies.find((e) => e.boss)!.boss!.clock = 999;
    expect(boss.boss!.clock).not.toBe(999);
  });
  it("shows the expected letter, tracks real missed words and clears transient feedback without discarding report data", () => {
    const g = new SiegeGame(14);
    g.start();
    const enemy = g.enemies[0];
    g.press(enemy.word[0]);
    const wrong = enemy.word[1] === "z" ? "q" : "z";
    g.press(wrong);
    g.press(wrong);
    expect(g.snapshot().mistake).toMatchObject({
      enemyId: enemy.id,
      expected: enemy.word[1],
      actual: wrong,
    });
    expect(g.result().missedWords).toEqual([{ word: enemy.word, errors: 2 }]);
    g.tick(1);
    expect(g.snapshot().mistake).toBeNull();
    const report = g.result();
    report.missedWords[0].errors = 50;
    expect(g.result().missedWords[0].errors).toBe(2);
    finishWord(g, enemy);
    expect(g.snapshot().rechargeRequired).toBe(5);
    expect(g.snapshot().pulseCredit).toBe(1);
    expect(g.result().metrics.errors).toBe(2);
  });
  it("does not invent a missed word when a letter matches no target", () => {
    const g = new SiegeGame(5);
    g.start();
    const used = new Set(g.enemies.map((e) => e.word[0]));
    g.press(
      [..."abcdefghijklmnopqrstuvwxyz"].find((letter) => !used.has(letter))!,
    );
    expect(g.snapshot().mistake?.expected).toBe("");
    expect(g.result().missedWords).toEqual([]);
  });
});
