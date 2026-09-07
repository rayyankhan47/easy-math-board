"use client";

import { useMemo } from "react";
import type { ClockObj } from "@/lib/types";

const R = 76;

/** Z_n as a dial. Stepping by k traces the subgroup <k>. */
export function ClockObject({ o }: { o: ClockObj }) {
  const { pts, orbit, order } = useMemo(() => {
    const pts = Array.from({ length: o.n }, (_, i) => {
      const t = (i / o.n) * Math.PI * 2 - Math.PI / 2;
      return { i, x: R + R * 0.78 * Math.cos(t), y: R + R * 0.78 * Math.sin(t) };
    });
    const seen: number[] = [];
    let v = 0;
    do {
      seen.push(v);
      v = (v + o.step) % o.n;
    } while (v !== 0 && seen.length <= o.n);
    return { pts, orbit: new Set(seen), order: seen.length };
  }, [o]);

  const seq = [...orbit];

  return (
    <div className="select-none">
      <svg width={R * 2} height={R * 2} className="overflow-visible">
        <circle cx={R} cy={R} r={R * 0.78} fill="none" stroke="var(--border)" strokeWidth={1} />
        {o.step > 1 &&
          seq.map((v, k) => {
            const a = pts[v];
            const b = pts[seq[(k + 1) % seq.length]];
            return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeWidth={1} opacity={0.5} />;
          })}
        {pts.map((p) => {
          const on = orbit.has(p.i);
          return (
            <g key={p.i}>
              <circle cx={p.x} cy={p.y} r={on ? 5 : 3} fill={on ? "var(--accent)" : "var(--text-ghost)"} />
              <text
                x={p.x} y={p.y - 9}
                textAnchor="middle"
                className={`font-mono text-[9px] ${on ? "fill-[var(--accent-soft)]" : "fill-[var(--text-faint)]"}`}
              >
                {p.i}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 text-center font-mono text-[10px] text-[var(--text-dim2)]">
        Z_{o.n} · ⟨{o.step}⟩ has order {order}
        {order === o.n && o.step > 1 ? " · generator" : ""}
      </div>
    </div>
  );
}
