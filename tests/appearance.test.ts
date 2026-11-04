import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("idb-keyval", () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }));
import { get, set } from "idb-keyval";
import { defaultSettings, loadSave, saveProgress } from "../game/storage";
describe("appearance preferences and existing local journals", () => {
  beforeEach(() => vi.clearAllMocks());
  it("opens existing version-one journals without losing their runs or sound choice", async () => {
    const runs = [{ id: "older-run", xp: 175 }];
    vi.mocked(get).mockResolvedValue({
      version: 1,
      runs,
      settings: { sound: true, soundPack: "mechkeys-tactile", soundVolume: 37 },
    });
    const save = await loadSave();
    expect(save.runs).toEqual(runs);
    expect(save.settings).toMatchObject({
      theme: "dark",
      accent: "amber",
      sound: true,
      soundPack: "mechkeys-tactile",
      soundVolume: 37,
    });
  });
  it("restores appearance and comfort preferences together", async () => {
    vi.mocked(get).mockResolvedValue({
      version: 1,
      runs: [],
      settings: {
        theme: "system",
        accent: "ocean",
        highContrast: true,
        largeText: true,
      },
    });
    const save = await loadSave();
    expect(save.settings).toMatchObject({
      theme: "system",
      accent: "ocean",
      highContrast: true,
      largeText: true,
    });
    await saveProgress(save);
    expect(set).toHaveBeenCalledWith("keybound-save-v1", save);
  });
  it("recovers from unknown appearance settings in old or edited saves", async () => {
    vi.mocked(get).mockResolvedValue({
      version: 1,
      runs: [],
      settings: { theme: "sepia", accent: "invalid" },
    });
    expect((await loadSave()).settings).toEqual(defaultSettings);
  });
  it("restores an arcade best independently of the bounded run history", async () => {
    vi.mocked(get).mockResolvedValue({
      version: 1,
      runs: [],
      arcadeBest: { score: 4200, wave: 6 },
      settings: {},
    });
    const save = await loadSave();
    expect(save.arcadeBest).toEqual({ score: 4200, wave: 6 });
    expect(save.arcadeBests).toEqual({ standard: { score: 4200, wave: 6 } });
    expect(save.siegeDifficulty).toBe("standard");
    expect(save.siegeMode).toBe("endless");
    expect(save.timedArcadeBests).toEqual({});
  });
});

it("restores timed records independently of legacy bests and preserves them when saving", async () => {
  vi.mocked(get).mockResolvedValue({
    version: 1,
    runs: [],
    settings: {},
    siegeMode: "timed",
    arcadeBest: { score: 9000, wave: 8 },
    timedArcadeBests: {
      training: { score: 1000.3, wave: 2 },
      expert: { score: NaN, wave: -5 },
    },
  });
  const save = await loadSave();
  expect(save.siegeMode).toBe("timed");
  expect(save.arcadeBests).toEqual({ standard: { score: 9000, wave: 8 } });
  expect(save.timedArcadeBests).toEqual({
    training: { score: 1000, wave: 2 },
    expert: { score: 0, wave: 0 },
  });
  await saveProgress(save);
  expect(set).toHaveBeenLastCalledWith("keybound-save-v1", save);
});

it("restores separate difficulty records, sanitizes invalid scores and preserves the selected difficulty", async () => {
  vi.mocked(get).mockResolvedValue({
    version: 1,
    runs: [],
    settings: {},
    siegeDifficulty: "expert",
    arcadeBest: { score: 4200, wave: 6 },
    arcadeBests: {
      training: { score: -20, wave: Infinity },
      standard: { score: 5000, wave: 8 },
      expert: { score: 1300.4, wave: 2 },
      unknown: { score: 99999, wave: 99 },
    },
  });
  const save = await loadSave();
  expect(save.siegeDifficulty).toBe("expert");
  expect(save.arcadeBests).toEqual({
    training: { score: 0, wave: 0 },
    standard: { score: 5000, wave: 8 },
    expert: { score: 1300, wave: 2 },
  });
});

it("persists independent keyboard and combat levels and safely restores older settings", async () => {
  vi.mocked(get).mockResolvedValue({
    version: 1,
    runs: [],
    settings: {
      sound: true,
      soundVolume: 0,
      combatSound: true,
      combatVolume: 62,
    },
  });
  const save = await loadSave();
  expect(save.settings).toMatchObject({
    sound: true,
    soundVolume: 0,
    combatSound: true,
    combatVolume: 62,
  });
  await saveProgress(save);
  expect(set).toHaveBeenLastCalledWith("keybound-save-v1", save);
});
