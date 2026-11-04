import { textCharacters } from "./custom-practice";
export type KeyStroke = {
  at: number;
  expected: string;
  actual: string;
  correct: boolean;
  latency: number;
};
export type Metrics = {
  wpm: number;
  grossWpm: number;
  accuracy: number;
  consistency: number;
  flow: number;
  combo: number;
  maxCombo: number;
  errors: number;
  duration: number;
  progress: number;
};
export type WeakKey = {
  key: string;
  hits: number;
  errors: number;
  latency: number;
  score: number;
};
export class TypingSession {
  cursor = 0;
  events: KeyStroke[] = [];
  startedAt: number | null = null;
  endedAt: number | null = null;
  pausedAt: number | null = null;
  pausedMs = 0;
  combo = 0;
  maxCombo = 0;
  private dirtyWord = false;
  private wordHasCharacters = false;
  private lastAt: number | null = null;
  readonly characters: string[];
  constructor(public readonly text: string) {
    this.text = text.normalize("NFC");
    this.characters = textCharacters(this.text);
  }
  press(actual: string, at: number) {
    if (this.complete || this.pausedAt !== null) return null;
    if (this.startedAt === null) this.startedAt = at;
    const expected = this.characters[this.cursor];
    const correct = actual === expected;
    this.events.push({
      at,
      expected,
      actual,
      correct,
      latency: this.lastAt === null ? 0 : Math.max(0, at - this.lastAt),
    });
    this.lastAt = at;
    let wordComplete = false;
    if (correct) {
      this.cursor++;
      if (!/\s/u.test(expected)) this.wordHasCharacters = true;
      if ((/\s/u.test(expected) || this.complete) && this.wordHasCharacters) {
        wordComplete = true;
        this.wordHasCharacters = false;
        this.combo = this.dirtyWord ? 0 : this.combo + 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.dirtyWord = false;
      }
    } else {
      this.dirtyWord = true;
      this.combo = 0;
    }
    if (this.complete) this.endedAt = at;
    return {
      correct,
      wordComplete,
    };
  }
  backspace() {
    if (this.pausedAt === null && !this.complete && this.cursor > 0)
      this.cursor--;
  }
  pause(at: number) {
    if (this.pausedAt === null) this.pausedAt = at;
  }
  resume(at: number) {
    if (this.pausedAt !== null) {
      if (this.startedAt !== null) this.pausedMs += at - this.pausedAt;
      this.pausedAt = null;
      this.lastAt = null;
    }
  }
  get complete() {
    return this.cursor === this.characters.length;
  }
  metrics(at: number): Metrics {
    const duration =
      this.startedAt === null
        ? 0
        : Math.max(
            0,
            (this.endedAt ?? this.pausedAt ?? at) -
              this.startedAt -
              this.pausedMs,
          );
    const minutes = Math.max(duration, 1000) / 60000;
    const errors = this.events.filter((e) => !e.correct).length;
    const intervals = this.events
      .slice(-24)
      .filter((e) => e.correct && e.latency > 0 && e.latency < 3000)
      .map((e) => e.latency);
    const mean =
      intervals.reduce((a, b) => a + b, 0) / Math.max(1, intervals.length);
    const variance =
      intervals.reduce((a, b) => a + (b - mean) ** 2, 0) /
      Math.max(1, intervals.length);
    const consistency =
      intervals.length < 3
        ? 0
        : Math.max(0, Math.min(100, 100 * (1 - Math.sqrt(variance) / mean)));
    return {
      wpm: Math.round(this.cursor / 5 / minutes),
      grossWpm: Math.round(this.events.length / 5 / minutes),
      accuracy: this.events.length
        ? ((this.events.length - errors) / this.events.length) * 100
        : 100,
      consistency: Math.round(consistency),
      flow: Math.round(
        Math.min(
          100,
          consistency *
            Math.min(1, intervals.length / 16) *
            (errors && !this.events.at(-1)?.correct ? 0.45 : 1),
        ),
      ),
      combo: this.combo,
      maxCombo: this.maxCombo,
      errors,
      duration,
      progress: this.characters.length
        ? this.cursor / this.characters.length
        : 0,
    };
  }
}
export function weakKeys(events: KeyStroke[]): WeakKey[] {
  const groups = new Map<string, KeyStroke[]>();
  for (const event of events) {
    if (event.expected.trim())
      groups.set(event.expected, [
        ...(groups.get(event.expected) ?? []),
        event,
      ]);
  }
  return [...groups]
    .map(([key, es]) => {
      const errors = es.filter((e) => !e.correct).length;
      const latencies = es
        .filter((e) => e.correct && e.latency > 0 && e.latency < 3000)
        .map((e) => e.latency);
      const latency = Math.round(
        latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length),
      );
      return {
        key,
        hits: es.length - errors,
        errors,
        latency,
        score:
          ((0.6 * errors) / es.length + 0.4 * Math.min(1, latency / 800)) *
          Math.min(1, es.length / 5),
      };
    })
    .sort((a, b) => b.score - a.score);
}
export function seededRandom(seed: string) {
  let state = 2166136261;
  for (const c of seed) state = Math.imul(state ^ c.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
export const drillWords = [
  "signal",
  "keeper",
  "harbor",
  "passage",
  "beacon",
  "relay",
  "coast",
  "light",
  "ship",
  "quiet",
  "grip",
  "rope",
  "reach",
  "ridge",
  "water",
  "course",
  "north",
  "south",
  "home",
  "storm",
  "steady",
  "shelter",
  "breathe",
  "station",
  "lamp",
  "chart",
  "map",
  "path",
  "port",
  "safe",
  "hold",
  "send",
  "clear",
  "wind",
  "rescue",
  "anchor",
  "return",
  "seaward",
  "weather",
  "message",
];
export function trainingText(keys: string[], seed: string, count = 45) {
  const random = seededRandom(seed);
  const targeted = drillWords.filter((word) =>
    keys.some((key) => word.includes(key)),
  );
  return Array.from({ length: count }, () => {
    const pool = random() < 0.65 && targeted.length ? targeted : drillWords;
    return pool[Math.floor(random() * pool.length)];
  }).join(" ");
}
