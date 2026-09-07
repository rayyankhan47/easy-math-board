"use client";

import { useMemo } from "react";
import { compile } from "mathjs";
import type { PlotObj } from "@/lib/types";

const INK = ["#5b8def", "#e0a06c", "#6cc7a1", "#c47ce0"];

export function PlotObject({ o }: { o: PlotObj }) {
  const { paths, yLo, yHi, zeroY, zeroX } = useMemo(() => {
    const N = 260;
    const series: { d: string; i: number }[] = [];
    let lo = Infinity;
    let hi = -Infinity;
    const sampled: (number | null)[][] = [];

    for (const src of o.exprs) {
      let f: (s: { x: number }) => number;
      try {
        const c = compile(src);
        f = (s) => c.evaluate(s) as number;
      } catch {
        sampled.push([]);
        continue;
      }
      const ys: (number | null)[] = [];
      for (let i = 0; i <= N; i++) {
        const x = o.from + ((o.to - o.from) * i) / N;
        let y: number | null = null;
        try {
          const r = f({ x });
          y = typeof r === "number" && Number.isFinite(r) ? r : null;
        } catch {
          y = null;
        }
        if (y !== null) {
          lo = Math.min(lo, y);
          hi = Math.max(hi, y);
        }
        ys.push(y);
      }
      sampled.push(ys);
    }

    if (!Number.isFinite(lo)) { lo = -1; hi = 1; }
    // clamp wild ranges so an asymptote doesn't flatten everything else
    const span = hi - lo || 1;
    if (span > 1e4) { lo = Math.max(lo, -50); hi = Math.min(hi, 50); }
    const pad = (hi - lo) * 0.08 || 1;
    lo -= pad; hi += pad;

    const px = (x: number) => ((x - o.from) / (o.to - o.from)) * o.w;
    const py = (y: number) => o.h - ((y - lo) / (hi - lo)) * o.h;

    sampled.forEach((ys, i) => {
      if (!ys.length) return;
      let d = "";
      let pen = false;
      ys.forEach((y, k) => {
        const x = o.from + ((o.to - o.from) * k) / N;
        if (y === null || py(y) < -o.h || py(y) > o.h * 2) { pen = false; return; }
        d += `${pen ? "L" : "M"}${px(x).toFixed(1)},${py(y).toFixed(1)}`;
        pen = true;
      });
      if (d) series.push({ d, i });
    });

    return {
      paths: series,
      yLo: lo, yHi: hi,
      zeroY: lo <= 0 && hi >= 0 ? py(0) : null,
      zeroX: o.from <= 0 && o.to >= 0 ? px(0) : null,
    };
  }, [o]);

  return (
    <div className="select-none">
      <svg width={o.w} height={o.h} className="overflow-visible">
        <rect width={o.w} height={o.h} fill="#111216" stroke="#22242a" rx={3} />
        {zeroY !== null && (
          <line x1={0} y1={zeroY} x2={o.w} y2={zeroY} stroke="#2b2e35" strokeWidth={1} />
        )}
        {zeroX !== null && (
          <line x1={zeroX} y1={0} x2={zeroX} y2={o.h} stroke="#2b2e35" strokeWidth={1} />
        )}
        {paths.map((p) => (
          <path key={p.i} d={p.d} fill="none" stroke={INK[p.i % INK.length]} strokeWidth={1.4} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-[#4a4e57]">
        <span>{o.from}</span>
        <span className="text-[#6b707a]">
          {o.exprs.join(", ")} · y ∈ [{yLo.toFixed(1)}, {yHi.toFixed(1)}]
        </span>
        <span>{o.to}</span>
      </div>
    </div>
  );
}
