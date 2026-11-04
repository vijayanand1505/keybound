import { siegeProfiles } from "./siege-difficulty";
import type { SiegeResult } from "./siege";
import { normalizeSiegeMode, siegeModes } from "./siege-mode";
export function siegeResultLabel(result: SiegeResult) {
  return `${siegeModes[normalizeSiegeMode(result.mode)].label} · ${siegeProfiles[result.difficulty].label}`;
}
export function siegeEndLabel(result: SiegeResult) {
  return result.endReason === "time"
    ? "60 seconds complete"
    : result.endReason === "hull"
      ? "Hull lost"
      : "Run ended";
}
export type SiegeBaseline = {
  bestScore: number;
  previous?: { score: number; wpm: number; accuracy: number };
};
export function siegeComparison(result: SiegeResult, baseline: SiegeBaseline) {
  return {
    newBest: result.score > baseline.bestScore,
    score: baseline.previous ? result.score - baseline.previous.score : null,
    wpm: baseline.previous ? result.metrics.wpm - baseline.previous.wpm : null,
    accuracy: baseline.previous
      ? result.metrics.accuracy - baseline.previous.accuracy
      : null,
  };
}
export function siegeSummary(result: SiegeResult) {
  return `KEYBOUND · Signal Siege (${siegeResultLabel(result)})\n${result.score.toLocaleString()} points · Wave ${result.wave} · ${result.kills} ${result.kills === 1 ? "enemy" : "enemies"}\n${result.metrics.wpm} WPM · ${result.metrics.accuracy.toFixed(1)}% accuracy · Best combo ${result.metrics.maxCombo}\n${siegeEndLabel(result)} · ${Math.floor(result.metrics.duration / 1000)}s played\nhttps://keybound-expeditions.vercel.app`;
}
export async function downloadSiegeCard(result: SiegeResult) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const background = ctx.createLinearGradient(0, 0, 1200, 720);
  background.addColorStop(0, "#0a1b28");
  background.addColorStop(1, "#182c2c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1200, 720);
  ctx.strokeStyle = "#82b6b1";
  ctx.strokeRect(32, 32, 1136, 656);
  ctx.fillStyle = "#c2d8ce";
  ctx.font = '20px "DM Sans", sans-serif';
  ctx.fillText(`KEYBOUND / Signal Siege / ${siegeResultLabel(result)}`, 64, 92);
  ctx.fillStyle = "#efd099";
  ctx.font = '600 84px "DM Sans", sans-serif';
  ctx.fillText(result.score.toLocaleString(), 64, 216);
  ctx.fillStyle = "#dce8df";
  ctx.font = '24px "DM Sans", sans-serif';
  ctx.fillText("points", 64, 254);
  const stats = [
    [String(result.wave), "Wave"],
    [`${result.metrics.wpm}`, "WPM"],
    [`${result.metrics.accuracy.toFixed(1)}%`, "Accuracy"],
    [`${result.metrics.maxCombo}×`, "Best combo"],
  ];
  stats.forEach(([value, label], i) => {
    ctx.font = '600 44px "DM Sans", sans-serif';
    ctx.fillStyle = "#eef2e9";
    ctx.fillText(value, 64 + i * 280, 370);
    ctx.font = '20px "DM Sans", sans-serif';
    ctx.fillStyle = "#a9c2b7";
    ctx.fillText(label, 64 + i * 280, 414);
  });
  ctx.font = '24px "DM Sans", sans-serif';
  ctx.fillStyle = "#dce8df";
  ctx.fillText(
    `${result.kills} ${result.kills === 1 ? "enemy" : "enemies"} destroyed · ${Math.floor(result.metrics.duration / 60000)}:${String(Math.floor(result.metrics.duration / 1000) % 60).padStart(2, "0")} played · ${siegeEndLabel(result)}`,
    64,
    510,
  );
  ctx.font = '20px "DM Sans", sans-serif';
  ctx.fillStyle = "#a9c2b7";
  ctx.fillText("Free to play · keybound-expeditions.vercel.app", 64, 624);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Image unavailable")),
      "image/png",
    ),
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "keybound-signal-siege.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
