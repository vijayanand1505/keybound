"use client";
import { useState } from "react";
import { Copy, Download, Target, Trophy } from "lucide-react";
import type { SiegeResult } from "@/game/siege";
import {
  downloadSiegeCard,
  siegeComparison,
  siegeSummary,
  type SiegeBaseline,
  siegeResultLabel,
  siegeEndLabel,
} from "@/game/siege-report";
export default function SiegeReport({
  result,
  baseline,
  onPractice,
}: {
  result: SiegeResult;
  baseline: SiegeBaseline;
  onPractice: (words: string[]) => void;
}) {
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState(false);
  const comparison = siegeComparison(result, baseline);
  const label = siegeResultLabel(result);
  const signed = (n: number, digits = 0) =>
    `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
  return (
    <section className="siege-report" aria-labelledby="siege-report-title">
      <div className="siege-report-heading">
        <div>
          <span className="eyebrow">
            {label} · {siegeEndLabel(result)}
          </span>
          <h2 id="siege-report-title">Your defense report</h2>
        </div>
        {comparison.newBest && (
          <span className="siege-record">
            <Trophy size={18} />
            New personal best
          </span>
        )}
      </div>
      <div className="siege-report-metrics">
        <div>
          <span>Best combo</span>
          <strong>{result.metrics.maxCombo}×</strong>
        </div>
        <div>
          <span>Enemies destroyed</span>
          <strong>{result.kills}</strong>
        </div>
        <div>
          <span>Time played</span>
          <strong>
            {Math.floor(result.metrics.duration / 60000)}:
            {String(Math.floor(result.metrics.duration / 1000) % 60).padStart(
              2,
              "0",
            )}
          </strong>
        </div>
        <div>
          <span>Wave reached</span>
          <strong>{result.wave}</strong>
        </div>
      </div>
      {baseline.previous ? (
        <div className="siege-comparison">
          <h3>Compared with your previous {label} run</h3>
          <p>
            <span>{signed(comparison.score!)} points</span>
            <span>{signed(comparison.wpm!)} WPM</span>
            <span>
              {signed(comparison.accuracy!, 1)} accuracy percentage points
            </span>
          </p>
        </div>
      ) : (
        <p>
          This is your first recorded {label} run. Future runs will show your
          progress here.
        </p>
      )}
      <div className="siege-word-review">
        <h3>What to practice next</h3>
        {result.missedWords.length ? (
          <>
            <p>These words caused mistakes. Practice them without a timer.</p>
            <ul>
              {result.missedWords.map((item) => (
                <li key={item.word}>
                  <strong>{item.word}</strong>
                  <span>
                    {item.errors} {item.errors === 1 ? "mistake" : "mistakes"}
                  </span>
                </li>
              ))}
            </ul>
            <button
              className="button primary"
              onClick={() =>
                onPractice(result.missedWords.map((item) => item.word))
              }
            >
              <Target size={16} />
              Practice missed words
            </button>
          </>
        ) : (
          <p>
            {result.metrics.errors
              ? "Some keys did not match a target. Start with the first letter of a visible word, then finish the highlighted word."
              : result.metrics.wpm
                ? "You finished without typing mistakes. Try another run or choose a higher difficulty."
                : "Type the first letter of an enemy word to choose a target. The tutorial is a safe place to practice the controls."}
          </p>
        )}
      </div>
      <div className="siege-share-actions">
        <button
          className="button ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(siegeSummary(result));
              setNotice("Result copied.");
            } catch {
              setNotice(
                "Clipboard unavailable. You can download the score card instead.",
              );
            }
          }}
        >
          <Copy size={16} />
          Copy arcade result
        </button>
        <button
          className="button ghost"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadSiegeCard(result);
              setNotice("Score card downloaded.");
            } catch {
              setNotice(
                "The score card could not be created. Please try again.",
              );
            } finally {
              setDownloading(false);
            }
          }}
        >
          <Download size={16} />
          {downloading ? "Creating card…" : "Download arcade card"}
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
