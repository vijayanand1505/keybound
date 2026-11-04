import type { Drone } from "./siege";
export type SiegeLabel = {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  shipX: number;
  shipY: number;
  shifted: boolean;
};
/** Place text independently of ship motion, with leader lines when a label must move. */
export function siegeLabels(
  enemies: Drone[],
  width: number,
  height: number,
  fontSize: number,
  target: number | null,
): SiegeLabel[] {
  if (width <= 0 || height <= 0) return [];
  const placed: SiegeLabel[] = [];
  const gap = height < 300 ? 4 : 6,
    edge = height < 300 ? 6 : 8;
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(Math.max(min, max), value));
  const ordered = [...enemies].sort(
    (a, b) =>
      Number(b.id === target) - Number(a.id === target) ||
      Number(b.kind === "boss") - Number(a.kind === "boss") ||
      b.y - a.y,
  );
  for (const enemy of ordered) {
    const labelWidth = Math.min(
      width - edge * 2,
      Math.max(
        enemy.word.length * fontSize * 0.6 + (width < 720 ? 16 : 20),
        enemy.armor > 1 ? (enemy.kind === "boss" ? 112 : 90) : 0,
      ),
    );
    const labelHeight = Math.ceil(
      fontSize * 1.3 + 12 + (enemy.armor > 1 ? 20 : 0),
    );
    const shipX = enemy.x * width,
      shipY = enemy.y * height;
    const preferredLeft = clamp(
      shipX - labelWidth / 2,
      edge,
      width - labelWidth - edge,
    );
    const preferredTop = clamp(
      shipY + (enemy.kind === "boss" ? 40 : width < 720 ? 21 : 24),
      edge,
      height - labelHeight - edge,
    );
    let best = { left: preferredLeft, top: preferredTop },
      bestCost = Infinity;
    const lefts = [
      preferredLeft,
      edge,
      width - labelWidth - edge,
      (width - labelWidth) / 2,
    ];
    const offsets = [0];
    for (let offset = 36; offset < height; offset += 36)
      offsets.push(offset, -offset);
    const tops = [
      ...offsets.map((offset) => preferredTop + offset),
      edge,
      height - labelHeight - edge,
      ...placed.flatMap((other) => [
        other.top + other.height + gap,
        other.top - labelHeight - gap,
      ]),
    ];
    for (const candidateTop of tops)
      for (const left of lefts) {
        const top = clamp(candidateTop, edge, height - labelHeight - edge);
        let overlap = 0;
        for (const other of placed)
          overlap +=
            Math.max(
              0,
              Math.min(
                left + labelWidth + gap,
                other.left + other.width + gap,
              ) - Math.max(left, other.left),
            ) *
            Math.max(
              0,
              Math.min(
                top + labelHeight + gap,
                other.top + other.height + gap,
              ) - Math.max(top, other.top),
            );
        const cost =
          overlap * 10000 +
          Math.abs(top - preferredTop) +
          Math.abs(left - preferredLeft) * 0.65;
        if (cost < bestCost) {
          bestCost = cost;
          best = { left, top };
        }
      }
    placed.push({
      id: enemy.id,
      ...best,
      width: labelWidth,
      height: labelHeight,
      shipX,
      shipY,
      shifted:
        Math.abs(
          best.top -
            (shipY + (enemy.kind === "boss" ? 40 : width < 720 ? 21 : 24)),
        ) > 6 || Math.abs(best.left - preferredLeft) > 6,
    });
  }
  return placed;
}
