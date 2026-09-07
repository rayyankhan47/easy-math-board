"use client";

import { useEffect, useMemo, useRef } from "react";
import { compile } from "mathjs";
import { useBoard } from "@/lib/store";
import { useTheme, token } from "@/lib/theme";
import { niceStep, tickLabel } from "@/lib/axes";
import type { SurfaceObj } from "@/lib/types";

/* A painter's-algorithm surface renderer. No WebGL: at these grid sizes a
 * sorted-quad pass is smooth, and it inherits the theme for free. */

interface P3 { x: number; y: number; z: number }

export function SurfaceObject({ o }: { o: SurfaceObj }) {
  const update = useBoard((s) => s.update);
  const select = useBoard((s) => s.select);
  const theme = useTheme((s) => s.theme);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  // Sample the surface once per expression change, not once per frame.
  const { pts, zLo, zHi } = useMemo(() => {
    const n = o.res;
    const pts: P3[][] = [];
    let zLo = Infinity;
    let zHi = -Infinity;
    let f: (s: Record<string, number>) => number;
    try {
      const c = compile(o.expr);
      f = (s) => c.evaluate(s) as number;
    } catch {
      return { pts: [], zLo: 0, zHi: 1 };
    }
    for (let i = 0; i <= n; i++) {
      const row: P3[] = [];
      for (let j = 0; j <= n; j++) {
        const x = -o.range + (2 * o.range * i) / n;
        const y = -o.range + (2 * o.range * j) / n;
        let z = 0;
        try {
          const r = f({ x, y });
          z = typeof r === "number" && Number.isFinite(r) ? r : NaN;
        } catch {
          z = NaN;
        }
        if (Number.isFinite(z)) { zLo = Math.min(zLo, z); zHi = Math.max(zHi, z); }
        row.push({ x, y, z });
      }
      pts.push(row);
    }
    if (!Number.isFinite(zLo)) { zLo = 0; zHi = 1; }
    // clamp pathological ranges so one pole doesn't flatten the surface
    const mid = (zLo + zHi) / 2;
    if (zHi - zLo > 40 * o.range) { zLo = mid - 4 * o.range; zHi = mid + 4 * o.range; }
    return { pts, zLo, zHi };
  }, [o.expr, o.range, o.res]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !pts.length) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = o.w * dpr;
    c.height = o.h * dpr;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = token("--inset");
    g.fillRect(0, 0, o.w, o.h);

    const zSpan = zHi - zLo || 1;
    const s = (o.zoom * Math.min(o.w, o.h)) / (2.9 * o.range);
    const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw);
    const cp = Math.cos(o.pitch), sp = Math.sin(o.pitch);
    const zScale = (1.1 * o.range) / zSpan;

    // project: rotate about z (yaw), tilt (pitch), then orthographic
    const proj = (p: P3) => {
      const z = (p.z - (zLo + zHi) / 2) * zScale;
      const x1 = p.x * cy - p.y * sy;
      const y1 = p.x * sy + p.y * cy;
      const y2 = y1 * cp - z * sp;
      const depth = y1 * sp + z * cp;
      return { sx: o.w / 2 + x1 * s, sy: o.h / 2 - y2 * s, depth };
    };

    type Quad = { path: [number, number][]; depth: number; t: number };
    const quads: Quad[] = [];
    for (let i = 0; i < o.res; i++)
      for (let j = 0; j < o.res; j++) {
        const corners = [pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1]];
        if (corners.some((p) => !Number.isFinite(p.z))) continue;
        const pr = corners.map(proj);
        quads.push({
          path: pr.map((p) => [p.sx, p.sy] as [number, number]),
          depth: pr.reduce((a, p) => a + p.depth, 0) / 4,
          t: (corners.reduce((a, p) => a + p.z, 0) / 4 - zLo) / zSpan,
        });
      }
    quads.sort((a, b) => a.depth - b.depth); // far to near

    const dark = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg").trim().startsWith("#1");

    // ---- axes, drawn behind the surface so it can occlude them ----
    const axis = token("--text-faint");
    const label = token("--text-dim2");
    g.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";

    const zTop = (zHi - (zLo + zHi) / 2) * zScale;
    const zBot = (zLo - (zLo + zHi) / 2) * zScale;
    const R = o.range;

    /** Project a raw (x, y, z-in-projection-units) triple. */
    const raw = (x: number, y: number, z: number) => {
      const x1 = x * cy - y * sy;
      const y1 = x * sy + y * cy;
      const y2 = y1 * cp - z * sp;
      return { sx: o.w / 2 + x1 * s, sy: o.h / 2 - y2 * s, depth: y1 * sp + z * cp };
    };

    const line = (a: { sx: number; sy: number }, b: { sx: number; sy: number }, w = 1) => {
      g.strokeStyle = axis;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(a.sx, a.sy);
      g.lineTo(b.sx, b.sy);
      g.stroke();
    };

    // Anchor the axes at whichever floor corner is furthest away, so the
    // surface never sits on top of them.
    const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    let ax_ = -1, ay_ = -1, best = -Infinity;
    for (const [i, j] of corners) {
      const d = raw(i * R, j * R, zBot).depth;
      if (d > best) { best = d; ax_ = i; ay_ = j; }
    }

    const step = niceStep(s, 54);
    g.fillStyle = label;
    g.textAlign = "center";
    g.textBaseline = "middle";

    const origin = raw(ax_ * R, ay_ * R, zBot);
    // x runs along the far edge, y along the other, z stands up from the corner
    line(origin, raw(-ax_ * R, ay_ * R, zBot), 1.1);
    line(origin, raw(ax_ * R, -ay_ * R, zBot), 1.1);
    line(origin, raw(ax_ * R, ay_ * R, zTop), 1.1);

    // small offset outward, so labels sit clear of the box
    const out = (p: { sx: number; sy: number }, k = 1) => {
      const dx = p.sx - o.w / 2;
      const dy = p.sy - o.h / 2;
      const m = Math.hypot(dx, dy) || 1;
      return { sx: p.sx + (dx / m) * 11 * k, sy: p.sy + (dy / m) * 11 * k };
    };

    for (let v = Math.ceil(-R / step) * step; v <= R + 1e-9; v += step) {
      if (Math.abs(v) < step / 1000) continue;
      const px = out(raw(v, ay_ * R, zBot));
      const py = out(raw(ax_ * R, v, zBot));
      g.fillText(tickLabel(v, step), px.sx, px.sy);
      g.fillText(tickLabel(v, step), py.sx, py.sy);
    }

    const zStep = niceStep(Math.abs(s * zScale) || 1, 46);
    for (let v = Math.ceil(zLo / zStep) * zStep; v <= zHi + 1e-9; v += zStep) {
      const p = out(raw(ax_ * R, ay_ * R, (v - (zLo + zHi) / 2) * zScale));
      g.fillText(tickLabel(v, zStep), p.sx, p.sy);
    }

    g.fillStyle = axis;
    g.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    const lx = out(raw(-ax_ * R * 1.1, ay_ * R, zBot), 1.7);
    const ly = out(raw(ax_ * R, -ay_ * R * 1.1, zBot), 1.7);
    const lz = out(raw(ax_ * R, ay_ * R, zTop), 1.7);
    g.fillText("x", lx.sx, lx.sy);
    g.fillText("y", ly.sx, ly.sy);
    g.fillText("z", lz.sx, lz.sy);
    g.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    g.fillStyle = label;

    for (const q of quads) {
      g.beginPath();
      g.moveTo(q.path[0][0], q.path[0][1]);
      for (let k = 1; k < 4; k++) g.lineTo(q.path[k][0], q.path[k][1]);
      g.closePath();
      if (!o.wire) {
        // cool -> warm by height
        const hue = 210 - 190 * q.t;
        const light = dark ? 30 + 34 * q.t : 52 + 30 * q.t;
        g.fillStyle = `hsl(${hue} 62% ${light}%)`;
        g.fill();
      }
      g.strokeStyle = o.wire
        ? `hsl(${210 - 190 * q.t} 62% ${dark ? 62 : 44}%)`
        : dark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.35)";
      g.lineWidth = o.wire ? 1 : 0.5;
      g.stroke();
    }
  }, [o, pts, zLo, zHi, theme]);

  return (
    <div className="select-none">
      <canvas
        ref={canvas}
        style={{ width: o.w, height: o.h }}
        className="cursor-grab rounded-[4px] border border-[var(--border)] active:cursor-grabbing"
        onPointerDown={(e) => {
          select(o.id, e.shiftKey);
          (e.target as Element).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, yaw: o.yaw, pitch: o.pitch };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          update<SurfaceObj>(o.id, {
            yaw: d.yaw + (e.clientX - d.x) * 0.01,
            pitch: Math.max(-1.5, Math.min(1.5, d.pitch + (e.clientY - d.y) * 0.01)),
          });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        onWheel={(e) => {
          e.stopPropagation();
          update<SurfaceObj>(o.id, {
            zoom: Math.min(6, Math.max(0.3, o.zoom * (1 - e.deltaY / 500))),
          });
        }}
      />
      <div
        data-drag
        className="mt-1 flex cursor-grab items-center justify-between gap-3 font-mono text-[10px] text-[var(--text-faint)]"
      >
        <span className="truncate">z = {o.expr}</span>
        <span className="shrink-0">drag to orbit</span>
      </div>
    </div>
  );
}
