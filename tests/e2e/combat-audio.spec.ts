import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";
// Exercise the real effects graph in Chrome's audio renderer, without audio hardware.
const audioModule = ts.transpileModule(
  readFileSync(new URL("../../game/combat-audio.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
test("combat effects render distinct audible signals and volume zero is silent", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async (source) => {
    const runtime = {} as {
      CombatAudio: new (context: unknown) => {
        play: (kind: string, volume: number) => void;
      };
    };
    new Function("exports", source)(runtime);
    const render = async (kind: string, volume: number) => {
      const context = new OfflineAudioContext(1, 24000, 24000);
      const audio = new runtime.CombatAudio(context);
      audio.play(kind, volume);
      const samples = (await context.startRendering()).getChannelData(0);
      let energy = 0,
        peak = 0,
        active = 0;
      for (const sample of samples) {
        energy += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
        if (Math.abs(sample) > 0.0001) active++;
      }
      return { energy, peak, active, finite: samples.every(Number.isFinite) };
    };
    const signals = [];
    for (const kind of [
      "hit",
      "kill",
      "armor",
      "pulse",
      "wave",
      "boss",
      "damage",
      "error",
    ])
      signals.push(await render(kind, 60));
    return {
      signals,
      quiet: await render("hit", 0),
      low: await render("hit", 20),
      high: await render("hit", 80),
    };
  }, audioModule);
  expect(
    result.signals.every((s) => s.finite && s.energy > 0.0001 && s.peak <= 1),
  ).toBe(true);
  expect(
    new Set(result.signals.map((s) => `${s.active}:${s.peak.toFixed(5)}`)).size,
  ).toBe(8);
  expect(result.quiet.energy).toBe(0);
  expect(result.high.energy).toBeGreaterThan(result.low.energy * 4);
});
