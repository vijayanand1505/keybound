import type { Run } from "./storage";
import type { SiegeResult } from "./siege";
import type { SiegeBests } from "./siege-difficulty";
export type CosmeticSelection = {
  ship: string;
  trail: string;
  target: string;
  hull?: string;
  beam?: string;
};
export const cosmeticCategories = [
  ["hull", "Ship frame"],
  ["ship", "Ship color"],
  ["trail", "Engine trail"],
  ["beam", "Laser style"],
  ["target", "Target marker"],
] as const;
export type CosmeticProgress = {
  runs: number;
  kills: number;
  bestWave: number;
  bestCombo: number;
};
export type CosmeticSave = {
  selection: CosmeticSelection;
  progress: CosmeticProgress;
};
export const defaultCosmetics: CosmeticSelection = {
  ship: "relay",
  trail: "ion",
  target: "brackets",
  hull: "vector",
  beam: "pulse-beam",
};
export const cosmeticOptions = [
  {
    id: "vector",
    category: "hull",
    name: "Vector",
    requirement: "Available now",
    stat: "runs",
    goal: 0,
    color: "#b6e1dc",
  },
  {
    id: "dart",
    category: "hull",
    name: "Dart",
    requirement: "Available now",
    stat: "runs",
    goal: 0,
    color: "#b6e1dc",
  },
  {
    id: "twinfin",
    category: "hull",
    name: "Twinfin",
    requirement: "Destroy 10 enemies",
    stat: "kills",
    goal: 10,
    color: "#b6e1dc",
  },
  {
    id: "relay",
    category: "ship",
    name: "Relay",
    requirement: "Available now",
    stat: "runs",
    goal: 0,
    color: "#b6e1dc",
  },
  {
    id: "aurora",
    category: "ship",
    name: "Aurora",
    requirement: "Finish 1 run",
    stat: "runs",
    goal: 1,
    color: "#bda8ff",
  },
  {
    id: "ember",
    category: "ship",
    name: "Ember",
    requirement: "Reach wave 5",
    stat: "bestWave",
    goal: 5,
    color: "#ffae83",
  },
  {
    id: "ion",
    category: "trail",
    name: "Ion",
    requirement: "Available now",
    stat: "kills",
    goal: 0,
    color: "#78e4df",
  },
  {
    id: "comet",
    category: "trail",
    name: "Comet",
    requirement: "Destroy 25 enemies",
    stat: "kills",
    goal: 25,
    color: "#b4abff",
  },
  {
    id: "solar",
    category: "trail",
    name: "Solar",
    requirement: "Reach a 10-word clean streak",
    stat: "bestCombo",
    goal: 10,
    color: "#ffd38a",
  },
  {
    id: "brackets",
    category: "target",
    name: "Brackets",
    requirement: "Available now",
    stat: "runs",
    goal: 0,
    color: "#edc783",
  },
  {
    id: "stardust",
    category: "trail",
    name: "Stardust",
    requirement: "Destroy 75 enemies",
    stat: "kills",
    goal: 75,
    color: "#a6e7ff",
  },
  {
    id: "pulse-beam",
    category: "beam",
    name: "Pulse beam",
    requirement: "Available now",
    stat: "runs",
    goal: 0,
    color: "#a3f3ed",
  },
  {
    id: "tracer",
    category: "beam",
    name: "Tracer",
    requirement: "Available now",
    stat: "runs",
    goal: 0,
    color: "#ffd38a",
  },
  {
    id: "prism",
    category: "beam",
    name: "Prism",
    requirement: "Reach a 5-word clean streak",
    stat: "bestCombo",
    goal: 5,
    color: "#c9b4ff",
  },
  {
    id: "diamond",
    category: "target",
    name: "Diamond",
    requirement: "Finish 3 runs",
    stat: "runs",
    goal: 3,
    color: "#edc783",
  },
  {
    id: "orbit",
    category: "target",
    name: "Orbit",
    requirement: "Destroy 50 enemies",
    stat: "kills",
    goal: 50,
    color: "#edc783",
  },
] as const;
export type CosmeticOption = (typeof cosmeticOptions)[number];
export function cosmeticUnlocked(
  option: CosmeticOption,
  progress: CosmeticProgress,
) {
  return progress[option.stat] >= option.goal;
}
function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}
/** Backfill old saves; durable totals survive the 100-run journal cap. */
export function normalizeCosmetics(
  value: unknown,
  runs: Run[] = [],
  bests: SiegeBests = {},
): CosmeticSave {
  const source =
    value && typeof value === "object" ? (value as Partial<CosmeticSave>) : {};
  const recorded = source.progress ?? ({} as Partial<CosmeticProgress>);
  const arcade = runs.filter((run) => run.arcade);
  const progress: CosmeticProgress = {
    runs: Math.max(
      count(recorded.runs),
      arcade.length,
      Object.values(bests).filter(
        (best) => count(best?.wave) > 0 || count(best?.score) > 0,
      ).length,
    ),
    kills: Math.max(
      count(recorded.kills),
      arcade.reduce((sum, run) => sum + count(run.arcade?.kills), 0),
    ),
    bestWave: Math.max(
      count(recorded.bestWave),
      ...arcade.map((run) => count(run.arcade?.wave)),
      ...Object.values(bests).map((best) => count(best?.wave)),
    ),
    bestCombo: Math.max(
      count(recorded.bestCombo),
      ...arcade.map((run) =>
        count(run.arcade?.maxCombo ?? run.metrics?.maxCombo),
      ),
    ),
  };
  const selection = { ...defaultCosmetics };
  for (const [category] of cosmeticCategories) {
    const choice = cosmeticOptions.find(
      (option) =>
        option.category === category &&
        option.id === source.selection?.[category],
    );
    if (choice && cosmeticUnlocked(choice, progress))
      selection[category] = choice.id;
  }
  return { selection, progress };
}
export function recordCosmetics(
  current: CosmeticSave,
  result: SiegeResult,
): CosmeticSave {
  if (result.tutorial) return current;
  return {
    selection: { ...current.selection },
    progress: {
      runs: current.progress.runs + 1,
      kills: current.progress.kills + result.kills,
      bestWave: Math.max(current.progress.bestWave, result.wave),
      bestCombo: Math.max(current.progress.bestCombo, result.metrics.maxCombo),
    },
  };
}
export function cosmeticLook(selection: CosmeticSelection) {
  const ship =
    selection.ship === "aurora"
      ? { fill: "#352d53", stroke: "#c9b4ff", canopy: "#ded4ff" }
      : selection.ship === "ember"
        ? { fill: "#4c302b", stroke: "#ffb58c", canopy: "#ffe2a9" }
        : { fill: "#244550", stroke: "#b6e1dc", canopy: "#eed19a" };
  return {
    ...ship,
    trail: selection.trail,
    target: selection.target,
    hull: selection.hull ?? "vector",
    beam: selection.beam ?? "pulse-beam",
    laser:
      selection.beam === "tracer"
        ? "#ffd38a"
        : selection.beam === "prism"
          ? "#c9b4ff"
          : "#a3f3ed",
    engine:
      selection.trail === "stardust"
        ? [166, 231, 255]
        : selection.trail === "comet"
          ? [174, 164, 255]
          : selection.trail === "solar"
            ? [255, 199, 109]
            : [120, 228, 223],
  };
}
/** Every frame keeps the same nose position and firing geometry. */
export function shipHullPoints(
  hull = "vector",
): readonly (readonly [number, number])[] {
  if (hull === "dart")
    return [
      [0, -25],
      [-7, -6],
      [-23, 9],
      [-8, 5],
      [0, 11],
      [8, 5],
      [23, 9],
      [7, -6],
    ];
  if (hull === "twinfin")
    return [
      [0, -25],
      [-7, -8],
      [-14, -16],
      [-21, 12],
      [-10, 9],
      [-6, 4],
      [0, 11],
      [6, 4],
      [10, 9],
      [21, 12],
      [14, -16],
      [7, -8],
    ];
  return [
    [0, -25],
    [-17, 11],
    [-5, 6],
    [0, 10],
    [5, 6],
    [17, 11],
  ];
}
export function shipHullPath(hull: string) {
  return (
    shipHullPoints(hull)
      .map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`)
      .join(" ") + " Z"
  );
}
