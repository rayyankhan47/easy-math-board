"use client";

import { useEffect, useRef, useState } from "react";
import { compile } from "mathjs";
import { useBoard } from "@/lib/store";
import { useTheme, token } from "@/lib/theme";
import { useSettings } from "@/lib/settings";
import { niceStep, tickLabel, rhs, paramsIn } from "@/lib/axes";
import type { PlaneObj } from "@/lib/types";

export const CURVE_INK = ["#2383e2", "#d9730d", "#0f7b6c", "#9065b0", "#d44c47", "#cb912f"];

/** A Cartesian plane: pan by dragging inside it, zoom with the wheel. */
export function PlaneObject({ o }: { o: PlaneObj }) {
  const update = useBoard((s) => s.update);
  const select = useBoard((s) => s.select);
  const theme = useTheme((s) => s.theme);
  const angleUnit = useSettings((s) => s.angleUnit);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = o.w * dpr;
    c.height = o.h * dpr;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ink = {
      bg: token("--inset"),
      grid: token("--border"),
      axis: token("--text-faint"),
      label: token("--text-dim2"),
    };

    const px = (x: number) => o.w / 2 + (x - o.cx) * o.ppu;
    const py = (y: number) => o.h / 2 - (y - o.cy) * o.ppu;
    const ux = (p: number) => o.cx + (p - o.w / 2) / o.ppu;
    const uy = (p: number) => o.cy - (p - o.h / 2) / o.ppu;

    g.fillStyle = ink.bg;
    g.fillRect(0, 0, o.w, o.h);

    // grid
    const step = niceStep(o.ppu);
    const x0 = Math.floor(ux(0) / step) * step;
    const x1 = ux(o.w);
    const y0 = Math.floor(uy(o.h) / step) * step;
    const y1 = uy(0);

    g.strokeStyle = ink.grid;
    g.lineWidth = 1;
    g.beginPath();
    for (let x = x0; x <= x1; x += step) {
      const p = Math.round(px(x)) + 0.5;
      g.moveTo(p, 0);
      g.lineTo(p, o.h);
    }
    for (let y = y0; y <= y1; y += step) {
      const p = Math.round(py(y)) + 0.5;
      g.moveTo(0, p);
      g.lineTo(o.w, p);
    }
    g.stroke();

    // axes
    g.strokeStyle = ink.axis;
    g.lineWidth = 1.25;
    g.beginPath();
    const ax = Math.round(px(0)) + 0.5;
    const ay = Math.round(py(0)) + 0.5;
    if (ax > 0 && ax < o.w) { g.moveTo(ax, 0); g.lineTo(ax, o.h); }
    if (ay > 0 && ay < o.h) { g.moveTo(0, ay); g.lineTo(o.w, ay); }
    g.stroke();

    // tick labels, clamped to the edge when the axis is off-screen
    g.fillStyle = ink.label;
    g.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    const labelY = Math.min(o.h - 4, Math.max(11, ay + 11));
    const labelX = Math.min(o.w - 6, Math.max(4, ax + 4));
    g.textAlign = "center";
    for (let x = x0; x <= x1; x += step) {
      if (Math.abs(x) < step / 1000) continue;
      g.fillText(tickLabel(x, step), px(x), labelY);
    }
    g.textAlign = "left";
    for (let y = y0; y <= y1; y += step) {
      if (Math.abs(y) < step / 1000) continue;
      g.fillText(tickLabel(y, step), labelX, py(y) - 2);
    }

    // Unset parameters default to 1 rather than making the curve vanish.
    const scope: Record<string, unknown> = { ...o.params };
    for (const k of paramsIn(o.curves.map((c) => c.expr))) scope[k] ??= 1;
    if (angleUnit === "deg") {
      const d = Math.PI / 180;
      Object.assign(scope, {
        sin: (t: number) => Math.sin(t * d),
        cos: (t: number) => Math.cos(t * d),
        tan: (t: number) => Math.tan(t * d),
      });
    }

    // curves — one sample per pixel column, with breaks at poles
    o.curves.forEach((cv, i) => {
      if (!cv.on) return;
      let f: (s: Record<string, unknown>) => number;
      try {
        const compiled = compile(rhs(cv.expr));
        f = (s) => compiled.evaluate(s as Record<string, unknown>) as number;
      } catch {
        return;
      }
      g.strokeStyle = cv.color || CURVE_INK[i % CURVE_INK.length];
      g.lineWidth = 1.75;
      g.beginPath();
      let pen = false;
      let prev = NaN;
      for (let p = 0; p <= o.w; p++) {
        const x = ux(p);
        let y: number;
        try {
          const r = f({ ...scope, x });
          y = typeof r === "number" ? r : NaN;
        } catch {
          y = NaN;
        }
        if (!Number.isFinite(y)) { pen = false; continue; }
        const yy = py(y);
        // a jump of more than a screen height is an asymptote, not a line
        if (pen && Number.isFinite(prev) && Math.abs(yy - prev) > o.h * 1.5) pen = false;
        if (yy < -o.h * 4 || yy > o.h * 5) { pen = false; prev = yy; continue; }
        if (pen) g.lineTo(p, yy);
        else g.moveTo(p, yy);
        pen = true;
        prev = yy;
      }
      g.stroke();
    });
  }, [o, theme, angleUnit]);

  const toUnits = (e: React.PointerEvent | React.MouseEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const sx = o.w / r.width;
    return {
      x: o.cx + ((e.clientX - r.left) * sx - o.w / 2) / o.ppu,
      y: o.cy - ((e.clientY - r.top) * sx - o.h / 2) / o.ppu,
    };
  };

  return (
    <div className="select-none">
      <canvas
        ref={canvas}
        style={{ width: o.w, height: o.h }}
        className="cursor-crosshair rounded-[4px] border border-[var(--border)]"
        onPointerDown={(e) => {
          select(o.id, e.shiftKey);
          (e.target as Element).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, cx: o.cx, cy: o.cy };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) {
            update<PlaneObj>(o.id, {
              cx: d.cx - (e.clientX - d.x) / o.ppu,
              cy: d.cy + (e.clientY - d.y) / o.ppu,
            });
          } else {
            setHover(toUnits(e));
          }
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => { drag.current = null; setHover(null); }}
        onWheel={(e) => {
          e.stopPropagation();
          const at = toUnits(e);
          const next = Math.min(4000, Math.max(0.5, o.ppu * (1 - e.deltaY / 500)));
          // keep the point under the cursor fixed
          update<PlaneObj>(o.id, {
            ppu: next,
            cx: at.x - (at.x - o.cx) * (o.ppu / next),
            cy: at.y - (at.y - o.cy) * (o.ppu / next),
          });
        }}
      />
      <div
        data-drag
        className="mt-1 flex cursor-grab items-center justify-between gap-3 font-mono text-[10px] text-[var(--text-faint)]"
      >
        <span className="truncate">
          {o.curves.filter((c) => c.on).map((c) => c.expr).join("  ·  ") || "no curves"}
        </span>
        <span className="shrink-0 tabular-nums">
          {hover ? `${hover.x.toFixed(2)}, ${hover.y.toFixed(2)}` : `${o.ppu.toFixed(0)} px/unit`}
        </span>
      </div>
    </div>
  );
}
