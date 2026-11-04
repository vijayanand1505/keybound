"use client";
import { Monitor, Moon, Sun, Check } from "lucide-react";
import type { Settings } from "@/game/storage";
const options = [
  {
    id: "light",
    name: "Light",
    description: "Light background with dark text",
    icon: Sun,
  },
  {
    id: "dark",
    name: "Dark",
    description: "Dark background with light text",
    icon: Moon,
  },
  {
    id: "system",
    name: "System",
    description: "Follow your device’s appearance",
    icon: Monitor,
  },
] as const;
const accents = [
  { id: "amber", name: "Amber" },
  { id: "sage", name: "Sage" },
  { id: "ocean", name: "Ocean" },
] as const;
export default function AppearanceSettings({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <section className="appearance-settings" aria-labelledby="appearance-title">
      <h2 id="appearance-title">Appearance</h2>
      <p className="settings-description">
        Choose a theme and accent color. Your preferences are saved on this
        device.
      </p>
      <fieldset className="theme-options">
        <legend>Color theme</legend>
        <div className="theme-grid">
          {options.map((option) => (
            <label
              className={`theme-choice ${settings.theme === option.id ? "selected" : ""}`}
              key={option.id}
            >
              <input
                type="radio"
                name="color-theme"
                value={option.id}
                checked={settings.theme === option.id}
                onChange={() => onChange({ theme: option.id })}
              />
              <span
                className={`theme-swatch swatch-${option.id}`}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
              <span className="theme-choice-title">
                <option.icon size={15} />
                {option.name}
                {settings.theme === option.id && <Check size={14} />}
              </span>
              <span className="theme-description">{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="accent-options">
        <legend>Accent color</legend>
        <div className="accent-choices">
          {accents.map((accent) => (
            <label
              className={`accent-choice ${settings.accent === accent.id ? "selected" : ""}`}
              key={accent.id}
            >
              <input
                type="radio"
                name="accent-color"
                value={accent.id}
                checked={settings.accent === accent.id}
                onChange={() => onChange({ accent: accent.id })}
              />
              <i
                className={`accent-dot accent-${accent.id}`}
                aria-hidden="true"
              />
              {accent.name}
              {settings.accent === accent.id && <Check size={13} />}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
