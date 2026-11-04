import type { KeyStroke, Metrics } from "./typing";
import { siegeProfiles, type SiegeDifficulty } from "./siege-difficulty";
import { SIEGE_TIME_LIMIT, type SiegeMode } from "./siege-mode";
export type TutorialStep =
  "target" | "release" | "finish" | "pulse" | "complete";
export type SiegeStatus = "ready" | "running" | "paused" | "over";
export type BossPhase = "shielded" | "carrier" | "overdrive";
export type MissedWord = { word: string; errors: number };
export type Drone = {
  boss?: {
    phase: BossPhase;
    clock: number;
    escortIn: number;
    escortsLeft: number;
  };
  id: number;
  word: string;
  progress: number;
  x: number;
  y: number;
  speed: number;
  armor: number;
  kind: "scout" | "interceptor" | "sentinel" | "boss";
  dirty: boolean;
};
export type PulseTarget = { drone: Drone; shield: boolean };
export type SiegeEvent = {
  id: number;
  kind:
    "hit" | "kill" | "error" | "damage" | "pulse" | "wave" | "armor" | "boss";
  x: number;
  y: number;
  text: string;
  /** Frozen shot target, retained briefly by the renderer after an elimination. */
  drone?: Drone;
  /** Frozen pre-pulse targets; visual wave contact never delays protection or points. */
  pulseTargets?: PulseTarget[];
};
export type SiegeResult = {
  mode?: SiegeMode;
  endReason?: "time" | "hull" | "ended";
  difficulty: SiegeDifficulty;
  tutorial: boolean;
  missedWords: MissedWord[];
  score: number;
  wave: number;
  kills: number;
  metrics: Metrics;
  events: KeyStroke[];
};
const shortWords =
  "arc ash bay beam bird blue bolt buoy calm code coil comet crest dawn deck deep drift dusk echo ember fern fire flare flux foam gale gate glow grid haze helm home hull ice iris jade jet keel kite lake lamp leaf lens link lock loop lume lunar map mast mint moon moss nest nova omen opal orbit peak pine port pulse rain ray reef ring rise road root rune sail salt sand scan sea seed ship sky snow song star stem sun tide time tree veil wake warm wave west wind wire wish wolf yard zero zone".split(
    " ",
  );
const longWords =
  "anchor aurora beacon binary circuit compass crystal current eclipse engine falcon galaxy gravity harbor horizon impulse lantern meteor nebula photon planet plasma prism quasar radar reactor rescue ripple rocket signal solar spirit static storm summit tether thruster vector velvet voyage whisper zenith".split(
    " ",
  );
const bossWords =
  "afterglow astronaut celestial frequency interstellar lighthouse satellite starlight supernova transmission trajectory wavelength".split(
    " ",
  );
