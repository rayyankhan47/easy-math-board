"use client";

import { useMemo } from "react";
import { useBoard } from "@/lib/store";
import { diagonalPairs, polyPoints, shapeFacts, shapeName } from "@/lib/shapes";
import type { ShapeObj } from "@/lib/types";

const PAD = 6;

export function ShapeObject({ o }: { o: ShapeObj }) {
  const select = useBoard((s) => s.select);
  const size = Math.min(o.w, o.h);
  const r = Math.max(8, size / 2 - PAD);

  const { pts, facts } = useMemo(
    () => ({
      pts: o.sides >= 3 ? polyPoints(o.sides, r, o.rotation) : [],
      facts: shapeFacts(o.sides, r),
    }),
    [o.sides, r, o.rotation],
  );

  const c = r + PAD;
  const d = pts.length ? `M ${pts.map((p) => `${p[0] + PAD} ${p[1] + PAD}`).join(" L ")} Z` : "";

  return (
    <div
      className="cursor-grab select-none"
      onPointerDown={(e) => select(o.id, e.shiftKey)}
    >
      <svg width={size} height={size} className="overflow-visible">
        {o.showCircum && (
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--text-ghost)" strokeDasharray="3 3" />
        )}
        {o.showIn && o.sides >= 3 && (
          <circle cx={c} cy={c} r={facts.apothem} fill="none" stroke="var(--text-ghost)" strokeDasharray="3 3" />
        )}

        {o.sides === 0 ? (
          <circle cx={c} cy={c} r={r} fill={o.fill ?? "none"} stroke={o.stroke} strokeWidth={1.6} />
        ) : (
          <path d={d} fill={o.fill ?? "none"} stroke={o.stroke} strokeWidth={1.6} strokeLinejoin="round" />
        )}

        {o.showDiagonals &&
          diagonalPairs(o.sides).map(([i, j], k) => (
            <line
              key={k}
              x1={pts[i][0] + PAD} y1={pts[i][1] + PAD}
              x2={pts[j][0] + PAD} y2={pts[j][1] + PAD}
              stroke={o.stroke}
              strokeWidth={0.7}
              opacity={0.45}
            />
          ))}

        {o.showVertices &&
          pts.map((p, i) => (
            <circle key={i} cx={p[0] + PAD} cy={p[1] + PAD} r={3} fill={o.stroke} />
          ))}
        {o.showVertices && o.sides === 0 && <circle cx={c} cy={c} r={2.5} fill={o.stroke} />}
      </svg>

      <div data-drag className="mt-0.5 text-center font-mono text-[10px] text-[var(--text-faint)]">
        {shapeName(o.sides)}
      </div>
    </div>
  );
}
