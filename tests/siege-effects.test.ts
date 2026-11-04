import { describe, expect, it } from "vitest";
import { SiegeGame } from "../game/siege";
import { SiegeRenderer } from "../game/siege-renderer";
import {
  HIT_RECOIL,
  HIT_RISE,
  HIT_PUSH,
  MAX_RECOIL,
  SHOT_FLIGHT,
  SHOT_AIM,
  SHOT_RETURN,
  hitRecoil,
  shotGeometry,
  shotHeading,
} from "../game/siege-effects";

function canvas() {
  const calls: { method: string; args: unknown[] }[] = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy<Record<string, unknown>>(
    {},
    {
      get(target, method: string) {
        if (method in target) return target[method];
        return (...args: unknown[]) => {
          calls.push({ method, args });
          if (method.startsWith("create")) return gradient;
        };
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}
function game() {
  const g = new SiegeGame(42);
  g.start();
  g.enemies = [g.enemies[0]];
  g.enemies[0].x = 0.15;
  g.enemies[0].y = 0.2;
  return g;
}

describe("aimed shots and impact effects", () => {
  it("puts the rotated nose and muzzle on the same firing line at desktop and mobile sizes", () => {
    for (const [w, h] of [
      [1200, 480],
      [320, 388],
      [320, 240],
    ]) {
      for (const x of [w * 0.1, w * 0.5, w * 0.9]) {
        const { angle, direction, muzzle } = shotGeometry(x, h * 0.2, w, h);
        expect(Math.sin(angle)).toBeCloseTo(direction.x);
        expect(-Math.cos(angle)).toBeCloseTo(direction.y);
        expect(muzzle.x).toBeCloseTo(w * 0.5 + Math.sin(angle) * 25);
        expect(muzzle.y).toBeCloseTo(h * 0.94 - Math.cos(angle) * 25);
        expect(Math.sign(angle)).toBe(Math.sign(x - w * 0.5));
      }
    }
  });

  it("waits for contact before pushing, then returns to rest and respects reduced motion", () => {
    expect(hitRecoil(SHOT_FLIGHT - 0.01, true)).toBe(0);
    expect(hitRecoil(SHOT_FLIGHT + HIT_RISE, true)).toBeCloseTo(HIT_PUSH);
    expect(hitRecoil(SHOT_FLIGHT + HIT_RECOIL + 0.01, true)).toBe(0);
    expect(hitRecoil(SHOT_FLIGHT + HIT_RECOIL / 2, false)).toBe(0);
  });

  it("rotates the ship, caps stacked recoil, and leaves the simulation position alone", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    const enemy = g.enemies[0];
    enemy.word = "satellite";
    for (const letter of "sat") g.press(letter);
    r.draw(ctx, 900, 480, g, 0, true);
    expect(calls.filter((c) => c.method === "rotate").at(-1)?.args[0]).toBe(0);
    r.draw(ctx, 900, 480, g, SHOT_AIM / 2, true);
    expect(
      calls.filter((c) => c.method === "rotate").at(-1)?.args[0],
    ).toBeCloseTo(
      shotGeometry(enemy.x * 900, enemy.y * 480, 900, 480).angle / 2,
    );
    expect(r.recoil(enemy.id, 900, 480, true)).toEqual({ x: 0, y: 0 });
    r.draw(
      ctx,
      900,
      480,
      g,
      3 * SHOT_AIM + SHOT_FLIGHT + HIT_RISE - SHOT_AIM / 2,
      true,
    );
    const offset = r.recoil(enemy.id, 900, 480, true);
    expect(offset.x).toBeLessThan(0);
    expect(offset.y).toBeLessThan(0);
    expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(MAX_RECOIL);
    expect(enemy.x).toBe(0.15);
    expect(enemy.y).toBe(0.2);
    expect(r.recoil(enemy.id, 900, 480, false)).toEqual({ x: 0, y: 0 });
  });

  it("retains a completed target until contact, bursts its letters, and emits impact audio once", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    const word = g.enemies[0].word;
    for (const letter of word) g.press(letter);
    expect(g.kills).toBe(1);
    expect(g.enemies).toHaveLength(0);
    expect(r.draw(ctx, 900, 480, g, 0, true)).toEqual([]);
    expect(
      calls.some((c) => c.method === "fillText" && c.args[0] === word),
    ).toBe(true);
    calls.length = 0;
    expect(
      r
        .draw(
          ctx,
          900,
          480,
          g,
          word.length * SHOT_AIM + SHOT_FLIGHT + 0.01,
          true,
        )
        .map((e) => e.kind),
    ).toEqual(["kill"]);
    expect(
      calls.filter((c) => c.method === "fillText").map((c) => c.args[0]),
    ).toEqual(expect.arrayContaining([...word]));
    expect(r.draw(ctx, 900, 480, g, 0.01, true)).toEqual([]);
    r.draw(ctx, 900, 480, g, 1, true);
    expect(r.animating).toBe(false);
  });

  it("keeps the real completed word box and bursts letters from its recoiled position", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    const enemy = g.enemies[0];
    enemy.word = "arc";
    r.rememberWord(g, enemy.id, enemy.word, {
      x: 0.7,
      y: 0.65,
      width: 90,
      height: 38,
      fontSize: 20,
    });
    for (const letter of enemy.word) g.press(letter);
    r.draw(ctx, 900, 480, g, 0, true);
    expect(
      calls
        .find((c) => c.method === "fillText" && c.args[0] === "arc")
        ?.args.slice(1),
    ).toEqual([630, 312]);
    calls.length = 0;
    r.draw(ctx, 900, 480, g, 3 * SHOT_AIM + SHOT_FLIGHT + 0.001, true);
    const letters = calls.filter(
      (c) =>
        c.method === "fillText" &&
        typeof c.args[0] === "string" &&
        c.args[0].length === 1,
    );
    const offset = r.recoil(enemy.id, 900, 480, true);
    expect(letters).toHaveLength(3);
    expect(
      letters.reduce((sum, c) => sum + Number(c.args[1]), 0) / 3,
    ).toBeCloseTo(630 + offset.x);
    expect(
      letters.reduce((sum, c) => sum + Number(c.args[2]), 0) / 3,
    ).toBeCloseTo(312 + offset.y);
    expect(
      calls.some((c) => c.method === "fillText" && c.args[0] === "arc"),
    ).toBe(false);
    const fresh = game();
    fresh.enemies[0].word = "arc";
    for (const letter of "arc") fresh.press(letter);
    calls.length = 0;
    r.draw(ctx, 900, 480, fresh, 0, true);
    expect(
      calls.find((c) => c.method === "fillText" && c.args[0] === "arc")
        ?.args[1],
    ).toBeCloseTo(fresh.events.find((e) => e.kind === "kill")!.x * 900);
  });

  it("does not push a word on an incorrect letter", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx } = canvas();
    g.enemies[0].word = "arc";
    g.press("a");
    r.draw(ctx, 900, 480, g, 0, true);
    r.draw(ctx, 900, 480, g, 1, true);
    g.press("z");
    r.draw(ctx, 900, 480, g, 0.25, true);
    expect(r.recoil(g.enemies[0].id, 900, 480, true)).toEqual({ x: 0, y: 0 });
  });

  it("freezes shots on pause and clears old effects and heading on a fresh run", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    const word = g.enemies[0].word;
    for (const letter of word) g.press(letter);
    r.draw(ctx, 900, 480, g, 0, true);
    g.pause();
    expect(r.draw(ctx, 900, 480, g, 10, true)).toEqual([]);
    g.resume();
    expect(
      r.draw(
        ctx,
        900,
        480,
        g,
        word.length * SHOT_AIM + SHOT_FLIGHT + 0.01,
        true,
      ),
    ).toHaveLength(1);
    const fresh = new SiegeGame(43);
    calls.length = 0;
    r.draw(ctx, 900, 480, fresh, 0, true);
    expect(r.animating).toBe(false);
    expect(calls.filter((c) => c.method === "rotate").at(-1)?.args[0]).toBe(0);
  });

  it("uses an immediate compact burst without moving labels when motion is reduced", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    const enemy = g.enemies[0];
    for (const letter of enemy.word) g.press(letter);
    expect(r.draw(ctx, 900, 480, g, 0, false).map((e) => e.kind)).toEqual([
      "kill",
    ]);
    expect(r.recoil(enemy.id, 900, 480, false)).toEqual({ x: 0, y: 0 });
    expect(calls.filter((c) => c.method === "fillText")).toHaveLength(1);
  });

  it("bursts a word shield without destroying its protected enemy and snapshots each shot", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx } = canvas();
    const enemy = g.enemies[0];
    enemy.kind = "sentinel";
    enemy.armor = 2;
    enemy.word = "arc";
    for (const letter of enemy.word) g.press(letter);
    expect(g.enemies[0].armor).toBe(1);
    expect(g.events.find((e) => e.kind === "armor")?.drone?.word).toBe("arc");
    expect(g.kills).toBe(0);
    expect(
      g.events
        .filter((e) => e.kind === "hit")
        .every((e) => e.drone?.word === "arc"),
    ).toBe(true);
    expect(r.draw(ctx, 900, 480, g, 0, true)).toEqual([]);
    expect(
      r
        .draw(ctx, 900, 480, g, 3 * SHOT_AIM + SHOT_FLIGHT + 0.01, true)
        .map((e) => e.kind),
    ).toEqual(["armor"]);
    expect(g.enemies[0].id).toBe(enemy.id);
  });

  it("eases toward a shot and returns before impact, independently of a locked word", () => {
    const angle = -0.8;
    expect(shotHeading(0, angle, 0, SHOT_AIM, true)).toBe(0);
    expect(shotHeading(0, angle, SHOT_AIM / 2, SHOT_AIM, true)).toBeCloseTo(
      angle / 2,
    );
    expect(shotHeading(0, angle, SHOT_AIM, SHOT_AIM, true)).toBe(angle);
    expect(
      shotHeading(0, angle, SHOT_AIM + SHOT_RETURN / 2, SHOT_AIM, true),
    ).toBeCloseTo(angle / 2);
    expect(shotHeading(0, angle, SHOT_AIM + SHOT_RETURN, SHOT_AIM, true)).toBe(
      0,
    );
    expect(SHOT_RETURN).toBeLessThan(SHOT_FLIGHT);
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    g.press(g.enemies[0].word[0]);
    r.draw(ctx, 900, 480, g, 0, true);
    r.draw(ctx, 900, 480, g, SHOT_AIM, true);
    expect(
      calls.filter((c) => c.method === "rotate").at(-1)?.args[0],
    ).toBeLessThan(0);
    r.draw(ctx, 900, 480, g, SHOT_RETURN + 0.001, true);
    expect(g.target).toBe(g.enemies[0].id);
    expect(calls.filter((c) => c.method === "rotate").at(-1)?.args[0]).toBe(0);
  });

  it("turns continuously between queued shots on opposite sides", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    const left = g.enemies[0];
    left.word = "a";
    const right = { ...left, id: 99, word: "b", x: 0.85 };
    g.enemies.push(right);
    g.press("a");
    g.press("b");
    r.draw(ctx, 900, 480, g, 0, true);
    r.draw(ctx, 900, 480, g, SHOT_AIM, true);
    const angle = shotGeometry(left.x * 900, left.y * 480, 900, 480).angle;
    expect(
      calls.filter((c) => c.method === "rotate").at(-1)?.args[0],
    ).toBeCloseTo(angle);
    r.draw(ctx, 900, 480, g, SHOT_AIM / 2, true);
    expect(
      calls.filter((c) => c.method === "rotate").at(-1)?.args[0],
    ).toBeCloseTo(0);
    r.draw(ctx, 900, 480, g, SHOT_AIM / 2, true);
    expect(
      calls.filter((c) => c.method === "rotate").at(-1)?.args[0],
    ).toBeCloseTo(-angle);
  });
});

