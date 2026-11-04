"use client";
import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Check,
  Headphones,
  Play,
  Square,
  Volume2,
} from "lucide-react";
import { previewSound, setSoundVolume, stopSounds } from "@/game/audio";
import {
  previewCombatSounds,
  setCombatVolume,
  stopCombatSounds,
} from "@/game/combat-audio";
import { soundPacks, type SoundPackId } from "@/game/sounds";
import type { Settings } from "@/game/storage";
export default function SoundSettings({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [previewError, setPreviewError] = useState("");
  const [playing, setPlaying] = useState<SoundPackId | null>(null);
  const [volume, setVolume] = useState(settings.soundVolume);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      cancel.current?.();
      stopCombatSounds();
    },
    [],
  );
  useEffect(() => {
    setVolume(settings.soundVolume);
    setSoundVolume(settings.soundVolume);
  }, [settings.soundVolume]);
  useEffect(() => {
    cancel.current?.();
    setPlaying(null);
  }, [settings.soundPack, settings.sound]);
  function preview(pack: SoundPackId) {
    if (playing === pack) {
      cancel.current?.();
      setPlaying(null);
      return;
    }
    cancel.current?.();
    setPreviewError("");
    setPlaying(pack);
    cancel.current = previewSound(
      pack,
      volume,
      () => setPlaying(null),
      () => {
        setPlaying(null);
        setPreviewError("Audio could not load. Please try Preview again.");
      },
    );
  }
  function commitVolume(value: string) {
    const next = Number(value);
    if (next !== settings.soundVolume) onChange({ soundVolume: next });
  }
  return (
    <section className="sound-studio" aria-labelledby="sound-studio-title">
      <div className="sound-studio-heading">
        <span className="sound-studio-icon">
          <Headphones size={22} />
        </span>
        <div>
          <span className="eyebrow">Keyboard audio</span>
          <h3 id="sound-studio-title">Keyboard sounds</h3>
        </div>
        <span className="sound-pack-count">{soundPacks.length} Free packs</span>
      </div>
      <p className="sound-intro">
        Choose a sound and use Preview to hear it. MechKeys Tactile and Classic
        use recorded keyboard sounds; Clicky, Linear, and Typewriter are
        synthesized.
      </p>
      <fieldset className="sound-packs">
        <legend className="visually-hidden">Keyboard sound pack</legend>
        {soundPacks.map((pack, index) => (
          <div
            className={`sound-pack ${settings.soundPack === pack.id ? "selected" : ""} ${playing === pack.id ? "is-playing" : ""}`}
            key={pack.id}
          >
            <label className="sound-pack-choice">
              <input
                type="radio"
                name="keyboard-sound-pack"
                value={pack.id}
                checked={settings.soundPack === pack.id}
                onChange={() => onChange({ soundPack: pack.id })}
              />
              <span className="sound-pack-label">
                <span className="sound-pack-title">
                  {pack.name}
                  {settings.soundPack === pack.id && <Check size={14} />}
                </span>
                <span className="sound-pack-tag">{pack.tag}</span>
                <span className="sound-pack-description">
                  {pack.description}
                </span>
              </span>
            </label>
            <div className="sound-pack-bottom">
              <span className="pack-wave" aria-hidden="true">
                {Array.from({ length: 13 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      height: `${5 + ((i * 7 + index * 11) % 18)}px`,
                      animationDelay: `${i * -0.07}s`,
                    }}
                  />
                ))}
              </span>
              <button
                type="button"
                className="sound-preview"
                aria-label={`${playing === pack.id ? "Stop" : "Preview"} ${pack.name}`}
                onClick={() => preview(pack.id)}
              >
                {playing === pack.id ? (
                  <Square size={12} fill="currentColor" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                {playing === pack.id ? "Stop" : "Preview"}
              </button>
            </div>
          </div>
        ))}
      </fieldset>
      <div className="sound-volume">
        <label htmlFor="sound-volume">
          <Volume2 size={16} />
          <span>Keyboard volume</span>
          <output htmlFor="sound-volume">{volume}%</output>
        </label>
        <input
          id="sound-volume"
          type="range"
          min="0"
          max="100"
          step="1"
          value={volume}
          aria-valuetext={`${volume} percent`}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            setSoundVolume(v);
            if (v === 0) {
              stopSounds();
              setPlaying(null);
            }
          }}
          onPointerUp={(e) => commitVolume(e.currentTarget.value)}
          onKeyUp={(e) => commitVolume(e.currentTarget.value)}
          onBlur={(e) => commitVolume(e.currentTarget.value)}
        />
        <span className="volume-endpoints">
          <span>Quiet</span>
          <span>Full</span>
        </span>
      </div>
      <div className="combat-sound-settings">
        <div className="setting-row">
          <span>
            <strong>Combat sound effects</strong>
            <small>
              Lasers, explosions, shields, pulses, and wave alerts in Signal
              Siege.
            </small>
          </span>
          <button
            type="button"
            className={`toggle ${settings.combatSound ? "on" : ""}`}
            role="switch"
            aria-checked={settings.combatSound}
            aria-label="Combat sound effects"
            onClick={() => {
              stopCombatSounds();
              onChange({ combatSound: !settings.combatSound });
            }}
          >
            <i />
          </button>
        </div>
        {settings.combatSound && (
          <div className="sound-volume">
            <label htmlFor="combat-volume">
              <Volume2 size={16} />
              <span>Combat volume</span>
              <output>{settings.combatVolume}%</output>
            </label>
            <input
              id="combat-volume"
              type="range"
              min="0"
              max="100"
              value={settings.combatVolume}
              onChange={(e) => {
                const combatVolume = Number(e.target.value);
                setCombatVolume(combatVolume);
                onChange({ combatVolume });
                if (!combatVolume) stopCombatSounds();
              }}
            />
            <button
              type="button"
              className="text-button"
              onClick={() => previewCombatSounds(settings.combatVolume)}
            >
              <Play size={14} />
              Preview combat effects
            </button>
          </div>
        )}
        <p className="small-muted">
          The headphone button mutes both channels. Keyboard and combat volumes
          are saved separately.
        </p>
      </div>
      {previewError && <p role="status">{previewError}</p>}
      <p className="sound-preview-note">
        <AudioLines size={14} />
        {playing
          ? `Playing ${soundPacks.find((pack) => pack.id === playing)?.name}…`
          : "Preview plays a short sample of this keyboard sound."}
      </p>
    </section>
  );
}
