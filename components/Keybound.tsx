"use client";
import { normalizeCosmetics, recordCosmetics } from "@/game/siege-cosmetics";
import { siegeProfiles } from "@/game/siege-difficulty";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Rocket,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronRight,
  Compass,
  Copy,
  Flag,
  Headphones,
  Keyboard,
  LockKeyhole,
  Map,
  Mountain,
  Pause,
  Feather,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Telescope,
  Timer,
  Trash2,
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";
import missionsData from "@/content/missions.json";
import {
  TypingSession,
  trainingText,
  utcDay,
  weakKeys,
  type Metrics,
} from "@/game/typing";
import {
  clearProgress,
  defaultSettings,
  loadSave,
  saveProgress,
  type Run,
  type Save,
  type Settings,
} from "@/game/storage";
import {
  playTone,
  stopSounds,
  setSoundVolume,
  preloadSoundPack,
  playKeyboardSound,
} from "@/game/audio";
import SoundSettings from "./SoundSettings";
import AppearanceSettings from "./AppearanceSettings";
import dynamic from "next/dynamic";
import type { SiegeResult } from "@/game/siege";
import { normalizeSiegeMode, siegeModes } from "@/game/siege-mode";
const SignalSiege = dynamic(() => import("./SignalSiege"), {
  loading: () => (
    <div className="loading">
      <Rocket />
      <p>Loading Signal Siege…</p>
    </div>
  ),
});
import CustomPractice from "./CustomPractice";
import {
  prepareCustomText,
  textCharacters,
  textWindowStart,
  type CustomDraft,
} from "@/game/custom-practice";
import Scene from "./Scene";
import GameCover from "./GameCover";
import ModeWorld from "./ModeWorld";
import ModeFeedback from "./ModeFeedback";
import { worldFor, worldStatus, type WorldFeedback } from "@/game/presentation";

type Mission = {
  id: string;
  expedition: string;
  number: number;
  title: string;
  type: string;
  description: string;
  briefing: string;
  seconds: number;
  keys: string;
  text: string;
  reward: number;
};
type View = "hub" | "briefing" | "playing" | "debrief";
type Tab =
  | "expeditions"
  | "daily"
  | "training"
  | "journal"
  | "settings"
  | "custom"
  | "arcade";
const missions: Mission[] = missionsData;
const expeditions = [
  {
    id: "coast",
    name: "The Storm Coast",
    region: "The northern shore",
    subtitle: "Send messages from a coastal lighthouse.",
    icon: Waves,
    number: "01",
    status: "8 missions",
  },
  {
    id: "ascent",
    name: "The White Ascent",
    region: "The high ranges",
    subtitle: "Type your way up the mountain.",
    icon: Mountain,
    number: "02",
    status: "8 missions",
  },
  {
    id: "abyss",
    name: "The Abyss",
    region: "The hadal zone",
    subtitle: "Some signals come from the deep.",
    icon: Radio,
    number: "03",
    status: "In development",
  },
  {
    id: "library",
    name: "The Sunken Library",
    region: "The forgotten desert",
    subtitle: "Explore an abandoned desert library.",
    icon: Map,
    number: "04",
    status: "In development",
  },
  {
    id: "city",
    name: "The Night City",
    region: "The blackout district",
    subtitle: "Restore power across the city.",
    icon: AudioLines,
    number: "05",
    status: "In development",
  },
  {
    id: "orbit",
    name: "Low Orbit",
    region: "The last station",
    subtitle: "Find the source of the Silence.",
    icon: Telescope,
    number: "06",
    status: "Arcade · play now",
  },
];
const initialMetrics: Metrics = {
  wpm: 0,
  grossWpm: 0,
  accuracy: 100,
  consistency: 0,
  flow: 0,
  combo: 0,
  maxCombo: 0,
  errors: 0,
  duration: 0,
  progress: 0,
};
const links: { id: Tab; label: string; icon: typeof Compass }[] = [
  { id: "expeditions", label: "Games", icon: Compass },
  { id: "daily", label: "Daily Challenge", icon: Radio },
  { id: "arcade", label: "Signal Siege", icon: Rocket },
  { id: "training", label: "Practice", icon: Target },
  { id: "custom", label: "Custom Text", icon: Feather },
  { id: "journal", label: "Progress", icon: Map },
];
function duration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function rank(xp: number) {
  return xp >= 2500
    ? "Pathfinder"
    : xp >= 1200
      ? "Courier"
      : xp >= 400
        ? "Runner"
        : "Recruit";
}

