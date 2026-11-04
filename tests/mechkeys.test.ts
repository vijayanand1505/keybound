import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { MechKeysAudio } from "../game/mechkeys-audio";
import {
  bigKeys,
  isRecordedPack,
  keyCodeForCharacter,
  keyPan,
  mechKeysPacks,
  recordedProfiles,
  sampleAnalysis,
  synthProfiles,
} from "../game/mechkeys-profiles";
import { normalizeSoundSettings, soundPacks } from "../game/sounds";
import manifest from "../public/audio/mechkeys/manifest.json";

function audioHarness() {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const makeSource = () => ({
    ...node(),
    start: vi.fn(),
    stop: vi.fn(),
    playbackRate: param(),
    frequency: param(),
    type: "",
    buffer: null as unknown,
    onended: null,
  });
  const sources: ReturnType<typeof makeSource>[] = [];
  const source = () => {
    const s = makeSource();
    sources.push(s);
    return s;
  };
  const panners: { pan: ReturnType<typeof param> }[] = [];
  const gains: { gain: ReturnType<typeof param> }[] = [];
  const context = {
    currentTime: 1,
    sampleRate: 48000,
    createBufferSource: source,
    createOscillator: source,
    createGain: () => {
      const n = { ...node(), gain: param() };
      gains.push(n);
      return n;
    },
    createStereoPanner: () => {
      const n = { ...node(), pan: param() };
      panners.push(n);
      return n;
    },
    createBiquadFilter: () => ({
      ...node(),
      frequency: param(),
      Q: param(),
      type: "",
    }),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    decodeAudioData: vi.fn(async () => ({
      sampleRate: 48000,
      getChannelData: () => new Float32Array([0, 0.6, -0.2]),
    })),
  };
  return {
    renderer: new MechKeysAudio(
      context as unknown as AudioContext,
      node() as unknown as AudioNode,
    ),
    context,
    sources,
    panners,
    gains,
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function fetchSamples() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })),
  );
}