/** Deterministic simulation. Time advances only through tick; DOM and graphics stay outside. */
export class SiegeGame {
  status: SiegeStatus = "ready";
  wave = 0;
  score = 0;
  hull: number;
  pulses: number;
  tutorialStep: TutorialStep | null = null;
  kills = 0;
  combo = 0;
  maxCombo = 0;
  correct = 0;
  attempts = 0;
  elapsed = 0;
  endReason: SiegeResult["endReason"];
  target: number | null = null;
  enemies: Drone[] = [];
  events: SiegeEvent[] = [];
  keystrokes: KeyStroke[] = [];
  private state: number;
  private nextId = 0;
  private eventId = 0;
  private pending = 0;
  private spawnIn = 0;
  private breakTime = 0;
  private lastKey = 0;
  private pulseCredit = 0;
  private missedWords = new Map<string, number>();
  private mistake: {
    enemyId: number | null;
    actual: string;
    expected: string;
    remaining: number;
  } | null = null;
  constructor(
    seed = Date.now(),
    public lanes = 5,
    public readonly difficulty: SiegeDifficulty = "standard",
    public readonly tutorial = false,
    public readonly mode: SiegeMode = "endless",
  ) {
    this.hull = this.profile.hull;
    this.pulses = this.profile.pulses;
    this.state = seed >>> 0;
    this.lanes = Math.max(3, Math.min(5, Math.round(lanes)));
  }
  get maxActive() {
    return this.lanes === 3
      ? Math.min(5, this.profile.maxActive)
      : this.profile.maxActive;
  }
  get profile() {
    return siegeProfiles[this.difficulty];
  }
  get timeRemaining() {
    return this.mode === "timed" && !this.tutorial
      ? Math.max(0, SIEGE_TIME_LIMIT - this.elapsed)
      : null;
  }
  private random() {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
  private emit(
    kind: SiegeEvent["kind"],
    x = 0.5,
    y = 0.5,
    text = "",
    drone?: Drone,
    pulseTargets?: PulseTarget[],
  ) {
    this.events.push({
      id: ++this.eventId,
      kind,
      x,
      y,
      text,
      ...(pulseTargets ? { pulseTargets } : {}),
      ...(drone
        ? {
            drone: {
              ...drone,
              ...(drone.boss ? { boss: { ...drone.boss } } : {}),
            },
          }
        : {}),
    });
    if (this.events.length > 48) this.events.shift();
  }
  private word(boss = false, exceptId?: number) {
    const used = new Set(
      this.enemies.filter((e) => e.id !== exceptId).map((e) => e.word[0]),
    );
    const bank =
      this.difficulty === "training"
        ? shortWords
        : this.difficulty === "expert"
          ? boss
            ? bossWords
            : longWords
          : boss
            ? bossWords
            : this.wave < 3
              ? shortWords
              : this.wave < 7
                ? [...shortWords, ...longWords]
                : longWords;
    const options = bank.filter((w) => !used.has(w[0]));
    const choices = options.length
      ? options
      : shortWords.filter((w) => !used.has(w[0]));
    return choices[Math.floor(this.random() * choices.length)] ?? "echo";
  }
  start() {
    if (this.status !== "ready") return;
    this.status = "running";
    if (this.tutorial) {
      this.wave = 1;
      this.tutorialStep = "target";
      this.tutorialDrone("orbit", 0.5);
    } else this.nextWave();
  }
  private tutorialDrone(word: string, x: number) {
    this.enemies.push({
      id: ++this.nextId,
      word,
      x,
      y: 0.35,
      speed: 0,
      progress: 0,
      armor: 1,
      kind: "scout",
      dirty: false,
    });
  }
  private nextWave() {
    this.wave++;
    this.pending = Math.min(
      this.profile.waveBase + this.wave,
      this.profile.maxSwarm,
    );
    this.breakTime = 0;
    this.spawnIn = 1.5 * this.profile.spawnScale;
    this.emit(
      "wave",
      0.5,
      0.3,
      this.wave % 5 === 0
        ? `WAVE ${this.wave} · DREADNOUGHT`
        : `WAVE ${this.wave}`,
    );
    this.spawn(this.wave % 5 === 0);
    if (this.pending > 0 && this.difficulty !== "training") this.spawn();
  }
  /** Keep timed play supplied with targets instead of spending the minute on empty fields. */
  private refillTimedField() {
    if (
      this.mode !== "timed" ||
      this.tutorial ||
      this.status !== "running" ||
      this.enemies.length > 0
    )
      return;
    if (this.pending === 0) this.nextWave();
    else {
      this.spawn();
      this.spawnIn =
        Math.max(0.8, 2.8 - this.wave * 0.12) * this.profile.spawnScale;
    }
  }
  private spawn(boss = false) {
    if (this.pending <= 0) return;
    this.pending--;
    const occupied = new Set(
      this.enemies
        .filter((e) => e.y < 0.3)
        .map((e) => Math.round(((e.x - 0.12) / 0.76) * (this.lanes - 1))),
    );
    const options = Array.from({ length: this.lanes }, (_, i) => i).filter(
      (i) => !occupied.has(i),
    );
    const lane = options.length
      ? options[Math.floor(this.random() * options.length)]
      : Math.floor(this.random() * this.lanes);
    const kind = boss
      ? "boss"
      : this.wave >= 3 && this.random() < 0.25
        ? "interceptor"
        : this.wave >= 4 && this.random() < 0.25
          ? "sentinel"
          : "scout";
    this.enemies.push({
      id: ++this.nextId,
      ...(boss
        ? {
            boss: {
              phase: "shielded" as const,
              clock: 0,
              escortIn: 0,
              escortsLeft: 0,
            },
          }
        : {}),
      word: this.word(boss),
      progress: 0,
      x: boss
        ? 0.5
        : (this.lanes === 3 ? 0.22 : 0.12) +
          (lane / (this.lanes - 1)) * (this.lanes === 3 ? 0.56 : 0.76),
      y: boss ? 0.18 : 0.14 + this.random() * 0.08,
      speed:
        Math.min(0.016 + this.wave * 0.0025, 0.065) *
        (kind === "interceptor" ? 1.45 : boss ? 0.68 : 1) *
        this.profile.speed,
      armor: boss ? 3 : kind === "sentinel" ? 2 : 1,
      kind,
      dirty: false,
    });
  }
  private breakShield(enemy: Drone) {
    enemy.armor--;
    if (enemy.boss) {
      enemy.boss.phase = enemy.armor === 2 ? "carrier" : "overdrive";
      enemy.boss.clock = 0;
      enemy.boss.escortIn = enemy.armor === 2 ? 2.5 : 0;
      enemy.boss.escortsLeft =
        enemy.armor === 2 ? (this.difficulty === "training" ? 1 : 2) : 0;
      this.emit(
        "boss",
        enemy.x,
        enemy.y,
        enemy.armor === 2
          ? "Carrier phase · Escorts launch in 3 seconds."
          : "Core exposed · The boss is speeding up.",
        enemy,
      );
    }
  }
  private moveBoss(enemy: Drone, dt: number) {
    const boss = enemy.boss!;
    boss.clock += dt;
    const desiredX =
      boss.phase === "carrier"
        ? 0.5
        : 0.5 +
          Math.sin(boss.clock * (boss.phase === "overdrive" ? 1.4 : 0.7)) *
            (boss.phase === "overdrive" ? 0.28 : 0.18);
    enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 2);
    if (boss.phase === "carrier" && boss.escortsLeft > 0) {
      boss.escortIn = Math.max(0, boss.escortIn - dt);
      if (boss.escortIn === 0 && this.enemies.length < this.maxActive) {
        const side = boss.escortsLeft % 2 ? 0.76 : 0.24;
        this.enemies.push({
          id: ++this.nextId,
          word: this.word(),
          progress: 0,
          x: side,
          y: Math.min(0.65, enemy.y + 0.22),
          speed: enemy.speed * 1.35,
          armor: 1,
          kind: "interceptor",
          dirty: false,
        });
        boss.escortsLeft--;
        boss.escortIn = boss.escortsLeft ? 0.7 : 0;
      }
    }
    return boss.phase === "carrier"
      ? 0.4
      : boss.phase === "overdrive"
        ? 1.8
        : 1;
  }
  tick(seconds: number) {
    if (this.status !== "running" || !Number.isFinite(seconds) || seconds <= 0)
      return;
    if (this.mistake) {
      this.mistake.remaining -= Math.min(seconds, 1);
      if (this.mistake.remaining <= 0) this.mistake = null;
    }
    if (this.tutorial) return;
    // Integrate long frames in small steps so throttling cannot skip collisions or whole waves.
    let remaining = Math.min(seconds, 1);
    while (remaining > 0 && this.status === "running") {
      const dt = Math.min(remaining, 0.05, this.timeRemaining ?? Infinity);
      remaining -= dt;
      this.elapsed += dt;
      if (this.timeRemaining !== null && this.timeRemaining < 1e-8) {
        this.elapsed = SIEGE_TIME_LIMIT;
        this.end("time");
        break;
      }
      for (const e of [...this.enemies]) {
        e.y += e.speed * dt * (e.boss ? this.moveBoss(e, dt) : 1);
        if (e.y >= 0.88) {
          this.enemies = this.enemies.filter((other) => other.id !== e.id);
          if (this.target === e.id) this.target = null;
          this.hull = Math.max(0, this.hull - 1);
          this.combo = 0;
          this.emit("damage", e.x, 0.88, "HULL HIT");
          if (this.hull === 0) {
            this.end("hull");
            break;
          }
        }
      }
      if (this.status !== "running") break;
      this.spawnIn -= dt;
      if (
        this.pending > 0 &&
        this.spawnIn <= 0 &&
        this.enemies.length < this.maxActive
      ) {
        this.spawn();
        this.spawnIn =
          Math.max(0.8, 2.8 - this.wave * 0.12) * this.profile.spawnScale;
      }
      if (this.mode === "timed") this.refillTimedField();
      else if (this.pending === 0 && this.enemies.length === 0) {
        this.breakTime += dt;
        if (this.breakTime >= this.profile.breakTime) this.nextWave();
      }
    }
  }
  press(letter: string) {
    if (
      this.status !== "running" ||
      (this.tutorial &&
        this.tutorialStep !== "target" &&
        this.tutorialStep !== "finish") ||
      !/^\p{L}$/u.test(letter) ||
      !/^[a-z]$/i.test(letter)
    )
      return null;
    letter = letter.toLowerCase();
    this.attempts++;
    let enemy = this.enemies.find((e) => e.id === this.target);
    if (!enemy) {
      enemy = [...this.enemies]
        .filter((e) => e.word[e.progress] === letter)
        .sort((a, b) => b.y - a.y)[0];
      if (enemy) this.target = enemy.id;
    }
    const expected = enemy?.word[enemy.progress] ?? "";
    const correct = expected === letter;
    this.keystrokes.push({
      at: this.elapsed * 1000,
      expected,
      actual: letter,
      correct,
      latency: this.lastKey
        ? Math.max(0, (this.elapsed - this.lastKey) * 1000)
        : 0,
    });
    if (this.keystrokes.length > 3000) this.keystrokes.shift();
    this.lastKey = this.elapsed;
    if (!correct) {
      this.combo = 0;
      if (enemy) {
        enemy.dirty = true;
        this.missedWords.set(
          enemy.word,
          (this.missedWords.get(enemy.word) ?? 0) + 1,
        );
        if (this.missedWords.size > 100)
          this.missedWords.delete(this.missedWords.keys().next().value!);
      }
      this.mistake = {
        enemyId: enemy?.id ?? null,
        actual: letter,
        expected,
        remaining: 0.9,
      };
      this.emit(
        "error",
        enemy?.x ?? 0.5,
        enemy?.y ?? 0.75,
        "SIGNAL MISSED",
        enemy,
      );
      return { correct: false, complete: false };
    }
    this.mistake = null;
    this.correct++;
    this.score += 10;
    enemy!.progress++;
    if (this.tutorialStep === "target") this.tutorialStep = "release";
    this.emit("hit", enemy!.x, enemy!.y, letter, enemy);
    if (enemy!.progress < enemy!.word.length)
      return { correct: true, complete: false };
    this.combo = enemy!.dirty ? 0 : this.combo + 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += 80 + Math.min(this.combo, 20) * 10;
    if (enemy!.armor > 1) {
      this.breakShield(enemy!);
      // Retain the completed shield word for its impact/burst, before replacing it.
      this.emit("armor", enemy!.x, enemy!.y, "SHIELD BROKEN", enemy);
      enemy!.word = this.word(enemy!.kind === "boss", enemy!.id);
      enemy!.progress = 0;
      enemy!.dirty = false;
    } else {
      this.enemies = this.enemies.filter((e) => e.id !== enemy!.id);
      this.target = null;
      this.kills++;
      if (enemy!.kind === "boss") this.score += 400;
      this.pulseCredit++;
      this.emit(
        "kill",
        enemy!.x,
        enemy!.y,
        `+${(enemy!.kind === "boss" ? 490 : 90) + Math.min(this.combo, 20) * 10}`,
        enemy,
      );
      if (this.pulseCredit >= this.profile.recharge) {
        this.pulseCredit = 0;
        this.pulses = Math.min(3, this.pulses + 1);
      }
    }
    if (this.tutorialStep === "finish") {
      this.tutorialStep = "pulse";
      this.tutorialDrone("beam", 0.28);
      this.tutorialDrone("nova", 0.72);
    }
    this.refillTimedField();
    return { correct: true, complete: true };
  }
  releaseTarget() {
    if (
      this.status !== "running" ||
      (this.tutorial && this.tutorialStep !== "release")
    )
      return;
    const enemy = this.enemies.find((e) => e.id === this.target);
    if (enemy) {
      this.score = Math.max(0, this.score - enemy.progress * 10);
      enemy.progress = 0;
      enemy.dirty = true;
    }
    this.target = null;
    if (this.tutorialStep === "release") this.tutorialStep = "finish";
  }
  pulse() {
    if (
      this.status !== "running" ||
      this.pulses === 0 ||
      (this.tutorial && this.tutorialStep !== "pulse")
    )
      return false;
    this.pulses--;
    this.combo = 0;
    this.target = null;
    const pulseTargets = this.enemies.map((e) => ({
      drone: { ...e, ...(e.boss ? { boss: { ...e.boss } } : {}) },
      shield: e.kind === "boss" && e.armor > 1,
    }));
    for (const e of [...this.enemies]) {
      if (e.kind === "boss" && e.armor > 1) {
        this.breakShield(e);
        e.progress = 0;
        e.dirty = true;
      } else {
        this.enemies = this.enemies.filter((other) => other.id !== e.id);
        this.score += 25;
        this.kills++;
      }
    }
    this.emit("pulse", 0.5, 0.94, "EMERGENCY PULSE", undefined, pulseTargets);
    this.refillTimedField();
    if (this.tutorialStep === "pulse") {
      this.tutorialStep = "complete";
      this.end();
    }
    return true;
  }
  pause() {
    if (this.status === "running") this.status = "paused";
  }
  resume() {
    if (this.status === "paused") this.status = "running";
  }
  end(reason: NonNullable<SiegeResult["endReason"]> = "ended") {
    if (this.status === "running" || this.status === "paused") {
      this.endReason = reason;
      this.status = "over";
    }
  }
  metrics(): Metrics {
    const minutes = Math.max(this.elapsed, 1) / 60;
    return {
      wpm: Math.round(this.correct / 5 / minutes),
      grossWpm: Math.round(this.attempts / 5 / minutes),
      accuracy: this.attempts ? (this.correct / this.attempts) * 100 : 100,
      consistency: 0,
      flow: Math.min(100, this.combo * 12),
      combo: this.combo,
      maxCombo: this.maxCombo,
      errors: this.attempts - this.correct,
      duration: Math.round(this.elapsed * 1000),
      progress: 0,
    };
  }
  result(): SiegeResult {
    return {
      mode: this.mode,
      endReason: this.endReason,
      difficulty: this.difficulty,
      tutorial: this.tutorial,
      missedWords: [...this.missedWords]
        .map(([word, errors]) => ({ word, errors }))
        .sort((a, b) => b.errors - a.errors)
        .slice(0, 12),
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      metrics: this.metrics(),
      events: [...this.keystrokes],
    };
  }
  snapshot() {
    const intermission =
      this.mode === "endless" &&
      this.pending === 0 &&
      this.enemies.length === 0;
    return {
      status: this.status,
      mode: this.mode,
      timeRemaining: this.timeRemaining,
      endReason: this.endReason,
      difficulty: this.difficulty,
      tutorial: this.tutorial,
      tutorialStep: this.tutorialStep,
      maxHull: this.profile.hull,
      wave: this.wave,
      score: this.score,
      hull: this.hull,
      pulses: this.pulses,
      pulseCredit: this.pulseCredit,
      rechargeRequired: this.profile.recharge,
      mistake: this.mistake ? { ...this.mistake } : null,
      nextWaveIn: intermission
        ? Math.max(0, this.profile.breakTime - this.breakTime)
        : 0,
      kills: this.kills,
      combo: this.combo,
      target: this.target,
      enemies: this.enemies.map((e) => ({
        ...e,
        ...(e.boss ? { boss: { ...e.boss } } : {}),
      })),
      remaining: this.pending,
      intermission,
      metrics: this.metrics(),
    };
  }
}
export type SiegeSnapshot = ReturnType<SiegeGame["snapshot"]>;
