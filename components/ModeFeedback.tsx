"use client";
import { useEffect, useState } from "react";
import { Check, Radio, Wind, Zap } from "lucide-react";
import { worldFor, type WorldFeedback } from "@/game/presentation";
import type { Metrics } from "@/game/typing";
export default function ModeFeedback({
  expedition,
  metrics,
  feedback,
  targets,
}: {
  expedition: string;
  metrics: Metrics;
  feedback: WorldFeedback;
  targets: string[];
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!feedback.id) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(timer);
  }, [feedback.id]);
  const world = worldFor(expedition);
  const count =
    world.kind === "daily"
      ? 7
      : world.kind === "code"
        ? 3
        : world.kind === "ascent"
          ? 10
          : 6;
  const restored = Math.floor(metrics.progress * count);
  const label =
    world.kind === "daily"
      ? "Relay chain"
      : world.kind === "code"
        ? "System uplink"
        : world.kind === "coach"
          ? "Key practice"
          : world.kind === "ascent"
            ? "The next handhold"
            : world.kind === "trial"
              ? "Typing test"
              : world.kind === "practice"
                ? "Practice progress"
                : "Coastal frequency";
  return (
    <>
      <div className="scene-instrument">
        <span className="instrument-label">
          <Radio size={12} />
          {label}
        </span>
        <div className="instrument-segments">
          {Array.from({ length: count }, (_, i) => (
            <i
              key={i}
              className={
                i < restored ? "restored" : i === restored ? "acquiring" : ""
              }
            />
          ))}
        </div>
        <span className="instrument-detail">
          {world.kind === "ascent"
            ? `${Math.round(4200 + metrics.progress * 640).toLocaleString("en-US")} m · Keep climbing`
            : world.kind === "coach"
              ? `${(targets.length ? targets : ["s", "r", "e"]).slice(0, 3).join(" / ").toUpperCase()} · Target keys`
              : world.kind === "practice"
                ? "Type at a comfortable pace."
                : `${restored} / ${count} ${world.kind === "code" ? "Subsystems" : world.kind === "daily" ? "Relays" : "Waypoints"} connected`}
        </span>
      </div>
      <div className="feedback-stage" aria-hidden="true">
        {feedback.id > 0 && visible && (
          <div
            key={feedback.id}
            className={`word-feedback feedback-${feedback.kind} ${metrics.combo >= 5 && metrics.combo % 5 === 0 ? "feedback-combo" : ""}`}
          >
            {feedback.kind === "error" ? (
              <>
                <span className="feedback-cross">×</span>
                <span>
                  {world.kind === "ascent"
                    ? "Ice shift / reset your grip"
                    : world.kind === "code"
                      ? "Packet interrupted"
                      : "Try the highlighted character."}
                </span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>
                  {metrics.combo >= 5 && metrics.combo % 5 === 0
                    ? `${metrics.combo} words without a mistake.`
                    : world.action}
                </span>
                {feedback.word && <small>{feedback.word}</small>}
              </>
            )}
          </div>
        )}
      </div>
      {metrics.flow >= 80 && (
        <div className="flow-state-banner">
          <Wind size={13} />
          <span>Flow state</span>
          <Zap size={11} />
        </div>
      )}
    </>
  );
}
