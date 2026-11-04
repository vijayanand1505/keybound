import {
  cosmeticLook,
  defaultCosmetics,
  shipHullPoints,
  type CosmeticSelection,
} from "./siege-cosmetics";
import type { SiegeGame, SiegeEvent, Drone } from "./siege";
import {
  burstProfile,
  comboHeat,
  pulseContact,
  HIT_RECOIL,
  MAX_RECOIL,
  type WordPlacement,
  SHOT_FLIGHT,
  SHOT_AIM,
  hitRecoil,
  impactAge,
  shotGeometry,
  shotHeading,
} from "./siege-effects";
import {
  drawAtmosphere,
  drawPulse,
  drawDestruction,
  drawBoss,
  drawTarget,
  drawCompletedWord,
} from "./siege-visuals";
type Effect = SiegeEvent & {
  age: number;
  sounded?: boolean;
  launch: number;
  from: number;
  viaPulse?: boolean;
  wordVisual?: WordPlacement;
};
export class SiegeRenderer {
  private effects: Effect[] = [];
  private look = cosmeticLook(defaultCosmetics);
  private lookKey = "";
  setCosmetics(selection: CosmeticSelection) {
    const key = `${selection.ship}:${selection.trail}:${selection.target}:${selection.hull ?? "vector"}:${selection.beam ?? "pulse-beam"}`;
    if (key !== this.lookKey) {
      this.lookKey = key;
      this.look = cosmeticLook(selection);
    }
  }
  preview(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    options: { time?: number; motion?: boolean; demoAge?: number } = {},
  ) {
    const { time = 0, motion = false, demoAge } = options;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#091923";
    ctx.fillRect(0, 0, w, h);
    drawAtmosphere(ctx, w, h, time, motion);
    const target = {
      id: -1,
      x: 0.5,
      y: 0.24,
      word: "arc",
      progress: 0,
      speed: 0,
      armor: 1,
      kind: "scout" as const,
      dirty: false,
    };
    const contact = 0.4 + SHOT_FLIGHT;
    if (demoAge === undefined || !motion || demoAge < contact) {
      const recoil =
        demoAge !== undefined && motion
          ? Math.min(
              MAX_RECOIL,
              [0, 0.2, 0.4].reduce(
                (sum, start) => sum + hitRecoil(demoAge - start, true),
                0,
              ),
            )
          : 0;
      this.drone(
        ctx,
        w,
        h,
        { ...target, y: target.y - recoil / h },
        true,
        time,
        motion,
      );
      ctx.fillStyle = "#dceeea";
      ctx.font = '12px "IBM Plex Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText("arc", w / 2, h * target.y + 35 - recoil);
      ctx.textAlign = "start";
    }
    ctx.save();
    ctx.translate(w / 2, h * 0.66);
    ctx.scale(1.65, 1.65);
    this.ship(ctx, 0, 0, time, motion, 0, demoAge !== undefined ? 0.65 : 0.35);
    ctx.restore();
    if (demoAge !== undefined) {
      const from = { x: w / 2, y: h * 0.66 - 25 * 1.65 },
        to = { x: w / 2, y: h * target.y };
      if (!motion) {
        this.bolt(ctx, from, to, 1, false);
        ctx.strokeStyle = this.look.laser;
        ctx.beginPath();
        ctx.arc(to.x, to.y, 9, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        for (const start of [0, 0.2, 0.4]) {
          const age = demoAge - start;
          if (age >= 0 && age < SHOT_FLIGHT)
            this.bolt(ctx, from, to, age / SHOT_FLIGHT, true);
        }
        if (demoAge >= contact)
          drawDestruction(
            ctx,
            {
              id: -1,
              kind: "kill",
              x: 0.5,
              y: target.y,
              text: "",
              drone: target,
            },
            to.x,
            to.y,
            demoAge - contact,
            true,
            12,
            { x: to.x, y: to.y + 32, fontSize: 12 },
          );
      }
    }
  }
  private bolt(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    progress: number,
    motion: boolean,
  ) {
    ctx.save();
    const dx = to.x - from.x,
      dy = to.y - from.y,
      length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length,
      ny = dx / length;
    ctx.strokeStyle = this.look.laser;
    ctx.lineWidth = this.look.beam === "prism" ? 1.4 : 2;
    ctx.shadowColor = this.look.laser;
    ctx.shadowBlur = motion ? 12 : 0;
    const line = (start: number, end: number, offset = 0) => {
      ctx.beginPath();
      ctx.moveTo(
        from.x + dx * start + nx * offset,
        from.y + dy * start + ny * offset,
      );
      ctx.lineTo(
        from.x + dx * end + nx * offset,
        from.y + dy * end + ny * offset,
      );
      ctx.stroke();
    };
    if (this.look.beam === "prism") {
      line(Math.max(0, progress - 0.13), progress, -2);
      line(Math.max(0, progress - 0.13), progress, 2);
    } else if (this.look.beam === "tracer") {
      for (let i = 0; i < 3; i++) {
        const end = progress - i * 0.045;
        if (end > 0) line(Math.max(0, end - 0.025), end);
      }
    } else line(Math.max(0, progress - 0.1), progress);
    ctx.restore();
  }
  private lastEvent = 0;
  private activeGame: SiegeGame | null = null;
  private heading = 0;
  private heat = 0;
  private lockId: number | null = null;
  private lockAge = 0;
  private wordGame: SiegeGame | null = null;
  private words = new Map<string, WordPlacement>();
  rememberWord(
    game: SiegeGame,
    id: number,
    word: string,
    placement: WordPlacement,
  ) {
    if (this.wordGame !== game) {
      this.wordGame = game;
      this.words.clear();
    }
    this.words.set(`${id}:${word}`, { ...placement });
    if (this.words.size > 64)
      this.words.delete(this.words.keys().next().value!);
  }
  get animating() {
    return (
      this.effects.length > 0 ||
      (this.activeGame?.status === "over" && this.heat > 0.01)
    );
  }
  recoil(id: number, w: number, h: number, motion: boolean) {
    let x = 0,
      y = 0;
    for (const effect of this.effects) {
      if (effect.kind !== "hit" || effect.drone?.id !== id) continue;
      const distance = hitRecoil(
        effect.age - (motion ? effect.launch : 0),
        motion,
      );
      const { direction } = shotGeometry(effect.x * w, effect.y * h, w, h);
      x += direction.x * distance;
      y += direction.y * distance;
    }
    const scale = Math.min(1, MAX_RECOIL / (Math.hypot(x, y) || 1));
    return { x: x * scale, y: y * scale };
  }
  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    game: SiegeGame,
    dt: number,
    motion: boolean,
    readyTime = 0,
  ) {
    if (this.activeGame !== game) {
      this.activeGame = game;
      this.effects = [];
      this.lastEvent = 0;
      this.heading = 0;
      this.heat = 0;
      this.lockId = null;
      this.lockAge = 0;
      if (this.wordGame !== game) {
        this.wordGame = game;
        this.words.clear();
      }
    }
    // Pause also freezes in-flight shots, recoil and explosions, including resizes.
    if (game.status !== "paused") {
      this.effects.forEach((e) => (e.age += dt));
      this.heat = comboHeat(
        this.heat,
        game.status === "running" ? game.combo : 0,
        dt,
      );
      if (this.lockId !== game.target) {
        this.lockId = game.target;
        this.lockAge = 0;
      } else this.lockAge += dt;
    }
    for (const event of game.events)
      if (event.id > this.lastEvent) {
        let launch = 0,
          from = this.heading;
        if (event.kind === "hit" && motion) {
          const previous = this.effects.findLast((e) => e.kind === "hit");
          // Queue rapid input so every bolt leaves while the ship faces its target.
          const waiting = previous
            ? Math.max(0, previous.launch - previous.age)
            : 0;
          launch = waiting + SHOT_AIM;
          if (previous && waiting > 0)
            from = shotGeometry(previous.x * w, previous.y * h, w, h).angle;
        } else if (event.kind === "kill" || event.kind === "armor") {
          const shot = this.effects.findLast(
            (e) => e.kind === "hit" && e.drone?.id === event.drone?.id,
          );
          launch = shot ? Math.max(0, shot.launch - shot.age) : 0;
        }
        this.effects.push({
          ...event,
          age: 0,
          launch,
          from,
          wordVisual: event.drone
            ? this.words.get(`${event.drone.id}:${event.drone.word}`)
            : undefined,
        });
        if (event.kind === "pulse") {
          for (const target of event.pulseTargets ?? []) {
            const drone = target.drone;
            this.effects.push({
              id: event.id,
              kind: target.shield ? "armor" : "kill",
              x: drone.x,
              y: drone.y,
              text: target.shield ? "SHIELD BROKEN" : "+25",
              drone,
              age: 0,
              launch: pulseContact(drone.x, drone.y, w, h),
              from: 0,
              viaPulse: true,
              wordVisual: this.words.get(`${drone.id}:${drone.word}`),
            });
          }
        }
        this.lastEvent = event.id;
      }
    // Recalculate contact after a viewport/fullscreen resize using the same circular wave.
    for (const effect of this.effects)
      if (effect.viaPulse && !effect.sounded)
        effect.launch = pulseContact(effect.x, effect.y, w, h);
    this.effects = this.effects
      .filter(
        (e) =>
          e.age <
          (e.kind === "kill" || e.kind === "armor"
            ? e.launch +
              (e.viaPulse ? 0 : SHOT_FLIGHT) +
              burstProfile(e.drone?.kind).duration
            : e.kind === "pulse"
              ? 1
              : e.kind === "hit"
                ? e.launch + SHOT_FLIGHT + HIT_RECOIL
                : e.kind === "boss"
                  ? 0.8
                  : 0.35),
      )
      .slice(-70);
    const impacts: SiegeEvent[] = [];
    for (const effect of this.effects) {
      if (
        (effect.kind === "kill" || effect.kind === "armor") &&
        !effect.sounded &&
        this.contactAge(effect, motion) >= 0 &&
        game.status !== "paused"
      ) {
        if (motion && effect.wordVisual && effect.drone) {
          const position = this.wordPosition(
            effect.wordVisual,
            w,
            h,
            this.recoil(effect.drone.id, w, h, motion),
          );
          effect.wordVisual = {
            ...effect.wordVisual,
            x: position.x / w,
            y: position.y / h,
          };
        }
        effect.sounded = true;
        impacts.push(effect);
      }
    }
    const aiming =
      motion && this.effects.find((e) => e.kind === "hit" && e.age < e.launch);
    const shot = aiming || this.effects.findLast((e) => e.kind === "hit");
    if (game.status !== "paused")
      this.heading = shot
        ? shotHeading(
            shot.from,
            shotGeometry(shot.x * w, shot.y * h, w, h).angle,
            shot.age,
            shot.launch,
            motion,
          )
        : 0;
    const time = game.status === "ready" ? readyTime : game.elapsed;
    ctx.clearRect(0, 0, w, h);
    // A redraw must not inherit a previous error/impact's stroke or glow settings.
    // Preserve the caller's DPR transform, but establish a stable drawing baseline.
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#07121d");
    bg.addColorStop(0.5, "#0a1d27");
    bg.addColorStop(1, "#111521");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(
      w * 0.73,
      h * 0.3,
      0,
      w * 0.73,
      h * 0.3,
      w * 0.6,
    );
    glow.addColorStop(0, "#28586a30");
    glow.addColorStop(0.55, "#315d7520");
    glow.addColorStop(1, "#07121d00");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    drawAtmosphere(ctx, w, h, time, motion);
    ctx.save();
    ctx.translate(w * 0.18, h * 1.58);
    ctx.scale(1, 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, h * 1.19, 0, Math.PI * 2);
    ctx.fillStyle = "#183c48";
    ctx.fill();
    ctx.strokeStyle = "#80d3da55";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, h * 1.22, 0, Math.PI * 2);
    ctx.strokeStyle = "#80d3da16";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
    // Distant relay moon: all artwork is procedural, without downloaded sprites.
    ctx.beginPath();
    ctx.arc(w * 0.12, h * 0.2, 25, 0, Math.PI * 2);
    ctx.fillStyle = "#6b9cab16";
    ctx.fill();
    ctx.strokeStyle = "#adc6cf30";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.12 + 10, h * 0.2 - 6, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#091923";
    ctx.fill();
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = "#d2b2733b";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.88);
    ctx.lineTo(w, h * 0.88);
    ctx.stroke();
    ctx.setLineDash([]);
    if (game.status === "ready") {
      [
        { x: 0.26, y: 0.24, kind: "scout" },
        { x: 0.75, y: 0.35, kind: "interceptor" },
        { x: 0.55, y: 0.12, kind: "sentinel" },
      ].forEach((e, i) =>
        this.drone(
          ctx,
          w,
          h,
          {
            ...e,
            id: i,
            armor: 1,
            word: "",
            progress: 0,
            speed: 0,
            dirty: false,
          } as Drone,
          false,
          motion ? time : 0,
          motion,
        ),
      );
    }
    for (const e of game.enemies) {
      const offset = this.recoil(e.id, w, h, motion);
      this.drone(
        ctx,
        w,
        h,
        { ...e, x: e.x + offset.x / w, y: e.y + offset.y / h },
        e.id === game.target,
        motion ? time : 0,
        motion,
      );
    }
    let particles = w < 600 ? 48 : 96;
    const perBurst = w < 600 || this.effects.length > 24 ? 8 : 24;
    for (const fx of this.effects) {
      const x = fx.x * w,
        y = fx.y * h,
        t =
          fx.age -
          (motion &&
          (fx.kind === "hit" || fx.kind === "kill" || fx.kind === "armor")
            ? fx.launch
            : 0);
      if (fx.kind === "hit") {
        if (t < 0) continue;
        const impact = impactAge(t, motion);
        const { muzzle } = shotGeometry(x, y, w, h);
        const p = motion ? Math.min(1, t / SHOT_FLIGHT) : 1;
        if (impact < 0 || (!motion && t < 0.06)) {
          this.bolt(ctx, muzzle, { x, y }, p, motion);
        }
        if (impact >= 0 && impact < 0.1) {
          ctx.globalAlpha = 1 - impact / 0.1;
          ctx.strokeStyle = this.look.laser;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, motion ? 4 + impact * 90 : 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (fx.kind === "kill" || fx.kind === "armor") {
        const impact = this.contactAge(fx, motion);
        if (impact < 0) {
          // Typing/scoring stays immediate; the defeated ship remains until its final bolt arrives.
          if (fx.kind === "kill" && fx.drone) {
            const offset = this.recoil(fx.drone.id, w, h, motion);
            this.drone(
              ctx,
              w,
              h,
              { ...fx.drone, x: fx.x + offset.x / w, y: fx.y + offset.y / h },
              !fx.viaPulse,
              motion ? time : 0,
              motion,
            );
            const word = fx.wordVisual;
            drawCompletedWord(
              ctx,
              fx.drone.word,
              word
                ? this.wordPosition(word, w, h, offset)
                : {
                    x: x + offset.x,
                    y: y + offset.y + (fx.drone.kind === "boss" ? 55 : 38),
                    width: fx.drone.word.length * 9 + 18,
                    height: 30,
                    fontSize: 14,
                  },
            );
          }
          continue;
        }
        particles -= drawDestruction(
          ctx,
          fx,
          x,
          y,
          impact,
          motion,
          Math.min(particles, perBurst),
          fx.wordVisual
            ? {
                x: fx.wordVisual.x * w,
                y: fx.wordVisual.y * h,
                fontSize: fx.wordVisual.fontSize,
              }
            : undefined,
        );
      } else if (fx.kind === "pulse") {
        drawPulse(ctx, w, h, t, motion);
      } else if (fx.kind === "boss" || fx.kind === "error") {
        const duration = fx.kind === "boss" ? 0.8 : 0.35;
        ctx.globalAlpha = Math.max(0, 1 - t / duration);
        ctx.strokeStyle = fx.kind === "error" ? "#f2ad9b" : "#b4d9b4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          motion ? 18 + t * (fx.kind === "boss" ? 85 : 30) : 25,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (fx.kind === "damage") {
        ctx.fillStyle = `rgba(209,96,79,${Math.max(0, 0.12 - t * 0.4)})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
    this.ship(ctx, w * 0.5, h * 0.94, time, motion, this.heading);
    return impacts;
  }
  private wordPosition(
    word: WordPlacement,
    w: number,
    h: number,
    offset: { x: number; y: number },
  ) {
    return {
      ...word,
      x: Math.max(
        word.width / 2 + 2,
        Math.min(w - word.width / 2 - 2, word.x * w + offset.x),
      ),
      y: Math.max(
        word.height / 2 + 2,
        Math.min(h - word.height / 2 - 2, word.y * h + offset.y),
      ),
    };
  }
  private contactAge(effect: Effect, motion: boolean) {
    return motion
      ? effect.age - effect.launch - (effect.viaPulse ? 0 : SHOT_FLIGHT)
      : effect.age;
  }
  private drone(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    e: Drone,
    locked: boolean,
    time: number,
    motion: boolean,
  ) {
    const x = e.x * w,
      y = e.y * h,
      boss = e.kind === "boss",
      scale = boss ? 1.7 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (!locked) ctx.rotate(Math.sin(time * 0.9 + e.id) * 0.045);
    ctx.strokeStyle = locked
      ? "#edc783"
      : e.kind === "interceptor"
        ? "#f1ab97"
        : e.armor > 1
          ? "#b4abea"
          : "#8dc7cd";
    ctx.fillStyle = "#142b36";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-9, -6);
    ctx.lineTo(0, -17);
    ctx.lineTo(9, -6);
    ctx.lineTo(20, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(0, 7);
    ctx.lineTo(6, -2);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(-2, -7, 4, 4);
    if (e.boss) drawBoss(ctx, e, motion);
    if (e.armor > 1) {
      ctx.strokeStyle = "#a99eea88";
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (locked)
      drawTarget(
        ctx,
        x,
        y,
        scale,
        this.lockAge,
        motion,
        this.effects.some(
          (fx) => fx.kind === "error" && fx.drone?.id === e.id && fx.age < 0.28,
        ),
        this.look.target,
      );
  }
  private ship(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    motion: boolean,
    heading: number,
    heat = this.heat,
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    const flame =
      12 + heat * 30 + (motion ? Math.sin(time * 22) * (1 + heat * 2) : 0);
    const base = this.look.engine;
    const channels = base.map((channel, i) =>
      Math.round(channel + heat * ([240, 200, 133][i] - channel)),
    );
    const color = `rgb(${channels.join(",")})`;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.22 + heat * 0.42;
    ctx.shadowColor = color;
    ctx.shadowBlur = motion ? 5 + heat * 13 : 0;
    ctx.beginPath();
    ctx.moveTo(-5 - heat * 2, 4);
    ctx.quadraticCurveTo(-3, 14, 0, flame);
    ctx.quadraticCurveTo(3, 14, 5 + heat * 2, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e3fff1";
    ctx.beginPath();
    ctx.moveTo(-2, 6);
    ctx.lineTo(0, 10 + heat * 12);
    ctx.lineTo(2, 6);
    ctx.fill();
    if (this.look.trail === "comet" || this.look.trail === "solar") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 7, 7);
        if (this.look.trail === "comet")
          ctx.quadraticCurveTo(side * 12, 20, side * 6, flame + 8);
        else ctx.lineTo(side * 4, flame + 4);
        ctx.stroke();
      }
    }
    if (this.look.trail === "stardust") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      for (let i = 0; i < (motion ? 6 : 3); i++) {
        const age = motion ? (time * 1.5 + i / 6) % 1 : (i + 1) / 4;
        const sx = Math.sin(i * 2.4) * (5 + age * 7),
          sy = 8 + age * (flame + 4);
        ctx.globalAlpha = (1 - age) * 0.7;
        ctx.beginPath();
        ctx.moveTo(sx - 1.5, sy);
        ctx.lineTo(sx + 1.5, sy);
        ctx.moveTo(sx, sy - 1.5);
        ctx.lineTo(sx, sy + 1.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = this.look.stroke;
    ctx.fillStyle = this.look.fill;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    shipHullPoints(this.look.hull).forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.look.canopy;
    ctx.fillRect(-2, -12, 4, 10);
    if (this.look.hull === "twinfin") {
      ctx.fillStyle = color;
      ctx.fillRect(-15, 6, 4, 3);
      ctx.fillRect(11, 6, 4, 3);
    }
    ctx.restore();
  }
}
