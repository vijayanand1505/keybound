"use client";
import { useState } from "react";
import { ChevronDown, LockKeyhole } from "lucide-react";
import {
  cosmeticOptions,
  cosmeticCategories,
  cosmeticUnlocked,
  shipHullPath,
  type CosmeticSave,
  type CosmeticSelection,
} from "@/game/siege-cosmetics";
import SiegeShipPreview from "./SiegeShipPreview";
export default function SiegeCosmetics({
  value,
  disabled,
  onChange,
  active,
  reducedMotion,
}: {
  value: CosmeticSave;
  disabled: boolean;
  onChange: (selection: CosmeticSelection) => void;
  active: boolean;
  reducedMotion: boolean;
}) {
  const [open, setOpen] = useState(false);
  const unlocked = cosmeticOptions.filter((option) =>
    cosmeticUnlocked(option, value.progress),
  ).length;
  return (
    <details
      className="siege-customization"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Customize ship{" "}
        <span>
          {unlocked} / {cosmeticOptions.length} unlocked
        </span>
        <ChevronDown size={16} />
      </summary>
      <div className="siege-cosmetic-body">
        <SiegeShipPreview
          selection={value.selection}
          enabled={open && active}
          disabled={disabled}
          reducedMotion={reducedMotion}
        />
        <div className="siege-cosmetic-options">
          {cosmeticCategories.map(([category, label]) => (
            <fieldset key={category} disabled={disabled}>
              <legend>{label}</legend>
              <div>
                {cosmeticOptions
                  .filter((option) => option.category === category)
                  .map((option) => {
                    const available = cosmeticUnlocked(option, value.progress);
                    return (
                      <label
                        key={option.id}
                        className={
                          !available
                            ? "cosmetic-locked"
                            : value.selection[category] === option.id
                              ? "cosmetic-selected"
                              : ""
                        }
                      >
                        <input
                          type="radio"
                          name={`cosmetic-${category}`}
                          value={option.id}
                          checked={value.selection[category] === option.id}
                          disabled={!available}
                          onChange={() =>
                            onChange({
                              ...value.selection,
                              [category]: option.id,
                            })
                          }
                        />
                        {category === "hull" ? (
                          <svg
                            className="cosmetic-frame"
                            viewBox="-28 -30 56 50"
                            aria-hidden="true"
                          >
                            <path d={shipHullPath(option.id)} />
                          </svg>
                        ) : (
                          <span
                            className="cosmetic-swatch"
                            style={{ background: option.color }}
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          <strong>{option.name}</strong>
                          <small>
                            {available ? "Unlocked" : option.requirement}
                          </small>
                          {!available && (
                            <small>
                              {Math.min(
                                value.progress[option.stat],
                                option.goal,
                              )}{" "}
                              / {option.goal}
                            </small>
                          )}
                        </span>
                        {!available && (
                          <LockKeyhole size={13} aria-hidden="true" />
                        )}
                      </label>
                    );
                  })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
    </details>
  );
}
