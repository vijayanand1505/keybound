import type { Drone, SiegeEvent } from "./siege";
import {
  burstProfile,
  pulseGeometry,
  PULSE_TRAVEL,
  type WordPlacement,
} from "./siege-effects";

/** Quiet background layers; no per-frame particle allocation or image downloads. */
export function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  motion: boolean,
) {
  for (let layer = 0; layer < 3; layer++) {
    const count = [44, 30, 18][layer];
    for (let i = 0; i < count; i++) {
      const seed = i + layer * 47;
      const x =
        ((((seed * 7919) % 997) / 997) * w +
          (motion ? time * (layer + 1) * 0.6 : 0)) %
        w;
      const y =
        ((((seed * 6311) % 991) / 991) * h +
          (motion ? time * (layer + 1) * 1.8 : 0)) %
        h;
      const alpha =
        0.17 + layer * 0.13 + (motion ? Math.sin(time * 0.4 + seed) * 0.05 : 0);
      ctx.fillStyle = `rgba(194,225,233,${alpha})`;
      ctx.fillRect(x, y, layer === 2 && i % 7 === 0 ? 2 : 1, 1);
    }
  }
  // A distant relay station, well behind the readable HTML labels.
  ctx.save();
  ctx.translate(w * 0.8 + (motion ? Math.sin(time * 0.025) * 8 : 0), h * 0.16);
  ctx.rotate(-0.24);
  ctx.strokeStyle = "#739aa72e";
  ctx.fillStyle = "#142c3870";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 35, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillRect(-4, -15, 8, 30);
  ctx.strokeRect(-4, -15, 8, 30);
  for (const side of [-1, 1]) {
    ctx.fillRect(side * 17 - 10, -4, 20, 8);
    ctx.strokeRect(side * 17 - 10, -4, 20, 8);
  }
  ctx.restore();
}

export function drawPulse(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  age: number,
  motion: boolean,
) {
  const origin = pulseGeometry(w, h);
  const p = Math.max(0, Math.min(1, age / PULSE_TRAVEL));
  const radius = motion ? Math.max(1, p * origin.radius) : Math.min(w, h) * 0.4;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - age / (PULSE_TRAVEL + 0.22));
  if (motion) {
    const halo = ctx.createRadialGradient(
      origin.x,
      origin.y,
      Math.max(0, radius - 24),
      origin.x,
      origin.y,
      radius + 4,
    );
    halo.addColorStop(0, "#7de9df00");
    halo.addColorStop(0.8, "#7de9df22");
    halo.addColorStop(1, "#d4fff900");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, radius + 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < (motion ? 2 : 1); i++) {
    ctx.strokeStyle = i ? "#8ae8e14d" : "#bafff1";
    ctx.lineWidth = i ? 5 : 2;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, Math.max(1, radius - i * 10), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Keep the completed word in its real box until its final bolt makes contact. */
export function drawCompletedWord(
  ctx: CanvasRenderingContext2D,
  text: string,
  word: WordPlacement,
) {
  ctx.save();
  ctx.fillStyle = "#07151de8";
  ctx.strokeStyle = "#dcc087";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(
    word.x - word.width / 2,
    word.y - word.height / 2,
    word.width,
    word.height,
    3,
  );
  ctx.fill();
  ctx.stroke();
  ctx.font = `${word.fontSize}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#9addca";
  ctx.fillText(text, word.x, word.y);
  ctx.restore();
}

/** Returns particles used, allowing one shared budget across simultaneous bursts. */
export function drawDestruction(
  ctx: CanvasRenderingContext2D,
  fx: SiegeEvent,
  x: number,
  y: number,
  age: number,
  motion: boolean,
  budget: number,
  word?: { x: number; y: number; fontSize: number },
) {
  const armor = fx.kind === "armor";
  const kind = fx.drone?.kind ?? "scout";
  const profile = burstProfile(kind);
  const p = Math.min(1, age / profile.duration);
  const heavy = kind === "sentinel" || kind === "boss";
  const count = motion ? Math.min(profile.particles, budget) : 0;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p);
  ctx.strokeStyle = armor
    ? "#b7a5fa"
    : kind === "interceptor"
      ? "#ffa48b"
      : heavy
        ? "#ffd38a"
        : "#95eee2";
  ctx.fillStyle = armor ? "#d9d2ff" : "#fff1c9";
  ctx.lineWidth = heavy ? 2 : 1.3;
  ctx.beginPath();
  ctx.arc(
    x,
    y,
    motion ? Math.max(0.5, (heavy ? 22 : 12) * (1 - Math.min(1, p * 4))) : 8,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    x,
    y,
    motion ? 10 + Math.sqrt(p) * profile.radius : 22,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  // A dreadnought breaks apart in three local detonations, never a screen flash.
  if (kind === "boss" && !armor && motion) {
    for (let i = 0; i < 3; i++) {
      const stage = age - 0.12 * (i + 1);
      if (stage < 0 || stage > 0.45) continue;
      ctx.beginPath();
      ctx.arc(
        x + (i - 1) * 28,
        y + (i % 2 ? -16 : 10),
        3 + stage * 55,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }
  for (let i = 0; i < count; i++) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2 + fx.id * 0.7;
    const distance =
      7 + (1 - (1 - p) ** 2) * profile.radius * (0.55 + (i % 3) * 0.22);
    ctx.save();
    ctx.translate(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
    );
    ctx.rotate(angle + p * (i % 2 ? 3 : -3));
    if (armor) {
      ctx.beginPath();
      ctx.arc(0, 0, heavy ? 8 : 5, 0, Math.PI * 0.65);
      ctx.stroke();
    } else if (heavy) {
      ctx.fillRect(-4, -2, 8, 4);
      ctx.strokeRect(-4, -2, 8, 4);
    } else {
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(kind === "interceptor" ? 10 : 5, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (motion && fx.drone) {
    const origin = word ?? {
      x,
      y: y + (kind === "boss" ? 55 : 38),
      fontSize: 14,
    };
    const scatter = Math.min(1, age / 0.45);
    const distance = (1 - (1 - scatter) ** 2) * profile.radius;
    ctx.font = `${origin.fontSize}px 'IBM Plex Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = armor ? "#d9d2ff" : "#ffe6b1";
    for (const [i, letter] of [...fx.drone.word].entries()) {
      const angle = (i / fx.drone.word.length) * Math.PI * 2 + fx.id;
      // Start at the original letter positions, then break the word apart.
      const start =
        (i - (fx.drone.word.length - 1) / 2) * origin.fontSize * 0.62;
      ctx.fillText(
        letter,
        origin.x + start * (1 - scatter * 0.35) + Math.cos(angle) * distance,
        origin.y + Math.sin(angle) * distance,
      );
    }
  }
  ctx.textBaseline = "alphabetic";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#e6d5a3";
  ctx.fillText(fx.text, x, y - (motion ? p * 28 : 24));
  ctx.restore();
  return count;
}

