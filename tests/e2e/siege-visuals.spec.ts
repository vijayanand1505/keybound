import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Render the actual modules in Chrome, with deterministic crowded scenes rather
// than exposing mutable game/debug state in the production app.
const modules = Object.fromEntries(
  [
    "siege",
    "siege-difficulty",
    "siege-mode",
    "siege-effects",
    "siege-visuals",
    "siege-renderer",
    "siege-cosmetics",
  ].map((name) => [
    `./${name}`,
    ts.transpileModule(
      readFileSync(new URL(`../../game/${name}.ts`, import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
  ]),
);
test("new frames, laser styles and Stardust render distinctly and freeze without changing combat", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async (sources) => {
    const cache: Record<string, any> = {};
    const require = (id: string): any => {
      if (cache[id]) return cache[id];
      const exports = (cache[id] = {});
      new Function("exports", "require", sources[id])(exports, require);
      return exports;
    };
    const { SiegeGame } = require("./siege"),
      { SiegeRenderer } = require("./siege-renderer"),
      { defaultCosmetics } = require("./siege-cosmetics");
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 220;
    const ctx = canvas.getContext("2d")!;
    const painter = new SiegeRenderer();
    const frames = ["vector", "dart", "twinfin"].map((hull) => {
      painter.setCosmetics({ ...defaultCosmetics, hull });
      painter.preview(ctx, 360, 220);
      return canvas.toDataURL();
    });
    const lasers = ["pulse-beam", "tracer", "prism"].map((beam) => {
      painter.setCosmetics({ ...defaultCosmetics, beam });
      painter.preview(ctx, 360, 220, { demoAge: 0.08 });
      return canvas.toDataURL();
    });
    painter.setCosmetics({
      ...defaultCosmetics,
      hull: "twinfin",
      beam: "prism",
      trail: "stardust",
    });
    painter.preview(ctx, 360, 220, { time: 0.1, motion: true });
    const moving = canvas.toDataURL();
    painter.preview(ctx, 360, 220, { time: 0.3, motion: true });
    const drift = moving !== canvas.toDataURL();
    painter.preview(ctx, 360, 220, { time: 0.1 });
    const still = canvas.toDataURL();
    painter.preview(ctx, 360, 220, { time: 1 });
    const calm = still === canvas.toDataURL();
    const g = new SiegeGame(42);
    g.start();
    g.press(g.enemies[0].word[0]);
    const before = JSON.stringify(g.result());
    painter.draw(ctx, 360, 220, g, 0, true);
    painter.draw(ctx, 360, 220, g, 0.12, true);
    const combatPreserved = before === JSON.stringify(g.result());
    g.pause();
    painter.draw(ctx, 360, 220, g, 0, true);
    const paused = canvas.toDataURL();
    painter.draw(ctx, 360, 220, g, 1, true);
    return {
      frames: new Set(frames).size,
      lasers: new Set(lasers).size,
      drift,
      calm,
      combatPreserved,
      frozen: paused === canvas.toDataURL(),
    };
  }, modules);
  expect(result).toEqual({
    frames: 3,
    lasers: 3,
    drift: true,
    calm: true,
    combatPreserved: true,
    frozen: true,
  });
});
for (const [width, height] of [
  [900, 480],
  [234, 388],
]) {
  test(`combat effects render, stay bounded and freeze on pause at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    const result = await page.evaluate(
      async ({ sources, width, height }) => {
        const cache: Record<string, any> = {};
        const require = (id: string): any => {
          if (cache[id]) return cache[id];
          const exports = (cache[id] = {});
          new Function("exports", "require", sources[id])(exports, require);
          return exports;
        };
        const { SiegeGame } = require("./siege");
        const { SiegeRenderer } = require("./siege-renderer");
        const { pulseContact } = require("./siege-effects");
        await document.fonts.ready;
        const canvas = document.createElement("canvas");
        canvas.id = "visual-fixture";
        canvas.width = width;
        canvas.height = height;
        canvas.style.cssText = `position:fixed;top:0;left:0;width:${width}px;height:${height}px;z-index:99999`;
        document.body.append(canvas);
        const ctx = canvas.getContext("2d")!;
        const g = new SiegeGame(42);
        g.start();
        g.enemies = Array.from({ length: 7 }, (_, i) => ({
          id: i + 1,
          x: 0.15 + (i % 3) * 0.34,
          y: 0.18 + Math.floor(i / 3) * 0.22,
          word: ["orbit", "beam", "nova", "sail", "tide", "flux", "ice"][i],
          progress: 0,
          speed: 0,
          armor: i === 0 ? 3 : i === 3 ? 2 : 1,
          dirty: false,
          kind:
            i === 0
              ? "boss"
              : i === 3
                ? "sentinel"
                : i % 2
                  ? "interceptor"
                  : "scout",
          ...(i === 0
            ? {
                boss: {
                  phase: "shielded",
                  clock: 1,
                  escortIn: 0,
                  escortsLeft: 0,
                },
              }
            : {}),
        }));
        const r = new SiegeRenderer();
        g.combo = 10;
        for (let i = 0; i < 60; i++) {
          g.tick(1 / 60);
          r.draw(ctx, width, height, g, 1 / 60, true);
        }
        const shielded = canvas.toDataURL();
        const boss = g.enemies[0];
        boss.boss.phase = "carrier";
        boss.boss.clock = 1;
        boss.boss.escortIn = 1.2;
        boss.boss.escortsLeft = 2;
        r.draw(ctx, width, height, g, 0, true);
        const carrier = canvas.toDataURL();
        boss.boss.phase = "overdrive";
        boss.boss.escortsLeft = 0;
        r.draw(ctx, width, height, g, 0, true);
        const core = canvas.toDataURL();
        // Hold a live target while acquiring its bracket, including an incorrect hit.
        g.target = 2;
        g.press("b");
        r.draw(ctx, width, height, g, 0, true);
        const acquired = canvas.toDataURL();
        g.press("z");
        r.draw(ctx, width, height, g, 0, true);
        const mistake = canvas.toDataURL();
        g.pause();
        const paused = canvas.toDataURL();
        r.draw(ctx, width, height, g, 1, true);
        const pauseFrozen = canvas.toDataURL() === paused;
        g.resume();
        // Pulse snapshots survive engine removal and produce contact-timed cues.
        boss.armor = 1;
        const targets = g.enemies.map((e: any) => ({
          id: e.id,
          x: e.x,
          y: e.y,
        }));
        g.pulses = 1;
        g.pulse();
        const immediate = {
          kills: g.kills,
          enemies: g.enemies.length,
          cues: r.draw(ctx, width, height, g, 0, true).length,
        };
        const contacts: number[] = [];
        const timings: number[] = [];
        for (let frame = 0; frame < 120; frame++) {
          const start = performance.now();
          const cues = r.draw(ctx, width, height, g, 1 / 60, true);
          timings.push(performance.now() - start);
          contacts.push(...cues.map((e: any) => e.drone?.id));
        }
        // Reduced motion produces the same scene at different decorative times.
        const still = new SiegeGame(43);
        still.start();
        still.enemies = [];
        const reduced = new SiegeRenderer();
        reduced.draw(ctx, width, height, still, 0, false);
        const quiet = canvas.toDataURL();
        reduced.draw(ctx, width, height, still, 1, false);
        const reducedStatic = canvas.toDataURL() === quiet;
        // Leave a contact frame visible for a screenshot of the real renderer.
        const fresh = new SiegeGame(44);
        fresh.start();
        fresh.enemies = targets.map((t: any, i: number) => ({
          ...t,
          word: ["orbit", "beam", "nova", "sail", "tide", "flux", "ice"][i],
          progress: 0,
          speed: 0,
          armor: 1,
          dirty: false,
          kind:
            i === 0
              ? "boss"
              : i === 3
                ? "sentinel"
                : i % 2
                  ? "interceptor"
                  : "scout",
        }));
        fresh.pulses = 1;
        fresh.pulse();
        const effects = new SiegeRenderer();
        effects.draw(ctx, width, height, fresh, 0, true);
        effects.draw(
          ctx,
          width,
          height,
          fresh,
          pulseContact(targets[3].x, targets[3].y, width, height) + 0.08,
          true,
        );
        timings.sort((a, b) => a - b);
        return {
          distinctPhases: new Set([shielded, carrier, core]).size,
          distinctMistake: acquired !== mistake,
          pauseFrozen,
          immediate,
          contacts,
          reducedStatic,
          p95: timings[Math.floor(timings.length * 0.95)],
          ended: !r.animating,
        };
      },
      { sources: modules, width, height },
    );
    expect(result.distinctPhases).toBe(3);
    expect(result.distinctMistake).toBe(true);
    expect(result.pauseFrozen).toBe(true);
    expect(result.immediate).toEqual({ kills: 7, enemies: 0, cues: 0 });
    expect(result.contacts.sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(result.reducedStatic).toBe(true);
    expect(result.ended).toBe(true);
    // Broad guard against pathological Canvas work, not a device FPS promise.
    expect(result.p95).toBeLessThan(50);
    await testInfo.attach("render-timing", {
      body: JSON.stringify({ width, height, p95ms: result.p95 }),
      contentType: "application/json",
    });
    await page
      .locator("#visual-fixture")
      .screenshot({ path: testInfo.outputPath("pulse-contact.png") });
  });
}