describe("original MechKeys recordings and profiles", () => {
  it("ships all 31 extension recordings without byte changes", () => {
    expect(manifest.extensionVersion).toBe("2.0.2");
    expect(manifest.files).toHaveLength(31);
    for (const file of manifest.files) {
      const bytes = readFileSync(
        new URL(`../public/audio/mechkeys/${file.path}`, import.meta.url),
      );
      expect(bytes.length).toBe(file.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        file.sha256,
      );
    }
    expect(recordedProfiles["mechkeys-tactile"].down).toHaveLength(12);
    expect(recordedProfiles["mechkeys-classic"].down).toHaveLength(16);
  });
  it("keeps all six old choices and accepts the five new saved preferences", () => {
    expect(soundPacks).toHaveLength(11);
    for (const pack of mechKeysPacks)
      expect(normalizeSoundSettings({ soundPack: pack.id }).soundPack).toBe(
        pack.id,
      );
    expect(isRecordedPack("toString")).toBe(false);
  });
  it("trims silence and applies the extension's peak normalization and cap", () => {
    const samples = new Float32Array(100);
    samples[20] = 0.3;
    expect(sampleAnalysis(samples, 1000)).toEqual({
      offset: 0.018000000000000002,
      normalization: expect.closeTo(2, 5),
    });
    expect(
      sampleAnalysis(new Float32Array([0.00001]), 48000).normalization,
    ).toBe(20);
    expect(sampleAnalysis(new Float32Array(20), 48000)).toEqual({
      offset: 0,
      normalization: 1,
    });
  });
  it("preserves physical key panning, large keys, and mobile character mapping", () => {
    expect(keyPan("CapsLock")).toBe(-0.35);
    expect(keyPan("Enter")).toBe(0.35);
    expect(keyPan("ArrowRight")).toBe(0.4);
    expect(keyPan("Unidentified")).toBe(0);
    expect(bigKeys.has("Backspace")).toBe(true);
    expect(keyCodeForCharacter("é")).toBe("KeyE");
    expect(keyCodeForCharacter("\n")).toBe("Enter");
    expect(keyCodeForCharacter(" ")).toBe("Space");
  });
  it("preserves the three synthesis profiles, including silent Linear release and typewriter bell", () => {
    expect(synthProfiles["mechkeys-clicky"].press).toEqual({
      frequency: 4200,
      q: 4,
      gain: 1,
      seconds: 0.016,
    });
    expect(synthProfiles["mechkeys-linear"].body).toEqual({
      frequency: 120,
      gain: 0.85,
      seconds: 0.075,
      wave: "sine",
    });
    expect(synthProfiles["mechkeys-linear"].release).toBeNull();
    expect(synthProfiles["mechkeys-typewriter"].bell).toBe(true);
  });
});
describe("MechKeys playback lifecycle", () => {
  it("decodes original recordings once, avoids consecutive press repeats, and plays a release", async () => {
    fetchSamples();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const h = audioHarness();
    await Promise.all([
      h.renderer.preload("mechkeys-tactile"),
      h.renderer.preload("mechkeys-tactile"),
    ]);
    expect(h.context.decodeAudioData).toHaveBeenCalledTimes(15);
    h.renderer.play("mechkeys-tactile", "down", "KeyA");
    h.renderer.play("mechkeys-tactile", "down", "KeyA");
    h.renderer.play("mechkeys-tactile", "up", "KeyA");
    expect(h.sources).toHaveLength(3);
    expect(h.sources[0].buffer).not.toBe(h.sources[1].buffer);
    expect(h.sources[0].playbackRate.value).toBe(1);
    expect(h.gains[2].gain.value).toBeCloseTo(0.35, 5);
    expect(h.panners[0].pan.value).toBeLessThan(0);
  });
  it("deepens Space but preserves dedicated Enter and Backspace recordings", async () => {
    fetchSamples();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const h = audioHarness();
    await h.renderer.preload("mechkeys-tactile");
    for (const code of ["Space", "Enter", "Backspace"])
      h.renderer.play("mechkeys-tactile", "down", code);
    expect(h.sources.map((s) => s.playbackRate.value)).toEqual([0.82, 1, 1]);
    expect(h.sources[1].buffer).not.toBe(h.sources[2].buffer);
  });
  it("derives the short Classic release with its rate and fade", async () => {
    fetchSamples();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const h = audioHarness();
    await h.renderer.preload("mechkeys-classic");
    h.renderer.play("mechkeys-classic", "up", "KeyA");
    expect(h.sources[0].playbackRate.value).toBe(0.84);
    expect(h.sources[0].start).toHaveBeenCalledWith(1, 0, 0.045000000000000005);
    expect(h.gains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      0.0001,
      1.035,
    );
  });
  it("does not play delayed recordings after stop during loading", async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((r) => {
      resolve = r;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => pending),
    );
    const h = audioHarness();
    h.renderer.play("mechkeys-classic", "down", "KeyA");
    h.renderer.stop();
    // Every pending request shares the deferred response; none may start an old key later.
    resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    await h.renderer.preload("mechkeys-classic");
    expect(h.sources).toHaveLength(0);
  });
  it("plays press/release components and the Enter bell, and stops active voices", () => {
    const h = audioHarness();
    h.renderer.play("mechkeys-linear", "down", "KeyA");
    expect(h.sources).toHaveLength(2);
    h.renderer.play("mechkeys-linear", "up", "KeyA");
    expect(h.sources).toHaveLength(2);
    h.renderer.play("mechkeys-typewriter", "down", "Enter");
    expect(h.sources).toHaveLength(6);
    expect(h.sources.slice(-2).map((s) => s.frequency.value)).toEqual([
      2093, 4186,
    ]);
    h.renderer.play("mechkeys-typewriter", "up", "Enter");
    expect(h.sources).toHaveLength(7);
    h.renderer.stop();
    for (const source of h.sources) expect(source.stop).toHaveBeenCalled();
  });
});
