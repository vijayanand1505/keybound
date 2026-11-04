"use client";
import { memo, useEffect, useRef, useState } from "react";
import type { Metrics } from "@/game/typing";
import type { WorldFeedback, WorldKind } from "@/game/presentation";

type Props = {
  kind: WorldKind;
  metrics: Metrics;
  cursor: number;
  feedback: WorldFeedback;
  paused: boolean;
  reducedMotion: boolean;
  targets: string[];
  highContrast: boolean;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};
const TAU = Math.PI * 2;
function random(i: number) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function ModeWorld(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [systemReduced, setSystemReduced] = useState(false);
  const elapsed = useRef(0);
  const drawStill = useRef<(() => void) | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReduced(media.matches);
    const change = () => setSystemReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const reduced = props.reducedMotion || systemReduced;
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d", { alpha: true });
    if (!ctx) return;
    let frame = 0,
      width = 1,
      height = 1,
      pixelRatio = 1,
      time = elapsed.current,
      previous = 0,
      lastFeedback = latest.current.feedback.id,
      lastCursor = latest.current.cursor,
      errorAt = -10;
    const particles: Particle[] = [];
    const animate = !reduced && !props.paused;
    const line = (points: number[][], color: string, w = 1) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.stroke();
    };
    const circle = (
      x: number,
      y: number,
      r: number,
      color: string,
      fill = false,
    ) => {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0, r), 0, TAU);
      if (fill) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };
    const text = (
      value: string,
      x: number,
      y: number,
      size: number,
      color: string,
      align: CanvasTextAlign = "center",
    ) => {
      ctx.font = `${size}px "IBM Plex Mono", monospace`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.fillText(value, x, y);
    };
    const emit = (x: number, y: number, error: boolean) => {
      for (let i = 0; i < (error ? 12 : 22); i++) {
        const angle = random(i + time * 100) * TAU,
          speed = 15 + random(i + 17) * 58;
        const life = 0.5 + random(i + 43) * 0.7;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          life,
          max: life,
          size: 1 + random(i + 61) * 2,
          color: error
            ? "#e5a18e"
            : props.kind === "ascent"
              ? "#cef1f3"
              : "#d6e5aa",
        });
      }
      if (particles.length > 100) particles.splice(0, particles.length - 100);
    };
    function draw(timestamp: number) {
      if (!ctx || !element) return;
      const delta = animate
        ? Math.min(0.04, previous ? (timestamp - previous) / 1000 : 0)
        : 0;
      previous = timestamp;
      time += delta;
      elapsed.current = time;
      const { metrics, feedback, cursor, targets } = latest.current;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const overlay = props.kind === "coast" || props.kind === "ascent";
      const scale =
        width < 600
          ? width / 650
          : Math.max(width / 1200, Math.min(height / 900, 1));
      // Keep circles, key targets, and text proportional on narrow screens.
      ctx.setTransform(
        pixelRatio * (overlay ? width / 1200 : scale),
        0,
        0,
        pixelRatio * (overlay ? height / 700 : scale),
        overlay ? 0 : pixelRatio * (width / 2 - 600 * scale),
        overlay
          ? 0
          : pixelRatio * (height * (width < 600 ? 0.31 : 0.38) - 298 * scale),
      );
      const t = reduced ? 0 : time,
        p = metrics.progress;
      if (feedback.id !== lastFeedback) {
        lastFeedback = feedback.id;
        if (animate) {
          const x = props.kind === "ascent" ? 550 + p * 210 : 600;
          emit(
            x,
            props.kind === "ascent" ? 388 - p * 151 : 300,
            feedback.kind === "error",
          );
          if (feedback.kind === "error") errorAt = time;
        }
      }
      if (cursor !== lastCursor) {
        lastCursor = cursor;
        if (animate && cursor % 4 === 0 && particles.length < 85)
          particles.push({
            x: 540 + random(cursor) * 120,
            y: 330,
            vx: (random(cursor + 1) - 0.5) * 24,
            vy: -35,
            life: 0.55,
            max: 0.55,
            size: 1,
            color: "#bce8cf",
          });
      }
      ctx.save();
      if (animate && time - errorAt < 0.28) {
        const strength = (1 - (time - errorAt) / 0.28) * 3;
        ctx.translate(
          Math.sin(time * 70) * strength,
          Math.cos(time * 50) * strength * 0.4,
        );
      }
      if (props.kind === "daily") {
        const bg = ctx.createLinearGradient(0, 0, 1200, 700);
        bg.addColorStop(0, "#102725");
        bg.addColorStop(1, "#071516");
        ctx.fillStyle = bg;
        ctx.fillRect(-5000, -5000, 10000, 10000);
        // Contour-map lines, with a slow second layer of signal weather.
        for (let row = 0; row < 17; row++) {
          const pts = [];
          for (let x = -20; x <= 1240; x += 15)
            pts.push([
              x,
              80 +
                row * 28 +
                Math.sin(x * 0.008 + row * 0.55) * 28 +
                Math.sin(x * 0.019 + row) * 9,
            ]);
          line(pts, "#90c99a10");
        }
        const cx = 600,
          cy = 298,
          r = 218;
        for (let i = 1; i <= 4; i++) circle(cx, cy, (r * i) / 4, "#a9d3ab26");
        line(
          [
            [cx - r - 25, cy],
            [cx + r + 25, cy],
          ],
          "#a9d3ab25",
        );
        line(
          [
            [cx, cy - r - 25],
            [cx, cy + r + 25],
          ],
          "#a9d3ab25",
        );
        const angle = t * 0.48 - 0.8;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        for (let i = 0; i < 30; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, r, -i * 0.018, -(i + 1) * 0.018, true);
          ctx.closePath();
          ctx.fillStyle = `rgba(129,218,161,${0.048 * (1 - i / 30)})`;
          ctx.fill();
        }
        line(
          [
            [0, 0],
            [r, 0],
          ],
          "#b2efbd90",
        );
        ctx.restore();
        const nodes = Array.from({ length: 7 }, (_, i) => ({
          x: cx + Math.cos(i * 0.88 - 0.8) * (120 + random(i) * 70),
          y: cy + Math.sin(i * 0.88 - 0.8) * (95 + random(i + 9) * 80),
        }));
        nodes.forEach((n, i) => {
          const active = p >= (i + 1) / 7;
          const next = nodes[(i + 1) % 7];
          ctx.setLineDash(active ? [] : [3, 7]);
          line(
            [
              [n.x, n.y],
              [next.x, next.y],
            ],
            active ? "#b4e2b480" : "#75a48b35",
          );
          ctx.setLineDash([]);
          circle(
            n.x,
            n.y,
            active ? 5 : 3,
            active ? "#d9f5bf" : "#698b78",
            true,
          );
          circle(
            n.x,
            n.y,
            12 + (animate ? (t * 8 + i * 5) % 20 : 0),
            active ? "#b8e5b040" : "#8cba9720",
          );
          text(
            `RLY-${String(i + 1).padStart(2, "0")}`,
            n.x,
            n.y + 26,
            8,
            active ? "#d5ecc2" : "#829b88",
          );
          if (active) {
            const f = (t * 0.45 + i * 0.17) % 1;
            circle(
              n.x + (next.x - n.x) * f,
              n.y + (next.y - next.y) * f,
              2,
              "#e9edba",
              true,
            );
          }
        });
        circle(cx, cy, 5, "#e9d297", true);
        circle(cx, cy, 15, "#e9d29765");
        text("N", cx, cy - r - 17, 10, "#b5cba7");
        text("E", cx + r + 17, cy + 3, 10, "#b5cba7");
        text("Coastal relay array", cx, cy + r + 37, 10, "#a7c4a0");

        for (let i = 0; i < 38; i++) {
          const h =
            8 + Math.sin(t * 2 + i * 0.8) ** 2 * (12 + metrics.flow * 0.15);
          ctx.fillStyle = `rgba(148,211,166,${0.15 + random(i) * 0.3})`;
          ctx.fillRect(902 + i * 3, 305 - h, 1, h);
        }
        text("Signal spectrum", 950, 325, 8, "#89aa91");
      } else if (props.kind === "code") {
        ctx.fillStyle = "#08171d";
        ctx.fillRect(-5000, -5000, 10000, 10000);
        const glow = ctx.createRadialGradient(600, 285, 10, 600, 285, 390);
        glow.addColorStop(0, "#1b52553d");
        glow.addColorStop(1, "#08171d00");
        ctx.fillStyle = glow;
        ctx.fillRect(-5000, -5000, 10000, 10000);
        for (let i = 0; i < 22; i++) {
          const x = i * 59;
          line(
            [
              [600 + (x - 600) * 0.25, 310],
              [x * 2 - 600, 700],
            ],
            "#65c9c71a",
          );
        }
        for (let i = 0; i < 13; i++) {
          const y = 315 + ((i * 31 + t * 8) % 385);
          line(
            [
              [0, y],
              [1200, y],
            ],
            "#65c9c71a",
          );
        }
        for (let col = 0; col < 22; col++) {
          const x = 40 + col * 54;
          for (let j = 0; j < 7; j++) {
            const y =
              (random(col + 30) * 600 + j * 25 + t * (10 + random(col) * 12)) %
              650;
            text(
              ["01", "{}", "=>", "[]", "::", "0x"][
                Math.floor(random(col * 7 + j) * 6)
              ],
              x,
              y,
              9,
              `rgba(112,199,189,${0.04 + j * 0.009})`,
            );
          }
        }
        const boot = Math.min(3, Math.floor(p * 3));
        [360, 600, 840].forEach((x, i) => {
          const online = i < boot;
          const receiving = i === boot && p > 0;
          const y = 205 + Math.abs(1 - i) * 25;
          ctx.fillStyle = "#122b30";
          ctx.fillRect(x - 53, y, 106, 170);
          ctx.strokeStyle = online ? "#82d7ce88" : "#486c6f66";
          ctx.strokeRect(x - 53, y, 106, 170);
          ctx.fillStyle = "#0b1c23";
          ctx.fillRect(x - 43, y + 12, 86, 25);
          text(
            ["Relay", "Beacon", "Gateway"][i],
            x,
            y + 28,
            9,
            online ? "#a6e5d8" : "#789292",
          );
          for (let slot = 0; slot < 5; slot++) {
            ctx.fillStyle = "#1b373c";
            ctx.fillRect(x - 40, y + 50 + slot * 22, 80, 15);
            circle(
              x + 28,
              y + 57 + slot * 22,
              1.8,
              online ? "#c1e7b1" : "#4b6c68",
              true,
            );
            line(
              [
                [x - 33, y + 57 + slot * 22],
                [x + 9, y + 57 + slot * 22],
              ],
              online ? "#78b4a45a" : "#395354",
            );
          }
          line(
            [
              [x, y + 175],
              [x, 410],
              [600, 410],
              [600, 448],
            ],
            online ? "#9cddbc70" : "#527d6f30",
            1.5,
          );
          if (online) {
            const f = (t * 0.6 + i * 0.3) % 1;
            circle(x, 380 + f * 30, 2, "#d2f4b9", true);
          }
          text(
            online
              ? "Power restored"
              : receiving
                ? "Receiving data"
                : "Awaiting input",
            x,
            y - 15,
            8,
            online ? "#bcdda9" : "#6c8f8a",
          );
        });
        text("{", 188, 310, 90, "#9cddce3d");
        text("}", 1012, 310, 90, "#9cddce3d");

        line(
          [
            [475, 170],
            [725, 170],
          ],
          "#84bca13c",
          2,
        );
        line(
          [
            [475, 170],
            [475 + p * 250, 170],
          ],
          "#b9e7bc",
          2,
        );
      } else if (props.kind === "coach") {
        ctx.fillStyle = "#1b1b22";
        ctx.fillRect(-5000, -5000, 10000, 10000);
        const glow = ctx.createRadialGradient(600, 280, 0, 600, 280, 430);
        glow.addColorStop(0, "#5c3d493d");
        glow.addColorStop(1, "#1b1b2200");
        ctx.fillStyle = glow;
        ctx.fillRect(-5000, -5000, 10000, 10000);
        for (let i = 0; i < 64; i++) {
          const x = random(i) * 1200,
            y = random(i + 87) * 520;
          circle(
            x + Math.sin(t * 0.13 + i) * 3,
            y + Math.cos(t * 0.2 + i) * 4,
            random(i + 14) * 1.3 + 0.4,
            `rgba(220,190,148,${0.12 + random(i) * 0.25})`,
            true,
          );
        }
        const pts = Array.from({ length: 14 }, (_, i) => {
          const a = i * 2.399;
          return [
            600 + Math.cos(a + t * 0.015) * (90 + random(i + 40) * 240),
            285 + Math.sin(a + t * 0.015) * (70 + random(i + 70) * 150),
          ];
        });
        pts.forEach((n, i) => {
          const active = p > i / 14;
          const next = pts[(i + 5) % pts.length];
          line([n, next], active ? "#deb78d60" : "#bba3bd1e");
          circle(
            n[0],
            n[1],
            active ? 3 : 2,
            active ? "#f4ce92" : "#8e8792",
            true,
          );
        });
        const keys = targets.length ? targets.slice(0, 3) : ["s", "r", "e"];
        keys.forEach((key, i) => {
          const x = 365 + i * 235,
            y = 278 + Math.sin(t * 0.7 + i * 2) * (!animate ? 0 : 10);
          const active = Math.floor(p * 30) % keys.length === i;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);
          ctx.strokeStyle = active ? "#f4ce9299" : "#c0a0ae3d";
          ctx.strokeRect(-36, -36, 72, 72);
          ctx.rotate(-Math.PI / 4);
          circle(
            0,
            0,
            67 + (animate ? Math.sin(t * 1.2 + i) * 3 : 0),
            "#ddbb8b1c",
          );
          text(key.toUpperCase(), 0, 12, 34, active ? "#f2d199" : "#c2afad");
          text(
            active ? "Target acquired" : "Pattern / " + (i + 1),
            0,
            96,
            8,
            active ? "#e4c591" : "#a595a2",
          );
          ctx.restore();
        });
        text("One clean word connects the next.", 600, 423, 8, "#b1a099");
      } else if (props.kind === "practice" || props.kind === "trial") {
        const sky = ctx.createLinearGradient(0, 0, 0, 700);
        sky.addColorStop(0, "#3a3b34");
        sky.addColorStop(0.48, "#5d6251");
        sky.addColorStop(1, "#162925");
        ctx.fillStyle = sky;
        ctx.fillRect(-5000, -5000, 10000, 10000);
        const sun = ctx.createRadialGradient(870, 210, 5, 870, 210, 180);
        sun.addColorStop(0, "#edcf8f44");
        sun.addColorStop(1, "#edcf8f00");
        ctx.fillStyle = sun;
        ctx.fillRect(550, 0, 650, 430);
        circle(870, 210, 28, "#dfc28c28", true);
        for (let layer = 0; layer < 4; layer++) {
          const pts = [[0, 700]];
          for (let x = 0; x <= 1220; x += 20)
            pts.push([
              x,
              285 +
                layer * 54 +
                Math.sin(x * 0.005 + layer * 0.7 + t * 0.015) * 35 +
                Math.sin(x * 0.013 + layer) * 9,
            ]);
          pts.push([1200, 700]);
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fillStyle = ["#65735b", "#425c4e", "#2c483f", "#1b352e"][layer];
          ctx.fill();
        }
        for (let i = 0; i < 38; i++) {
          const x = (random(i) * 1200 + t * (4 + random(i + 4) * 8)) % 1200,
            y = 90 + random(i + 100) * 420 + Math.sin(t * 0.4 + i) * 14;
          circle(
            x,
            y,
            1 + random(i) * 1.3,
            `rgba(239,219,159,${0.1 + random(i + 14) * 0.3})`,
            true,
          );
        }
        ctx.save();
        ctx.translate(600, 295);
        ctx.rotate(-0.06 + Math.sin(t * 0.2) * 0.007);
        ctx.fillStyle = "#172921de";
        ctx.strokeStyle = "#d4c58d55";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-160, -77);
        ctx.quadraticCurveTo(-80, -95, 0, -65);
        ctx.quadraticCurveTo(80, -95, 160, -77);
        ctx.lineTo(160, 88);
        ctx.quadraticCurveTo(80, 65, 0, 88);
        ctx.quadraticCurveTo(-80, 65, -160, 88);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        line(
          [
            [0, -65],
            [0, 88],
          ],
          "#d4c58d44",
        );
        for (let i = 0; i < 6; i++) {
          line(
            [
              [-135, -42 + i * 19],
              [-25, -37 + i * 19],
            ],
            "#d4c58d30",
          );
          line(
            [
              [25, -37 + i * 19],
              [135, -42 + i * 19],
            ],
            i < Math.floor(p * 6) ? "#e8cb9180" : "#d4c58d30",
          );
        }
        text(
          props.kind === "trial" ? "Recruit / 01" : "Field notes",
          -80,
          -103,
          9,
          "#e3d5b0",
        );
        ctx.restore();
        if (props.kind === "trial") {
          for (let i = 0; i < 3; i++)
            circle(
              600,
              290,
              135 + i * 22 + (animate ? Math.sin(t * 0.5) * 5 : 0),
              "#d9c59320",
            );
          text("Finding your frequency", 600, 466, 9, "#d8c99d");
        } else
          text("No destination. just the journey.", 600, 449, 9, "#c5caa4");
      } else {
        // Weather overlays keep the original coast and mountain artwork intact.
        if (props.kind === "ascent") {
          for (let i = 0; i < 95; i++) {
            const depth = i % 3,
              speed = 15 + depth * 19;
            const x =
                ((((random(i) * 1400 - t * speed * 1.8) % 1400) + 1400) %
                  1400) -
                100,
              y = ((random(i + 95) * 800 + t * speed * 0.6) % 800) - 50;
            circle(
              x,
              y,
              0.7 + depth * 0.7,
              `rgba(221,244,243,${0.17 + depth * 0.12})`,
              true,
            );
          }
          for (let i = 0; i < 8; i++) {
            const x =
                ((((random(i + 40) * 1500 - t * 58) % 1500) + 1500) % 1500) -
                150,
              y = 110 + i * 40;
            line(
              [
                [x, y],
                [x + 65, y - 7],
                [x + 110, y - 4],
              ],
              "#d4efef1c",
            );
          }
          const altitude = Math.round(4200 + p * 640);
          text(
            `${altitude.toLocaleString("en-US")} M`,
            978,
            247,
            22,
            "#d0eeeb",
          );
          text("Altitude / above sea level", 978, 269, 7, "#a9c4c2");
          for (let i = 0; i < 10; i++) {
            const x = 550 + i * 23,
              y = 490 - i * 12;
            circle(x, y, 4, i / 10 < p ? "#e4d09e99" : "#bbdce732");
            if (i / 10 < p)
              line(
                [
                  [x - 2, y],
                  [x, y + 2],
                  [x + 4, y - 3],
                ],
                "#eef5ce",
              );
          }
        } else {
          // Fine sea spray drifts independently of the existing rain.
          for (let i = 0; i < 24; i++) {
            const x = (random(i) * 1300 + t * 7) % 1300,
              y = 345 + random(i + 50) * 135 + Math.sin(t * 0.3 + i) * 4;
            line(
              [
                [x, y],
                [x + 18 + random(i + 20) * 36, y],
              ],
              "#d7e5d81a",
            );
          }
        }
      }
      if (metrics.flow >= 80) {
        const aura = ctx.createRadialGradient(600, 280, 140, 600, 280, 650);
        aura.addColorStop(0, "#a5dfb700");
        aura.addColorStop(1, `rgba(189,215,145,${0.07 + Math.sin(t) * 0.02})`);
        ctx.fillStyle = aura;
        ctx.fillRect(-5000, -5000, 10000, 10000);
      }
      if (animate) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const q = particles[i];
          q.life -= delta;
          if (q.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          q.x += q.vx * delta;
          q.y += q.vy * delta;
          q.vy += 12 * delta;
          ctx.globalAlpha = q.life / q.max;
          circle(q.x, q.y, q.size, q.color, true);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (animate) frame = requestAnimationFrame(draw);
    }
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      element.width = Math.round(width * pixelRatio);
      element.height = Math.round(height * pixelRatio);
      if (!animate) draw(0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    drawStill.current = () => {
      if (!animate) draw(0);
    };
    draw(0);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      drawStill.current = null;
    };
  }, [props.kind, props.paused, reduced]);
  useEffect(() => {
    drawStill.current?.();
  }, [props.metrics, props.cursor, props.feedback, props.targets]);
  return (
    <div
      className={`mode-world world-${props.kind} ${props.highContrast ? "world-high-contrast" : ""}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvas}
        data-world={props.kind}
        data-motion={reduced ? "reduced" : props.paused ? "paused" : "animated"}
      />
      <div className="world-vignette" />
    </div>
  );
}
export default memo(ModeWorld);
