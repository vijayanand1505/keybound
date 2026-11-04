"use client";
import { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import { SiegeRenderer } from "@/game/siege-renderer";
import type { CosmeticSelection } from "@/game/siege-cosmetics";

export default function SiegeShipPreview({
  selection,
  enabled,
  disabled,
  reducedMotion,
}: {
  selection: CosmeticSelection;
  enabled: boolean;
  disabled: boolean;
  reducedMotion: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<SiegeRenderer | null>(null);
  const frame = useRef(0);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [systemReduced, setSystemReduced] = useState(false);
  const calm = reducedMotion || systemReduced;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const painter = new SiegeRenderer();
    painter.setCosmetics(selection);
    renderer.current = painter;
    const reset = () => {
      cancelAnimationFrame(frame.current);
      painter.preview(ctx, 360, 220);
      setRunning(false);
    };
    reset();
    setNotice("");
    const visibility = () => {
      if (document.hidden) reset();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame.current);
      renderer.current = null;
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [
    selection.ship,
    selection.trail,
    selection.target,
    selection.hull,
    selection.beam,
    enabled,
    disabled,
    calm,
  ]);
  function fire() {
    const ctx = canvas.current?.getContext("2d"),
      painter = renderer.current;
    if (!ctx || !painter || !enabled || disabled || running) return;
    cancelAnimationFrame(frame.current);
    if (calm) {
      painter.preview(ctx, 360, 220, { demoAge: 0.08 });
      setNotice("Shot preview. Reduced motion is on.");
      return;
    }
    setRunning(true);
    setNotice("");
    const started = performance.now();
    const animate = (now: number) => {
      const age = (now - started) / 1000;
      if (age >= 1.3 || document.hidden) {
        painter.preview(ctx, 360, 220);
        setRunning(false);
        setNotice("Preview complete.");
        return;
      }
      painter.preview(ctx, 360, 220, { time: age, motion: true, demoAge: age });
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
  }
  return (
    <figure className="siege-ship-preview">
      <canvas
        ref={canvas}
        width={720}
        height={440}
        role="img"
        aria-label="Preview of your selected ship frame, color, engine trail, laser and target marker"
      />
      <div className="siege-preview-actions">
        <button
          type="button"
          className="button ghost"
          onClick={fire}
          disabled={!enabled || disabled || running}
        >
          <Crosshair size={15} />
          {running ? "Firing…" : "Test fire"}
        </button>
        <span role="status">{notice}</span>
      </div>
      <figcaption>
        {disabled
          ? "Finish this run to change your style."
          : "All styles are free. Choices save on this device."}
      </figcaption>
    </figure>
  );
}