export default function Keybound() {
  const [tab, setTab] = useState<Tab>("expeditions");
  const [view, setView] = useState<View>("hub");
  const [arcadeVisited, setArcadeVisited] = useState(false);
  const [arcadeInProgress, setArcadeInProgress] = useState(false);
  const [selected, setSelected] = useState("coast");
  const [mission, setMission] = useState<Mission>(missions[0]);
  const [save, setSave] = useState<Save>({
    version: 1,
    runs: [],
    settings: defaultSettings,
  });
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [metrics, setMetrics] = useState(initialMetrics);
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState<WorldFeedback>({
    id: 0,
    kind: "word",
    word: "",
  });
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<Run | null>(null);
  const [today, setToday] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy results");
  const [practiceSeconds, setPracticeSeconds] = useState(60);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const session = useRef<TypingSession | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const passage = useRef<HTMLDivElement>(null);
  const finishGuard = useRef(false);
  const composing = useRef(false);
  const physicalInput = useRef(false);
  const heldSoundKeys = useRef(new Set<string>());
  const beginButton = useRef<HTMLButtonElement>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const current = expeditions.find((e) => e.id === selected)!;
  const totalXp = save.runs.reduce((n, r) => n + r.xp, 0);
  const completedIds = useMemo(
    () => new Set(save.runs.filter((r) => r.completed).map((r) => r.missionId)),
    [save.runs],
  );
  const completed = missions.filter((m) => completedIds.has(m.id)).length;
  const allEvents = useMemo(
    () => save.runs.flatMap((r) => r.events),
    [save.runs],
  );
  const weak = useMemo(() => weakKeys(allEvents), [allEvents]);
  const stats = save.runs.length
    ? {
        wpm: Math.round(
          save.runs.reduce((n, r) => n + r.metrics.wpm, 0) / save.runs.length,
        ),
        accuracy: (
          save.runs.reduce((n, r) => n + r.metrics.accuracy, 0) /
          save.runs.length
        ).toFixed(1),
      }
    : null;
  const settings = save.settings;
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : settings.theme;
      document.documentElement.dataset.accent = settings.accent;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme, settings.accent]);

  useEffect(() => {
    if (!settings.sound) stopSounds();
  }, [settings.sound]);
  useEffect(() => {
    setSoundVolume(settings.soundVolume);
  }, [settings.soundVolume]);
  useEffect(() => {
    stopSounds();
    heldSoundKeys.current.clear();
    physicalInput.current = false;
    void preloadSoundPack(settings.soundPack).catch(() => {});
    return stopSounds;
  }, [settings.soundPack]);
  useEffect(() => {
    heldSoundKeys.current.clear();
    physicalInput.current = false;
    if (paused || !settings.sound) stopSounds();
  }, [paused, view, settings.sound]);
  const world = worldFor(mission.expedition);
  const targetKeys = useMemo(
    () => weak.slice(0, 3).map((key) => key.key),
    [weak],
  );
  const missionCharacters = useMemo(
    () => textCharacters(mission.text),
    [mission.text],
  );
  const displayStart =
    mission.expedition === "code"
      ? 0
      : textWindowStart(missionCharacters, cursor);
  const visibleCharacters = missionCharacters.slice(
    displayStart,
    displayStart + 460,
  );
  const untimed = settings.calm || mission.seconds === 0;

  useEffect(() => {
    let active = true;
    loadSave()
      .then((data) => {
        if (active) {
          setSave(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setLoaded(true);
          setNotice(
            "Browser storage is unavailable. You can play, but progress will last only for this visit.",
          );
        }
      });
    setToday(utcDay());
    const timer = setInterval(() => setToday(utcDay()), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const persist = useCallback((next: Save) => {
    setSave(next);
    void saveProgress(next).catch(() =>
      setNotice(
        "Your browser could not save progress. Export your progress before leaving.",
      ),
    );
  }, []);
  function updateSettings(patch: Partial<Settings>) {
    persist({
      ...saveRef.current,
      settings: { ...saveRef.current.settings, ...patch },
    });
  }
  const recordSiege = useCallback(
    (defense: SiegeResult) => {
      if (defense.tutorial) return;
      const previous = saveRef.current;
      const mode = normalizeSiegeMode(defense.mode);
      const bestKey = mode === "timed" ? "timedArcadeBests" : "arcadeBests";
      const best = previous[bestKey]?.[defense.difficulty];
      const run: Run = {
        id: crypto.randomUUID(),
        missionId: "orbit-signal-siege",
        title: `Signal Siege · ${siegeModes[mode].label} · ${siegeProfiles[defense.difficulty].label}`,
        expedition: "orbit",
        mode: "arcade",
        date: new Date().toISOString(),
        completed: false,
        xp: Math.min(
          300,
          defense.kills * 5 + Math.max(0, defense.wave - 1) * 15,
        ),
        metrics: defense.metrics,
        events: defense.events,
        arcade: {
          mode,
          endReason: defense.endReason,
          score: defense.score,
          wave: defense.wave,
          kills: defense.kills,
          difficulty: defense.difficulty,
          maxCombo: defense.metrics.maxCombo,
          missedWords: defense.missedWords,
        },
      };
      persist({
        ...previous,
        runs: [...previous.runs, run].slice(-100),
        siegeCosmetics: recordCosmetics(
          normalizeCosmetics(
            previous.siegeCosmetics,
            previous.runs,
            previous.arcadeBests,
          ),
          defense,
        ),
        [bestKey]: {
          ...previous[bestKey],
          [defense.difficulty]: {
            score: Math.max(best?.score ?? 0, defense.score),
            wave: Math.max(best?.wave ?? 0, defense.wave),
          },
        },
      });
    },
    [persist],
  );
  function navigate(next: Tab) {
    if (next === "arcade") setArcadeVisited(true);
    setTab(next);
    setView("hub");
    setNotice("");
  }
  function brief(next: Mission) {
    setMission(next);
    setView("briefing");
    setNotice("");
    setResult(null);
  }
  function activate(next: Mission) {
    setMission(next);
    session.current = new TypingSession(next.text);
    finishGuard.current = false;
    setCursor(0);
    setMetrics(initialMetrics);
    setError(false);
    setFeedback({ id: 0, kind: "word", word: "" });
    setPaused(false);
    setView("playing");
  }
  function start() {
    activate(mission);
  }
  const saveCustomDraft = useCallback(
    (draft: CustomDraft) => persist({ ...saveRef.current, customDraft: draft }),
    [persist],
  );
  function startCustomPractice(draft: CustomDraft) {
    const text = prepareCustomText(draft.text);
    if (!text) return;
    activate({
      id: `custom-${crypto.randomUUID()}`,
      expedition: "custom",
      number: 1,
      title: draft.title.trim() || "My custom practice",
      type: "Custom practice",
      description: "Practice with your own text.",
      briefing:
        "Type your own passage. Enter moves to the next line. Case and punctuation count.",
      seconds: draft.seconds,
      keys: "Case · punctuation · paragraph breaks",
      text,
      reward: 50,
    });
  }
  const finish = useCallback(
    (success: boolean) => {
      const s = session.current;
      if (!s || finishGuard.current) return;
      finishGuard.current = true;
      const measured = s.metrics(performance.now());
      const timedPractice =
        mission.expedition === "practice" ||
        mission.expedition === "trial" ||
        (mission.expedition === "custom" && mission.seconds > 0);
      const completed = success || (timedPractice && s.events.length > 0);
      const xp = completed
        ? Math.round(
            mission.reward *
              (measured.accuracy / 100) ** 2 *
              (1 + measured.consistency / 200),
          )
        : 0;
      const run: Run = {
        id: crypto.randomUUID(),
        missionId: mission.id,
        title: mission.title,
        expedition: mission.expedition,
        mode: saveRef.current.settings.calm ? "calm" : "standard",
        date: new Date().toISOString(),
        completed,
        xp,
        metrics: measured,
        events: s.events,
      };
      persist({
        ...saveRef.current,
        runs: [...saveRef.current.runs, run].slice(-100),
      });
      setResult(run);
      setMetrics(measured);
      setView("debrief");
      if (saveRef.current.settings.sound)
        playTone(completed ? "complete" : "error", mission.expedition, {
          pack: saveRef.current.settings.soundPack,
          volume: saveRef.current.settings.soundVolume,
        });
    },
    [mission, persist],
  );
  function togglePause() {
    const s = session.current;
    if (!s) return;
    if (paused) {
      s.resume(performance.now());
      setPaused(false);
      setTimeout(() => input.current?.focus(), 0);
    } else {
      s.pause(performance.now());
      setPaused(true);
    }
  }
  useEffect(() => {
    if (view === "briefing") beginButton.current?.focus();
    if (view === "playing") input.current?.focus();
  }, [view]);
  useEffect(() => {
    if (view !== "playing") return;
    const timer = setInterval(() => {
      const s = session.current;
      if (!s) return;
      const m = s.metrics(performance.now());
      setMetrics(m);
      if (
        mission.seconds > 0 &&
        !settings.calm &&
        m.duration >= mission.seconds * 1000
      )
        finish(false);
    }, 100);
    const pause = () => {
      if (session.current && !finishGuard.current) {
        session.current.pause(performance.now());
        setPaused(true);
      }
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [view, mission.seconds, settings.calm, finish]);
  useEffect(() => {
    const shortcuts = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setTab("settings");
        setView("hub");
      }
      if (
        e.shiftKey &&
        e.key === "Enter" &&
        (view === "playing" || view === "debrief")
      ) {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  });
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 8000);
    return () => clearTimeout(t);
  }, [notice]);
  function processText(value: string, trusted: boolean, keyboardSound = false) {
    if (!trusted || paused || !session.current) return;
    for (const char of textCharacters(value)) {
      const response = session.current.press(char, performance.now());
      if (!response) break;
      setError(!response.correct);
      if (!response.correct || response.wordComplete) {
        const word =
          session.current.characters
            .slice(0, session.current.cursor)
            .join("")
            .trim()
            .split(/\s+/)
            .at(-1) ?? "";
        setFeedback((previous) => ({
          id: previous.id + 1,
          kind: response.correct ? "word" : "error",
          word: response.correct ? word : "",
        }));
      }
      if (settings.sound && !keyboardSound)
        playTone(
          !response.correct ? "error" : response.wordComplete ? "word" : "key",
          world.kind,
          {
            pack: settings.soundPack,
            volume: settings.soundVolume,
            character: char,
          },
        );
    }
    setCursor(session.current.cursor);
    setMetrics(session.current.metrics(performance.now()));
    if (session.current.complete) finish(true);
  }
  useEffect(() => {
    if (view !== "playing") return;
    const container = passage.current;
    const caret = container?.querySelector<HTMLElement>(".caret");
    if (container && caret) {
      if (
        caret.offsetTop + caret.offsetHeight >
        container.scrollTop + container.clientHeight - 15
      )
        container.scrollTop = Math.max(
          0,
          caret.offsetTop - container.clientHeight / 2,
        );
      else if (caret.offsetTop < container.scrollTop + 10)
        container.scrollTop = Math.max(0, caret.offsetTop - 10);
    }
  }, [cursor, view, settings.largeText]);
  function daily() {
    const day = utcDay();
    brief({
      id: `daily-${day}`,
      expedition: "daily",
      number: 1,
      title: "The Signal Must Get Through",
      type: "Daily expedition",
      description: "A new typing challenge each day.",
      briefing: `Everyone gets the same daily text. Try it as often as you like. Results save on this device. A new challenge starts at 00:00 UTC.`,
      seconds: 150,
      keys: "Letters · space",
      text: trainingText([], `daily-v1-${day}`, 65),
      reward: 150,
    });
  }
  function practice(kind: "practice" | "trial" | "coach" | "code") {
    if (kind === "coach" && !allEvents.length) {
      setNotice(
        "Complete a mission first so Tick can learn which keys need practice.",
      );
      return;
    }
    const timed = kind === "practice" || kind === "trial";
    const code =
      'const signal = await relay.connect();\nif (signal.ready) {\n  beacon.send("We are still here.");\n  return true;\n}';
    brief({
      id: `${kind}-${Date.now()}`,
      expedition: kind,
      number: 1,
      title:
        kind === "trial"
          ? "Recruitment Trial"
          : kind === "coach"
            ? "Weakness Hunt"
            : kind === "code"
              ? "The Signal Room"
              : "Field Notes",
      type:
        kind === "code"
          ? "Code practice"
          : timed
            ? "Timed practice"
            : "Adaptive practice",
      description: "Build speed and accuracy with regular practice.",
      briefing:
        kind === "trial"
          ? "Type for 60 seconds to measure your speed and accuracy. Your result will be saved for comparison."
          : kind === "coach"
            ? `Tick has prepared a route with extra practice for ${weak
                .slice(0, 3)
                .map((k) => k.key.toUpperCase())
                .join(", ")}. Accuracy first. Speed follows.`
            : kind === "code"
              ? "Restore the relay script. Capital letters, indentation, and punctuation count. Enter inserts a new line; Tab types two spaces."
              : "The timer starts when you begin typing. Your results are saved in Progress.",
      seconds: kind === "trial" ? 60 : timed ? practiceSeconds : 180,
      keys: kind === "code" ? "Case sensitive · symbols" : "Letters · space",
      text:
        kind === "code"
          ? code
          : trainingText(
              kind === "coach" ? weak.slice(0, 3).map((k) => k.key) : [],
              `${kind}-${Date.now()}`,
              timed ? 400 : 50,
            ),
      reward: 50,
    });
  }
  async function copyResults() {
    if (!result) return;
    const text = `KEYBOUND · ${result.title}\n${result.metrics.wpm} WPM · ${result.metrics.accuracy.toFixed(1)}% accuracy · ${result.metrics.maxCombo} clean word combo\n${result.completed ? "Signal restored." : "The next attempt starts here."}\n${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy results"), 2500);
    } catch {
      setNotice(
        "Clipboard access unavailable. Use Download card to save your result.",
      );
    }
  }
  function downloadCard() {
    if (!result) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#11191a";
    ctx.fillRect(0, 0, 1200, 630);
    ctx.strokeStyle = "#b8a06b";
    ctx.strokeRect(32, 32, 1136, 566);
    ctx.fillStyle = "#d7b77b";
    ctx.font = '600 22px "DM Sans", Arial, sans-serif';
    ctx.fillText("KEYBOUND / Typing results", 75, 100);
    ctx.fillStyle = "#eee9df";
    let titleSize = 46;
    ctx.font = `600 ${titleSize}px "DM Sans", Arial, sans-serif`;
    while (ctx.measureText(result.title).width > 1040 && titleSize > 24) {
      titleSize -= 2;
      ctx.font = `600 ${titleSize}px "DM Sans", Arial, sans-serif`;
    }
    ctx.fillText(result.title, 75, 210);
    ctx.font = '600 100px "DM Sans", Arial, sans-serif';
    ctx.fillText(`${result.metrics.wpm}`, 75, 365);
    ctx.fillText(`${result.metrics.accuracy.toFixed(1)}%`, 465, 365);
    ctx.fillStyle = "#a3ada7";
    ctx.font = '20px "DM Sans", Arial, sans-serif';
    ctx.fillText("Words per minute", 75, 410);
    ctx.fillText("Accuracy", 465, 410);
    ctx.fillText(
      result.completed
        ? "Session complete"
        : "Try again to improve your result.",
      75,
      515,
    );
    ctx.font = '18px "DM Sans", Arial, sans-serif';
    ctx.fillText("Free to play · keybound", 75, 555);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "keybound-field-report.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  function exportSave() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "keybound-field-journal.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function expeditionTile(e: (typeof expeditions)[number]) {
    const available = e.id === "coast" || e.id === "ascent" || e.id === "orbit";
    return (
      <button
        key={e.id}
        aria-label={`Expedition ${e.number}: ${e.name}. ${e.status}`}
        className={`expedition-tile ${selected === e.id ? "selected" : ""} ${!available ? "unavailable" : ""}`}
        onClick={() =>
          e.id === "orbit" ? navigate("arcade") : setSelected(e.id)
        }
        aria-pressed={e.id === "orbit" ? undefined : selected === e.id}
      >
        <div className={`tile-art art-${e.id} ${available ? "has-cover" : ""}`}>
          {e.id === "coast" || e.id === "ascent" || e.id === "orbit" ? (
            <GameCover kind={e.id} />
          ) : (
            <e.icon size={31} strokeWidth={1} />
          )}
          {!available && <LockKeyhole size={12} className="tile-lock" />}
        </div>
        <div className="tile-copy">
          <span className="tiny-label">
            {e.id === "orbit"
              ? "Arcade shooter"
              : available
                ? "Story adventure"
                : `Expedition ${e.number}`}
          </span>
          <h3>{e.name}</h3>
          <span className={`tile-status ${available ? "available" : ""}`}>
            <i />
            {e.id === "orbit"
              ? e.status
              : available
                ? `${missions.filter((m) => m.expedition === e.id && completedIds.has(m.id)).length} / ${e.status}`
                : e.status}
          </span>
          {available && (
            <span className="tile-open" aria-hidden="true">
              <ArrowUpRight size={18} />
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div
      className={`app ${settings.reducedMotion ? "reduce-motion" : ""} ${settings.highContrast ? "high-contrast" : ""} ${settings.largeText ? "large-text" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              navigate("expeditions");
            }}
            aria-label="Keybound home"
          >
            <span className="brand-mark">
              <Compass size={28} strokeWidth={1.3} />
            </span>
            <span>
              KEYBOUND<small>Typing games</small>
            </span>
          </a>
          <nav aria-label="Main navigation">
            {links.map((link) => (
              <button
                key={link.id}
                aria-label={link.label}
                className={`nav-item ${tab === link.id ? "active" : ""}`}
                onClick={() => navigate(link.id)}
              >
                <link.icon size={18} />
                <span>{link.label}</span>
                {link.id === "daily" && <i className="nav-dot" />}
                {tab === link.id && (
                  <ChevronRight size={14} className="nav-chevron" />
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button
            aria-label="Settings"
            className={`nav-item ${tab === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={18} />
            <span>Settings</span> <span className="shortcut">⌘ ,</span>
          </button>
          <div className="profile" aria-label="Guest profile">
            <span className="avatar">
              <Compass size={21} />
            </span>
            <span>
              Unknown courier
              <small>
                {rank(totalXp)} · {totalXp.toLocaleString()} XP
              </small>
            </span>
            <span className="guest-badge">Guest</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>
              {view === "playing"
                ? mission.title
                : view === "briefing"
                  ? "Mission briefing"
                  : view === "debrief"
                    ? "Results"
                    : tab === "settings"
                      ? "Settings"
                      : links.find((link) => link.id === tab)?.label}
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="quick-practice"
              onClick={() => practice("trial")}
            >
              <Keyboard size={16} /> 60-second test
            </button>
            <span className="mobile-identity">
              <strong>Unknown courier</strong>
              <small>Guest · {totalXp.toLocaleString()} XP</small>
            </span>
            <button
              className={`icon-button ${settings.sound ? "enabled" : ""}`}
              aria-label={settings.sound ? "Mute sound" : "Enable sound"}
              onClick={() => {
                updateSettings({ sound: !settings.sound });
                if (!settings.sound)
                  playTone("word", world.kind, {
                    pack: settings.soundPack,
                    volume: settings.soundVolume,
                  });
                else stopSounds();
              }}
            >
              <Headphones size={18} />
            </button>
          </div>
        </header>
        <main
          id="main"
          className={view === "playing" ? "main game-main" : "main"}
        >
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                className="icon-button"
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {loaded &&
            arcadeInProgress &&
            !(tab === "arcade" && view === "hub") && (
              <div className="siege-return-banner">
                <span>Your Signal Siege run is paused.</span>
                <button
                  className="text-button"
                  onClick={() => navigate("arcade")}
                >
                  Return to paused run
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          {loaded && arcadeVisited && (
            <div hidden={tab !== "arcade" || view !== "hub"}>
              <SignalSiege
                active={tab === "arcade" && view === "hub"}
                settings={settings}
                recentRuns={save.runs}
                cosmetics={normalizeCosmetics(
                  save.siegeCosmetics,
                  save.runs,
                  save.arcadeBests,
                )}
                onCosmeticChange={(selection) =>
                  persist({
                    ...saveRef.current,
                    siegeCosmetics: normalizeCosmetics(
                      {
                        ...normalizeCosmetics(
                          saveRef.current.siegeCosmetics,
                          saveRef.current.runs,
                          saveRef.current.arcadeBests,
                        ),
                        selection,
                      },
                      saveRef.current.runs,
                      saveRef.current.arcadeBests,
                    ),
                  })
                }
                initialDifficulty={save.siegeDifficulty ?? "standard"}
                initialMode={save.siegeMode ?? "endless"}
                timedBests={save.timedArcadeBests ?? {}}
                onModeChange={(siegeMode) =>
                  persist({ ...saveRef.current, siegeMode })
                }
                bests={save.arcadeBests ?? {}}
                onDifficultyChange={(siegeDifficulty) =>
                  persist({ ...saveRef.current, siegeDifficulty })
                }
                onRunStateChange={setArcadeInProgress}
                onPracticeWords={(words) =>
                  startCustomPractice({
                    title: "Signal Siege: missed words",
                    text: words.join(" "),
                    seconds: 0,
                  })
                }
                onFinish={recordSiege}
              />
            </div>
          )}
          {!loaded ? (
            <div className="loading">
              <Compass className="loading-compass" />
              <p>Loading your progress…</p>
            </div>
          ) : view === "briefing" ? (
            <section
              className={`briefing page-enter briefing-world-${world.kind}`}
            >
              <button className="text-button" onClick={() => setView("hub")}>
                <ArrowLeft size={15} /> Back to games
              </button>
              <div className="briefing-grid">
                <div className="briefing-art">
                  {world.kind === "coast" || world.kind === "ascent" ? (
                    <Scene kind={world.kind} />
                  ) : (
                    <ModeWorld
                      kind={world.kind}
                      metrics={initialMetrics}
                      cursor={0}
                      feedback={{ id: 0, kind: "word", word: "" }}
                      paused={false}
                      reducedMotion={settings.reducedMotion}
                      targets={targetKeys}
                      highContrast={settings.highContrast}
                    />
                  )}
                  <div className="art-caption">
                    <span className="eyebrow">Mission briefing</span>
                    <h2>{mission.title}</h2>
                  </div>
                </div>
                <div className="briefing-copy">
                  <span className="eyebrow">
                    {mission.type} /{" "}
                    {settings.calm ? "Calm mode" : "Standard mode"}
                  </span>
                  <h1>Before you start</h1>
                  <div className="radio-message">
                    <span>
                      <Radio size={15} />{" "}
                      {mission.expedition === "coach"
                        ? "Tick · field terminal"
                        : "Mara · guild frequency"}
                    </span>
                    <p>“{mission.briefing}”</p>
                  </div>
                  <div className="briefing-facts">
                    <span>
                      <Timer size={16} />
                      {untimed
                        ? "No time pressure"
                        : `${mission.seconds} second window`}
                    </span>
                    <span>
                      <Keyboard size={16} />
                      {mission.keys}
                    </span>
                    <span>
                      <ShieldCheck size={16} />
                      No account needed
                    </span>
                  </div>
                  <button
                    className="button primary"
                    ref={beginButton}
                    onClick={start}
                  >
                    <Play size={16} fill="currentColor" /> Begin mission{" "}
                    <kbd>↵</kbd>
                  </button>
                  <p className="small-muted">
                    Type the displayed text exactly. Mistakes stop the cursor.
                    Esc pauses.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => updateSettings({ calm: !settings.calm })}
                  >
                    {settings.calm
                      ? "Switch to Standard mode"
                      : "Prefer no timer? Switch to Calm mode"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </section>
          ) : view === "playing" ? (
            <section
              className={`game-view game-world-${world.kind} ${error ? "has-error" : ""} ${metrics.flow >= 80 ? "in-flow" : ""} ${paused ? "world-paused" : ""}`}
            >
              {(world.kind === "coast" || world.kind === "ascent") && (
                <Scene
                  kind={world.kind}
                  progress={metrics.progress}
                  flow={metrics.flow}
                />
              )}
              <ModeWorld
                key={mission.id}
                kind={world.kind}
                metrics={metrics}
                cursor={cursor}
                feedback={feedback}
                paused={paused}
                reducedMotion={settings.reducedMotion}
                targets={targetKeys}
                highContrast={settings.highContrast}
              />
              <ModeFeedback
                expedition={mission.expedition}
                metrics={metrics}
                feedback={feedback}
                targets={targetKeys}
              />
              <div className="game-top">
                <div>
                  <span className="eyebrow">{mission.type}</span>
                  <h2>{mission.title}</h2>
                </div>
                <button className="button ghost" onClick={togglePause}>
                  <Pause size={15} />
                  Pause <kbd>Esc</kbd>
                </button>
              </div>
              <div className="game-stats">
                <div>
                  <strong>{metrics.wpm}</strong>
                  <span>WPM</span>
                </div>
                <div>
                  <strong>
                    {metrics.accuracy.toFixed(1)}
                    <small>%</small>
                  </strong>
                  <span>Accuracy</span>
                </div>
                <div>
                  <strong>
                    {untimed
                      ? "∞"
                      : duration(
                          Math.max(
                            0,
                            mission.seconds * 1000 - metrics.duration,
                          ),
                        )}
                  </strong>
                  <span>{untimed ? "No time limit" : "Time left"}</span>
                </div>
              </div>
              <div className="world-status">
                <i />
                {worldStatus(mission.expedition, metrics.progress, error)}
              </div>
              <div
                className={`terminal ${focused ? "terminal-focused" : ""}`}
                onClick={() => input.current?.focus()}
              >
                <div className="terminal-top">
                  <span>
                    <Radio size={14} /> {world.label} <i /> Ch. 07
                  </span>
                  <span>
                    {metrics.combo >= 3
                      ? `${metrics.combo} CLEAN WORD COMBO`
                      : "Typing input ready"}
                  </span>
                </div>
                <div
                  ref={passage}
                  className="typing-passage"
                  aria-hidden="true"
                >
                  {visibleCharacters.map((char, index) => {
                    const i = index + displayStart;
                    return (
                      <span
                        key={i}
                        className={`${i < cursor ? "typed" : ""} ${i === cursor ? "caret" : ""} ${i === cursor && error ? "wrong" : ""}`}
                      >
                        {char === "\n" ? (
                          <>
                            <span className="newline">↵</span>
                            <br />
                          </>
                        ) : (
                          char
                        )}
                      </span>
                    );
                  })}
                </div>
                <textarea
                  ref={input}
                  className="typing-input"
                  aria-label="Type the mission transmission"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onFocus={() => setFocused(true)}
                  onBlur={() => {
                    setFocused(false);
                    heldSoundKeys.current.clear();
                    physicalInput.current = false;
                  }}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onCompositionStart={() => {
                    composing.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    composing.current = false;
                    processText(e.currentTarget.value, e.nativeEvent.isTrusted);
                    e.currentTarget.value = "";
                  }}
                  onInput={(e) => {
                    const native = e.nativeEvent as InputEvent;
                    if (composing.current || native.isComposing) return;
                    if (
                      [
                        "insertFromPaste",
                        "insertFromDrop",
                        "insertReplacementText",
                      ].includes(native.inputType)
                    ) {
                      e.currentTarget.value = "";
                      return;
                    }
                    processText(
                      e.currentTarget.value,
                      native.isTrusted,
                      physicalInput.current,
                    );
                    physicalInput.current = false;
                    e.currentTarget.value = "";
                  }}
                  onKeyUp={(e) => {
                    if (
                      e.nativeEvent.isTrusted &&
                      heldSoundKeys.current.delete(e.code) &&
                      settings.sound &&
                      !paused
                    )
                      playKeyboardSound("up", e.code, {
                        pack: settings.soundPack,
                        volume: settings.soundVolume,
                      });
                  }}
                  onKeyDown={(e) => {
                    physicalInput.current = false;
                    if (
                      e.nativeEvent.isTrusted &&
                      settings.sound &&
                      !paused &&
                      e.code &&
                      e.code !== "Unidentified" &&
                      e.key !== "Process" &&
                      !e.nativeEvent.isComposing &&
                      e.key !== "Escape" &&
                      !e.metaKey &&
                      !e.ctrlKey
                    ) {
                      if (e.repeat)
                        physicalInput.current = heldSoundKeys.current.has(
                          e.code,
                        );
                      else {
                        physicalInput.current = playKeyboardSound(
                          "down",
                          e.code,
                          {
                            pack: settings.soundPack,
                            volume: settings.soundVolume,
                          },
                        );
                        if (physicalInput.current)
                          heldSoundKeys.current.add(e.code);
                      }
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      togglePause();
                    } else if (e.key === "Backspace") {
                      e.preventDefault();
                      if (error) setError(false);
                      else {
                        session.current?.backspace();
                        setCursor(session.current?.cursor ?? 0);
                      }
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      processText(
                        "\n",
                        e.nativeEvent.isTrusted,
                        physicalInput.current,
                      );
                    } else if (
                      e.key === "Tab" &&
                      (mission.expedition === "code" ||
                        (mission.expedition === "custom" &&
                          missionCharacters
                            .slice(cursor, cursor + 2)
                            .join("") === "  ")) &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();
                      processText(
                        "  ",
                        e.nativeEvent.isTrusted,
                        physicalInput.current,
                      );
                    }
                  }}
                />
                <div className="terminal-bottom">
                  <span className={error ? "error-label" : ""}>
                    {error
                      ? "Incorrect key — type the underlined character to continue."
                      : metrics.duration === 0
                        ? "Start typing to begin the timer."
                        : !focused
                          ? "Click the terminal to continue typing."
                          : "Type the highlighted character to continue."}
                  </span>
                  <span>{Math.round(metrics.progress * 100)}% complete</span>
                </div>
                <div className="transmission-progress">
                  <i style={{ width: `${metrics.progress * 100}%` }} />
                </div>
              </div>
              <div className="flow-line">
                <span>
                  <Wind size={15} /> Flow {metrics.flow}%
                </span>
                <div>
                  <i style={{ width: `${metrics.flow}%` }} />
                </div>
                <span>
                  {metrics.flow >= 80 ? "In the flow" : "Keep a steady pace"}
                </span>
              </div>
              {paused && (
                <PauseDialog
                  onResume={togglePause}
                  onRestart={start}
                  onQuit={() => {
                    setPaused(false);
                    setView("hub");
                  }}
                />
              )}
            </section>
          ) : view === "debrief" && result ? (
            <section className="debrief page-enter">
              <div className="debrief-heading">
                <span className="success-mark">
                  {result.completed ? (
                    <Flag size={29} />
                  ) : (
                    <Compass size={29} />
                  )}
                </span>
                <span className="eyebrow">Field report / {result.title}</span>
                <h1>{result.completed ? "Session complete" : "Time’s up"}</h1>
                <p>
                  {result.completed
                    ? "Your result has been saved on this device."
                    : "Try again, or turn on Calm mode to practice without a time limit."}
                </p>
                <span className="xp-pill">+{result.xp} XP</span>
              </div>
              <div className="result-stats">
                <div>
                  <Zap />
                  <strong>{result.metrics.wpm}</strong>
                  <span>Words per minute</span>
                </div>
                <div>
                  <Target />
                  <strong>
                    {result.metrics.accuracy.toFixed(1)}
                    <small>%</small>
                  </strong>
                  <span>Accuracy</span>
                </div>
                <div>
                  <Wind />
                  <strong>
                    {result.metrics.consistency}
                    <small>%</small>
                  </strong>
                  <span>Rhythm consistency</span>
                </div>
                <div>
                  <Sparkles />
                  <strong>
                    {result.metrics.maxCombo}
                    <small>×</small>
                  </strong>
                  <span>Best clean word combo</span>
                </div>
              </div>
              <div className="debrief-details">
                <div>
                  <span className="eyebrow">Tick's field notes</span>
                  <h3>What to practice next</h3>
                  <p>
                    {weakKeys(result.events).some((k) => k.errors)
                      ? "These keys caused the most mistakes. Use Weakness Hunt for focused practice."
                      : "You finished without mistakes. Try another session at a comfortable pace."}
                  </p>
                  <div className="weak-key-list">
                    {weakKeys(result.events)
                      .slice(0, 3)
                      .map((k) => (
                        <span key={k.key}>
                          <kbd>{k.key.toUpperCase()}</kbd>
                          <span>
                            {k.errors} errors
                            <small>{k.latency} ms average</small>
                          </span>
                        </span>
                      ))}
                  </div>
                </div>
                <div className="report-summary">
                  <span>
                    Time in the field
                    <strong>{duration(result.metrics.duration)}</strong>
                  </span>
                  <span>
                    Transmission sent
                    <strong>
                      {Math.round(result.metrics.progress * 100)}%
                    </strong>
                  </span>
                  <span>
                    Difficulty<strong>{result.mode}</strong>
                  </span>
                  <span>
                    Result storage<strong>This device</strong>
                  </span>
                </div>
              </div>
              <div className="debrief-actions">
                <button
                  className="button primary"
                  onClick={() => {
                    const next = missions.find(
                      (m) =>
                        m.expedition === mission.expedition &&
                        m.number === mission.number + 1,
                    );
                    if (next && result.completed) brief(next);
                    else setView("hub");
                  }}
                >
                  {missions.some(
                    (m) =>
                      m.expedition === mission.expedition &&
                      m.number === mission.number + 1,
                  ) && result.completed
                    ? "Next mission"
                    : mission.expedition === "custom"
                      ? "Back to my text"
                      : "Return to games"}
                  <ArrowRight size={16} />
                </button>
                <button className="button ghost" onClick={start}>
                  <RotateCcw size={15} />
                  Try again
                </button>
                <button className="button ghost" onClick={copyResults}>
                  <Copy size={15} />
                  {copyLabel}
                </button>
                <button className="button ghost" onClick={downloadCard}>
                  <ArrowDownToLine size={15} />
                  Download card
                </button>
              </div>
            </section>
          ) : (
            <>
              {tab === "expeditions" && (
                <div className="page-enter">
                  <div className="page-heading">
                    <div>
                      <h1>Games &amp; practice</h1>
                      <p>
                        Defend your ship in Signal Siege, explore a story, or
                        practice with your own words.
                      </p>
                    </div>
                  </div>
                  <div className="expedition-layout">
                    <section
                      className="arcade-feature"
                      aria-labelledby="home-siege-title"
                    >
                      <GameCover
                        kind="orbit"
                        eager
                        sizes="(max-width: 760px) 90vw, (max-width: 950px) 55vw, 65vw"
                      />
                      <span className="feature-label">
                        <Rocket size={15} /> Featured game
                      </span>
                      <div className="arcade-feature-copy">
                        <h2 id="home-siege-title">Signal Siege</h2>
                        <p>
                          Type enemy words. Destroy incoming ships. See how long
                          you can survive, or race the 60-second clock.
                        </p>
                        <div className="feature-meta">
                          <span>
                            <ShieldCheck size={15} /> Three difficulties
                          </span>
                          <span>
                            <Zap size={15} /> Endless & 60-second modes
                          </span>
                        </div>
                        <button
                          className="button primary"
                          onClick={() => navigate("arcade")}
                        >
                          <Play size={15} fill="currentColor" />
                          {arcadeInProgress ? "Continue run" : "Play now"}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </section>
                    <section className="hero-card">
                      <GameCover
                        kind={selected === "ascent" ? "ascent" : "coast"}
                        eager
                        sizes="(max-width: 760px) 90vw, 35vw"
                      />
                      <div className="hero-top">
                        <span className="glass-tag">
                          <i />
                          {selected === "coast"
                            ? "Expedition 01"
                            : selected === "ascent"
                              ? "Expedition 02"
                              : "Uncharted territory"}
                        </span>
                      </div>
                      <div className="hero-content">
                        <h2>{current.name}</h2>
                        <p>
                          {selected === "coast"
                            ? "Guide a ship home by typing lighthouse messages."
                            : selected === "ascent"
                              ? "Climb the mountain and restore the weather station."
                              : current.subtitle}
                        </p>
                        {["coast", "ascent"].includes(selected) ? (
                          <>
                            <div className="hero-meta">
                              <span>
                                <Keyboard size={14} />
                                {selected === "coast"
                                  ? "Home row practice"
                                  : "Top row practice"}
                              </span>
                              <span>
                                <Timer size={14} />
                                2–3 min / mission
                              </span>
                            </div>
                            <button
                              className="button primary"
                              onClick={() =>
                                brief(
                                  missions.find(
                                    (m) =>
                                      m.expedition === selected &&
                                      !completedIds.has(m.id),
                                  ) ??
                                    missions.find(
                                      (m) => m.expedition === selected,
                                    )!,
                                )
                              }
                            >
                              <Play size={14} fill="currentColor" />
                              {completedIds.has(
                                missions.find((m) => m.expedition === selected)!
                                  .id,
                              )
                                ? "Continue expedition"
                                : "Begin expedition"}
                              <ArrowRight size={17} />
                            </button>
                          </>
                        ) : (
                          <span className="coming-soon">
                            <LockKeyhole size={15} />
                            This expedition is in development.
                          </span>
                        )}
                      </div>
                    </section>
                  </div>
                  <div className="section-heading">
                    <h2>Choose a game</h2>
                    <span>{completed} / 16 missions completed</span>
                  </div>
                  <div className="expedition-grid">
                    {expeditions
                      .filter(
                        (e) =>
                          e.id === "coast" ||
                          e.id === "ascent" ||
                          e.id === "orbit",
                      )
                      .map(expeditionTile)}
                  </div>
                  <details className="upcoming-expeditions">
                    <summary>
                      Upcoming chapters <ChevronRight size={16} />
                    </summary>
                    <div className="expedition-grid">
                      {expeditions
                        .filter(
                          (e) =>
                            e.id !== "coast" &&
                            e.id !== "ascent" &&
                            e.id !== "orbit",
                        )
                        .map(expeditionTile)}
                    </div>
                  </details>
                  <div className="bottom-grid">
                    <section className="mission-board">
                      <div className="section-heading">
                        <h2>
                          Missions <span>{current.name}</span>
                        </h2>
                      </div>
                      {missions
                        .filter((m) => m.expedition === selected)
                        .map((m) => (
                          <button
                            className="mission-row"
                            key={m.id}
                            onClick={() => brief(m)}
                          >
                            <span
                              className={`mission-number ${completedIds.has(m.id) ? "done" : ""}`}
                            >
                              {completedIds.has(m.id) ? (
                                <Check size={15} />
                              ) : (
                                String(m.number).padStart(2, "0")
                              )}
                            </span>
                            <span className="mission-title">
                              {m.title}
                              <small>
                                {m.type} · {m.keys}
                              </small>
                            </span>
                            <span className="mission-time">
                              {Math.round(m.seconds / 60)} MIN
                            </span>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                      {!["coast", "ascent"].includes(selected) && (
                        <div className="empty-state">
                          <current.icon size={30} />
                          <h3>This chapter is in development</h3>
                          <p>
                            This chapter is in development. The coast and the
                            mountains are ready to explore.
                          </p>
                        </div>
                      )}
                    </section>
                    <div className="home-tools">
                      <aside className="dispatch-card">
                        <span className="daily-symbol">
                          <Radio size={43} strokeWidth={1} />
                          <i />
                          <b />
                        </span>
                        <h2>Daily challenge</h2>
                        <p>A new passage every day. See how you do.</p>
                        <div className="daily-tags">
                          <span>
                            <Timer size={12} />
                            150 seconds
                          </span>
                        </div>
                        <button className="button secondary" onClick={daily}>
                          Play challenge
                          <ArrowRight size={16} />
                        </button>
                      </aside>
                      <aside className="coach-card">
                        <h3>
                          {save.runs.length
                            ? "Work on difficult keys"
                            : "Check your typing speed"}
                        </h3>
                        <p>
                          {save.runs.length
                            ? "Practice the keys you miss most often."
                            : "Get your WPM and accuracy in a 60-second test."}
                        </p>
                        <button
                          className="text-button"
                          onClick={() =>
                            practice(save.runs.length ? "coach" : "trial")
                          }
                        >
                          {save.runs.length
                            ? "Practice difficult keys"
                            : "Start 60-second test"}
                          <ArrowRight size={15} />
                        </button>
                      </aside>
                    </div>
                  </div>
                </div>
              )}
              {tab === "daily" && (
                <section className="page-enter">
                  <PageHeading
                    title="Daily typing challenge"
                    text="Everyone gets the same text each day. Play without an account."
                  />
                  <div className="daily-feature">
                    <ModeWorld
                      kind="daily"
                      metrics={initialMetrics}
                      cursor={0}
                      feedback={{ id: 0, kind: "word", word: "" }}
                      paused={false}
                      reducedMotion={settings.reducedMotion}
                      targets={targetKeys}
                      highContrast={settings.highContrast}
                    />
                    <div>
                      <span className="eyebrow">
                        {today} / RESETS AT 00:00 UTC
                      </span>
                      <h2>Today’s challenge</h2>
                      <p>
                        Type 65 words before the timer runs out. You can retry
                        as often as you like.
                      </p>
                      <button className="button primary" onClick={daily}>
                        Play today's expedition
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="section-heading">
                    <h2>Your daily results</h2>
                    <span>Local results · unranked</span>
                  </div>
                  <RunList
                    runs={save.runs
                      .filter((r) => r.expedition === "daily")
                      .slice(-10)
                      .reverse()}
                  />
                </section>
              )}
              {tab === "custom" && (
                <section className="page-enter">
                  <PageHeading
                    title="Practice your own text"
                    text="Create a typing practice from any sentence, paragraph, or passage."
                  />
                  <CustomPractice
                    initial={save.customDraft}
                    onSave={saveCustomDraft}
                    onStart={startCustomPractice}
                    calm={settings.calm}
                  />
                </section>
              )}
              {tab === "training" && (
                <section className="page-enter">
                  <PageHeading
                    title="Typing practice"
                    text="Choose a timed session, practice code, or work on difficult keys."
                  />
                  <div className="custom-practice-banner">
                    <Feather size={25} />
                    <div>
                      <h2>Use your own text</h2>
                      <p>
                        Create a practice with your own sentences or paragraphs.
                      </p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => navigate("custom")}
                    >
                      Create your own practice
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="siege-discovery">
                    <Rocket size={27} />
                    <div>
                      <span className="eyebrow">Low orbit / live arcade</span>
                      <h2>Try the typing shooter</h2>
                      <p>
                        Type enemy words to fire. Survive waves, break shields,
                        and protect the last relay.
                      </p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => navigate("arcade")}
                    >
                      Play Signal Siege
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="training-grid">
                    <div className="training-card">
                      <Target />
                      <span className="eyebrow">Personalized practice</span>
                      <h2>Weakness Hunt</h2>
                      <p>Practice the keys that cause you the most mistakes.</p>
                      <div className="key-pills">
                        {weak.length ? (
                          weak
                            .slice(0, 3)
                            .map((k) => (
                              <kbd key={k.key}>{k.key.toUpperCase()}</kbd>
                            ))
                        ) : (
                          <span>
                            Complete a mission to reveal your key map.
                          </span>
                        )}
                      </div>
                      <button
                        className="button primary"
                        onClick={() => practice("coach")}
                      >
                        Train with Tick
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className="training-card">
                      <Keyboard />
                      <span className="eyebrow">Free practice</span>
                      <h2>Field Notes</h2>
                      <p>
                        Choose a duration and practice common words. The timer
                        starts when you begin typing.
                      </p>
                      <div
                        className="duration-options"
                        aria-label="Practice duration"
                      >
                        {[15, 30, 60, 120].map((s) => (
                          <button
                            key={s}
                            aria-pressed={practiceSeconds === s}
                            className={practiceSeconds === s ? "selected" : ""}
                            onClick={() => setPracticeSeconds(s)}
                          >
                            {s}s
                          </button>
                        ))}
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => practice("practice")}
                      >
                        Open field notes
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className="training-card">
                      <Radio />
                      <span className="eyebrow">Code practice</span>
                      <h2>Signal Room</h2>
                      <p>
                        Practice a JavaScript snippet, including brackets,
                        capital letters, and punctuation.
                      </p>
                      <pre>
                        if (signal.ready) {"{"}
                        <br /> beacon.send("hello");
                        <br />
                        {"}"}
                      </pre>
                      <button
                        className="button secondary"
                        onClick={() => practice("code")}
                      >
                        Enter the signal room
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className="trial-banner">
                      <Compass size={30} />
                      <div>
                        <h3>Check your typing speed</h3>
                        <p>
                          Take a 60-second test to measure your speed and
                          accuracy.
                        </p>
                      </div>
                      <button
                        className="button ghost"
                        onClick={() => practice("trial")}
                      >
                        Take the trial
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
              {tab === "journal" && (
                <section className="page-enter">
                  <PageHeading
                    title="Your results"
                    text="Review your speed, accuracy, and recent sessions."
                  />
                  <div className="journal-stats">
                    <Stat
                      label="Missions completed"
                      value={String(completed)}
                    />
                    <Stat
                      label="Average WPM"
                      value={stats ? String(stats.wpm) : "—"}
                    />
                    <Stat
                      label="Average accuracy"
                      value={stats ? `${stats.accuracy}%` : "—"}
                    />
                    <Stat label="Total XP" value={`${totalXp} XP`} />
                  </div>
                  <section className="heatmap-panel">
                    <div className="section-heading">
                      <h2>Mistakes by key</h2>
                      <span>Error rate · brighter means more practice</span>
                    </div>
                    {["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"].map(
                      (row, i) => (
                        <div
                          className="keyboard-row"
                          key={row}
                          style={{ paddingLeft: i * 14 }}
                        >
                          {row.split("").map((k) => {
                            const s = weak.find((w) => w.key === k);
                            return (
                              <span
                                className={`heatmap-key ${s ? "has-data" : ""}`}
                                style={
                                  s
                                    ? {
                                        background: `rgba(215,175,103,${0.07 + Math.min(0.7, s.errors / Math.max(1, s.hits + s.errors))})`,
                                      }
                                    : undefined
                                }
                                key={k}
                                title={
                                  s
                                    ? `${k}: ${s.errors} errors / ${s.hits + s.errors} attempts, ${s.latency} ms average`
                                    : `${k}: No samples yet`
                                }
                              >
                                {k}
                                <small>{s ? s.errors : "·"}</small>
                              </span>
                            );
                          })}
                        </div>
                      ),
                    )}
                    <p className="small-muted">
                      QWERTY reference · Measured characters work with your
                      physical keyboard layout.
                    </p>
                  </section>
                  <div className="section-heading">
                    <h2>Recent field reports</h2>
                    <button className="text-button" onClick={exportSave}>
                      <ArrowDownToLine size={14} />
                      Export progress
                    </button>
                  </div>
                  <RunList runs={save.runs.slice(-20).reverse()} />
                </section>
              )}
              {tab === "settings" && (
                <section className="settings-page page-enter">
                  <PageHeading
                    title="Settings"
                    text="Settings and progress are saved only in this browser."
                  />
                  <div className="settings-panel">
                    <h2>Gameplay</h2>
                    <Toggle
                      label="Calm mode"
                      description="Remove time limits in story missions and practice. Signal Siege has its own difficulty settings."
                      checked={settings.calm}
                      onChange={() => updateSettings({ calm: !settings.calm })}
                    />
                    <Toggle
                      label="Terminal sound"
                      description="Enable keyboard audio, mission feedback, and combat effects."
                      checked={settings.sound}
                      onChange={() =>
                        updateSettings({ sound: !settings.sound })
                      }
                    />
                    {settings.sound && (
                      <SoundSettings
                        settings={settings}
                        onChange={updateSettings}
                      />
                    )}
                    <AppearanceSettings
                      settings={settings}
                      onChange={updateSettings}
                    />
                    <h2>Comfort & accessibility</h2>
                    <Toggle
                      label="Reduce motion"
                      description="Disable rain, beam movement, and interface transitions. System preferences are also respected."
                      checked={settings.reducedMotion}
                      onChange={() =>
                        updateSettings({
                          reducedMotion: !settings.reducedMotion,
                        })
                      }
                    />
                    <Toggle
                      label="High contrast"
                      description="Clearer text and stronger interface boundaries."
                      checked={settings.highContrast}
                      onChange={() =>
                        updateSettings({ highContrast: !settings.highContrast })
                      }
                    />
                    <Toggle
                      label="Larger typing text"
                      description="Enlarge typing passages and Signal Siege enemy words."
                      checked={settings.largeText}
                      onChange={() =>
                        updateSettings({ largeText: !settings.largeText })
                      }
                    />
                    <h2>Your data</h2>
                    <p className="settings-description">
                      Your last 100 sessions, settings, and drafts are saved in
                      this browser. No account is needed. Clearing browser data
                      removes this progress, so export a copy if you want to
                      keep it.
                    </p>
                    <div className="data-actions">
                      <button className="button ghost" onClick={exportSave}>
                        <ArrowDownToLine size={15} />
                        Export my data
                      </button>
                      <button
                        className="button ghost danger"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 size={15} />
                        Delete local progress
                      </button>
                    </div>
                    {confirmDelete && (
                      <div className="delete-confirm" role="alert">
                        <p>
                          Delete all runs, XP, and settings from this device?
                          This cannot be undone.
                        </p>
                        <button
                          className="button danger"
                          onClick={async () => {
                            try {
                              await clearProgress();
                              setArcadeVisited(false);
                              setArcadeInProgress(false);
                              setSave({
                                version: 1,
                                runs: [],
                                settings: defaultSettings,
                              });
                              setConfirmDelete(false);
                              setNotice(
                                "Your local progress has been deleted.",
                              );
                            } catch {
                              setNotice(
                                "Browser storage could not be cleared. Try again or clear site data in your browser.",
                              );
                            }
                          }}
                        >
                          Delete everything
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setConfirmDelete(false)}
                        >
                          Keep my progress
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="small-muted">
                    KEYBOUND is free to play. Progress is saved in this browser.
                    Export a copy above if you want to keep a backup.
                  </p>
                </section>
              )}
            </>
          )}
          {view !== "playing" && (
            <footer className="footer">
              <span className="footer-brand">KEYBOUND</span>
              <p className="footer-credit">
                Developed and maintained by{" "}
                <a
                  href="https://github.com/vijayanand1505"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Vijay Anand
                </a>
              </p>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}
function PageHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="setting-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <button
        type="button"
        className={`toggle ${checked ? "on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
      >
        <i />
      </button>
    </div>
  );
}
function RunList({ runs }: { runs: Run[] }) {
  return runs.length ? (
    <div className="run-list">
      {runs.map((r) => (
        <div className="run-row" key={r.id}>
          <span className={`run-icon ${r.completed ? "done" : ""}`}>
            {r.completed ? <Flag size={17} /> : <Compass size={17} />}
          </span>
          <span className="run-title">
            {r.title}
            <small>
              {new Date(r.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              · {r.mode} ·{" "}
              {r.arcade
                ? `Wave ${r.arcade.wave} · ${r.arcade.score.toLocaleString()} points`
                : r.completed
                  ? "Completed"
                  : "Attempt"}
            </small>
          </span>
          <span>
            <strong>{r.metrics.wpm}</strong> WPM
          </span>
          <span>{r.metrics.accuracy.toFixed(1)}%</span>
          <span className="run-xp">+{r.xp} XP</span>
        </div>
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <Map size={30} />
      <h3>No results yet</h3>
      <p>Complete a session to see your results here.</p>
    </div>
  );
}

function PauseDialog({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="pause-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onResume();
      }}
      aria-labelledby="pause-title"
    >
      <div className="pause-card">
        <span className="eyebrow">Paused</span>
        <h2 id="pause-title">Mission paused</h2>
        <p>Your progress and timer are paused.</p>
        <button className="button primary" autoFocus onClick={onResume}>
          <Play size={16} />
          Resume mission
        </button>
        <button className="button ghost" onClick={onRestart}>
          <RotateCcw size={16} />
          Start again
        </button>
        <button className="text-button" onClick={onQuit}>
          Return to games
        </button>
      </div>
    </dialog>
  );
}
