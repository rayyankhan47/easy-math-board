"use client";

import { useMemo } from "react";
import { arrowHead, inkBounds, strokePath } from "@/lib/ink";
import type { InkObj } from "@/lib/types";

/** Renders a stroke exactly as it was drawn. Nothing is straightened or tidied. */
export function InkObject({ o }: { o: InkObj }) {
  const { d, head, box } = useMemo(() => {
    const box = inkBounds(o.points, o.size);
    // shift into the svg's own coordinate space
    const shifted = o.points.map(
      ([x, y, p]) => [x - box.minX, y - box.minY, p] as [number, number, number],
    );
    return {
      box,
      d: strokePath(shifted, o.tool, o.size),
      head: o.tool === "arrow" ? arrowHead(shifted, o.size) : "",
    };
  }, [o]);

  const highlight = o.tool === "highlighter";

  return (
    <svg
      width={Math.max(1, box.w)}
      height={Math.max(1, box.h)}
      viewBox={`0 0 ${Math.max(1, box.w)} ${Math.max(1, box.h)}`}
      style={{
        marginLeft: box.minX,
        marginTop: box.minY,
        opacity: highlight ? 0.42 : 1,
        mixBlendMode: highlight ? "multiply" : "normal",
      }}
      /* The box is transparent to clicks; only the stroke itself is not, so a
         scribble over a plane never blocks the plane underneath. */
      className="pointer-events-none overflow-visible"
    >
      <path d={d} fill={o.color} className="pointer-events-auto cursor-grab" />
      {head && (
        <path
          d={head}
          fill="none"
          stroke={o.color}
          strokeWidth={Math.max(1.6, o.size * 0.72)}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-auto cursor-grab"
        />
      )}
    </svg>
  );
}
