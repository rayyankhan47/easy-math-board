import { getStroke } from "perfect-freehand";
import type { InkObj, InkTool } from "./types";

export const INK_COLORS = [
  "#37352f", // ink
  "#2383e2", // blue
  "#d44c47", // red
  "#0f7b6c", // green
  "#d9730d", // orange
  "#9065b0", // purple
];

/** Highlighter needs a light, saturated set — the ink palette goes muddy. */
export const HIGHLIGHT_COLORS = ["#ffd93d", "#7ee787", "#7cc4fa", "#ff9de2", "#ffab70"];

export const SIZES = [2, 4, 7, 12];

const OPTS: Record<InkTool, Parameters<typeof getStroke>[1]> = {
  pen: { thinning: 0.62, smoothing: 0.42, streamline: 0.42, simulatePressure: true },
  highlighter: { thinning: 0, smoothing: 0.5, streamline: 0.5, simulatePressure: false },
  arrow: { thinning: 0.5, smoothing: 0.5, streamline: 0.55, simulatePressure: true },
};

/** perfect-freehand gives an outline polygon; turn it into a filled path. */
export function strokePath(
  points: [number, number, number][],
  tool: InkTool,
  size: number,
): string {
  if (!points.length) return "";
  const outline = getStroke(points, { size, ...OPTS[tool] });
  if (!outline.length) return "";
  return (
    outline.reduce(
      (acc, [x, y], i, a) => {
        const [nx, ny] = a[(i + 1) % a.length];
        acc.push(x, y, (x + nx) / 2, (y + ny) / 2);
        return acc;
      },
      ["M", ...outline[0], "Q"] as (string | number)[],
    ).join(" ") + " Z"
  );
}

/**
 * Arrowhead from the stroke's own direction, averaged over the tail so a shaky
 * hand still points where it meant to.
 */
export function arrowHead(points: [number, number, number][], size: number): string {
  if (points.length < 2) return "";
  const end = points[points.length - 1];
  const back = points[Math.max(0, points.length - 8)];
  const a = Math.atan2(end[1] - back[1], end[0] - back[0]);
  const len = Math.max(9, size * 2.6);
  const spread = 0.42;
  const p1 = [end[0] - len * Math.cos(a - spread), end[1] - len * Math.sin(a - spread)];
  const p2 = [end[0] - len * Math.cos(a + spread), end[1] - len * Math.sin(a + spread)];
  return `M ${p1[0]} ${p1[1]} L ${end[0]} ${end[1]} L ${p2[0]} ${p2[1]}`;
}

export function inkBounds(points: [number, number, number][], size: number) {
  if (!points.length) return { minX: 0, minY: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const pad = size * 1.5 + 4;
  return { minX: minX - pad, minY: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

/** Is any part of this stroke within `r` of the point? Used by the eraser. */
export function strokeHit(o: InkObj, px: number, py: number, r: number): boolean {
  const rr = (r + o.size) ** 2;
  for (const [x, y] of o.points) {
    const dx = o.x + x - px;
    const dy = o.y + y - py;
    if (dx * dx + dy * dy <= rr) return true;
  }
  return false;
}
