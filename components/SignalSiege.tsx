"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Crosshair,
  ChevronDown,
  Heart,
  Maximize,
  Minimize,
  Pause,
  Play,
  Rocket,
  RotateCcw,
  Shield,
  Trophy,
  Zap,
} from "lucide-react";
import {
  siegeDifficulties,
  siegeProfiles,
  type SiegeBests,
  type SiegeDifficulty,
} from "@/game/siege-difficulty";
import { SiegeGame, type SiegeResult } from "@/game/siege";
import { SiegeRenderer } from "@/game/siege-renderer";
import { playKeyboardSound, playTone, stopSounds } from "@/game/audio";
import type { Settings, Run } from "@/game/storage";
import {
  playCombatSound,
  setCombatVolume,
  stopCombatSounds,
  unlockCombatAudio,
} from "@/game/combat-audio";
import { siegeLabels } from "@/game/siege-labels";
import type { SiegeBaseline } from "@/game/siege-report";
import SiegeReport from "./SiegeReport";
import GameCover from "./GameCover";
import SiegeCosmetics from "./SiegeCosmetics";
import { SiegeCountdown } from "@/game/siege-countdown";
import {
  normalizeSiegeMode,
  siegeModes,
  type SiegeMode,
} from "@/game/siege-mode";
import {
  cosmeticOptions,
  cosmeticUnlocked,
  type CosmeticSave,
  type CosmeticSelection,
} from "@/game/siege-cosmetics";
export default function SignalSiege({
  settings,
  active,
  recentRuns,
  cosmetics,
  onCosmeticChange,
  onRunStateChange,
  onPracticeWords,
  initialDifficulty,
  initialMode,
  timedBests,
  onModeChange,
  bests,
  onDifficultyChange,
  onFinish,
}: {
  settings: Settings;
  active: boolean;
  recentRuns: Run[];
  cosmetics: CosmeticSave;
  onCosmeticChange: (selection: CosmeticSelection) => void;
  onRunStateChange: (inProgress: boolean) => void;
  onPracticeWords: (words: string[]) => void;
  initialDifficulty: SiegeDifficulty;
  initialMode: SiegeMode;
  timedBests: SiegeBests;
  onModeChange: (mode: SiegeMode) => void;
  bests: SiegeBests;
  onDifficultyChange: (difficulty: SiegeDifficulty) => void;
  onFinish: (result: SiegeResult) => void;
}) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<SiegeCountdown | null>(null);
  const restoreLaunchFocus = useRef(false);
  const cosmeticsRef = useRef(cosmetics);
  cosmeticsRef.current = cosmetics;
  const startingUnlocks = useRef(new Set<string>());
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [mode, setMode] = useState(initialMode);
  const game = useRef(
    new SiegeGame(Date.now(), 5, initialDifficulty, false, initialMode),
  );
  const consoleRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const baseline = useRef<SiegeBaseline>({ bestScore: 0 });
  const [modalPause, setModalPause] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [fieldDimensions, setFieldDimensions] = useState({
    width: 900,
    height: 480,
  });
  const canvas = useRef<HTMLCanvasElement>(null);
  const targetElements = useRef(new Map<number, HTMLDivElement>());
  const rendererRef = useRef<SiegeRenderer | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState(() => game.current.snapshot());
  const [message, setMessage] = useState(
    "Choose a difficulty, then launch a run.",
  );
  const [focused, setFocused] = useState(false);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const saved = useRef(false);
  const resetClock = useRef(false);
  const held = useRef(new Set<string>());
  const composing = useRef(false);
  const systemReduced = useRef(false);
  function sync() {
    setView(game.current.snapshot());
  }
  function record() {
    if (
      saved.current ||
      game.current.status === "ready" ||
      game.current.tutorial
    )
      return;
    saved.current = true;
    const result = game.current.result();
    if (
      result.score > 0 ||
      result.metrics.errors > 0 ||
      result.metrics.duration > 1000
    )
      onFinishRef.current(result);
  }
  function cancelLaunch() {
    if (!countdownRef.current) return;
    countdownRef.current = null;
    restoreLaunchFocus.current = true;
    setCountdown(null);
    held.current.clear();
    stopSounds();
    stopCombatSounds();
    setMessage("Launch cancelled. Start again when you’re ready.");
  }
  function launch(tutorial = false) {
    if (countdownRef.current) return;
    startingUnlocks.current = new Set(
      cosmeticOptions
        .filter((option) =>
          cosmeticUnlocked(option, cosmeticsRef.current.progress),
        )
        .map((option) => option.id),
    );
    const previous = [...recentRuns]
      .reverse()
      .find(
        (run) =>
          run.arcade &&
          (run.arcade.difficulty ?? "standard") === difficulty &&
          normalizeSiegeMode(run.arcade.mode) === mode,
      );
    baseline.current = {
      bestScore:
        (mode === "timed" ? timedBests : bests)[difficulty]?.score ?? 0,
      ...(previous?.arcade
        ? {
            previous: {
              score: previous.arcade.score,
              wpm: previous.metrics.wpm,
              accuracy: previous.metrics.accuracy,
            },
          }
        : {}),
    };
    stopCombatSounds();
    if (settingsRef.current.sound && settingsRef.current.combatSound)
      void unlockCombatAudio();
    resetClock.current = true;
    game.current = new SiegeGame(
      Date.now(),
      (canvas.current?.clientWidth ?? 900) < 500 ? 3 : 5,
      tutorial ? "training" : difficulty,
      tutorial,
      tutorial ? "endless" : mode,
    );
    saved.current = false;
    held.current.clear();
    if (tutorial) game.current.start();
    else {
      countdownRef.current = new SiegeCountdown();
      setCountdown(3);
    }
    setMessage(
      tutorial
        ? "Follow the tutorial instructions."
        : "Starting in 3. Get your hands ready.",
    );
    sync();
    input.current?.focus({ preventScroll: true });
    canvas.current
      ?.closest(".siege-console")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function pause(modal = true) {
    if (countdownRef.current) {
      cancelLaunch();
      return;
    }
    if (game.current.status !== "running") return;
    game.current.pause();
    setModalPause(modal);
    held.current.clear();
    stopSounds();
    stopCombatSounds();
    setMessage("Game paused. Your timer and enemies are stopped.");
    sync();
  }
  function resume() {
    dialog.current?.close();
    resetClock.current = true;
    game.current.resume();
    if (settingsRef.current.sound && settingsRef.current.combatSound)
      void unlockCombatAudio();
    setMessage("Game resumed. Keep typing enemy words.");
    sync();
    input.current?.focus({ preventScroll: true });
  }
  function end() {
    game.current.end();
    record();
    stopSounds();
    stopCombatSounds();
    setMessage(
      game.current.tutorial
        ? "Tutorial ended. Launch whenever you are ready."
        : "Defense ended. Your report is saved on this device.",
    );
    sync();
  }
  function release() {
    game.current.releaseTarget();
    setMessage("Target released. Its partial word has been reset.");
    sync();
    input.current?.focus({ preventScroll: true });
  }
  function leaveTutorial() {
    game.current.end();
    stopSounds();
    stopCombatSounds();
    game.current = new SiegeGame(
      Date.now(),
      game.current.lanes,
      difficulty,
      false,
      mode,
    );
    setMessage("Choose your difficulty and launch when ready.");
    sync();
  }
  function chooseDifficulty(next: SiegeDifficulty) {
    setDifficulty(next);
    onDifficultyChange(next);
    if (game.current.status === "ready") {
      game.current = new SiegeGame(
        Date.now(),
        game.current.lanes,
        next,
        false,
        mode,
      );
      sync();
    }
  }
  function chooseMode(next: SiegeMode) {
    setMode(next);
    onModeChange(next);
    if (game.current.status === "ready") {
      game.current = new SiegeGame(
        Date.now(),
        game.current.lanes,
        difficulty,
        false,
        next,
      );
      sync();
    }
  }
  function captureWord(id: number, word: string) {
    const label = targetElements.current.get(id);
    const element = label?.querySelector<HTMLElement>(".siege-word");
    const field = canvas.current;
    if (!label || !element || !field || !rendererRef.current) return;
    const bounds = field.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const rect = element.getBoundingClientRect();
    const [dx = 0, dy = 0] = label.style.translate.split(" ").map(parseFloat);
    rendererRef.current.rememberWord(game.current, id, word, {
      x: (rect.left + rect.width / 2 - bounds.left - (dx || 0)) / bounds.width,
      y: (rect.top + rect.height / 2 - bounds.top - (dy || 0)) / bounds.height,
      width: rect.width,
      height: rect.height,
      fontSize: parseFloat(getComputedStyle(element).fontSize),
    });
  }
  function pulse() {
    for (const enemy of game.current.enemies) captureWord(enemy.id, enemy.word);
    if (game.current.pulse()) {
      setMessage(
        game.current.tutorial
          ? "Tutorial complete. Launch your defense when ready."
          : `Emergency pulse deployed. Type ${game.current.profile.recharge} drones down to earn another.`,
      );
      sync();
    } else
      setMessage(
        `No pulse charge. Destroy ${game.current.profile.recharge} drones by typing to recharge.`,
      );
    input.current?.focus({ preventScroll: true });
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === consoleRef.current)
        await document.exitFullscreen();
      else await consoleRef.current?.requestFullscreen();
      input.current?.focus({ preventScroll: true });
    } catch {
      setMessage(
        "Fullscreen is unavailable in this browser. You can continue in the normal view.",
      );
    }
  }
  useEffect(() => {
    if (countdown === null && restoreLaunchFocus.current) {
      restoreLaunchFocus.current = false;
      if (active && document.hasFocus())
        consoleRef.current
          ?.querySelector<HTMLButtonElement>(
            ".siege-ready-overlay .siege-launch",
          )
          ?.focus({ preventScroll: true });
    }
  }, [countdown, active]);
  useEffect(() => {
    if (!active) {
      cancelLaunch();
      pause(false);
      if (document.fullscreenElement === consoleRef.current)
        void document.exitFullscreen().catch(() => {});
    }
  }, [active]);
  useEffect(() => {
    onRunStateChange(
      !view.tutorial && (view.status === "running" || view.status === "paused"),
    );
  }, [view.status, view.tutorial, onRunStateChange]);
  useEffect(() => {
    setFullscreenAvailable(Boolean(document.fullscreenEnabled));
    const change = () => {
      const isFullscreen = document.fullscreenElement === consoleRef.current;
      setFullscreen(isFullscreen);
      if (!isFullscreen && game.current.status === "running") pause(false);
    };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    if (!settings.sound || !settings.combatSound || !active) stopCombatSounds();
    setCombatVolume(settings.combatVolume);
  }, [settings.sound, settings.combatSound, settings.combatVolume, active]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      systemReduced.current = media.matches;
    };
    update();
    media.addEventListener("change", update);
    const size = () =>
      setHeight(
        window.innerWidth < 720
          ? Math.max(
              240,
              Math.min(
                480,
                (window.visualViewport?.height ?? window.innerHeight) - 180,
              ),
            )
          : undefined,
      );
    size();
    window.visualViewport?.addEventListener("resize", size);
    window.addEventListener("resize", size);
    return () => {
      media.removeEventListener("change", update);
      window.visualViewport?.removeEventListener("resize", size);
      window.removeEventListener("resize", size);
    };
  }, []);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d");
    if (!ctx) return;
    const renderer = new SiegeRenderer();
    rendererRef.current = renderer;
    let frame = 0,
      last = performance.now(),
      lastHud = 0,
      lastEvent = 0,
      lastStatus = "",
      dirty = true;
    const resize = () => {
      const rect = element.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (rect.width > 0 && rect.height > 0)
        setFieldDimensions((previous) =>
          previous.width === rect.width && previous.height === rect.height
            ? previous
            : { width: rect.width, height: rect.height },
        );
      element.width = Math.round(rect.width * dpr);
      element.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    };
    let activeGame = game.current;
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const loop = (now: number) => {
      const dt = resetClock.current ? 0 : Math.max(0, (now - last) / 1000);
      resetClock.current = false;
      last = now;
      const g = game.current,
        was = g.status;
      if (countdownRef.current) {
        if (!activeRef.current || document.hidden) cancelLaunch();
        else if (countdownRef.current.advance(dt)) {
          countdownRef.current = null;
          setCountdown(null);
          g.start();
          resetClock.current = true;
          setMessage("Type the first letter of a word to lock a target.");
          sync();
        } else setCountdown(countdownRef.current.value);
      } else if (!activeRef.current) g.pause();
      else g.tick(dt);
      if (was === "running" && g.status === "over") {
        record();
        setMessage(
          g.tutorial
            ? "Tutorial complete. Your relay is ready."
            : g.endReason === "time"
              ? "Time’s up. Your 60-second arcade result is saved."
              : "Run complete. Try again to beat your score.",
        );
        sync();
      }
      if (activeGame !== g) {
        activeGame = g;
        lastEvent = 0;
      }
      const recent = g.events.filter((e) => e.id > lastEvent);
      for (const event of recent) {
        lastEvent = event.id;
        if (
          activeRef.current &&
          (g.status === "running" ||
            (was === "running" && g.status === "over")) &&
          settingsRef.current.sound &&
          settingsRef.current.combatSound &&
          event.kind !== "kill" &&
          event.kind !== "armor"
        )
          playCombatSound(event.kind, settingsRef.current.combatVolume);
        if (event.kind === "damage")
          setMessage(
            `Hull hit. ${g.hull} shield${g.hull === 1 ? "" : "s"} remaining.`,
          );
        else if (event.kind === "wave")
          setMessage(
            event.text +
              (g.wave % 5 === 0
                ? " · Break three word shields to destroy the boss."
                : " · Keep the relay alive."),
          );
        else if (event.kind === "boss") setMessage(event.text);
        else if (
          event.kind === "armor" &&
          !g.enemies.some((enemy) => enemy.boss)
        )
          setMessage("Shield broken. Type the new word to finish your target.");
      }
      if (
        activeRef.current &&
        element.clientWidth > 0 &&
        ((g.status !== "paused" &&
          (g.status !== "over" ||
            lastStatus !== "over" ||
            renderer.animating)) ||
          dirty)
      ) {
        const motion =
          !settingsRef.current.reducedMotion && !systemReduced.current;
        renderer.setCosmetics(cosmeticsRef.current.selection);
        const impacts = renderer.draw(
          ctx,
          element.clientWidth,
          element.clientHeight,
          g,
          Math.min(dt, 0.05),
          motion,
          now / 1000,
        );
        for (const impact of impacts) {
          if (
            g.status === "running" &&
            settingsRef.current.sound &&
            settingsRef.current.combatSound
          )
            playCombatSound(impact.kind, settingsRef.current.combatVolume);
        }
        // Move the readable HTML label with its Canvas ship without rerendering React at 60fps.
        for (const [id, label] of targetElements.current) {
          const offset = renderer.recoil(
            id,
            element.clientWidth,
            element.clientHeight,
            motion,
          );
          const left = parseFloat(label.style.left) || 0;
          const top = parseFloat(label.style.top) || 0;
          const x = Math.max(
            2 - left,
            Math.min(
              element.clientWidth - left - label.offsetWidth - 2,
              offset.x,
            ),
          );
          const y = Math.max(
            2 - top,
            Math.min(
              element.clientHeight - top - label.offsetHeight - 2,
              offset.y,
            ),
          );
          label.style.translate = `${x}px ${y}px`;
        }
        dirty = false;
      }
      if (
        (g.status === "running" && now - lastHud > 75) ||
        lastStatus !== g.status
      ) {
        setView(g.snapshot());
        lastHud = now;
      }
      lastStatus = g.status;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const blur = () => {
      cancelLaunch();
      if (game.current.status === "running") {
        game.current.pause();
        setModalPause(true);
        held.current.clear();
        stopSounds();
        stopCombatSounds();
        setMessage("Paused while you were away.");
        setView(game.current.snapshot());
      }
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      rendererRef.current = null;
      countdownRef.current = null;
      observer.disconnect();
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      stopSounds();
      stopCombatSounds();
      if (
        game.current.status === "running" ||
        game.current.status === "paused"
      ) {
        game.current.end();
      }
    };
  }, []);
  useEffect(() => {
    if (
      active &&
      modalPause &&
      view.status === "paused" &&
      !dialog.current?.open
    )
      dialog.current?.showModal();
    else if (
      (!active || !modalPause || view.status !== "paused") &&
      dialog.current?.open
    )
      dialog.current.close();
  }, [view.status, active, modalPause]);
  useEffect(() => {
    if (!settings.sound) {
      held.current.clear();
      stopSounds();
    }
  }, [settings.sound]);
  function type(letter: string, physical = false) {
    // Capture the real word box before React replaces a completed word/target.
    const target =
      game.current.enemies.find((e) => e.id === game.current.target) ??
      game.current.enemies.find(
        (e) => e.word[e.progress] === letter.toLowerCase(),
      );
    if (target) captureWord(target.id, target.word);
    const response = game.current.press(letter);
    if (!response) return;
    if (!response.correct) {
      const mistake = game.current.snapshot().mistake;
      setMessage(
        mistake?.expected
          ? `Expected ${mistake.expected.toUpperCase()}, received ${letter.toUpperCase()}. Your progress is unchanged.`
          : `No target starts with ${letter.toUpperCase()}. Type the first letter of a visible word.`,
      );
    } else if (response.complete)
      setMessage(
        game.current.target
          ? "Armor cracked. New word incoming."
          : "Target neutralized. Pick your next signal.",
      );
    if (settingsRef.current.sound && !physical)
      playTone(response.correct ? "key" : "error", "code", {
        pack: settingsRef.current.soundPack,
        volume: settingsRef.current.soundVolume,
        character: letter,
      });
    sync();
  }
  const fieldWidth = fieldDimensions.width;
  const fieldHeight = fieldDimensions.height;
  const labels = siegeLabels(
    view.enemies,
    fieldWidth,
    fieldHeight,
    settings.largeText
      ? 20
      : typeof window !== "undefined" && window.innerWidth <= 720
        ? 14
        : 16,
    view.target,
  );
  const labelById = new Map(labels.map((label) => [label.id, label]));
  const target = view.enemies.find((e) => e.id === view.target);
  const boss = view.enemies.find((e) => e.boss);
  const danger =
    view.hull === 1 || view.enemies.some((enemy) => enemy.y > 0.68);
  const locked =
    view.status === "running" || view.status === "paused" || countdown !== null;
  const profile =
    siegeProfiles[locked && !view.tutorial ? view.difficulty : difficulty];
  const activeDifficulty =
    locked && !view.tutorial ? view.difficulty : difficulty;
  const activeMode = locked && !view.tutorial ? view.mode : mode;
  const activeBests = activeMode === "timed" ? timedBests : bests;
  const tutorialStep = view.tutorialStep;
  const tutorialText =
    tutorialStep === "target"
      ? "Type O to lock onto ORBIT. Each correct letter fires a shot."
      : tutorialStep === "release"
        ? "Press Backspace to release your target. This resets its partial word and removes those partial-word points."
        : tutorialStep === "finish"
          ? "Now type ORBIT completely to destroy the drone. Mistakes keep your progress; try the next letter again."
          : "Press Space or tap Pulse to clear both drones. In a real run, typed eliminations recharge pulses.";
  return (
    <section
      className="siege-page page-enter"
      aria-labelledby="siege-title"
      data-status={countdown !== null ? "countdown" : view.status}
      data-elapsed={view.metrics.duration}
      data-mode={view.mode}
    >
      <div className="siege-heading">
        <div>
          <h1 id="siege-title">Signal Siege</h1>
          <p>Type enemy words to defend your ship.</p>
        </div>
        <div className="siege-best">
          <Trophy size={17} />
          <span>
            {siegeModes[activeMode].label} ·{" "}
            {siegeProfiles[activeDifficulty].label} best
            <strong>
              {(activeBests[activeDifficulty]?.score ?? 0).toLocaleString()}
            </strong>
          </span>
        </div>
      </div>
      <fieldset className="siege-mode" disabled={locked}>
        <legend>Choose your mode</legend>
        <div>
          {(["endless", "timed"] as const).map((choice) => (
            <label
              key={choice}
              className={mode === choice ? "is-selected" : ""}
            >
              <input
                type="radio"
                name="siege-mode"
                value={choice}
                checked={mode === choice}
                onChange={() => chooseMode(choice)}
              />
              <span>
                <strong>{siegeModes[choice].label}</strong>
                <span>{siegeModes[choice].description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="siege-difficulty" disabled={locked}>
        <legend>Choose your difficulty</legend>
        <div className="siege-difficulty-options">
          {siegeDifficulties.map((choice) => {
            const option = siegeProfiles[choice];
            return (
              <label
                key={choice}
                className={difficulty === choice ? "is-selected" : ""}
              >
                <input
                  type="radio"
                  name="siege-difficulty"
                  value={choice}
                  checked={difficulty === choice}
                  onChange={() => chooseDifficulty(choice)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                  <small>
                    {option.hull} shields · {option.pulses} pulse
                    {option.pulses > 1 ? "s" : ""}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
        <div className="siege-setup-footer">
          <button type="button" onClick={() => launch(true)}>
            Learn to play <ArrowRight size={14} />
          </button>
        </div>
      </fieldset>
      <SiegeCosmetics
        value={cosmetics}
        active={active}
        reducedMotion={settings.reducedMotion}
        disabled={locked}
        onChange={onCosmeticChange}
      />
      <div className="siege-toolbar">
        {!fullscreen && (
          <button
            type="button"
            data-siege-control="true"
            className="text-button siege-fullscreen"
            disabled={!fullscreenAvailable}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
        )}
      </div>
      <div
        ref={consoleRef}
        className={`siege-console ${settings.highContrast ? "siege-contrast" : ""}`}
      >
        {fullscreen && (
          <button
            className="siege-fullscreen-exit"
            data-siege-control="true"
            onClick={toggleFullscreen}
            aria-label="Exit fullscreen"
          >
            <Minimize size={18} />
          </button>
        )}
        <div className="siege-hud" aria-label="Defense statistics">
          <div>
            <span>Wave</span>
            <strong>{String(Math.max(view.wave, 1)).padStart(2, "0")}</strong>
          </div>
          <div>
            <span>Score</span>
            <strong>{String(view.score).padStart(5, "0")}</strong>
          </div>
          <div className="siege-shields">
            <span>Hull</span>
            <strong aria-label={`${view.hull} hull shields`}>
              <span className="siege-hull-count">
                {view.hull}/{view.maxHull}
              </span>
              {Array.from({ length: view.maxHull }, (_, i) => (
                <Heart
                  key={i}
                  size={17}
                  className={i < view.hull ? "charged" : ""}
                  fill={i < view.hull ? "currentColor" : "none"}
                />
              ))}
            </strong>
          </div>
          <div>
            <span>Accuracy</span>
            <strong>
              {Math.round(view.metrics.accuracy)}
              <small>%</small>
            </strong>
          </div>
          {view.timeRemaining !== null && (
            <div
              className={`siege-timer ${view.timeRemaining <= 10 ? "is-low" : ""}`}
            >
              <span>Time left</span>
              <strong
                role="timer"
                aria-label={`${Math.ceil(view.timeRemaining)} seconds remaining`}
              >
                {Math.floor(Math.ceil(view.timeRemaining) / 60)}:
                {String(Math.ceil(view.timeRemaining) % 60).padStart(2, "0")}
              </strong>
            </div>
          )}
          <button
            className="siege-icon-button"
            disabled={view.status !== "running"}
            onClick={() => pause()}
            aria-label="Pause defense"
          >
            <Pause size={17} />
            <span>ESC</span>
          </button>
        </div>
        {boss?.boss && locked && (
          <div
            className={`siege-boss-panel boss-${boss.boss.phase}`}
            role="status"
          >
            <Shield size={20} />
            <div>
              <strong>
                Dreadnought · Phase {4 - boss.armor} / 3 ·{" "}
                {boss.boss.phase === "shielded"
                  ? "Moving shields"
                  : boss.boss.phase === "carrier"
                    ? "Escort carrier"
                    : "Core exposed"}
              </strong>
              <span>
                {boss.boss.phase === "shielded"
                  ? "Finish its word to break a shield."
                  : boss.boss.phase === "carrier"
                    ? boss.boss.escortsLeft
                      ? `${boss.boss.escortIn > 0 ? `Escorts launching in ${Math.ceil(boss.boss.escortIn)}s` : "Escorts ready to launch"} · ${boss.boss.escortsLeft} remaining`
                      : "Escorts deployed. Break the next shield."
                    : "Overdrive: faster approach. Finish the final word."}
              </span>
            </div>
            <div
              className="siege-phase-markers"
              aria-label={`${boss.armor} word shields remaining`}
            >
              {[3, 2, 1].map((armor) => (
                <i
                  key={armor}
                  className={
                    armor === boss.armor
                      ? "current"
                      : armor > boss.armor
                        ? "complete"
                        : ""
                  }
                />
              ))}
            </div>
          </div>
        )}
        {view.tutorial && locked && (
          <div className="siege-tutorial" aria-label="Interactive tutorial">
            <div role="status">
              <span className="siege-kicker">
                Flight school · step{" "}
                {tutorialStep === "target"
                  ? 1
                  : tutorialStep === "release"
                    ? 2
                    : tutorialStep === "finish"
                      ? 3
                      : 4}{" "}
                / 4
              </span>
              <p>{tutorialText}</p>
              <small>
                Targets stay still. Take your time. No scores or XP are saved.
              </small>
            </div>
            <div className="siege-tutorial-actions">
              {tutorialStep === "release" && (
                <button onClick={release}>Release target</button>
              )}
              <button onClick={leaveTutorial}>Skip tutorial</button>
            </div>
          </div>
        )}
        <div
          className="siege-field"
          style={{ height }}
          onClick={(e) => {
            if (
              !(e.target as HTMLElement).closest("button") &&
              (view.status === "running" || countdownRef.current)
            )
              input.current?.focus({ preventScroll: true });
          }}
        >
          <canvas ref={canvas} aria-hidden="true" />
          <svg
            className="siege-label-connectors"
            viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}
            aria-hidden="true"
          >
            {labels
              .filter((label) => label.shifted)
              .map((label) => (
                <line
                  key={label.id}
                  x1={label.shipX}
                  y1={label.shipY}
                  x2={Math.max(
                    label.left + 6,
                    Math.min(label.left + label.width - 6, label.shipX),
                  )}
                  y2={
                    label.top > label.shipY
                      ? label.top
                      : label.top + label.height
                  }
                  className={label.id === view.target ? "locked" : ""}
                />
              ))}
          </svg>
          <div
            className="siege-targets"
            role="list"
            aria-label="Incoming targets"
          >
            {view.enemies.map((e) => (
              <div
                key={e.id}
                ref={(element) => {
                  if (element) targetElements.current.set(e.id, element);
                  else targetElements.current.delete(e.id);
                }}
                role="listitem"
                className={`siege-enemy ${view.target === e.id ? "is-locked" : ""} ${e.kind === "boss" ? "is-boss" : ""} ${view.mistake?.enemyId === e.id ? "is-mistake" : ""}`}
                style={{
                  left: labelById.get(e.id)?.left,
                  top: labelById.get(e.id)?.top,
                  width: labelById.get(e.id)?.width,
                  transform: "none",
                }}
                data-word={e.word}
                data-enemy-id={e.id}
              >
                {e.armor > 1 && (
                  <span className="siege-armor">
                    {e.kind === "boss" ? "Dreadnought" : "Sentinel"}{" "}
                    {Array.from({ length: e.armor }, (_, i) => (
                      <i key={i} />
                    ))}
                  </span>
                )}
                <span className="siege-word">
                  <span className="siege-typed">
                    {e.word.slice(0, e.progress)}
                  </span>
                  {view.target === e.id ? (
                    <>
                      <span className="siege-next-letter">
                        {e.word[e.progress]}
                      </span>
                      <span>{e.word.slice(e.progress + 1)}</span>
                    </>
                  ) : (
                    <span>{e.word.slice(e.progress)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          {view.status === "running" &&
            view.mode === "endless" &&
            view.intermission && (
              <div className="siege-wave-clear">
                <Shield size={25} />
                <strong>Sector cleared</strong>
                <span>
                  {(view.wave + 1) % 5 === 0
                    ? "Boss incoming"
                    : `Wave ${view.wave + 1}`}{" "}
                  in {Math.ceil(view.nextWaveIn)}s
                </span>
              </div>
            )}
          {view.status === "running" && danger && !view.tutorial && (
            <div className="siege-danger" role="status">
              {view.hull === 1 ? "Last hull shield" : "Enemy approaching"} ·
              Finish a word or use a pulse
            </div>
          )}
          {view.status === "running" && view.mistake && (
            <div className="siege-mistake-feedback" role="status">
              {view.mistake.expected ? (
                <>
                  <kbd>{view.mistake.actual.toUpperCase()}</kbd> received · Next
                  key <kbd>{view.mistake.expected.toUpperCase()}</kbd>
                </>
              ) : (
                <>
                  No target starts with{" "}
                  <kbd>{view.mistake.actual.toUpperCase()}</kbd>
                </>
              )}
            </div>
          )}
          {view.status === "paused" && !modalPause && (
            <div className="siege-overlay siege-soft-pause">
              <div className="siege-intro">
                <Pause size={26} />
                <h2>Game paused</h2>
                <p>
                  Your targets and timer are stopped. Resume when you’re ready.
                </p>
                <button className="siege-launch" onClick={resume}>
                  <Play size={16} />
                  Resume defense
                </button>
                <button
                  className="siege-end"
                  onClick={view.tutorial ? leaveTutorial : end}
                >
                  {view.tutorial ? "Exit tutorial" : "End run & save report"}
                </button>
              </div>
            </div>
          )}
          {view.status === "running" && !focused && (
            <button
              className="siege-focus-prompt"
              onClick={() => input.current?.focus()}
            >
              <Crosshair size={16} />
              Click here to continue typing
            </button>
          )}
          {countdown !== null && (
            <div className="siege-overlay siege-countdown">
              <div>
                <p>Get ready</p>
                <strong
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={`Starting in ${countdown}`}
                >
                  {countdown}
                </strong>
                <p>Type enemy words when the countdown ends.</p>
                <button
                  className="button ghost"
                  data-siege-control="true"
                  onClick={cancelLaunch}
                >
                  Cancel launch
                </button>
              </div>
            </div>
          )}
          {view.status === "ready" && countdown === null && (
            <div className="siege-overlay siege-ready-overlay">
              <GameCover kind="orbit" sizes="(max-width: 950px) 90vw, 1100px" />
              <div className="siege-intro">
                <span className="siege-orbit-icon">
                  <Rocket size={31} />
                </span>
                <h2>
                  {mode === "timed"
                    ? "One minute. Your best score."
                    : "Defend your ship"}
                </h2>
                <p>
                  Type each enemy’s word to destroy it. {profile.hull} shields ·{" "}
                  {profile.label} difficulty.
                  {mode === "timed" &&
                    " Ends at 60 seconds or when your hull runs out."}
                </p>
                <button className="siege-launch" onClick={() => launch()}>
                  <Play size={16} fill="currentColor" />
                  Launch defense
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}
          {view.status === "over" && !view.tutorial && (
            <div className="siege-overlay">
              <div className="siege-intro siege-results">
                <span className="siege-kicker">
                  {siegeModes[view.mode].label} ·{" "}
                  {siegeProfiles[view.difficulty].label} · Wave {view.wave}
                </span>
                <h2>
                  {view.endReason === "time" ? "Time’s up" : "Run complete"}
                </h2>
                <p>
                  {view.kills} {view.kills === 1 ? "enemy" : "enemies"}{" "}
                  destroyed.
                </p>
                {cosmeticOptions.some(
                  (option) =>
                    cosmeticUnlocked(option, cosmetics.progress) &&
                    !startingUnlocks.current.has(option.id),
                ) && (
                  <p className="siege-cosmetic-reward">
                    New styles unlocked:{" "}
                    {cosmeticOptions
                      .filter(
                        (option) =>
                          cosmeticUnlocked(option, cosmetics.progress) &&
                          !startingUnlocks.current.has(option.id),
                      )
                      .map((option) => option.name)
                      .join(", ")}
                  </p>
                )}
                <div className="siege-result-stats">
                  <span>
                    <strong>{view.score.toLocaleString()}</strong>Score
                  </span>
                  <span>
                    <strong>{view.metrics.wpm}</strong>WPM
                  </span>
                  <span>
                    <strong>{view.metrics.accuracy.toFixed(1)}%</strong>Accuracy
                  </span>
                </div>
                <button className="siege-launch" onClick={() => launch()}>
                  <RotateCcw size={16} />
                  Fly again
                  <ArrowRight size={16} />
                </button>
                <span className="siege-intro-note">
                  {fullscreen
                    ? "Your score is saved. Stay here to review it, or use the exit button to leave fullscreen."
                    : "Your defense report and personal best save on this device."}
                </span>
              </div>
            </div>
          )}
          {view.status === "over" && view.tutorial && (
            <div className="siege-overlay">
              <div className="siege-intro siege-tutorial-complete">
                <Shield size={32} />
                <span className="siege-kicker">
                  Flight school /{" "}
                  {tutorialStep === "complete" ? "Complete" : "Ended"}
                </span>
                <h2>Tutorial complete</h2>
                <p>Start a run with your selected difficulty.</p>
                <button className="siege-launch" onClick={() => launch()}>
                  <Play size={16} />
                  Launch {profile.label} defense
                  <ArrowRight size={16} />
                </button>
                <button
                  className="siege-tutorial-replay"
                  onClick={() => launch(true)}
                >
                  Replay tutorial
                </button>
              </div>
            </div>
          )}
          {locked && (
            <span className="siege-defense-line" aria-hidden="true">
              Relay defense perimeter
            </span>
          )}
          <textarea
            ref={input}
            className="siege-input"
            aria-label="Type incoming enemy words"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              setFocused(false);
              held.current.clear();
              const next = event.relatedTarget as HTMLElement | null;
              if (
                next?.closest(
                  ".siege-control-deck, .siege-hud, .siege-tutorial-actions, [data-siege-control]",
                )
              )
                return;
              queueMicrotask(() => {
                if (document.activeElement !== input.current) pause(false);
              });
            }}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              if (countdownRef.current) {
                e.currentTarget.value = "";
                return;
              }
              if (e.nativeEvent.isTrusted)
                for (const char of e.currentTarget.value) type(char);
              e.currentTarget.value = "";
            }}
            onInput={(e) => {
              if (countdownRef.current) {
                e.currentTarget.value = "";
                return;
              }
              const native = e.nativeEvent as InputEvent;
              if (composing.current || native.isComposing) return;
              if (
                native.isTrusted &&
                ![
                  "insertFromPaste",
                  "insertFromDrop",
                  "insertReplacementText",
                ].includes(native.inputType)
              )
                for (const char of e.currentTarget.value)
                  if (char === " ") pulse();
                  else type(char);
              e.currentTarget.value = "";
            }}
            onKeyDown={(e) => {
              if (
                !e.nativeEvent.isTrusted ||
                e.metaKey ||
                e.ctrlKey ||
                e.nativeEvent.isComposing
              )
                return;
              if (e.key === "Escape") {
                e.preventDefault();
                pause();
                return;
              }
              if (
                countdownRef.current &&
                (e.key === " " ||
                  e.key === "Backspace" ||
                  /^[a-z]$/i.test(e.key))
              ) {
                e.preventDefault();
                return;
              }
              if (view.status !== "running") return;
              if (e.repeat) {
                if (
                  e.key === " " ||
                  e.key === "Backspace" ||
                  /^[a-z]$/i.test(e.key)
                )
                  e.preventDefault();
                return;
              }
              if (
                e.key === " " ||
                e.key === "Backspace" ||
                /^[a-z]$/i.test(e.key)
              ) {
                e.preventDefault();
                const physical = Boolean(
                  settings.sound &&
                  e.code &&
                  e.code !== "Unidentified" &&
                  playKeyboardSound("down", e.code, {
                    pack: settings.soundPack,
                    volume: settings.soundVolume,
                  }),
                );
                if (physical) held.current.add(e.code);
                if (e.key === " ") pulse();
                else if (e.key === "Backspace") {
                  release();
                } else type(e.key, physical);
              }
            }}
            onKeyUp={(e) => {
              if (
                e.nativeEvent.isTrusted &&
                held.current.delete(e.code) &&
                settings.sound &&
                view.status === "running"
              )
                playKeyboardSound("up", e.code, {
                  pack: settings.soundPack,
                  volume: settings.soundVolume,
                });
            }}
          />
        </div>
        <div className="siege-control-deck">
          <div className="siege-lock">
            <Crosshair size={16} />
            <span>
              {target ? (
                <>
                  Next key{" "}
                  <kbd className="siege-next-key">
                    {target.word[target.progress]?.toUpperCase()}
                  </kbd>
                  <strong>
                    <span>{target.word.slice(0, target.progress)}</span>
                    {target.word.slice(target.progress)}
                  </strong>
                </>
              ) : (
                <>
                  Auto target<strong>Start any word to lock on</strong>
                </>
              )}
            </span>
          </div>
          <div className="siege-combo">
            <span>Clean streak</span>
            <strong>
              {view.combo}
              <small>×</small>
            </strong>
          </div>
          <button
            className="siege-pulse"
            onClick={pulse}
            disabled={
              view.status !== "running" ||
              view.pulses === 0 ||
              (view.tutorial && tutorialStep !== "pulse")
            }
            aria-label={`Emergency pulse, ${view.pulses} charges`}
          >
            <Zap size={18} />
            <span>
              Pulse<strong>{view.pulses} / 3</strong>
            </span>
            <kbd>SPACE</kbd>
          </button>
        </div>
        <div className="siege-recharge">
          <label htmlFor="pulse-recharge">
            {view.pulses === 3
              ? "Pulse charges full"
              : `Pulse recharge · ${view.pulseCredit} / ${view.rechargeRequired} typed eliminations`}
          </label>
          <progress
            id="pulse-recharge"
            max={view.rechargeRequired}
            value={view.pulses === 3 ? view.rechargeRequired : view.pulseCredit}
          />
        </div>
      </div>
      {view.status === "over" && !view.tutorial && (
        <SiegeReport
          result={game.current.result()}
          baseline={baseline.current}
          onPractice={onPracticeWords}
        />
      )}
      <p className="siege-status sr-only" role="status">
        {message}
      </p>
      <div className="siege-guide">
        <span>
          <kbd>A–Z</kbd>Type a word to attack
        </span>
        <span>
          <kbd>SPACE</kbd>Emergency pulse
        </span>
        <span>
          <kbd>⌫</kbd>Release target
        </span>
        <span>
          <kbd>ESC</kbd>Pause
        </span>
      </div>
      <details className="siege-help">
        <summary>
          How to play <ChevronDown size={16} />
        </summary>
        <div className="siege-details">
          <div>
            <Crosshair size={20} />
            <h3>Choose a target</h3>
            <p>
              The first letter locks a drone. Each correct letter fires a bolt;
              finish its word to destroy it. Mistakes break your clean streak.
            </p>
          </div>
          <div>
            <Zap size={20} />
            <h3>Use a pulse</h3>
            <p>
              Space releases a screen-clearing pulse. Destroy drones by typing
              to recharge. Save a charge for a crowded sky.
            </p>
          </div>
          <div>
            <Shield size={20} />
            <h3>Know your enemies</h3>
            <p>
              Interceptors accelerate, sentinels have two word shields, and a
              dreadnought arrives every fifth wave. Break its moving shields,
              watch for escorts, then stop its exposed core before it reaches
              you.
            </p>
          </div>
        </div>
      </details>
      <dialog
        ref={dialog}
        className="siege-pause-dialog"
        aria-labelledby="siege-pause-title"
        onCancel={(e) => {
          e.preventDefault();
          resume();
        }}
      >
        <Pause size={25} />
        <h2 id="siege-pause-title">Game paused</h2>
        <p>Your ship, targets and clock are paused.</p>
        <button className="siege-launch" onClick={resume}>
          <Play size={16} />
          Resume defense
        </button>
        <button
          className="siege-end"
          onClick={view.tutorial ? leaveTutorial : end}
        >
          {view.tutorial ? "Exit tutorial" : "End run & save report"}
        </button>
      </dialog>
    </section>
  );
}
