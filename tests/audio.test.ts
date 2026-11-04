import { describe, expect, it } from "vitest";
import {
  legacySoundPacks as soundPacks,
  normalizeSoundSettings,
} from "../game/sounds";
import { synthesizeSound } from "../game/sound-synthesis";
const energy = (pcm: Float32Array) =>
  pcm.reduce((total, sample) => total + sample * sample, 0);
function band(pcm: Float32Array, rate: number, hz: number) {
  let real = 0,
    imaginary = 0;
  for (let i = 0; i < pcm.length; i++) {
    const a = (2 * Math.PI * hz * i) / rate;
    real += pcm[i] * Math.cos(a);
    imaginary += pcm[i] * Math.sin(a);
  }
  return real * real + imaginary * imaginary;
}
describe("sound preferences and backwards compatibility", () => {
  it("gives old saves safe defaults without requiring a new save version", () => {
    expect(normalizeSoundSettings({})).toEqual({
      soundPack: "soft",
      soundVolume: 45,
    });
    expect(normalizeSoundSettings(null)).toEqual({
      soundPack: "soft",
      soundVolume: 45,
    });
  });
  it("validates unknown packs and clamps invalid volume", () => {
    expect(
      normalizeSoundSettings({ soundPack: "missing", soundVolume: Infinity }),
    ).toEqual({ soundPack: "soft", soundVolume: 45 });
    expect(
      normalizeSoundSettings({ soundPack: "thock", soundVolume: 140 }),
    ).toEqual({ soundPack: "thock", soundVolume: 100 });
    expect(normalizeSoundSettings({ soundVolume: -10 }).soundVolume).toBe(0);
  });
});
describe("audible sound-pack synthesis", () => {
  it("produces finite non-silent bounded PCM for every pack and feedback type", () => {
    for (const pack of soundPacks)
      for (const kind of ["key", "word", "error", "complete"] as const) {
        const pcm = synthesizeSound(pack.id, kind, 16000, 1);
        expect(energy(pcm)).toBeGreaterThan(0.01);
        expect(
          pcm.every((n) => Number.isFinite(n) && Math.abs(n) <= 0.751),
        ).toBe(true);
        expect(pcm[0]).toBe(0);
        expect(Math.abs(pcm.at(-1)!)).toBeLessThan(0.005);
      }
  });
  it("generates genuinely different keyboard signals and repeatable sample variants", () => {
    const signals = soundPacks.map((p) =>
      Array.from(synthesizeSound(p.id, "key", 16000, 2)).join(","),
    );
    expect(new Set(signals).size).toBe(soundPacks.length);
    expect(synthesizeSound("mechanical", "key", 16000, 1)).toEqual(
      synthesizeSound("mechanical", "key", 16000, 1),
    );
    expect(synthesizeSound("mechanical", "key", 16000, 1)).not.toEqual(
      synthesizeSound("mechanical", "key", 16000, 2),
    );
  });
  it("gives thock low-frequency body rather than only renaming the click", () => {
    const thock = synthesizeSound("thock", "key", 16000, 0),
      click = synthesizeSound("mechanical", "key", 16000, 0);
    expect(band(thock, 16000, 125)).toBeGreaterThan(
      band(thock, 16000, 2600) * 10,
    );
    expect(band(click, 16000, 1850)).toBeGreaterThan(band(thock, 16000, 1850));
  });
  it("gives typewriter Enter an extended carriage tail and differentiates space", () => {
    expect(
      synthesizeSound("typewriter", "key", 16000, 1, "\n").length,
    ).toBeGreaterThan(
      synthesizeSound("typewriter", "key", 16000, 1, "a").length,
    );
    expect(synthesizeSound("thock", "key", 16000, 1, " ")).not.toEqual(
      synthesizeSound("thock", "key", 16000, 1, "a"),
    );
  });
  it("keeps a longer reward sound and mode-aware soft notes", () => {
    expect(synthesizeSound("soft", "complete", 16000).length).toBeGreaterThan(
      synthesizeSound("soft", "key", 16000).length * 4,
    );
    expect(synthesizeSound("soft", "key", 16000, 1, "", "coast")).not.toEqual(
      synthesizeSound("soft", "key", 16000, 1, "", "ascent"),
    );
  });
});
