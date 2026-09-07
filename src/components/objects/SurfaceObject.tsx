"use client";

import { useEffect, useMemo, useRef } from "react";
import { compile } from "mathjs";
import { useBoard } from "@/lib/store";
import { useTheme, token } from "@/lib/theme";
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
      <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[10px] text-[var(--text-faint)]">
        <span className="truncate">z = {o.expr}</span>
        <span className="shrink-0">drag to orbit</span>
      </div>
    </div>
  );
}
