import { describe, expect, it } from "vitest";
import { worldFor, worldStatus } from "../game/presentation";
describe("mode-specific presentation", () => {
  it("preserves the coast fallback while giving each playable side mode a distinct environment", () => {
    expect(worldFor("unknown").kind).toBe("coast");
    const modes = [
      "coast",
      "ascent",
      "daily",
      "coach",
      "code",
      "practice",
      "trial",
    ];
    expect(new Set(modes.map((m) => worldFor(m).kind)).size).toBe(modes.length);
    expect(new Set(modes.map((m) => worldFor(m).label)).size).toBe(
      modes.length,
    );
  });
  it("gives the mountain and code modes relevant progress and error feedback", () => {
    expect(worldStatus("ascent", 0.9)).toMatch(/summit/i);
    expect(worldStatus("ascent", 0.4, true)).toMatch(/grip lost/i);
    expect(worldStatus("code", 0.9)).toMatch(/reboot/i);
    expect(worldStatus("code", 0.4, true)).toMatch(/syntax/i);
  });
  it("does not show coastal ship messaging in other modes", () => {
    for (const mode of [
      "ascent",
      "daily",
      "coach",
      "code",
      "practice",
      "trial",
    ]) {
      expect(worldStatus(mode, 0)).not.toMatch(/SHIP|HARBOR|BEACON/i);
      expect(worldStatus(mode, 0.95)).not.toMatch(/SHIP|HARBOR/i);
    }
  });
});
