export type WorldKind =
  "coast" | "ascent" | "daily" | "coach" | "code" | "practice" | "trial";
export type WorldPresentation = {
  kind: WorldKind;
  label: string;
  action: string;
  unit: string;
  stages: readonly [string, string, string, string];
  accent: string;
};
const worlds: Record<WorldKind, WorldPresentation> = {
  coast: {
    kind: "coast",
    label: "Coastal transmitter",
    action: "Message relayed",
    unit: "Signal restored",
    stages: [
      "Awaiting your transmission",
      "Beacon signal strengthening",
      "The ship has your signal",
      "Harbor in sight",
    ],
    accent: "#dbb779",
  },
  ascent: {
    kind: "ascent",
    label: "Alpine field terminal",
    action: "Handhold secured",
    unit: "Route climbed",
    stages: [
      "Establish your first handhold",
      "Ascending the ice wall",
      "Above the cloud line",
      "The summit is within reach",
    ],
    accent: "#a7dde7",
  },
  daily: {
    kind: "daily",
    label: "Daily relay network",
    action: "Relay node connected",
    unit: "Network restored",
    stages: [
      "Scanning for a signal",
      "Uplink acquired",
      "Restoring the relay chain",
      "Final station in range",
    ],
    accent: "#9ee5bb",
  },
  coach: {
    kind: "coach",
    label: "Tick / key constellation",
    action: "Target locked",
    unit: "Pattern mapped",
    stages: [
      "Practice your difficult keys",
      "Building muscle memory",
      "Keep practicing the highlighted keys",
      "Practice almost complete",
    ],
    accent: "#ebbd86",
  },
  code: {
    kind: "code",
    label: "Signal room / relay os",
    action: "Packet compiled",
    unit: "System restored",
    stages: [
      "Relay offline / awaiting input",
      "Establishing a secure connection",
      "Power returning to the grid",
      "Final reboot sequence",
    ],
    accent: "#8bdad8",
  },
  practice: {
    kind: "practice",
    label: "Field notes / open frequency",
    action: "Word complete",
    unit: "Passage explored",
    stages: [
      "Start typing when you’re ready",
      "Settling into your rhythm",
      "Keep a steady pace",
      "Almost finished",
    ],
    accent: "#e8ca92",
  },
  trial: {
    kind: "trial",
    label: "Guild / recruit calibration",
    action: "Baseline sample logged",
    unit: "Trial transcribed",
    stages: [
      "Type for 60 seconds",
      "Measuring speed and accuracy",
      "Keep typing until the timer ends",
      "Test almost complete",
    ],
    accent: "#e8ca92",
  },
};
export function worldFor(expedition: string): WorldPresentation {
  if (expedition === "custom")
    return {
      ...worlds.practice,
      label: "Field notes / your words",
      action: "Word complete",
    };
  return worlds[expedition as WorldKind] ?? worlds.coast;
}
export function worldStatus(
  expedition: string,
  progress: number,
  error = false,
): string {
  const world = worldFor(expedition);
  if (error)
    return world.kind === "ascent"
      ? "Grip lost / find your next hold"
      : world.kind === "code"
        ? "Syntax interrupted / correct to reconnect"
        : world.kind === "coach"
          ? "Incorrect key / try the highlighted letter"
          : "Signal interrupted / restore the connection";
  return world.stages[
    progress > 0.85 ? 3 : progress > 0.5 ? 2 : progress > 0.15 ? 1 : 0
  ];
}
export type WorldFeedback = {
  id: number;
  kind: "word" | "error";
  word: string;
};