/** Boss geometry is local to its hull, leaving the word label steady. */
export function drawBoss(
  ctx: CanvasRenderingContext2D,
  enemy: Drone,
  motion: boolean,
) {
  const boss = enemy.boss!;
  const clock = motion ? boss.clock : 1;
  const unfold = Math.min(1, clock / 0.65);
  ctx.lineWidth = 1.5;
  if (boss.phase === "shielded") {
    ctx.strokeStyle = "#b9aff1aa";
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 + clock * 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, 29, angle, angle + 1.65);
      ctx.stroke();
    }
    ctx.strokeStyle = "#c9baff55";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 24, -8);
      ctx.lineTo(side * 16, -3);
      ctx.lineTo(side * 22, 3);
      ctx.stroke();
    }
  } else if (boss.phase === "carrier") {
    const warning =
      boss.escortsLeft > 0 ? Math.max(0, 1 - boss.escortIn / 2.5) : 0;
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#0a1b25";
      ctx.strokeStyle = "#98d7bd";
      ctx.fillRect(side * 26 - 5, -6, 10, 15);
      ctx.strokeRect(side * 26 - 5, -6, 10, 15);
      ctx.fillStyle = `rgba(137,238,189,${0.25 + warning * 0.65})`;
      ctx.fillRect(side * (26 + unfold * 7) - 2, -6, 4, 15);
      ctx.strokeStyle = "#98d7bd88";
      ctx.beginPath();
      ctx.moveTo(side * 16, -5);
      ctx.lineTo(side * (26 + unfold * 7), 10);
      ctx.lineTo(side * 22, 17);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#ffbb85";
    ctx.beginPath();
    ctx.arc(0, 0, 5 + (motion ? Math.sin(clock * 5) * 0.6 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ff9a7666";
    ctx.beginPath();
    ctx.arc(0, 0, 10 + unfold * 3, 0, Math.PI * 2);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.strokeStyle = "#ffa180";
      ctx.beginPath();
      ctx.moveTo(side * 15, 4);
      ctx.lineTo(side * (25 + unfold * 10), -15);
      ctx.lineTo(side * 21, -22);
      ctx.stroke();
      ctx.fillStyle = "#ff9a7666";
      ctx.fillRect(side * 12 - 2, -15, 4, 10 + unfold * 8);
    }
  }
}

export function drawTarget(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  age: number,
  motion: boolean,
  error: boolean,
  style = "brackets",
) {
  const settle = motion ? Math.max(0, 1 - age / 0.2) ** 2 : 0;
  const radius = (30 + settle * 11) * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = error ? "#ffb09a" : "#edc783bb";
  ctx.lineWidth = error ? 2 : 1;
  if (style === "diamond") {
    ctx.beginPath();
    ctx.moveTo(0, -radius - 4);
    ctx.lineTo(radius + 4, 0);
    ctx.lineTo(0, radius + 4);
    ctx.lineTo(-radius - 4, 0);
    ctx.closePath();
    ctx.stroke();
  } else if (style === "orbit") {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        radius,
        (i * Math.PI) / 2 + 0.12,
        ((i + 1) * Math.PI) / 2 - 0.12,
      );
      ctx.stroke();
    }
  } else {
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * radius, sy * (radius - 9));
        ctx.lineTo(sx * radius, sy * radius);
        ctx.lineTo(sx * (radius - 9), sy * radius);
        ctx.stroke();
      }
  }
  // A mistake changes shape as well as color, without moving the target or word.
  if (error) {
    ctx.beginPath();
    ctx.moveTo(-4, -radius - 5);
    ctx.lineTo(4, -radius - 13);
    ctx.moveTo(4, -radius - 5);
    ctx.lineTo(-4, -radius - 13);
    ctx.stroke();
  }
  ctx.restore();
}