import {
  pulseContact,
  pulseGeometry,
  PULSE_TRAVEL,
  comboHeat,
  burstProfile,
} from "../game/siege-effects";
import {
  drawAtmosphere,
  drawBoss,
  drawDestruction,
  drawTarget,
} from "../game/siege-visuals";

describe("combat presentation", () => {
  it("times circular pulse contact in pixels on wide and tall fields", () => {
    for (const [w, h] of [
      [1200, 480],
      [234, 388],
      [390, 844],
    ]) {
      const origin = pulseGeometry(w, h);
      expect(pulseContact(0.5, 0.94, w, h)).toBe(0);
      expect(pulseContact(0, 0, w, h)).toBeCloseTo(PULSE_TRAVEL);
      for (const [x, y] of [
        [0.2, 0.7],
        [0.8, 0.2],
      ]) {
        const time = pulseContact(x, y, w, h);
        expect((time / PULSE_TRAVEL) * origin.radius).toBeCloseTo(
          Math.hypot(x * w - origin.x, y * h - origin.y),
        );
      }
    }
  });

  it("protects and scores immediately, but bursts each pulse target only on wave contact", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    const first = { ...g.enemies[0], id: 21, word: "sail", x: 0.5, y: 0.7 };
    const second = { ...first, id: 22, word: "beam", x: 0.2, y: 0.2 };
    g.enemies = [first, second];
    const score = g.score;
    g.pulse();
    expect(g.enemies).toHaveLength(0);
    expect(g.score - score).toBe(50);
    expect(g.kills).toBe(2);
    expect(r.draw(ctx, 900, 480, g, 0, true)).toEqual([]);
    expect(
      calls.some((c) => c.method === "fillText" && c.args[0] === "sail"),
    ).toBe(true);
    const near = pulseContact(first.x, first.y, 900, 480);
    expect(r.draw(ctx, 900, 480, g, near - 0.001, true)).toEqual([]);
    expect(
      r.draw(ctx, 900, 480, g, 0.002, true).map((e) => e.drone?.id),
    ).toEqual([21]);
    g.pause();
    expect(r.draw(ctx, 900, 480, g, 10, true)).toEqual([]);
    g.resume();
    const far = pulseContact(second.x, second.y, 900, 480);
    expect(
      r.draw(ctx, 900, 480, g, far - near, true).map((e) => e.drone?.id),
    ).toEqual([22]);
    expect(r.draw(ctx, 900, 480, g, 0.01, true)).toEqual([]);
    r.draw(ctx, 900, 480, g, 2, true);
    expect(r.animating).toBe(false);
  });

  it("keeps a contacted pulse target destroyed when resizing changes its arrival distance", () => {
    const g = game(),
      r = new SiegeRenderer(),
      { ctx, calls } = canvas();
    const enemy = g.enemies[0];
    enemy.word = "sail";
    enemy.x = 0.5;
    enemy.y = 0.2;
    g.pulse();
    r.draw(ctx, 1800, 300, g, 0, true);
    const contact = pulseContact(enemy.x, enemy.y, 1800, 300);
    expect(
      r.draw(ctx, 1800, 300, g, contact + 0.001, true).map((e) => e.kind),
    ).toEqual(["kill"]);
    calls.length = 0;
    // This tall field puts the same snapshot farther from its circular wave front.
    expect(r.draw(ctx, 234, 600, g, 0, true)).toEqual([]);
    expect(
      calls.some((c) => c.method === "fillText" && c.args[0] === "sail"),
    ).toBe(false);
  });

  it("captures pulse shield state before phase changes, without changing the pulse economy", () => {
    const g = game();
    const boss = g.enemies[0];
    boss.kind = "boss";
    boss.armor = 3;
    boss.boss = { phase: "shielded", clock: 4, escortIn: 0, escortsLeft: 0 };
    g.pulse();
    expect(g.enemies).toHaveLength(1);
    expect(boss.boss.phase).toBe("carrier");
    expect(boss.armor).toBe(2);
    const pulse = g.events.findLast((e) => e.kind === "pulse")!;
    expect(pulse.pulseTargets?.[0]).toMatchObject({
      shield: true,
      drone: { armor: 3, boss: { phase: "shielded" } },
    });
    expect(
      g.events.findLast((e) => e.kind === "boss")?.drone?.boss?.phase,
    ).toBe("carrier");
    boss.boss.clock = 10;
    expect(pulse.pulseTargets?.[0].drone.boss?.clock).toBe(4);
    const r = new SiegeRenderer(),
      { ctx } = canvas();
    expect(r.draw(ctx, 900, 480, g, 0, false).map((e) => e.kind)).toEqual([
      "armor",
    ]);
    expect(r.draw(ctx, 900, 480, g, 0.01, false)).toEqual([]);
    expect(g.kills).toBe(0);
    expect(g.pulses).toBe(0);
  });

  it("smoothly builds engine heat from clean words and fades after losing a combo", () => {
    let heat = 0;
    for (let i = 0; i < 60; i++) heat = comboHeat(heat, 10, 1 / 60);
    expect(heat).toBeGreaterThan(0.9);
    const afterMistake = comboHeat(heat, 0, 1 / 60);
    expect(afterMistake).toBeLessThan(heat);
    expect(afterMistake).toBeGreaterThan(heat * 0.9);
    expect(comboHeat(heat, 0, 0)).toBe(heat);
    expect(comboHeat(0, 100, 10)).toBeLessThanOrEqual(1);
    expect(comboHeat(1, -3, 10)).toBeGreaterThanOrEqual(0);
  });

  it("uses distinct destruction profiles and respects a shared particle budget", () => {
    expect(
      new Set(
        ["scout", "sentinel", "interceptor", "boss"].map((kind) =>
          JSON.stringify(burstProfile(kind)),
        ),
      ).size,
    ).toBe(4);
    const { ctx, calls } = canvas();
    const g = game(),
      drone = g.enemies[0];
    drone.kind = "boss";
    const fx = {
      id: 1,
      kind: "kill" as const,
      x: 0.5,
      y: 0.3,
      text: "+500",
      drone,
    };
    expect(drawDestruction(ctx, fx, 100, 100, 0.3, true, 5)).toBe(5);
    expect(calls.some((c) => c.method === "strokeRect")).toBe(true);
    calls.length = 0;
    expect(drawDestruction(ctx, fx, 100, 100, 0.3, false, 96)).toBe(0);
    expect(calls.filter((c) => c.method === "fillText")).toHaveLength(1);
  });

  it("moves separate star layers, while reduced-motion scenery remains static", () => {
    const { ctx, calls } = canvas();
    drawAtmosphere(ctx, 900, 480, 0, true);
    const initial = JSON.stringify(calls);
    calls.length = 0;
    drawAtmosphere(ctx, 900, 480, 10, true);
    expect(JSON.stringify(calls)).not.toBe(initial);
    calls.length = 0;
    drawAtmosphere(ctx, 900, 480, 0, false);
    const reduced = JSON.stringify(calls);
    calls.length = 0;
    drawAtmosphere(ctx, 900, 480, 10, false);
    expect(JSON.stringify(calls)).toBe(reduced);
    expect(calls.filter((c) => c.method === "fillRect")).toHaveLength(95);
  });

  it("gives every boss phase its own geometry and freezes reduced-motion transitions", () => {
    const { ctx, calls } = canvas(),
      g = game(),
      boss = g.enemies[0];
    boss.boss = { phase: "shielded", clock: 0, escortsLeft: 2, escortIn: 2.5 };
    const shapes = [];
    for (const phase of ["shielded", "carrier", "overdrive"] as const) {
      boss.boss.phase = phase;
      calls.length = 0;
      drawBoss(ctx, boss, true);
      shapes.push(JSON.stringify(calls));
      calls.length = 0;
      drawBoss(ctx, boss, false);
      const still = JSON.stringify(calls);
      boss.boss.clock = 5;
      calls.length = 0;
      drawBoss(ctx, boss, false);
      expect(JSON.stringify(calls)).toBe(still);
      boss.boss.clock = 0;
    }
    expect(new Set(shapes).size).toBe(3);
  });

  it("settles targeting brackets and marks mistakes with an extra shape", () => {
    const { ctx, calls } = canvas();
    drawTarget(ctx, 100, 100, 1, 0, true, false);
    const acquired = JSON.stringify(calls);
    calls.length = 0;
    drawTarget(ctx, 100, 100, 1, 1, true, false);
    expect(JSON.stringify(calls)).not.toBe(acquired);
    const normal = calls.filter((c) => c.method === "lineTo").length;
    calls.length = 0;
    drawTarget(ctx, 100, 100, 1, 1, true, true);
    expect(calls.filter((c) => c.method === "lineTo").length).toBe(normal + 2);
    calls.length = 0;
    drawTarget(ctx, 100, 100, 1, 0, false, false);
    const still = JSON.stringify(calls);
    calls.length = 0;
    drawTarget(ctx, 100, 100, 1, 1, false, false);
    expect(JSON.stringify(calls)).toBe(still);
  });
});
